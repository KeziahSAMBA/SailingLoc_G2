import { Router } from 'express';
import { adminLogin, adminCreateUser } from '../controllers/userController.js';
import { adminStats } from '../controllers/statsController.js';
import {
  adminListUsers,
  adminUpdateUser,
  adminDeleteUser,
} from '../controllers/adminUserController.js';
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Espace d'administration, monté sous /api/admin.
router.post('/login', adminLogin);
router.get('/stats', protect, requireAdmin, adminStats);

router.get('/users', protect, requireAdmin, adminListUsers);
router.post('/users', protect, requireAdmin, adminCreateUser);
router.patch('/users/:id', protect, requireAdmin, adminUpdateUser);
router.delete('/users/:id', protect, requireAdmin, adminDeleteUser);

export default router;
