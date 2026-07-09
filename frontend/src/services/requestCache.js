// Cache mémoire court pour les données du catalogue public (bateaux, ports).
// SearchBar, Carrousel et la page catégorie déclenchent chacun les mêmes
// requêtes à chaque montage : sur un simple trajet accueil → catégorie, cela
// faisait jusqu'à six fetch identiques, dont plusieurs en plein milieu des
// animations de transition (parsing JSON + re-rendus en pleine cascade).
// La promesse est partagée dès son départ (déduplication des requêtes en vol,
// y compris les doubles montages de StrictMode en dev), puis conservée TTL ms.
const TTL_MS = 60000;
const entries = new Map();

export function cachedRequest(key, request) {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = request().catch((err) => {
    // Un échec ne doit pas empoisonner le cache : la prochaine demande réessaie.
    entries.delete(key);
    throw err;
  });
  entries.set(key, { promise, at: Date.now() });
  return promise;
}

export function invalidateCachedRequest(key) {
  entries.delete(key);
}
