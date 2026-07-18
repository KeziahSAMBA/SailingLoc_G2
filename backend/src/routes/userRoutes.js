import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  register,
  login,
  refresh,
  logout,
  me,
  updateMe,
  changeMyPassword,
  confirmEmail,
  resend,
  forgotPassword,
  resetPassword,
  verifyResetToken,
  patchMyAvatar,
  deleteMyAvatar,
} from '../controllers/userController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import {
  getDashboard,
  getMyBookings,
  payMyBooking,
  cancelMyBooking,
  requestMyRefund,
  reportMyDispute,
  getMyFavorites,
  postFavorite,
  deleteFavorite,
} from '../controllers/locataireController.js';
import {
  getDashboard as getProprietaireDashboard,
  getMyBoat as getProprietaireBoat,
  getMyBoats as getProprietaireBoats,
  getMyBookings as getProprietaireBookings,
  getMyPayments as getProprietairePayments,
  patchBooking as patchProprietaireBooking,
  reportBookingDispute as reportProprietaireDispute,
} from '../controllers/proprietaireController.js';

// Photos de profil : servies en statique via /uploads (visibles dans le header
// et la messagerie), extension conservée pour le bon type MIME.
const AVATARS_DIR = 'uploads/avatars';
fs.mkdirSync(AVATARS_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 Mo
  fileFilter: (req, file, cb) => {
    if (AVATAR_MIME.includes(file.mimetype)) return cb(null, true);
    cb(
      Object.assign(new Error('Format non supporté. Formats acceptés : JPG, PNG, WebP.'), {
        status: 400,
      })
    );
  },
});

// Exécute multer et transforme ses erreurs en réponses JSON propres.
function uploadAvatar(req, res, next) {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      const status = err.code === 'LIMIT_FILE_SIZE' ? 400 : err.status || 500;
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Image trop volumineuse (max 3 Mo).' : err.message;
      return res.status(status).json({ message });
    }
    next();
  });
}

// Photos jointes à un litige : statiques via /uploads, comme les photos de bateaux.
const DISPUTES_DIR = 'uploads/disputes';
fs.mkdirSync(DISPUTES_DIR, { recursive: true });

const disputeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DISPUTES_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (AVATAR_MIME.includes(file.mimetype)) return cb(null, true);
    cb(
      Object.assign(new Error('Format non supporté. Formats acceptés : JPG, PNG, WebP.'), {
        status: 400,
      })
    );
  },
});

function uploadDisputePhotos(req, res, next) {
  disputeUpload.array('photos', 5)(req, res, (err) => {
    if (err) {
      const status = ['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(
        err.code
      )
        ? 400
        : err.status || 500;
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Photo trop volumineuse (max 5 Mo).'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
            ? '5 photos maximum.'
            : err.message;
      return res.status(status).json({ message });
    }
    next();
  });
}

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/resend-verification', resend);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/reset-password/:token', verifyResetToken);
router.get('/verify-email/:token', confirmEmail);
router.get('/me', protect, me);
router.patch('/me', protect, updateMe);
router.patch('/me/password', protect, changeMyPassword);
router.patch('/me/avatar', protect, uploadAvatar, patchMyAvatar);
router.delete('/me/avatar', protect, deleteMyAvatar);
router.get('/me/dashboard', protect, requireRole('locataire'), getDashboard);
router.get(
  '/me/proprietaire/dashboard',
  protect,
  requireRole('proprietaire'),
  getProprietaireDashboard
);
router.get(
  '/me/proprietaire/bookings',
  protect,
  requireRole('proprietaire'),
  getProprietaireBookings
);
router.patch(
  '/me/proprietaire/bookings/:id_booking',
  protect,
  requireRole('proprietaire'),
  patchProprietaireBooking
);
router.post(
  '/me/proprietaire/bookings/:id_booking/dispute',
  protect,
  requireRole('proprietaire'),
  uploadDisputePhotos,
  reportProprietaireDispute
);
router.get(
  '/me/proprietaire/payments',
  protect,
  requireRole('proprietaire'),
  getProprietairePayments
);
router.get('/me/proprietaire/boats', protect, requireRole('proprietaire'), getProprietaireBoats);
router.get(
  '/me/proprietaire/boats/:id_boat',
  protect,
  requireRole('proprietaire'),
  getProprietaireBoat
);
router.get('/me/bookings', protect, requireRole('locataire'), getMyBookings);
router.post('/me/bookings/:id_booking/pay', protect, requireRole('locataire'), payMyBooking);
router.post('/me/bookings/:id_booking/cancel', protect, requireRole('locataire'), cancelMyBooking);
router.post(
  '/me/bookings/:id_booking/refund-request',
  protect,
  requireRole('locataire'),
  requestMyRefund
);
router.post(
  '/me/bookings/:id_booking/dispute',
  protect,
  requireRole('locataire'),
  uploadDisputePhotos,
  reportMyDispute
);
router.get('/me/favorites', protect, requireRole('locataire'), getMyFavorites);
router.post('/me/favorites/:id_boat', protect, requireRole('locataire'), postFavorite);
router.delete('/me/favorites/:id_boat', protect, requireRole('locataire'), deleteFavorite);

export default router;
