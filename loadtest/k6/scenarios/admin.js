import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, authHeaders, rateLimited } from '../config.js';

// Parcours administrateur : peu de trafic, mais les requêtes les plus lourdes.
// /api/admin/stats enchaîne sept agrégations dont trois $queryRaw avec GROUP BY.
export function adminJourney(data) {
  if (!data.admin) return;
  const auth = authHeaders(data.admin);

  const stats = http.get(`${BASE_URL}/api/admin/stats`, {
    ...auth,
    tags: { groupe: 'stats_admin', name: 'GET /admin/stats' },
  });
  check(stats, {
    'stats admin 200': (r) => r.status === 200,
    'stats admin complètes': (r) => {
      try {
        return r.json('stats.users') !== undefined && r.json('stats.bookingsByMonth') !== undefined;
      } catch {
        return false;
      }
    },
  });
  if (stats.status === 429) rateLimited.add(1);

  sleep(1);

  const users = http.get(`${BASE_URL}/api/admin/users`, {
    ...auth,
    tags: { groupe: 'stats_admin', name: 'GET /admin/users' },
  });
  check(users, { 'liste utilisateurs 200': (r) => r.status === 200 });

  const bookings = http.get(`${BASE_URL}/api/admin/bookings`, {
    ...auth,
    tags: { groupe: 'stats_admin', name: 'GET /admin/bookings' },
  });
  check(bookings, { 'liste réservations 200': (r) => r.status === 200 });

  sleep(1);

  const payments = http.get(`${BASE_URL}/api/admin/payments/stats`, {
    ...auth,
    tags: { groupe: 'stats_admin', name: 'GET /admin/payments/stats' },
  });
  check(payments, { 'agrégats paiements 200': (r) => r.status === 200 });

  const logs = http.get(`${BASE_URL}/api/admin/logs?pageSize=25`, {
    ...auth,
    tags: { groupe: 'stats_admin', name: 'GET /admin/logs' },
  });
  check(logs, { 'journal 200': (r) => r.status === 200 });

  sleep(2 + Math.random() * 2);
}
