import fs from 'fs';
import path from 'path';

const EXTENSIONS_BY_MIME = Object.freeze({
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
});

export function extensionForMime(mimetype) {
  return EXTENSIONS_BY_MIME[mimetype] || null;
}

export function resolvePathInside(rootDirectory, candidatePath) {
  if (!candidatePath || typeof candidatePath !== 'string') return null;
  const root = path.resolve(rootDirectory);
  const absolutePath = path.resolve(candidatePath);
  const relativePath = path.relative(root, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return absolutePath;
}

export function fileMatchesMime(buffer, mimetype) {
  if (!Buffer.isBuffer(buffer)) return false;

  if (mimetype === 'application/pdf') {
    return buffer.length >= 5 && buffer.subarray(0, 5).equals(Buffer.from('%PDF-'));
  }
  if (mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(signature);
  }
  if (mimetype === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

function uploadedFiles(req) {
  if (req.file) return [req.file];
  if (Array.isArray(req.files)) return req.files;
  if (req.files && typeof req.files === 'object') return Object.values(req.files).flat();
  return [];
}

export function removeUploadedFiles(req) {
  return Promise.all(
    uploadedFiles(req).map((file) => fs.promises.unlink(file.path).catch(() => undefined))
  );
}

// Multer vérifie uniquement le type déclaré dans la requête. Cette seconde
// vérification lit la signature réelle du fichier avant tout traitement métier.
export async function validateUploadedFileContents(req, res, next) {
  const files = uploadedFiles(req);

  try {
    await Promise.all(
      files.map(async (file) => {
        const handle = await fs.promises.open(file.path, 'r');
        try {
          const header = Buffer.alloc(16);
          const { bytesRead } = await handle.read(header, 0, header.length, 0);
          if (!fileMatchesMime(header.subarray(0, bytesRead), file.mimetype)) {
            throw new Error('FILE_SIGNATURE_MISMATCH');
          }
        } finally {
          await handle.close();
        }
      })
    );
    next();
  } catch {
    await removeUploadedFiles(req);
    res.status(400).json({ message: 'Le contenu du fichier ne correspond pas au format annoncé.' });
  }
}
