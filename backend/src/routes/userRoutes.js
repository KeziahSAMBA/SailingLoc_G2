import { Router } from 'express';
import {
  register,
  adminCreateUser,
  login,
  adminLogin,
  refresh,
  logout,
  me,
  confirmEmail,
  resend,
  forgotPassword,
  resetPassword,
  verifyResetToken,
} from '../controllers/userController.js';
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/resend-verification', resend);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/reset-password/:token', verifyResetToken);
router.get('/verify-email/:token', confirmEmail);
router.get('/me', protect, me);
router.post('/admin/users', protect, requireAdmin, adminCreateUser);

export default router;
