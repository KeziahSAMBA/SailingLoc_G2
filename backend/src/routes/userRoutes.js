import { Router } from 'express';
import { register, confirmEmail } from '../controllers/userController.js';

const router = Router();

router.post('/register', register);
router.get('/verify-email/:token', confirmEmail);

export default router;