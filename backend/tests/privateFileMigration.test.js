import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';

const db = {
  document: { findMany: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
  image: { findMany: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
};

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { migratePrivateFiles } = await import('../src/services/privateFileMigrationService.js');
const { encryptBuffer, isEncrypted, readDecrypted } = await import('../src/utils/fileCrypto.js');

const TEST_KEY = 'c'.repeat(64);
let tmpDir;
let previousEnvironment;
let documentRow;

function privatePath(kind, name) {
  return path.join(tmpDir, 'private', kind === 'document' ? 'documents' : 'disputes', name);
}

function legacyPath(kind, name) {
  return path.join(tmpDir, 'uploads', kind === 'document' ? 'documents' : 'disputes', name);
}

function migrationTarget(kind, source) {
  const key = crypto
    .createHash('sha256')
    .update(`private-files-aes-gcm-v1:${kind}:${path.resolve(source)}`)
    .digest('hex')
    .slice(0, 40);
  return privatePath(kind, `private-files-aes-gcm-v1-${key}${path.extname(source)}`);
}

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'private-file-migration-'));
  previousEnvironment = {
    NODE_ENV: process.env.NODE_ENV,
    FILE_ENCRYPTION_KEY: process.env.FILE_ENCRYPTION_KEY,
    UPLOADS_DIR: process.env.UPLOADS_DIR,
    DOCUMENTS_DIR: process.env.DOCUMENTS_DIR,
    DISPUTES_DIR: process.env.DISPUTES_DIR,
    ALLOW_LEGACY_CLEAR_FILE_READ: process.env.ALLOW_LEGACY_CLEAR_FILE_READ,
  };
  process.env.NODE_ENV = 'test';
  process.env.FILE_ENCRYPTION_KEY = TEST_KEY;
  process.env.UPLOADS_DIR = path.join(tmpDir, 'uploads');
  process.env.DOCUMENTS_DIR = path.join(tmpDir, 'private', 'documents');
  process.env.DISPUTES_DIR = path.join(tmpDir, 'private', 'disputes');
  delete process.env.ALLOW_LEGACY_CLEAR_FILE_READ;
});

