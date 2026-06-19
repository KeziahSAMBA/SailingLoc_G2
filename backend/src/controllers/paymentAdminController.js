import { listPayments, paymentStats } from '../services/paymentAdminService.js';

export async function adminListPayments(req, res) {
  try {
    const payments = await listPayments(req.query);
    res.json({ payments });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminPaymentStats(_req, res) {
  try {
    const stats = await paymentStats();
    res.json({ stats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
