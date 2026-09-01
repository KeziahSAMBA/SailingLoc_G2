import {
  listBookings,
  cancelBooking,
  listDisputes,
  setDisputeStatus,
  getDisputeImageFile,
} from '../services/bookingAdminService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function adminListBookings(req, res) {
  try {
    const bookings = await listBookings(req.query);
    res.json({ bookings });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminCancelBooking(req, res) {
  try {
    const booking = await cancelBooking(req.params.id, req.body?.reason);
    res.json({ booking });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminListDisputes(req, res) {
  try {
    const disputes = await listDisputes(req.query);
    res.json({ disputes });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminSetDisputeStatus(req, res) {
  try {
    const dispute = await setDisputeStatus(req.params.id, req.body?.status, req.body?.resolution, {
      refund_percent: req.body?.refund_percent,
      refund_commission: req.body?.refund_commission,
    });
    res.json({ dispute });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminDownloadDisputeImage(req, res) {
  try {
    const { content, mimeType } = await getDisputeImageFile(req.params.id, req.params.imageId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', String(content.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="evidence-${Number(req.params.imageId)}"`
    );
    return res.send(content);
  } catch (err) {
    return sendError(res, err);
  }
}
