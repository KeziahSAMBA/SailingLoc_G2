import {
  getBoat,
  getBookingLocataire,
  getDashboardStats,
  listBoats,
  listBookings,
  listPayments,
  setBookingStatus,
  getStripeAccountStatus,
  createStripeOnboardingLink,
  createStripeLoginLink,
} from '../services/proprietaireService.js';
import { reportDispute } from '../services/bookingService.js';
import { listOwnerReviews, replyToReview } from '../services/reviewService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function getDashboard(req, res) {
  try {
    const stats = await getDashboardStats(req.user.id_user);
    res.json({ stats });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyBookings(req, res) {
  try {
    const bookings = await listBookings(req.user.id_user);
    res.json({ bookings });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getBookingLocataireProfile(req, res) {
  try {
    const data = await getBookingLocataire(req.user.id_user, req.params.id_booking);
    res.json(data);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyReviews(req, res) {
  try {
    const reviews = await listOwnerReviews(req.user.id_user);
    res.json({ reviews });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postReviewReply(req, res) {
  try {
    const review = await replyToReview(req.user.id_user, req.params.id_review, req.body?.reply);
    res.json({ review });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyBoats(req, res) {
  try {
    const boats = await listBoats(req.user.id_user);
    res.json({ boats });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyBoat(req, res) {
  try {
    const boat = await getBoat(req.user.id_user, req.params.id_boat);
    res.json({ boat });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyPayments(req, res) {
  try {
    const { totals, payments } = await listPayments(req.user.id_user);
    res.json({ totals, payments });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function patchBooking(req, res) {
  try {
    const { action, reason } = req.body || {};
    const booking = await setBookingStatus(req.user.id_user, req.params.id_booking, action, reason);
    res.json({ booking });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyStripeAccount(req, res) {
  try {
    res.json(await getStripeAccountStatus(req.user.id_user));
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postStripeOnboarding(req, res) {
  try {
    res.json(await createStripeOnboardingLink(req.user.id_user));
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postStripeLoginLink(req, res) {
  try {
    res.json(await createStripeLoginLink(req.user.id_user));
  } catch (err) {
    return sendError(res, err);
  }
}

export async function reportBookingDispute(req, res) {
  try {
    const dispute = await reportDispute({
      id_user: req.user.id_user,
      id_booking: req.params.id_booking,
      reason: req.body?.reason,
      asOwner: true,
      files: req.files || [],
    });
    res.status(201).json({ dispute });
  } catch (err) {
    return sendError(res, err);
  }
}
