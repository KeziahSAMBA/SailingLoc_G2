import { Router } from 'express';
import { register, confirmEmail, resend } from '../controllers/userController.js';

const router = Router();

router.post('/register', register);
router.post('/resend-verification', resend);
router.get('/verify-email/:token', confirmEmail);

export default router;