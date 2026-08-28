import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, rateLimited, sample } from '../config.js';

// Parcours du visiteur non connecté : c'est le trafic dominant d'une
// marketplace, et le seul qui soit intégralement en lecture.
export function visitorJourney(data) {
  const catalogue = http.get(`${BASE_URL}/api/boats`, {
    tags: { groupe: 'catalogue', endpoint: 'GET /api/boats' },
  });
  check(catalogue, {
    'catalogue 200': (r) => r.status === 200,
    'catalogue non vide': (r) => {
      try {
        return Array.isArray(r.json()) && r.json().length > 0;
      } catch {
        return false;
      }
    },
  });
  if (catalogue.status === 429) rateLimited.add(1);

  sleep(1 + Math.random());

  const parType = http.get(`${BASE_URL}/api/boats/by-type`, {
    tags: { groupe: 'catalogue', endpoint: 'GET /api/boats/by-type' },
  });
  check(parType, { 'sections par type 200': (r) => r.status === 200 });
  if (parType.status === 429) rateLimited.add(1);

  const ports = http.get(`${BASE_URL}/api/ports`, {
    tags: { groupe: 'catalogue', endpoint: 'GET /api/ports' },
  });
  check(ports, { 'ports 200': (r) => r.status === 200 });

  sleep(1 + Math.random());

  // Consultation d'une fiche : les avis publics sont chargés dans la foulée
  // par le front, on reproduit la séquence réelle.
  const boatId = data.boatIds.length ? sample(data.boatIds) : null;
  if (boatId) {
    const avisBateau = http.get(`${BASE_URL}/api/boats/${boatId}/reviews`, {
      tags: { groupe: 'detail_bateau', endpoint: 'GET /api/boats/:id/reviews' },
    });
    check(avisBateau, { 'avis du bateau 200': (r) => r.status === 200 });
    if (avisBateau.status === 429) rateLimited.add(1);

    const avisFiltres = http.get(`${BASE_URL}/api/reviews/public?id_boat=${boatId}`, {
      tags: { groupe: 'detail_bateau', endpoint: 'GET /api/reviews/public?id_boat' },
    });
    check(avisFiltres, { 'avis filtrés 200': (r) => r.status === 200 });
  }

  const tousAvis = http.get(`${BASE_URL}/api/reviews/public`, {
    tags: { groupe: 'detail_bateau', endpoint: 'GET /api/reviews/public (tous)' },
  });
  check(tousAvis, { 'avis publics 200': (r) => r.status === 200 });

  sleep(2 + Math.random() * 2);
}
