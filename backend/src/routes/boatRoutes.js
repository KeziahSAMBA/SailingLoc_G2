import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { optionalProtect, protect, requireRole } from '../middlewares/authMiddleware.js';
import { audit } from '../middlewares/auditMiddleware.js';
import { bookingCreateLimiter, uploadLimiter } from '../middlewares/abuseProtection.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';
import {
  acceptsMulterMetadata,
  generatedFileName,
  inspectUploadedFile,
  privateDirectory,
  resolveExistingUploadedFile,
} from '../utils/fileSecurity.js';
import {
  uploadBoat,
  putBoat,
  removeBoat,
  getBoats,
  getBoatsByType,
  createBookingController,
} from '../controllers/boatController.js';
import { getBoatReviews } from '../controllers/reviewController.js';

// Photos servies en statique via /uploads : on garde l'extension d'origine
// pour que le navigateur reçoive le bon type MIME. L'acte de francisation, lui, est
// un document sensible : stockée hors du dossier statique et servie uniquement
// par la route protégée GET /api/documents/:id/file.
const IMAGES_DIR = path.resolve(process.env.UPLOADS_DIR || 'uploads', 'boats');
const DOCUMENTS_DIR = privateDirectory('document');
fs.mkdirSync(IMAGES_DIR, { recursive: true, mode: 0o755 });
fs.mkdirSync(DOCUMENTS_DIR, { recursive: true, mode: 0o700 });

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, file.fieldname === 'acte_francisation' ? DOCUMENTS_DIR : IMAGES_DIR),
  filename: (req, file, cb) =>
    cb(
      null,
      generatedFileName(
        file.originalname,
        file.fieldname === 'acte_francisation' ? 'document' : 'image'
      )
    ),
});

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 6,
    fields: 25,
    fieldSize: 16 * 1024,
    parts: 35,
    headerPairs: 200,
  }, // 5 Mo par fichier, 5 photos + 1 acte de francisation
  fileFilter: (req, file, cb) => {
    const kind = file.fieldname === 'acte_francisation' ? 'document' : 'image';
    const allowed = file.fieldname === 'acte_francisation' ? DOCUMENT_MIME : IMAGE_MIME;
    if (allowed.includes(file.mimetype) && acceptsMulterMetadata(file, kind)) return cb(null, true);
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
async function removeUploadedFiles(req) {
  const files = Object.values(req.files || {}).flat();
  await Promise.all(
    files.map(async (file) => {
      const kind = file.fieldname === 'acte_francisation' ? 'document' : 'image';
      try {
        const safePath = await resolveExistingUploadedFile(file, kind);
        await fs.promises.unlink(safePath);
      } catch {
        // Best-effort cleanup must not change the response contract.
      }
    })
  );
}

async function validateBoatFiles(req, res, next) {
  const images = req.files?.images || [];
  const acte = req.files?.acte_francisation?.[0];
  try {
    for (const file of images) {
      const metadata = await inspectUploadedFile(file, 'image');
      file.detectedMimeType = metadata.mimeType;
      file.safeOriginalName = metadata.safeName;
    }
    if (acte) {
      const metadata = await inspectUploadedFile(acte, 'document');
      acte.detectedMimeType = metadata.mimeType;
      acte.safeOriginalName = metadata.safeName;
    }
    return next();
  } catch (err) {
    await removeUploadedFiles(req);
    return sendError(res, err.status ? err : Object.assign(err, { status: 400 }));
  }
}

function uploadFiles(req, res, next) {
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'acte_francisation', maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      const status = [
        'LIMIT_FILE_SIZE',
        'LIMIT_FILE_COUNT',
        'LIMIT_FIELD_SIZE',
        'LIMIT_FIELD_COUNT',
        'LIMIT_PART_COUNT',
        'LIMIT_HEADER_COUNT',
        'LIMIT_UNEXPECTED_FILE',
      ].includes(err.code)
        ? 400
        : err.status || 500;
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (max 5 Mo).' : err.message;
      return removeUploadedFiles(req).finally(() =>
        sendError(res, Object.assign(err, { status }), { message })
      );
    }
    next();
  });
}

const router = Router();

router.get('/by-type', getBoatsByType);
router.get('/', getBoats);
router.get('/:id_boat/reviews', optionalProtect, getBoatReviews);
// `audit` est placé après `uploadFiles` : multer doit avoir rempli req.body.
router.post(
  '/',
  protect,
  requireRole('proprietaire', 'admin'),
  uploadLimiter,
  uploadFiles,
  validateBoatFiles,
  audit('boat.create', { meta: (req) => ({ name: req.body?.name, type: req.body?.type }) }),
  uploadBoat
);
router.post(
  '/:id_boat/bookings',
  protect,
  requireRole('locataire'),
  bookingCreateLimiter,
  audit('booking.create', {
    targetType: 'booking',
    meta: (req) => ({
      id_boat: req.params.id_boat,
      start_date: req.body?.start_date,
      end_date: req.body?.end_date,
    }),
  }),
  createBookingController
);
router.put(
  '/:id_boat',
  protect,
  requireRole('proprietaire'),
  uploadLimiter,
  uploadFiles,
  validateBoatFiles,
  audit('boat.update', {
    targetId: (req) => req.params.id_boat,
    meta: (req) => ({ name: req.body?.name, status: req.body?.status }),
  }),
  putBoat
);
router.delete(
  '/:id_boat',
  protect,
  requireRole('proprietaire'),
  audit('boat.delete', { targetId: (req) => req.params.id_boat }),
  removeBoat
);

export default router;
