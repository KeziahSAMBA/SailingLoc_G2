import { Counter } from 'k6/metrics';

export const BASE_URL = (__ENV.BASE_URL || 'https://sailinglocbackend-staging.up.railway.app')
  .trim()
  .replace(/\/$/, '');

export const MARKER = '@loadtest.local';
export const PASSWORD = __ENV.LOAD_PASSWORD || 'LoadTest!2026';

// Nombre de comptes authentifiés en setup(). bcrypt coûte ~275 ms par
// connexion : on se connecte une seule fois par compte et les VUs se
// partagent les jetons, sinon le tir ne mesurerait que le hachage.
export const GUEST_POOL = Number(__ENV.GUEST_POOL) || 20;
export const OWNER_POOL = Number(__ENV.OWNER_POOL) || 5;

// Un seul 429 invalide le tir : il signifie que LOAD_TEST_MODE n'est pas actif
// sur la cible, et donc que l'on mesure le rate limiting et non l'application.
export const rateLimited = new Counter('rate_limited');

export const THRESHOLDS = {
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.99'],
  rate_limited: ['count==0'],
  'http_req_duration{groupe:catalogue}': ['p(95)<400', 'p(99)<800'],
  'http_req_duration{groupe:detail_bateau}': ['p(95)<500', 'p(99)<1000'],
  'http_req_duration{groupe:dashboard}': ['p(95)<700', 'p(99)<1500'],
  'http_req_duration{groupe:stats_admin}': ['p(95)<1500', 'p(99)<3000'],
  'http_req_duration{groupe:ecriture}': ['p(95)<800', 'p(99)<2000'],
  'http_req_duration{groupe:login}': ['p(95)<1500', 'p(99)<3000'],
};

// Répartition du trafic simulé, calquée sur l'usage attendu d'une marketplace :
// l'essentiel des requêtes vient de visiteurs non connectés.
export const MIX = [
  { journey: 'visiteur', weight: 60 },
  { journey: 'locataire', weight: 25 },
  { journey: 'proprietaire', weight: 10 },
  { journey: 'admin', weight: 5 },
];

export const PROFILES = {
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: Number(__ENV.VUS) || 50 },
      { duration: '5m', target: Number(__ENV.VUS) || 50 },
      { duration: '1m', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '3m', target: 100 },
      { duration: '3m', target: 200 },
      { duration: '3m', target: 300 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 150 },
      { duration: '1m', target: 150 },
      { duration: '30s', target: 0 },
    ],
  },
  soak: {
    executor: 'constant-vus',
    vus: Number(__ENV.VUS) || 20,
    duration: '30m',
  },
};

export function pickJourney() {
  const total = MIX.reduce((s, m) => s + m.weight, 0);
  let n = Math.random() * total;
  for (const m of MIX) {
    n -= m.weight;
    if (n <= 0) return m.journey;
  }
  return MIX[0].journey;
}

export function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export function sample(list) {
  return list[Math.floor(Math.random() * list.length)];
}