afterAll(() => {
  for (const [key, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  jest.clearAllMocks();
  documentRow = null;
  db.document.findMany.mockImplementation(async () => (documentRow ? [{ ...documentRow }] : []));
  db.image.findMany.mockResolvedValue([]);
  db.document.updateMany.mockImplementation(async ({ where, data }) => {
    if (
      documentRow &&
      documentRow.id_document === where.id_document &&
      documentRow.file_url === where.file_url
    ) {
      documentRow = { ...documentRow, ...data };
      return { count: 1 };
    }
    return { count: 0 };
  });
});

describe('private file migration', () => {
  it('dry-run reports legacy cleartext without writing or changing references', async () => {
    const source = legacyPath('document', 'legacy.pdf');
    const plain = Buffer.from('%PDF-1.7\nlegacy evidence');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, plain);
    documentRow = { id_document: 10, file_url: source };

    const outcome = await migratePrivateFiles({ dryRun: true, limit: 10 });

    expect(outcome.detail).toMatchObject({
      scanned: 1,
      migrated: 1,
      documents: 1,
      failed: 0,
    });
    expect(fs.readFileSync(source).equals(plain)).toBe(true);
    expect(db.document.updateMany).not.toHaveBeenCalled();
    expect(fs.existsSync(process.env.DOCUMENTS_DIR)).toBe(false);
  });

  it('encrypts, moves and safely resumes an interrupted-free migration idempotently', async () => {
    const source = legacyPath('document', 'resume.pdf');
    const plain = Buffer.from('%PDF-1.7\nresume evidence');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, plain);
    documentRow = { id_document: 11, file_url: source };

    const first = await migratePrivateFiles({ dryRun: false, limit: 10 });
    const persistedPath = db.document.updateMany.mock.calls[0][0].data.file_url;
    const target = path.resolve(persistedPath);

    expect(first.detail).toMatchObject({ scanned: 1, migrated: 1, failed: 0 });
    expect(fs.existsSync(source)).toBe(false);
    expect(isEncrypted(fs.readFileSync(target))).toBe(true);
    expect((await readDecrypted(target)).equals(plain)).toBe(true);

    db.document.updateMany.mockClear();
    const second = await migratePrivateFiles({ dryRun: false, limit: 10 });

    expect(second.detail).toMatchObject({ scanned: 0, migrated: 0, failed: 0 });
    expect(db.document.updateMany).not.toHaveBeenCalled();
    expect(fs.existsSync(target)).toBe(true);
  });

  it('copie directement une source chiffrée sur une cible plaintext existante', async () => {
    const source = legacyPath('document', 'encrypted-source.pdf');
    const target = migrationTarget('document', source);
    const plain = Buffer.from('%PDF-1.7\nencrypted source');
    const encrypted = encryptBuffer(plain);
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(source, encrypted);
    fs.writeFileSync(target, Buffer.from('%PDF-1.7\nstale plaintext'));
    documentRow = { id_document: 15, file_url: source };

    const outcome = await migratePrivateFiles({ dryRun: false, limit: 10 });

    expect(outcome.detail).toMatchObject({ migrated: 1, failed: 0 });
    expect(fs.readFileSync(target).equals(encrypted)).toBe(true);
    expect((await readDecrypted(target)).equals(plain)).toBe(true);
    expect(fs.existsSync(source)).toBe(false);
  });

  it('accepte une cible déjà chiffrée ayant le même contenu', async () => {
    const source = legacyPath('document', 'encrypted-retry.pdf');
    const target = migrationTarget('document', source);
    const plain = Buffer.from('%PDF-1.7\nsame evidence');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(source, encryptBuffer(plain));
    fs.writeFileSync(target, encryptBuffer(plain));
    documentRow = { id_document: 16, file_url: source };

    const outcome = await migratePrivateFiles({ dryRun: false, limit: 10 });

    expect(outcome.detail).toMatchObject({ migrated: 1, failed: 0 });
    expect((await readDecrypted(target)).equals(plain)).toBe(true);
    expect(fs.existsSync(source)).toBe(false);
  });

  it('reprend après une interruption survenue après écriture et suppression', async () => {
    const source = legacyPath('document', 'interrupted.pdf');
    const target = migrationTarget('document', source);
    const plain = Buffer.from('%PDF-1.7\ninterrupted evidence');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, encryptBuffer(plain));
    documentRow = { id_document: 17, file_url: source };
    db.document.updateMany.mockRejectedValueOnce(new Error('interruption'));

    const first = await migratePrivateFiles({ dryRun: false, limit: 10 });
    expect(first.detail).toMatchObject({ migrated: 0, failed: 1 });
    expect(fs.existsSync(source)).toBe(false);
    expect((await readDecrypted(target)).equals(plain)).toBe(true);

    const second = await migratePrivateFiles({ dryRun: false, limit: 10 });
    expect(second.detail).toMatchObject({ migrated: 1, failed: 0 });
    expect(path.resolve(documentRow.file_url)).toBe(path.resolve(target));
    expect((await readDecrypted(target)).equals(plain)).toBe(true);
  });

  it('refuses an unencrypted private file in production by default', async () => {
    const source = privatePath('document', 'still-clear.pdf');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, Buffer.from('%PDF-1.7\nnot migrated'));

    const previousNodeEnv = process.env.NODE_ENV;
    const previousSwitch = process.env.ALLOW_LEGACY_CLEAR_FILE_READ;
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_LEGACY_CLEAR_FILE_READ;
    try {
      await expect(readDecrypted(source)).rejects.toMatchObject({
        code: 'LEGACY_CLEAR_FILE',
        status: 503,
      });
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      if (previousSwitch === undefined) delete process.env.ALLOW_LEGACY_CLEAR_FILE_READ;
      else process.env.ALLOW_LEGACY_CLEAR_FILE_READ = previousSwitch;
    }
  });

  it('reports an oversized source as failed without reading it into memory', async () => {
    const source = legacyPath('document', 'too-large.pdf');
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, Buffer.alloc(5 * 1024 * 1024 + 1));
    documentRow = { id_document: 12, file_url: source };

    const outcome = await migratePrivateFiles({ dryRun: false, limit: 10 });

    expect(outcome.detail).toMatchObject({ scanned: 1, migrated: 0, failed: 1 });
    expect(fs.existsSync(source)).toBe(true);
    expect(db.document.updateMany).not.toHaveBeenCalled();
  });

  it('reports a symbolic source as failed and never follows it', async () => {
    const outside = path.join(tmpDir, 'outside.pdf');
    const source = legacyPath('document', 'symbolic.pdf');
    fs.writeFileSync(outside, Buffer.from('%PDF-1.7\noutside'));
    fs.mkdirSync(path.dirname(source), { recursive: true });
    try {
      fs.symlinkSync(outside, source);
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error?.code)) return;
      throw error;
    }
    documentRow = { id_document: 13, file_url: source };

    const outcome = await migratePrivateFiles({ dryRun: false, limit: 10 });

    expect(outcome.detail).toMatchObject({ scanned: 1, migrated: 0, failed: 1 });
    expect(fs.existsSync(outside)).toBe(true);
    expect(db.document.updateMany).not.toHaveBeenCalled();
  });

  it('ne lit ni ne supprime la cible réelle d’un lien symbolique interne', async () => {
    const target = legacyPath('document', 'internal-target.pdf');
    const source = legacyPath('document', 'internal-link.pdf');
    const plain = Buffer.from('%PDF-1.7\ninternal target');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, plain);
    try {
      fs.symlinkSync(target, source);
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error?.code)) return;
      throw error;
    }
    documentRow = { id_document: 14, file_url: source };

    const outcome = await migratePrivateFiles({ dryRun: false, limit: 10 });

    expect(outcome.detail).toMatchObject({ scanned: 1, migrated: 0, failed: 1 });
    expect(fs.lstatSync(source).isSymbolicLink()).toBe(true);
    expect(fs.readFileSync(target).equals(plain)).toBe(true);
    expect(db.document.updateMany).not.toHaveBeenCalled();
  });
});
