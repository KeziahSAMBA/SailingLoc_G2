import { Router } from 'express';
import { getOwnerProfile } from '../controllers/ownerController.js';

const router = Router();

// Fiche publique d'un propriétaire, ouverte à tous (même contrat que
// /api/reviews/public) : identité, badges de vérification, bateaux et avis.
router.get('/:id', getOwnerProfile);

export default router;
