import api from './api.js';

// Vue synthétique du tableau de bord propriétaire (bateaux publiés,
// réservations à confirmer, revenus du mois).
export function getDashboard() {
  return api.get('/users/me/proprietaire/dashboard');
}
