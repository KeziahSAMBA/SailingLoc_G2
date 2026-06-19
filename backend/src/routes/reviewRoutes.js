import { Router } from 'express';
import { getPublicReviews } from '../controllers/reviewController.js';

const router = Router();

router.get('/public', getPublicReviews);

export default router;
