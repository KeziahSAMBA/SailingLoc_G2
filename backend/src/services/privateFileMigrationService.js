import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import prisma from '../config/db.js';
import { decryptBuffer, encryptBuffer, isEncrypted } from '../utils/fileCrypto.js';
import {
  documentsRoot,
  disputesRoot,
  isWithin,
  legacyDocumentsRoot,
  legacyDisputesRoot,
  privateDirectory,
  privateRootFor,
  resolveExistingPrivateFile,
  resolveStoredFilePath,
  storagePath,
} from '../utils/fileSecurity.js';

// This is an operator-invoked migration, not an always-on cleanup sweep. It
// only considers paths referenced by Document or dispute Image rows, and it
// never walks arbitrary directories. A bounded batch also keeps a failed run
// resumable without exhausting the database or filesystem.
export const PRIVATE_FILE_MIGRATION_BATCH = 500;
const MIGRATION_NAME = 'private-files-aes-gcm-v1';
const SAFE_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp']);

const KIND_CONFIG = Object.freeze({
  document: Object.freeze({
    id: 'id_document',
    field: 'file_url',
    model: 'document',
    currentRoot: documentsRoot,
    legacyRoot: legacyDocumentsRoot,
  }),
  dispute: Object.freeze({
    id: 'id_image',
    field: 'url',
    model: 'image',
    currentRoot: disputesRoot,
    legacyRoot: legacyDisputesRoot,
  }),
});

function configFor(kind) {
  const config = KIND_CONFIG[kind];
  if (!config) throw new Error(`Type de fichier privé inconnu : ${kind}`);
  return config;
}

function positiveLimit(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return PRIVATE_FILE_MIGRATION_BATCH;
  return Math.min(parsed, PRIVATE_FILE_MIGRATION_BATCH);
}

function extensionFor(candidate) {
  const extension = path.extname(String(candidate || '')).toLowerCase();
  return SAFE_EXTENSIONS.has(extension) ? extension : '.bin';
}

function sourceKey(kind, sourcePath) {
  return crypto
    .createHash('sha256')
    .update(`${MIGRATION_NAME}:${kind}:${path.resolve(sourcePath)}`)
    .digest('hex')
    .slice(0, 40);
}

function destinationPath(kind, sourcePath) {
  const root = privateDirectory(kind);
  const candidate = path.resolve(
    root,
    `${MIGRATION_NAME}-${sourceKey(kind, sourcePath)}${extensionFor(sourcePath)}`
  );
  if (!isWithin(root, candidate)) {
    throw new Error('Destination de migration hors du stockage privé.');
  }
  return candidate;
}

function isCurrentPath(kind, candidate) {
  return isWithin(privateRootFor(kind), candidate);
}

function modelFor(kind) {
  return prisma[configFor(kind).model];
}

async function loadRows(kind) {
  const config = configFor(kind);
  const model = modelFor(kind);
  if (!model?.findMany) return [];

  const select = { [config.id]: true, [config.field]: true };
  const args = { select, orderBy: { [config.id]: 'asc' } };
  if (kind === 'dispute') args.where = { type: 'dispute' };
  return model.findMany(args);
}

function resultTemplate(dryRun) {
  return {
    migration: MIGRATION_NAME,
    dryRun: Boolean(dryRun),
    scanned: 0,
    migrated: 0,
    alreadyEncrypted: 0,
    skipped: 0,
    failed: 0,
    documents: 0,
    disputes: 0,
  };
}

function safeLog(logger, event) {
  if (typeof logger !== 'function') return;
  // Deliberately no path, filename, URL, user id, or exception message: the
  // migration journal must remain useful without becoming a PII side channel.
  logger({ migration: MIGRATION_NAME, ...event });
}

