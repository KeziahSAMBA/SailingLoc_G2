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

// Signale un problème (litige) sur une réservation annulée ou terminée,
// avec photos optionnelles (multipart).
export function reportDispute(idBooking, reason, photos = []) {
  const form = new FormData();
  form.append('reason', reason);
  photos.forEach((file) => form.append('photos', file));
  return api.post(`/users/me/proprietaire/bookings/${idBooking}/dispute`, form, {
    headers: { 'Content-Type': undefined },
  });
}

// Historique des paiements reçus sur les bateaux du propriétaire, avec les
// totaux (brut, commissions déduites, net).
export function getPayments() {
  return api.get('/users/me/proprietaire/payments');
}

// Liste des bateaux du propriétaire avec leur statut d'annonce.
export function getBoats() {
  return api.get('/users/me/proprietaire/boats');
}

// Crée une annonce de bateau (multipart : champs + photos + disponibilités).
export function createBoat(formData) {
  return api.post('/boats', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// Détail d'un de mes bateaux (pré-remplissage du formulaire d'édition).
export function getBoat(idBoat) {
  return api.get(`/users/me/proprietaire/boats/${idBoat}`);
}

// Met à jour un brouillon ou une annonce (mêmes données que la création).
export function updateBoat(idBoat, formData) {
  return api.put(`/boats/${idBoat}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// Supprime un brouillon ou une annonce (bloqué si réservations à venir).
export function deleteBoat(idBoat) {
  return api.delete(`/boats/${idBoat}`);
}
