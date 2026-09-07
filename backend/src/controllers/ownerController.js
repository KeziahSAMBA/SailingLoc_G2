import { getOwnerPublicProfile } from '../services/ownerProfileService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

// GET /api/owners/:id — fiche publique d'un propriétaire (aucune authentification).
export async function getOwnerProfile(req, res) {
  try {
    const profile = await getOwnerPublicProfile(req.params.id);
    res.json(profile);
  } catch (err) {
    return sendError(res, err);
  }
}
