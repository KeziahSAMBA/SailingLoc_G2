// Conservation de l'état du tunnel de réservation pendant 15 minutes : si la
// session expire en cours de tunnel, le locataire reconnecté reprend là où il
// en était (même étape, même demande — pas de doublon). La déconnexion
// volontaire purge l'état ; l'expiration de session le conserve.
const KEY = 'sailingloc:reservation-resume';
const TTL_MS = 15 * 60 * 1000;

export function saveReservationResume({ path, step, id_booking }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, step, id_booking, savedAt: Date.now() }));
  } catch {
    // Stockage indisponible (navigation privée…) : la reprise est juste perdue.
  }
}

// Retourne l'état sauvegardé s'il a moins de 15 minutes, sinon null (et purge).
export function loadReservationResume() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved?.path || !(Date.now() - saved.savedAt <= TTL_MS)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function clearReservationResume() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Rien à purger si le stockage est inaccessible.
  }
}
