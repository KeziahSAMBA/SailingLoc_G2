import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import {
  acceptsMulterMetadata,
  generatedFileName,
  inspectUploadedFile,
  privateDirectory,
} from '../utils/fileSecurity.js';
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
  getMyClosureStatus,
  deactivateMe,
  deleteMe,
} from '../controllers/userController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { audit } from '../middlewares/auditMiddleware.js';
import { bookingActionLimiter, uploadLimiter } from '../middlewares/abuseProtection.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';
import {
  getDashboard,
  getMyBookings,
  postMyBookingReview,
  getMyPayments,
  payMyBooking,
  cancelMyBooking,
  requestMyRefund,
  reportMyDispute,
  patchMyReview,
  deleteMyReview,
  getMyBoatReviewEligibility,
  getMyFavorites,
  postFavorite,
  deleteFavorite,
} from '../controllers/locataireController.js';
import {
  getDashboard as getProprietaireDashboard,
  getMyBoat as getProprietaireBoat,
  getMyBoats as getProprietaireBoats,
  getMyBookings as getProprietaireBookings,
  getBookingLocataireProfile as getProprietaireBookingLocataire,
  getMyReviews as getProprietaireReviews,
  postReviewReply as postProprietaireReviewReply,
  getMyPayments as getProprietairePayments,
  patchBooking as patchProprietaireBooking,
  reportBookingDispute as reportProprietaireDispute,
  getMyStripeAccount,
  postStripeOnboarding,
  postStripeLoginLink,
} from '../controllers/proprietaireController.js';
import { getBookingInvoice } from '../controllers/invoiceController.js';

// Photos de profil : servies en statique via /uploads (visibles dans le header
// et la messagerie), extension conservée pour le bon type MIME.
const AVATARS_DIR = path.resolve(process.env.UPLOADS_DIR || 'uploads', 'avatars');
fs.mkdirSync(AVATARS_DIR, { recursive: true, mode: 0o755 });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => cb(null, generatedFileName(file.originalname, 'avatar')),
});

const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 8 * 1024,
    parts: 2,
    headerPairs: 100,
  }, // 3 Mo
  fileFilter: (req, file, cb) => {
    if (AVATAR_MIME.includes(file.mimetype) && acceptsMulterMetadata(file, 'avatar')) {
      return cb(null, true);
    }
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
        err.code === 'LIMIT_FILE_SIZE' ? 'Image trop volumineuse (max 3 Mo).' : err.message;
      return fs.promises
        .unlink(req.file?.path)
        .catch(() => {})
        .finally(() => sendError(res, Object.assign(err, { status }), { message }));
    }
    next();
  });
}

async function validateAvatarFile(req, res, next) {
  if (!req.file) return next();
  try {
    const metadata = await inspectUploadedFile(req.file, 'avatar');
    req.file.detectedMimeType = metadata.mimeType;
    req.file.safeOriginalName = metadata.safeName;
    return next();
  } catch (err) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    return sendError(res, err.status ? err : Object.assign(err, { status: 400 }));
  }
}

// Photos jointes à un litige : statiques via /uploads, comme les photos de bateaux.
const DISPUTES_DIR = privateDirectory('dispute');
fs.mkdirSync(DISPUTES_DIR, { recursive: true, mode: 0o700 });

const disputeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DISPUTES_DIR),
    filename: (req, file, cb) => {
      cb(null, generatedFileName(file.originalname, 'dispute'));
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
    fields: 3,
    fieldSize: 16 * 1024,
    parts: 10,
    headerPairs: 150,
  },
  fileFilter: (req, file, cb) => {
    if (AVATAR_MIME.includes(file.mimetype) && acceptsMulterMetadata(file, 'dispute')) {
      return cb(null, true);
    }
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
      const status = [
        'LIMIT_FILE_SIZE',
        'LIMIT_FILE_COUNT',
        'LIMIT_UNEXPECTED_FILE',
        'LIMIT_FIELD_SIZE',
        'LIMIT_FIELD_COUNT',
        'LIMIT_PART_COUNT',
        'LIMIT_HEADER_COUNT',
      ].includes(err.code)
        ? 400
        : err.status || 500;
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Photo trop volumineuse (max 5 Mo).'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
            ? '5 photos maximum.'
            : err.message;
      const files = req.files || [];
      return Promise.all(
        files.map((file) => fs.promises.unlink(file.path).catch(() => {}))
      ).finally(() => sendError(res, Object.assign(err, { status }), { message }));
    }
    next();
  });
}

async function validateDisputePhotos(req, res, next) {
  const files = req.files || [];
  try {
    for (const file of files) {
      const metadata = await inspectUploadedFile(file, 'dispute');
      file.detectedMimeType = metadata.mimeType;
      file.safeOriginalName = metadata.safeName;
    }
    return next();
  } catch (err) {
    await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
    return sendError(res, err.status ? err : Object.assign(err, { status: 400 }));
  }
}

const router = Router();

