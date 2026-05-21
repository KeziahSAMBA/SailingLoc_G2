import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import {
  listMyDocuments,
  uploadMyDocument,
  deleteMyDocumentController,
  downloadDocument,
} from '../controllers/documentController.js';

// Hors du dossier servi en statique (/uploads) : les documents ne sont accessibles
// que via la route protégée GET /:id/file.
const UPLOAD_DIR = process.env.DOCUMENTS_DIR || 'storage/documents';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
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
      return res.status(status).json({ message });
    }
    next();
  });
}

const router = Router();

router.get('/', protect, requireRole('locataire', 'proprietaire'), listMyDocuments);
router.post('/', protect, requireRole('locataire', 'proprietaire'), uploadSingle, uploadMyDocument);
router.delete(
  '/:id',
  protect,
  requireRole('locataire', 'proprietaire'),
  deleteMyDocumentController
);
// Téléchargement protégé : autorisé au propriétaire du document ou à un admin
// (le contrôle d'accès est fait dans le service).
router.get('/:id/file', protect, downloadDocument);

export default router;
