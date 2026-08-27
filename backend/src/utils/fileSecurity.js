import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Uploads are deliberately described in one place.  Multer's `mimetype` and
// the extension supplied by a browser are only hints and can both be forged;
// the route middleware calls inspectUploadedFile after the file has been
// written, so the bytes are checked before a database row is created.
export const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_AVATAR_SIZE = 3 * 1024 * 1024;

const TYPES = Object.freeze({
  pdf: Object.freeze({
    mimeType: 'application/pdf',
    extensions: Object.freeze(['.pdf']),
  }),
  jpeg: Object.freeze({
    mimeType: 'image/jpeg',
    extensions: Object.freeze(['.jpg', '.jpeg']),
  }),
  png: Object.freeze({
    mimeType: 'image/png',
    extensions: Object.freeze(['.png']),
  }),
  webp: Object.freeze({
    mimeType: 'image/webp',
    extensions: Object.freeze(['.webp']),
  }),
});

const DOCUMENT_KEYS = Object.freeze(['pdf', 'jpeg', 'png']);
const IMAGE_KEYS = Object.freeze(['jpeg', 'png', 'webp']);

function allowedKeys(kind) {
  if (kind === 'document') return DOCUMENT_KEYS;
  if (kind === 'image' || kind === 'avatar' || kind === 'dispute') return IMAGE_KEYS;
  throw new Error(`Type de fichier inconnu : ${kind}`);
}

export function isWithin(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

const cwd = () => process.cwd();
const uploadsRoot = () => path.resolve(cwd(), process.env.UPLOADS_DIR || 'uploads');

export function documentsRoot() {
  return path.resolve(cwd(), process.env.DOCUMENTS_DIR || path.join('storage', 'documents'));
}

export function disputesRoot() {
  return path.resolve(cwd(), process.env.DISPUTES_DIR || path.join('storage', 'disputes'));
}

export function publicUploadsRoot() {
  return uploadsRoot();
}

export function legacyDocumentsRoot() {
  return path.join(uploadsRoot(), 'documents');
}

export function legacyDisputesRoot() {
  return path.join(uploadsRoot(), 'disputes');
}

export function privateRootFor(kind) {
  if (kind === 'document') return documentsRoot();
  if (kind === 'dispute') return disputesRoot();
  throw new Error(`Type privé inconnu : ${kind}`);
}

function rootCandidates(kind) {
  if (kind === 'document') return [documentsRoot(), legacyDocumentsRoot()];
  if (kind === 'dispute') return [disputesRoot(), legacyDisputesRoot()];
  throw new Error(`Type privé inconnu : ${kind}`);
}

function publicRootFor(kind) {
  if (kind === 'boat' || kind === 'boats') return path.join(uploadsRoot(), 'boats');
  if (kind === 'avatar' || kind === 'avatars') return path.join(uploadsRoot(), 'avatars');
  throw new Error(`Type public inconnu : ${kind}`);
}

function extensionForKey(key) {
  return key === 'jpeg' ? '.jpg' : `.${key}`;
}

function keyForMetadata(originalName, mimeType, kind) {
  const ext = path.extname(String(originalName || '')).toLowerCase();
  const key = allowedKeys(kind).find(
    (candidate) =>
      TYPES[candidate].mimeType === mimeType && TYPES[candidate].extensions.includes(ext)
  );
  return key || null;
}

function keyForMagic(header) {
  if (header.length >= 5 && header.subarray(0, 5).equals(Buffer.from('%PDF-'))) return 'pdf';
  if (
    header.length >= 8 &&
    header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'jpeg';
  }
  if (
    header.length >= 12 &&
    header.subarray(0, 4).equals(Buffer.from('RIFF')) &&
    header.subarray(8, 12).equals(Buffer.from('WEBP'))
  ) {
    return 'webp';
  }
  return null;
}

function maxSizeFor(kind) {
  return kind === 'avatar'
    ? MAX_AVATAR_SIZE
    : kind === 'document'
      ? MAX_DOCUMENT_SIZE
      : MAX_IMAGE_SIZE;
}

function badFile(message) {
  return Object.assign(new Error(message), { status: 400, code: 'INVALID_FILE' });
}

// Read only the bytes required to identify the supported formats.  Keeping the
// probe small avoids accepting a large untrusted upload merely to inspect it.
async function readHeader(filePath) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(16);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return header.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function sanitizedStem(name) {
  const input = path.basename(String(name || 'fichier')).normalize('NFKC');
  // Unicode category Cc covers ASCII controls (including NUL, CR/LF and DEL)
  // without triggering eslint's no-control-regex rule.
  const withoutControls = input.replace(/\p{Cc}/gu, '');
  const stem = path
    .basename(withoutControls, path.extname(withoutControls))
    .replace(/[\\/]/g, '_')
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+$/, '');
  return stem.slice(0, 220) || 'fichier';
}

