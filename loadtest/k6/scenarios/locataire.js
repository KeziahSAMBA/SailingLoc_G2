import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders, rateLimited, sample } from '../config.js';

// Parcours du locataire connecté : consultation de son espace, puis une
// écriture légère (favori) pour mesurer un chemin transactionnel sans créer
// de réservation à chaque itération.
export function locataireJourney(data) {
  if (!data.guests.length) return;
  const token = sample(data.guests);
  const auth = authHeaders(token);

  const dashboard = http.get(`${BASE_URL}/api/users/me/dashboard`, {
    ...auth,
    tags: { groupe: 'dashboard', name: 'GET /me/dashboard' },
  });
  check(dashboard, {
    'dashboard locataire 200': (r) => r.status === 200,
    'dashboard porte des compteurs': (r) => {
      try {
        return r.json('stats.activeBookings') !== undefined;
      } catch {
        return false;
      }
    },
  });
  if (dashboard.status === 429) rateLimited.add(1);

  sleep(1);

  const bookings = http.get(`${BASE_URL}/api/users/me/bookings`, {
    ...auth,
    tags: { groupe: 'dashboard', name: 'GET /me/bookings' },
  });
  check(bookings, { 'réservations 200': (r) => r.status === 200 });

  const payments = http.get(`${BASE_URL}/api/users/me/payments`, {
    ...auth,
    tags: { groupe: 'dashboard', name: 'GET /me/payments' },
  });
  check(payments, { 'paiements 200': (r) => r.status === 200 });

  const favorites = http.get(`${BASE_URL}/api/users/me/favorites`, {
    ...auth,
    tags: { groupe: 'dashboard', name: 'GET /me/favorites' },
  });
  check(favorites, { 'favoris 200': (r) => r.status === 200 });

  sleep(1 + Math.random());

  // Ajout puis retrait : l'opération est idempotente côté service (upsert /
  // deleteMany), le jeu de données ne dérive donc pas au fil du tir.
  const boatId = data.boatIds.length ? sample(data.boatIds) : null;
  if (boatId) {
    const ajout = http.post(`${BASE_URL}/api/users/me/favorites/${boatId}`, null, {
      ...auth,
      tags: { groupe: 'ecriture', name: 'POST /me/favorites/:id' },
    });
    check(ajout, { 'ajout favori 201': (r) => r.status === 201 });
    if (ajout.status === 429) rateLimited.add(1);

    const retrait = http.del(`${BASE_URL}/api/users/me/favorites/${boatId}`, null, {
      ...auth,
      tags: { groupe: 'ecriture', name: 'DELETE /me/favorites/:id' },
    });
    check(retrait, { 'retrait favori 200': (r) => r.status === 200 });
  }

  sleep(2 + Math.random() * 2);
}
