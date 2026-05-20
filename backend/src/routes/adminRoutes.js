import { Router } from 'express';
import { adminLogin, adminCreateUser } from '../controllers/userController.js';
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Espace d'administration, monté sous /api/admin.
router.post('/login', adminLogin);
router.post('/users', protect, requireAdmin, adminCreateUser);

export default router;