async function lstatIfPresent(filePath) {
  try {
    return await fs.promises.lstat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function readExisting(filePath) {
  const stat = await fs.promises.stat(filePath);
  if (!stat.isFile()) throw new Error('Le chemin ne désigne pas un fichier.');
  // Upload validation caps these formats at 5 MiB. Refuse unexpectedly huge
  // legacy objects instead of allowing an operator command to become a memory
  // exhaustion primitive.
  if (stat.size > 5 * 1024 * 1024) throw new Error('Fichier privé trop volumineux.');
  return fs.promises.readFile(filePath);
}

async function writeTarget(target, bytes) {
  const existing = await lstatIfPresent(target);
  if (existing?.isSymbolicLink()) throw new Error('Destination de migration symbolique.');
  if (existing && !existing.isFile()) throw new Error('Destination de migration invalide.');

  await fs.promises.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const tmp = `${target}.tmp-${crypto.randomBytes(8).toString('hex')}`;
  try {
    await fs.promises.writeFile(tmp, bytes, { mode: 0o600, flag: 'wx' });
    await fs.promises.rename(tmp, target);
  } finally {
    await fs.promises.unlink(tmp).catch(() => {});
  }
}

async function ensureEncryptedTarget(target, sourceBytes, sourceWasEncrypted) {
  const existing = await lstatIfPresent(target);
  if (existing?.isSymbolicLink()) throw new Error('Destination de migration symbolique.');

  if (existing) {
    if (!existing.isFile()) throw new Error('Destination de migration invalide.');
    const targetBytes = await readExisting(target);
    if (!isEncrypted(targetBytes)) {
      await writeTarget(target, encryptBuffer(sourceBytes));
      return;
    }
    // A deterministic destination makes retries safe. If an operator points
    // two rows at the same physical file, a ciphertext/content mismatch must
    // fail closed instead of silently reassigning evidence.
    const sourcePlain = sourceWasEncrypted ? decryptBuffer(sourceBytes) : sourceBytes;
    const targetPlain = decryptBuffer(targetBytes);
    if (
      !crypto.timingSafeEqual(
        crypto.createHash('sha256').update(sourcePlain).digest(),
        crypto.createHash('sha256').update(targetPlain).digest()
      )
    ) {
      throw new Error('Destination de migration différente de la source.');
    }
    return;
  }

  await writeTarget(target, sourceWasEncrypted ? sourceBytes : encryptBuffer(sourceBytes));
}

async function updateReference(kind, row, storedPath) {
  const config = configFor(kind);
  const model = modelFor(kind);
  const id = row[config.id];
  if (!model || !id) throw new Error('Référence de fichier invalide.');
  const where = { [config.id]: id };
  // Compare-and-set protects a concurrent replacement from being overwritten.
  where[config.field] = row[config.field];
  if (typeof model.updateMany === 'function') {
    const updated = await model.updateMany({ where, data: { [config.field]: storedPath } });
    if (updated && updated.count === 0) {
      // Another worker may have completed this exact migration. A later scan
      // will verify the destination; do not overwrite a changed row.
      const current =
        typeof model.findUnique === 'function'
          ? await model.findUnique({
              where: { [config.id]: id },
              select: { [config.field]: true },
            })
          : null;
      if (current?.[config.field] !== storedPath) {
        throw new Error('Référence de fichier modifiée.');
      }
    }
    return;
  }
  if (typeof model.update === 'function') {
    await model.update({ where: { [config.id]: id }, data: { [config.field]: storedPath } });
    return;
  }
  throw new Error('Modèle de fichier indisponible.');
}

async function migrateRow(kind, row, { dryRun, logger, result }) {
  const config = configFor(kind);
  const rawValue = String(row[config.field] || '').trim();
  const id = row[config.id];
  if (!rawValue) {
    result.failed += 1;
    safeLog(logger, { kind, id, outcome: 'failed' });
    return;
  }

  let lexicalPath;
  try {
    lexicalPath = resolveStoredFilePath(rawValue, kind);
  } catch {
    result.failed += 1;
    safeLog(logger, { kind, id, outcome: 'failed' });
    return;
  }

  const target = destinationPath(kind, lexicalPath);
  let existingPath = null;
  try {
    existingPath = await resolveExistingPrivateFile(rawValue, kind);
  } catch {
    // A prior run can have removed the legacy source after writing the target
    // but before updating the row. A deterministic destination makes that
    // interrupted state recoverable on the next run.
    const targetStat = await lstatIfPresent(target);
    if (!targetStat?.isFile() || targetStat.isSymbolicLink()) {
      result.failed += 1;
      safeLog(logger, { kind, id, outcome: 'failed' });
      return;
    }
    const targetBytes = await readExisting(target);
    if (!isEncrypted(targetBytes)) {
      result.failed += 1;
      safeLog(logger, { kind, id, outcome: 'failed' });
      return;
    }
    if (!dryRun) await updateReference(kind, row, storagePath(target));
    result.migrated += 1;
    safeLog(logger, { kind, id, outcome: 'recovered' });
    return;
  }

  const sourceBytes = await readExisting(existingPath);
  const sourceEncrypted = isEncrypted(sourceBytes);
  const needsMove = !isCurrentPath(kind, existingPath);
  if (sourceEncrypted && !needsMove) {
    result.alreadyEncrypted += 1;
    safeLog(logger, { kind, id, outcome: 'already-encrypted' });
    return;
  }

  if (dryRun) {
    result.migrated += 1;
    safeLog(logger, { kind, id, outcome: 'would-migrate' });
    return;
  }

  await ensureEncryptedTarget(target, sourceBytes, sourceEncrypted);

  // Remove the cleartext/legacy source before changing the DB reference. If
  // the process dies between these steps, the deterministic target above lets
  // the next invocation repair the row without serving cleartext.
  if (path.resolve(existingPath) !== path.resolve(target)) {
    const safeSource = await resolveExistingPrivateFile(existingPath, kind);
    await fs.promises.unlink(safeSource);
  }

  const persistedPath = storagePath(target);
  if (row[config.field] !== persistedPath) await updateReference(kind, row, persistedPath);
  result.migrated += 1;
  safeLog(logger, { kind, id, outcome: 'migrated' });
}

export async function scanPrivateFiles({ limit = PRIVATE_FILE_MIGRATION_BATCH } = {}) {
  const bounded = positiveLimit(limit);
  const rows = [
    ...(await loadRows('document')).map((row) => ({ kind: 'document', row })),
    ...(await loadRows('dispute')).map((row) => ({ kind: 'dispute', row })),
  ];
  rows.sort((a, b) => {
    const left = Number(a.row[KIND_CONFIG[a.kind].id]);
    const right = Number(b.row[KIND_CONFIG[b.kind].id]);
    return left - right || a.kind.localeCompare(b.kind);
  });

  const targets = [];
  for (const item of rows) {
    if (targets.length >= bounded) break;
    const config = configFor(item.kind);
    const raw = String(item.row[config.field] || '').trim();
    if (!raw) continue;
    let source;
    try {
      source = await resolveExistingPrivateFile(raw, item.kind);
    } catch {
      // Include a recoverable interrupted row when its deterministic target is
      // present; migrateRow will distinguish that from a genuinely broken row.
      try {
        const lexical = resolveStoredFilePath(raw, item.kind);
        const target = destinationPath(item.kind, lexical);
        const stat = await lstatIfPresent(target);
        if (stat?.isFile() && !stat.isSymbolicLink()) targets.push(item);
      } catch {
        // Invalid paths are reported by the actual migration run, not exposed
        // with their values in this scan result.
      }
      continue;
    }
    const bytes = await readExisting(source);
    if (!isEncrypted(bytes) || !isCurrentPath(item.kind, source)) targets.push(item);
  }
  return targets;
}

export async function countPrivateFilesToMigrate() {
  return (await scanPrivateFiles({ limit: PRIVATE_FILE_MIGRATION_BATCH })).length;
}

export async function migratePrivateFiles({
  dryRun = true,
  limit = PRIVATE_FILE_MIGRATION_BATCH,
  logger,
} = {}) {
  const result = resultTemplate(dryRun);
  const rows = await scanPrivateFiles({ limit });
  result.scanned = rows.length;

  for (const item of rows) {
    result[item.kind === 'document' ? 'documents' : 'disputes'] += 1;
    try {
      await migrateRow(item.kind, item.row, { dryRun: Boolean(dryRun), logger, result });
    } catch {
      result.failed += 1;
      safeLog(logger, {
        kind: item.kind,
        id: item.row[KIND_CONFIG[item.kind].id],
        outcome: 'failed',
      });
    }
  }

  return {
    affected: result.migrated,
    detail: result,
  };
}

export default {
  key: 'files.migrate',
  category: 'files',
  defaultSchedule: '0 3 * * 0',
  defaultEnabled: false,
  defaultDryRun: true,
  defaultParams: { limit: PRIVATE_FILE_MIGRATION_BATCH },
  maxBatch: PRIVATE_FILE_MIGRATION_BATCH,
  count: () => countPrivateFilesToMigrate(),
  targets: async ({ params }) =>
    (await scanPrivateFiles({ limit: params?.limit ?? PRIVATE_FILE_MIGRATION_BATCH })).map(
      (item) => `${item.kind}:${item.row[KIND_CONFIG[item.kind].id]}`
    ),
  run: ({ params, now }) => migratePrivateFiles({ dryRun: false, limit: params?.limit, now }),
};
