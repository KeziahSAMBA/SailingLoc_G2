import { Router } from 'express';
import multer from 'multer';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { uploadBoat, getBoats } from '../controllers/boatController.js';

const upload = multer({ dest: 'uploads/boats' });
const router = Router();

router.get('/', getBoats);
router.post(
  '/',
  protect,
  requireRole('proprietaire', 'admin'),
  upload.array('images', 5),
  uploadBoat
);

export default router;
