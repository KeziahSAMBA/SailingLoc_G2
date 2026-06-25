import { Router } from 'express';
import { getPorts } from '../controllers/portController.js';

const router = Router();

router.get('/', getPorts);

export default router;
