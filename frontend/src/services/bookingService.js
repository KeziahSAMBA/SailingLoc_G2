import api from './api.js';
import { invalidateCachedRequest } from './requestCache.js';

// Crée une réservation « pending » pour le locataire connecté.
export function createBooking(idBoat, start_date, end_date) {
  return api.post(`/boats/${idBoat}/bookings`, { start_date, end_date }).then((res) => {
    // Les plages réservées du bateau ont changé : la prochaine lecture du
    // catalogue repart au serveur (jours bloqués dans les calendriers).
    invalidateCachedRequest('boats');
    return res;
  });
}

// Paiement simulé d'une réservation « pending » : aucune donnée bancaire
// n'est transmise, le serveur enregistre un paiement fictif et confirme.
export function payBooking(idBooking) {
  return api.post(`/users/me/bookings/${idBooking}/pay`);
}