export function safeDisplayName(originalName, keyOrMime) {
  const key = TYPES[keyOrMime]
    ? keyOrMime
    : Object.keys(TYPES).find((candidate) => TYPES[candidate].mimeType === keyOrMime);
  return `${sanitizedStem(originalName)}${extensionForKey(key || 'bin').replace('.bin', '')}`;
}

export function mimeTypeForFileName(fileName) {
  const ext = path.extname(String(fileName || '')).toLowerCase();
  const key = Object.keys(TYPES).find((candidate) => TYPES[candidate].extensions.includes(ext));
  return key ? TYPES[key].mimeType : 'application/octet-stream';
}

export function generatedFileName(originalName, kind) {
  const ext = path.extname(String(originalName || '')).toLowerCase();
  const key = allowedKeys(kind).find((candidate) => TYPES[candidate].extensions.includes(ext));
  // The middleware will reject an unsupported extension before this is used.
  // A neutral suffix keeps an error path from ever reintroducing user input.
  const suffix = key ? extensionForKey(key) : '.bin';
  return `${crypto.randomBytes(24).toString('hex')}${suffix}`;
}

export function storagePath(filePath) {
  const absolute = path.resolve(String(filePath));
  const relative = path.relative(cwd(), absolute);
  // Relative paths keep existing deployments readable.  A separately mounted
  // private volume may legitimately live outside cwd; retain its absolute
  // path in the database (it is never exposed in API responses) and still
  // validate it against the configured private root on every read.
  if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return absolute.split(path.sep).join('/');
  }
  return relative.split(path.sep).join('/');
}

export function expectedMimeTypes(kind) {
  return allowedKeys(kind).map((key) => TYPES[key].mimeType);
}

export function expectedExtensions(kind) {
  return allowedKeys(kind).flatMap((key) => TYPES[key].extensions);
}

// Multer's `fileFilter` is intentionally only a fast first gate.  This second
// gate verifies extension + declared MIME + magic bytes after the stream was
// persisted.  It rejects SVG, HTML, GIF and all other active/unsupported
// formats, including files with a mismatched extension.
export async function inspectUploadedFile(file, kind) {
  if (!file?.path) throw badFile('Fichier absent.');
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > maxSizeFor(kind)) {
    throw badFile(
      `Fichier trop volumineux (max ${Math.round(maxSizeFor(kind) / 1024 / 1024)} Mo).`
    );
  }

  const originalName = String(file.originalname || '');
  const extension = path.extname(originalName).toLowerCase();
  const declaredKey = keyForMetadata(originalName, String(file.mimetype || '').toLowerCase(), kind);
  if (!declaredKey) {
    throw badFile('Le type MIME et l’extension du fichier ne correspondent pas.');
  }

  let header;
  try {
    header = await readHeader(file.path);
  } catch {
    throw badFile('Fichier illisible.');
  }
  const actualKey = keyForMagic(header);
  if (!actualKey || !allowedKeys(kind).includes(actualKey) || actualKey !== declaredKey) {
    throw badFile('Le contenu du fichier ne correspond pas à son type annoncé.');
  }

  return {
    key: actualKey,
    mimeType: TYPES[actualKey].mimeType,
    extension,
    safeName: safeDisplayName(originalName, actualKey),
    storedName: generatedFileName(originalName, kind),
  };
}

// Fast check used by multer before writing to disk.  Byte validation still runs
// in inspectUploadedFile and is therefore mandatory.
export function acceptsMulterMetadata(file, kind) {
  return Boolean(keyForMetadata(file?.originalname, file?.mimetype, kind));
}

function candidateFromStoredValue(storedValue, kind) {
  const raw = String(storedValue || '').trim();
  if (!raw) throw new Error('Chemin de fichier absent.');

  let pathname = raw;
  try {
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) pathname = new URL(raw).pathname;
  } catch {
    throw new Error('Chemin de fichier invalide.');
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new Error('Chemin de fichier invalide.');
  }
  decoded = decoded.replace(/\\/g, '/');

  for (const root of rootCandidates(kind)) {
    const rootAbs = path.resolve(root);
    const normalized = decoded.replace(/^\/+/, '');
    const rootRelative = path.relative(cwd(), rootAbs).replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized === rootRelative || normalized.startsWith(`${rootRelative}/`)) {
      const candidate = path.resolve(cwd(), normalized);
      if (isWithin(rootAbs, candidate)) return candidate;
    }
    // Legacy rows stored an absolute URL ending in /uploads/disputes/… or
    // /uploads/documents/….  Only the basename is accepted; nested traversal
    // and arbitrary paths cannot be mapped into the private root.
    const legacySegment = kind === 'document' ? '/uploads/documents/' : '/uploads/disputes/';
    const marker = normalized.toLowerCase().indexOf(legacySegment.slice(1));
    if (marker >= 0) {
      const suffix = normalized.slice(marker + legacySegment.length - 1);
      if (suffix && !suffix.includes('/') && !suffix.includes('..')) {
        const legacyRoot = kind === 'document' ? legacyDocumentsRoot() : legacyDisputesRoot();
        const candidate = path.resolve(legacyRoot, suffix);
        if (isWithin(legacyRoot, candidate)) return candidate;
      }
    }
    // Relative values such as storage/documents/a.pdf are common in existing
    // rows.  Resolve them normally, then require the result to be inside this
    // kind's root.
    const candidate = path.resolve(cwd(), decoded);
    if (isWithin(rootAbs, candidate)) return candidate;

    // Configured private roots can be mounted outside cwd. On POSIX, stripping
    // the leading slash above would otherwise turn `/srv/private/a.pdf` into a
    // cwd-relative path; retain absolute values when they are supplied.
    if (path.isAbsolute(decoded)) {
      const absoluteCandidate = path.resolve(decoded);
      if (isWithin(rootAbs, absoluteCandidate)) return absoluteCandidate;
    }
  }
  throw new Error('Chemin de fichier hors du stockage privé.');
}

