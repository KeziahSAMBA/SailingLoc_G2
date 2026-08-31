import api, { UPLOAD_TIMEOUT_MS } from './api.js';
import { cachedRequest, invalidateCachedRequest } from './requestCache.js';
import { fetchBoundedPublicPages } from './publicPagination.js';

export function fetchBoats() {
  // Le serveur borne chaque page ; le cache conserve ensuite l'agrégat pour
  // les différents consommateurs du catalogue pendant sa courte durée de vie.
  return cachedRequest('boats', () =>
    fetchBoundedPublicPages(
      ({ page, pageSize }) => api.get('/boats', { params: { page, pageSize } }),
      { getItemId: (boat) => boat?.id_boat }
    )
  );
}

// Relecture forcée au serveur (disponibilités à jour), en repeuplant le cache
// pour les autres consommateurs (SearchBar, carrousels…).
export function fetchBoatsFresh() {
  invalidateCachedRequest('boats');
  return fetchBoats();
}

export function fetchBoatsByType() {
  return api.get('/boats/by-type');
}

export function createBoat(formData) {
  // On laisse axios/le navigateur poser le Content-Type (avec le boundary multipart).
  // `undefined` écrase le défaut 'application/json' de l'instance api.
  return api
    .post('/boats', formData, {
      headers: { 'Content-Type': undefined },
      timeout: UPLOAD_TIMEOUT_MS,
    })
    .then((res) => {
      // Le catalogue vient de changer : la prochaine lecture repart au serveur.
      invalidateCachedRequest('boats');
      return res;
    });
}
