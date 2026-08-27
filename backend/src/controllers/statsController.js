import { getAdminStats } from '../services/statsService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function adminStats(req, res) {
  try {
    const stats = await getAdminStats();
    res.json({ stats });
  } catch (err) {
    return sendError(res, err);
  }
}
