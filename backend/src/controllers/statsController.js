import { getAdminStats } from '../services/statsService.js';

export async function adminStats(req, res) {
  try {
    const stats = await getAdminStats();
    res.json({ stats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