// Les endpoints de session et de jetons restent publics, mais ne doivent pas
// pouvoir être utilisés comme oracle ou comme boucle de rejeu à grande
// vitesse. Les limites sont par IP et n'affectent pas les routes métier.
const sessionActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', sessionActionLimiter, refresh);
router.post('/logout', sessionActionLimiter, logout);
router.post('/resend-verification', resend);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/reset-password/:token', verifyResetToken);
router.get('/verify-email/:token', verificationLimiter, confirmEmail);
router.get('/me', protect, me);
router.patch('/me', protect, updateMe);
router.patch('/me/password', protect, changeMyPassword);
router.patch('/me/avatar', protect, uploadLimiter, uploadAvatar, validateAvatarFile, patchMyAvatar);
router.delete('/me/avatar', protect, deleteMyAvatar);
router.get('/me/closure', protect, requireRole('locataire', 'proprietaire'), getMyClosureStatus);
router.post(
  '/me/deactivate',
  protect,
  requireRole('locataire', 'proprietaire'),
  audit('user.deactivate_self', {
    targetType: 'user',
    targetId: (req) => String(req.user.id_user),
    meta: () => null,
  }),
  deactivateMe
);
router.delete(
  '/me',
  protect,
  requireRole('locataire', 'proprietaire'),
  audit('user.delete_self', {
    targetType: 'user',
    targetId: (req) => String(req.user.id_user),
    meta: () => null,
  }),
  deleteMe
);
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
router.get(
  '/me/proprietaire/bookings/:id_booking/locataire',
  protect,
  requireRole('proprietaire'),
  getProprietaireBookingLocataire
);
router.get(
  '/me/proprietaire/bookings/:id_booking/invoice.pdf',
  protect,
  requireRole('proprietaire'),
  getBookingInvoice
);
// Le propriétaire valide ou refuse : le statut demandé part dans les détails.
router.patch(
  '/me/proprietaire/bookings/:id_booking',
  protect,
  requireRole('proprietaire'),
  bookingActionLimiter,
  audit('booking.decide', { targetType: 'booking', targetId: (req) => req.params.id_booking }),
  patchProprietaireBooking
);
router.post(
  '/me/proprietaire/bookings/:id_booking/dispute',
  protect,
  requireRole('proprietaire'),
  bookingActionLimiter,
  uploadLimiter,
  uploadDisputePhotos,
  validateDisputePhotos,
  audit('dispute.open', { targetType: 'booking', targetId: (req) => req.params.id_booking }),
  reportProprietaireDispute
);
router.get(
  '/me/proprietaire/payments',
  protect,
  requireRole('proprietaire'),
  getProprietairePayments
);
router.get(
  '/me/proprietaire/stripe-account',
  protect,
  requireRole('proprietaire'),
  getMyStripeAccount
);
router.post(
  '/me/proprietaire/stripe-account/onboarding',
  protect,
  requireRole('proprietaire'),
  postStripeOnboarding
);
router.post(
  '/me/proprietaire/stripe-account/login-link',
  protect,
  requireRole('proprietaire'),
  postStripeLoginLink
);
router.get(
  '/me/proprietaire/reviews',
  protect,
  requireRole('proprietaire'),
  getProprietaireReviews
);
router.post(
  '/me/proprietaire/reviews/:id_review/reply',
  protect,
  requireRole('proprietaire'),
  postProprietaireReviewReply
);
router.get('/me/proprietaire/boats', protect, requireRole('proprietaire'), getProprietaireBoats);
router.get(
  '/me/proprietaire/boats/:id_boat',
  protect,
  requireRole('proprietaire'),
  getProprietaireBoat
);
router.get('/me/bookings', protect, requireRole('locataire'), getMyBookings);
router.get(
  '/me/bookings/:id_booking/invoice.pdf',
  protect,
  requireRole('locataire'),
  getBookingInvoice
);
router.post(
  '/me/bookings/:id_booking/review',
  protect,
  requireRole('locataire'),
  postMyBookingReview
);
router.get('/me/payments', protect, requireRole('locataire'), getMyPayments);
router.post(
  '/me/bookings/:id_booking/pay',
  protect,
  requireRole('locataire'),
  bookingActionLimiter,
  audit('booking.pay', { targetType: 'booking', targetId: (req) => req.params.id_booking }),
  payMyBooking
);
router.post(
  '/me/bookings/:id_booking/cancel',
  protect,
  requireRole('locataire'),
  bookingActionLimiter,
  audit('booking.cancel_guest', {
    targetType: 'booking',
    targetId: (req) => req.params.id_booking,
  }),
  cancelMyBooking
);
router.post(
  '/me/bookings/:id_booking/refund-request',
  protect,
  requireRole('locataire'),
  bookingActionLimiter,
  audit('booking.refund_request', {
    targetType: 'booking',
    targetId: (req) => req.params.id_booking,
  }),
  requestMyRefund
);
router.post(
  '/me/bookings/:id_booking/dispute',
  protect,
  requireRole('locataire'),
  bookingActionLimiter,
  uploadLimiter,
  uploadDisputePhotos,
  validateDisputePhotos,
  audit('dispute.open', { targetType: 'booking', targetId: (req) => req.params.id_booking }),
  reportMyDispute
);
router.patch('/me/reviews/:id_review', protect, requireRole('locataire'), patchMyReview);
router.delete('/me/reviews/:id_review', protect, requireRole('locataire'), deleteMyReview);
router.get(
  '/me/boats/:id_boat/review-eligibility',
  protect,
  requireRole('locataire'),
  getMyBoatReviewEligibility
);
router.get('/me/favorites', protect, requireRole('locataire'), getMyFavorites);
router.post('/me/favorites/:id_boat', protect, requireRole('locataire'), postFavorite);
router.delete('/me/favorites/:id_boat', protect, requireRole('locataire'), deleteFavorite);

export default router;
