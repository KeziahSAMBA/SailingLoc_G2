import {
  getDashboardStats,
  listBoats,
  listBookings,
  listPayments,
  setBookingStatus,
} from '../services/proprietaireService.js';

export async function getDashboard(req, res) {
  try {
    const stats = await getDashboardStats(req.user.id_user);
    res.json({ stats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getMyBookings(req, res) {
  try {
    const bookings = await listBookings(req.user.id_user);
    res.json({ bookings });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getMyBoats(req, res) {
  try {
    const boats = await listBoats(req.user.id_user);
    res.json({ boats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getMyPayments(req, res) {
  try {
    const { totals, payments } = await listPayments(req.user.id_user);
    res.json({ totals, payments });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function patchBooking(req, res) {
  try {
    const { action, reason } = req.body || {};
    const booking = await setBookingStatus(req.user.id_user, req.params.id_booking, action, reason);
    res.json({ booking });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
