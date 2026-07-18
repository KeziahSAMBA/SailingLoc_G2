import {
  getDashboardStats,
  listBookings,
  listFavorites,
  addFavorite,
  removeFavorite,
} from '../services/locataireService.js';
import { payBooking, cancelOwnBooking, requestRefund } from '../services/bookingService.js';

export async function getDashboard(req, res) {
  try {
    const stats = await getDashboardStats(req.user.id_user);
    res.json({ stats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
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
    res.status(err.status || 500).json({ message: err.message });
  }
}

// Demande de remboursement (litige) sur une réservation annulée non remboursée.
export async function requestMyRefund(req, res) {
  try {
    const dispute = await requestRefund(req.user.id_user, req.params.id_booking, req.body?.reason);
    res.status(201).json({ dispute });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getMyFavorites(req, res) {
  try {
    const favorites = await listFavorites(req.user.id_user);
    res.json({ favorites });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function postFavorite(req, res) {
  try {
    const id_boat = Number(req.params.id_boat);
    if (!Number.isInteger(id_boat)) {
      return res.status(400).json({ message: 'Identifiant de bateau invalide.' });
    }
    await addFavorite(req.user.id_user, id_boat);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function deleteFavorite(req, res) {
  try {
    const id_boat = Number(req.params.id_boat);
    if (!Number.isInteger(id_boat)) {
      return res.status(400).json({ message: 'Identifiant de bateau invalide.' });
    }
    await removeFavorite(req.user.id_user, id_boat);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
