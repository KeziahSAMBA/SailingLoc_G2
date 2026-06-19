import api from './api.js';

// Vue synthétique du tableau de bord locataire (réservations en cours, favoris,
// messages non lus).
export function getDashboard() {
  return api.get('/users/me/dashboard');
}
