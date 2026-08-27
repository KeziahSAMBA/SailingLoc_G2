import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { audit } from '../middlewares/auditMiddleware.js';
import {
  acceptsMulterMetadata,
  generatedFileName,
  inspectUploadedFile,
  privateDirectory,
} from '../utils/fileSecurity.js';
import {
  listMyDocuments,
  uploadMyDocument,
  deleteMyDocumentController,
  downloadDocument,
} from '../controllers/documentController.js';

// Hors du dossier servi en statique (/uploads) : les documents ne sont accessibles
// que via la route protégée GET /:id/file.
const UPLOAD_DIR = privateDirectory('document');
fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, generatedFileName(file.originalname, 'document')),
});

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype) && acceptsMulterMetadata(file, 'document')) {
      return cb(null, true);
    }
    cb(
      Object.assign(new Error('Format non supporté. Formats acceptés : PDF, JPG, PNG.'), {
        status: 400,
      })
    );
  },
});

// Exécute multer et transforme ses erreurs en réponses JSON propres.
function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 400 : err.status || 500;
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (max 5 Mo).' : err.message;
      return removeUploadedFiles(req).finally(() => res.status(status).json({ message }));
    }
    next();
  });
}

async function removeUploadedFiles(req) {
  const files = req.file ? [req.file] : [];
  if (req.files) files.push(...Object.values(req.files).flat());
  await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
}

// A MIME header is user-controlled.  Inspect the bytes after multer has
// finished writing, then attach a safe display name and detected MIME to the
// file object consumed by the service.
async function validateDocumentFile(req, res, next) {
  try {
    if (!req.file) return next();
    const metadata = await inspectUploadedFile(req.file, 'document');
    req.file.detectedMimeType = metadata.mimeType;
    req.file.safeOriginalName = metadata.safeName;
    return next();
  } catch (err) {
    await removeUploadedFiles(req);
    return res.status(err.status || 400).json({ message: err.message });
  }
}

const router = Router();

router.get('/', protect, requireRole('locataire', 'proprietaire'), listMyDocuments);
router.post(
  '/',
  protect,
  requireRole('locataire', 'proprietaire'),
  uploadSingle,
  validateDocumentFile,
  audit('document.upload', { meta: (req) => ({ type: req.body?.type }) }),
  uploadMyDocument
);
router.delete(
  '/:id',
  protect,
  requireRole('locataire', 'proprietaire'),
  audit('document.delete'),
  deleteMyDocumentController
);
// Téléchargement protégé : autorisé au propriétaire du document ou à un admin
// (le contrôle d'accès est fait dans le service).
router.get('/:id/file', protect, downloadDocument);

export default router;
