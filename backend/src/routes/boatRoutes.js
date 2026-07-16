import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import {
  uploadBoat,
  putBoat,
  removeBoat,
  getBoats,
  getBoatsByType,
  createBookingController,
} from '../controllers/boatController.js';

// Photos servies en statique via /uploads : on garde l'extension d'origine
// pour que le navigateur reçoive le bon type MIME. L'acte de francisation, lui, est
// un document sensible : stockée hors du dossier statique et servie uniquement
// par la route protégée GET /api/documents/:id/file.
const IMAGES_DIR = 'uploads/boats';
const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || 'storage/documents';
fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, file.fieldname === 'acte_francisation' ? DOCUMENTS_DIR : IMAGES_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 }, // 5 Mo par fichier, 5 photos + 1 acte de francisation
  fileFilter: (req, file, cb) => {
    const allowed = file.fieldname === 'acte_francisation' ? DOCUMENT_MIME : IMAGE_MIME;
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(
      Object.assign(
        new Error(
          file.fieldname === 'acte_francisation'
            ? "Format d'acte de francisation non supporté. Formats acceptés : PDF, JPG, PNG."
            : 'Format non supporté. Formats acceptés : JPG, PNG, WebP.'
        ),
        { status: 400 }
      )
    );
  },
});

// Exécute multer et transforme ses erreurs en réponses JSON propres.
function uploadFiles(req, res, next) {
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'acte_francisation', maxCount: 1 },
  ])(req, res, (err) => {
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

router.get('/by-type', getBoatsByType);
router.get('/', getBoats);
router.post('/', protect, requireRole('proprietaire', 'admin'), uploadFiles, uploadBoat);
router.post('/:id_boat/bookings', protect, requireRole('locataire'), createBookingController);
router.put('/:id_boat', protect, requireRole('proprietaire'), uploadFiles, putBoat);
router.delete('/:id_boat', protect, requireRole('proprietaire'), removeBoat);

export default router;
