import api, { UPLOAD_TIMEOUT_MS } from './api.js';
import { cachedRequest, invalidateCachedRequest } from './requestCache.js';

export function fetchBoats() {
  return cachedRequest('boats', () => api.get('/boats'));
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
