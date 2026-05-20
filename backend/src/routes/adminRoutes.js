import { Router } from 'express';
import { adminLogin, adminCreateUser } from '../controllers/userController.js';
import { adminStats } from '../controllers/statsController.js';
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Espace d'administration, monté sous /api/admin.
router.post('/login', adminLogin);
router.post('/users', protect, requireAdmin, adminCreateUser);
router.get('/stats', protect, requireAdmin, adminStats);

export default router;
