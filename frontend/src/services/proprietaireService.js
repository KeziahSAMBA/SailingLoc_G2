import api from './api.js';

// Vue synthétique du tableau de bord propriétaire (bateaux publiés,
// réservations à confirmer, revenus du mois).
export function getDashboard() {
  return api.get('/users/me/proprietaire/dashboard');
}

// Liste complète des réservations reçues sur les bateaux du propriétaire.
export function getBookings() {
  return api.get('/users/me/proprietaire/bookings');
}

// Confirme, refuse ou annule une réservation (action: 'confirm' | 'refuse' | 'cancel').
export function updateBookingStatus(idBooking, action, reason) {
  return api.patch(`/users/me/proprietaire/bookings/${idBooking}`, {
    action,
    reason,
  });
}
