import api from './api.js';

// Le locataire dépose un avis (note + commentaire) sur une location terminée.
export function createBookingReview(idBooking, { rating, comment }) {
  return api.post(`/users/me/bookings/${idBooking}/review`, { rating, comment });
}

// Avis validés d'un bateau (avec la réponse éventuelle du propriétaire).
export function getBoatReviews(idBoat) {
  return api.get(`/boats/${idBoat}/reviews`);
}

// Le locataire connecté peut-il laisser un avis sur ce bateau ?
export function getReviewEligibility(idBoat) {
  return api.get(`/users/me/boats/${idBoat}/review-eligibility`);
}

// Le locataire modifie son propre avis (repart en modération).
export function updateReview(idReview, { rating, comment }) {
  return api.patch(`/users/me/reviews/${idReview}`, { rating, comment });
}

// Avis reçus sur les bateaux du propriétaire connecté.
export function getProprietaireReviews() {
  return api.get('/users/me/proprietaire/reviews');
}

// Le propriétaire répond (ou modifie sa réponse) à un avis.
export function replyToReview(idReview, reply) {
  return api.post(`/users/me/proprietaire/reviews/${idReview}/reply`, { reply });
}
