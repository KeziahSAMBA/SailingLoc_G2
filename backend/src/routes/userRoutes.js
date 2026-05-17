import { Router } from 'express';
import {
  register,
  login,
  adminLogin,
  refresh,
  logout,
  me,
  confirmEmail,
  resend,
} from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/admin/login', adminLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/resend-verification', resend);
router.get('/verify-email/:token', confirmEmail);
router.get('/me', protect, me);

export default router;