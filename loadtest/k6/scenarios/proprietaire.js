import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders, rateLimited, sample } from '../config.js';

// Parcours du propriétaire : son tableau de bord déclenche refuseExpiredPending
// (balayage + transaction) avant chaque lecture, c'est le chemin authentifié le
// plus coûteux de l'application.
export function proprietaireJourney(data) {
  if (!data.owners.length) return;
  const auth = authHeaders(sample(data.owners));

  const dashboard = http.get(`${BASE_URL}/api/users/me/proprietaire/dashboard`, {
    ...auth,
    tags: { groupe: 'dashboard', endpoint: 'GET /me/proprietaire/dashboard' },
  });
  check(dashboard, { 'dashboard proprio 200': (r) => r.status === 200 });
  if (dashboard.status === 429) rateLimited.add(1);

  sleep(1);

  const boats = http.get(`${BASE_URL}/api/users/me/proprietaire/boats`, {
    ...auth,
    tags: { groupe: 'dashboard', endpoint: 'GET /me/proprietaire/boats' },
  });
  check(boats, { 'mes bateaux 200': (r) => r.status === 200 });

  const bookings = http.get(`${BASE_URL}/api/users/me/proprietaire/bookings`, {
    ...auth,
    tags: { groupe: 'dashboard', endpoint: 'GET /me/proprietaire/bookings' },
  });
  check(bookings, { 'réservations reçues 200': (r) => r.status === 200 });

  sleep(1);

  const payments = http.get(`${BASE_URL}/api/users/me/proprietaire/payments`, {
    ...auth,
    tags: { groupe: 'dashboard', endpoint: 'GET /me/proprietaire/payments' },
  });
  check(payments, { 'revenus 200': (r) => r.status === 200 });

  const reviews = http.get(`${BASE_URL}/api/users/me/proprietaire/reviews`, {
    ...auth,
    tags: { groupe: 'dashboard', endpoint: 'GET /me/proprietaire/reviews' },
  });
  check(reviews, { 'avis reçus 200': (r) => r.status === 200 });

  sleep(2 + Math.random() * 2);
}