export function resolveStoredFilePath(storedValue, kind) {
  return candidateFromStoredValue(storedValue, kind);
}

export async function resolveExistingPrivateFile(storedValue, kind) {
  const candidate = resolveStoredFilePath(storedValue, kind);
  const realPath = await fs.promises.realpath(candidate);
  if (!rootCandidates(kind).some((root) => isWithin(root, realPath))) {
    throw new Error('Le fichier réel est hors du stockage privé.');
  }
  const stat = await fs.promises.stat(realPath);
  if (!stat.isFile()) throw new Error('Le chemin ne désigne pas un fichier.');
  return realPath;
}

function candidateFromPublicStoredValue(storedValue, kind) {
  const raw = String(storedValue || '').trim();
  if (!raw) throw new Error('Chemin de fichier absent.');

  let pathname = raw;
  try {
    if (/^[a-z][a-z\d+.-]*:\/\//i.test(raw)) pathname = new URL(raw).pathname;
  } catch {
    throw new Error('Chemin de fichier invalide.');
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    throw new Error('Chemin de fichier invalide.');
  }
  decoded = decoded.replace(/\\/g, '/');

  const root = publicRootFor(kind);
  const rootAbs = path.resolve(root);
  const normalized = decoded.replace(/^\/+/, '');
  const rootRelative = path.relative(cwd(), rootAbs).replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized === rootRelative || normalized.startsWith(`${rootRelative}/`)) {
    const candidate = path.resolve(cwd(), normalized);
    if (isWithin(rootAbs, candidate)) return candidate;
  }

  // Existing rows contain absolute APP_URL values. Only a single basename
  // below the expected `/uploads/{boats|avatars}/` segment is accepted; this
  // deliberately rejects nested paths and traversal attempts.
  const segment = `/uploads/${kind === 'boat' || kind === 'boats' ? 'boats' : 'avatars'}/`;
  const marker = normalized.toLowerCase().indexOf(segment.slice(1));
  if (marker >= 0) {
    const suffix = normalized.slice(marker + segment.length - 1);
    if (suffix && !suffix.includes('/') && !suffix.includes('..')) {
      const candidate = path.resolve(rootAbs, suffix);
      if (isWithin(rootAbs, candidate)) return candidate;
    }
  }

  // Configured roots may be absolute (particularly on Windows and in a
  // separately mounted volume). Do not reinterpret those as cwd-relative.
  if (path.isAbsolute(decoded)) {
    const candidate = path.resolve(decoded);
    if (isWithin(rootAbs, candidate)) return candidate;
  }
  throw new Error('Chemin de fichier hors du stockage public.');
}

export function resolveStoredPublicFilePath(storedValue, kind) {
  return candidateFromPublicStoredValue(storedValue, kind);
}

export async function resolveExistingPublicFile(storedValue, kind) {
  const candidate = resolveStoredPublicFilePath(storedValue, kind);
  const realPath = await fs.promises.realpath(candidate);
  const root = publicRootFor(kind);
  if (!isWithin(root, realPath)) {
    throw new Error('Le fichier réel est hors du stockage public.');
  }
  const stat = await fs.promises.stat(realPath);
  if (!stat.isFile()) throw new Error('Le chemin ne désigne pas un fichier.');
  return realPath;
}

export function privateDirectory(kind) {
  const root = privateRootFor(kind);
  // A deployment may mount private storage outside the application working
  // directory, but it must never be configured below the public uploads root.
  if (isWithin(uploadsRoot(), root)) throw new Error('Répertoire privé invalide.');
  return root;
}

export function isLegacyPrivatePath(storedValue, kind) {
  try {
    const candidate = resolveStoredFilePath(storedValue, kind);
    return isWithin(kind === 'document' ? legacyDocumentsRoot() : legacyDisputesRoot(), candidate);
  } catch {
    return false;
  }
}
