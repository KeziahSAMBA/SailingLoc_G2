import { getDashboardStats } from '../services/locataireService.js';

export async function getDashboard(req, res) {
  try {
    const stats = await getDashboardStats(req.user.id_user);
    res.json({ stats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
