import api from './api.js';

// Vue synthétique du tableau de bord locataire (réservations en cours, favoris,
// messages non lus).
export function getDashboard() {
  return api.get('/users/me/dashboard');
}

// Liste complète des réservations du locataire connecté.
export function getBookings() {
  return api.get('/users/me/bookings');
}

// Annule une réservation à venir (remboursement automatique si encaissée).
export function cancelBooking(idBooking, reason) {
  return api.post(`/users/me/bookings/${idBooking}/cancel`, { reason });
}

// Demande de remboursement (litige) sur une réservation annulée non remboursée.
export function requestRefund(idBooking, reason) {
  return api.post(`/users/me/bookings/${idBooking}/refund-request`, { reason });
}

// Bateaux favoris du locataire connecté.
export function getFavorites() {
  return api.get('/users/me/favorites');
}

// Ajoute un bateau aux favoris.
export function addFavorite(idBoat) {
  return api.post(`/users/me/favorites/${idBoat}`);
}

// Retire un bateau des favoris.
export function removeFavorite(idBoat) {
  return api.delete(`/users/me/favorites/${idBoat}`);
}
