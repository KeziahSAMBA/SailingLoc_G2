import { Router } from 'express';
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
} from '../controllers/userController.js';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import {
  getDashboard,
  getMyBookings,
  getMyFavorites,
  postFavorite,
  deleteFavorite,
} from '../controllers/locataireController.js';

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
router.get('/me/dashboard', protect, requireRole('locataire'), getDashboard);
router.get('/me/bookings', protect, requireRole('locataire'), getMyBookings);
router.get('/me/favorites', protect, requireRole('locataire'), getMyFavorites);
router.post('/me/favorites/:id_boat', protect, requireRole('locataire'), postFavorite);
router.delete('/me/favorites/:id_boat', protect, requireRole('locataire'), deleteFavorite);

export default router;
