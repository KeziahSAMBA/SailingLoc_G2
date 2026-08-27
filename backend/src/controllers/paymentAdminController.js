import { listPayments, paymentStats } from '../services/paymentAdminService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function adminListPayments(req, res) {
  try {
    const payments = await listPayments(req.query);
    res.json({ payments });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminPaymentStats(_req, res) {
  try {
    const stats = await paymentStats();
    res.json({ stats });
  } catch (err) {
    return sendError(res, err);
  }
}
