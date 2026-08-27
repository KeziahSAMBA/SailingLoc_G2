import {
  getDashboardStats,
  listBookings,
  listPayments,
  listFavorites,
  addFavorite,
  removeFavorite,
} from '../services/locataireService.js';
import {
  payBooking,
  cancelOwnBooking,
  requestRefund,
  reportDispute,
} from '../services/bookingService.js';
import {
  createBookingReview,
  updateBookingReview,
  deleteBookingReview,
  getReviewEligibility,
} from '../services/reviewService.js';
import { requirePositiveId } from '../utils/inputSecurity.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function getDashboard(req, res) {
  try {
    const stats = await getDashboardStats(req.user.id_user);
    res.json({ stats });
  } catch (err) {
    return sendError(res, err);
  }
}

// Paiement d'une réservation « pending » du locataire connecté. Avec Stripe,
// la réponse inclut le client_secret du PaymentIntent que le front confirme
// via Stripe Elements ; sans clé Stripe, paiement simulé (client_secret null).
export async function payMyBooking(req, res) {
  try {
    const result = await payBooking(req.user.id_user, req.params.id_booking);
    res.status(201).json(result);
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

export async function getMyPayments(req, res) {
  try {
    res.json(await listPayments(req.user.id_user));
  } catch (err) {
    return sendError(res, err);
  }
}

// Annulation par le locataire (avant le début du séjour), avec remboursement
// automatique de tout paiement encaissé.
export async function cancelMyBooking(req, res) {
  try {
    const booking = await cancelOwnBooking(
      req.user.id_user,
      req.params.id_booking,
      req.body?.reason
    );
    res.json({ booking });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postMyBookingReview(req, res) {
  try {
    const review = await createBookingReview(
      req.user.id_user,
      req.params.id_booking,
      req.body || {}
    );
    res.status(201).json({ review });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function patchMyReview(req, res) {
  try {
    const review = await updateBookingReview(req.user.id_user, req.params.id_review, req.body);
    res.json({ review });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function deleteMyReview(req, res) {
  try {
    await deleteBookingReview(req.user.id_user, req.params.id_review);
    res.status(204).end();
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyBoatReviewEligibility(req, res) {
  try {
    const eligibility = await getReviewEligibility(req.user.id_user, req.params.id_boat);
    res.json(eligibility);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function reportMyDispute(req, res) {
  try {
    const dispute = await reportDispute({
      id_user: req.user.id_user,
      id_booking: req.params.id_booking,
      reason: req.body?.reason,
      files: req.files || [],
    });
    res.status(201).json({ dispute });
  } catch (err) {
    return sendError(res, err);
  }
}

// Demande de remboursement (litige) sur une réservation annulée non remboursée.
export async function requestMyRefund(req, res) {
  try {
    const dispute = await requestRefund(req.user.id_user, req.params.id_booking, req.body?.reason);
    res.status(201).json({ dispute });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyFavorites(req, res) {
  try {
    const favorites = await listFavorites(req.user.id_user);
    res.json({ favorites });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postFavorite(req, res) {
  try {
    const id_boat = requirePositiveId(req.params.id_boat, 'Identifiant de bateau');
    await addFavorite(req.user.id_user, id_boat);
    res.status(201).json({ success: true });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function deleteFavorite(req, res) {
  try {
    const id_boat = requirePositiveId(req.params.id_boat, 'Identifiant de bateau');
    await removeFavorite(req.user.id_user, id_boat);
    res.json({ success: true });
  } catch (err) {
    return sendError(res, err);
  }
}
