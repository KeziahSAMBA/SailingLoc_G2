import {
  listBookings,
  cancelBooking,
  listDisputes,
  setDisputeStatus,
} from '../services/bookingAdminService.js';

export async function adminListBookings(req, res) {
  try {
    const bookings = await listBookings(req.query);
    res.json({ bookings });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminCancelBooking(req, res) {
  try {
    const booking = await cancelBooking(req.params.id, req.body?.reason);
    res.json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminListDisputes(req, res) {
  try {
    const disputes = await listDisputes(req.query);
    res.json({ disputes });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
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
    res.status(err.status || 500).json({ message: err.message });
  }
}
