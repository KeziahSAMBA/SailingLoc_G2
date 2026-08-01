import { useEffect, useRef, useState } from 'react';
import { onRequestActivity, bumpGeneration } from '../services/api.js';

// Écran de chargement/no-connexion (cf. PageLoadGateScreen.jsx) : affiché par
// dessus toute l'app quand la navigation vers une nouvelle page semble
// bloquée — hors ligne, backend injoignable, ou une requête en vol qui traîne
// trop longtemps.
//
// Armé seulement une fenêtre courte après chaque navigation (ARM_WINDOW_MS) :
// l'app a des sondages en arrière-plan (messagerie, toutes les 4 s) qui n'ont
// rien à voir avec le chargement de LA page — les regarder en continu
// déclencherait l'écran en pleine navigation déjà terminée. Passé la fenêtre,
// on cesse d'observer : la page a soit fini de charger, soit échoué en
// silence (comportement préexistant de ses propres .catch(), hors sujet ici).
const SLOW_THRESHOLD_MS = 4000;
const ARM_WINDOW_MS = 12000;
const CHECK_INTERVAL_MS = 300;
const RETRY_INTERVAL_MS = 3000;

export function usePageLoadGate(pathname) {
  const [stuck, setStuck] = useState(false);
  const [routerKey, setRouterKey] = useState(0);
  const activityRef = useRef({
    pendingCount: 0,
    oldestPendingAt: null,
    lastNetworkFailureAt: null,
  });
  const wasOfflineRef = useRef(false);
  // Distingue une vraie navigation (nouveau pathname) d'un simple retry
  // (même page, routerKey avancé) : un retry ne doit PAS réinitialiser
  // `stuck` à `!navigator.onLine`, sans quoi l'écran clignote à chaque
  // remontage (en ligne mais backend injoignable → passe à false le temps
  // que la nouvelle tentative échoue à son tour).
  const lastPathnameRef = useRef(null);

  useEffect(
    () =>
      onRequestActivity((state) => {
        activityRef.current = state;
      }),
    []
  );

  // Coupure confirmée par le navigateur : retente dès l'événement 'online',
  // sans attendre le prochain tick du retry périodique ci-dessous.
  useEffect(() => {
    function handleOffline() {
      wasOfflineRef.current = true;
    }
    function handleOnline() {
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        bumpGeneration();
        setRouterKey((k) => k + 1);
      }
    }
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Fenêtre de tolérance réarmée à chaque nouvelle page (ou remontage forcé
  // par un retry ci-dessous).
  useEffect(() => {
    const navStartedAt = Date.now();
    const isNewPage = lastPathnameRef.current !== pathname;
    lastPathnameRef.current = pathname;
    if (isNewPage) setStuck(!navigator.onLine);

    const checkInterval = setInterval(() => {
      const offline = !navigator.onLine;
      const { oldestPendingAt, lastNetworkFailureAt } = activityRef.current;
      const slow = Boolean(oldestPendingAt) && Date.now() - oldestPendingAt > SLOW_THRESHOLD_MS;
      const networkFailure = Boolean(lastNetworkFailureAt) && lastNetworkFailureAt > navStartedAt;
      setStuck(offline || slow || networkFailure);
    }, CHECK_INTERVAL_MS);

    // Panne confirmée (hors ligne, ou requête qui a réellement échoué sans
    // réponse — backend injoignable) : on retente régulièrement en remontant
    // la page, plutôt que d'attendre indéfiniment — sans quoi le fetch raté
    // reste avalé en silence (.catch(() => {}) des pages) et rien ne le
    // relance jamais tout seul. Une requête simplement lente (pas encore
    // échouée) n'est PAS retentée : mieux vaut la laisser aboutir.
    const retryInterval = setInterval(() => {
      const { lastNetworkFailureAt } = activityRef.current;
      const offline = !navigator.onLine;
      const networkFailure = Boolean(lastNetworkFailureAt) && lastNetworkFailureAt > navStartedAt;
      if (offline || networkFailure) {
        bumpGeneration();
        setRouterKey((k) => k + 1);
      }
    }, RETRY_INTERVAL_MS);

    const disarm = setTimeout(() => {
      clearInterval(checkInterval);
      clearInterval(retryInterval);
      setStuck(false);
    }, ARM_WINDOW_MS);

    return () => {
      clearInterval(checkInterval);
      clearInterval(retryInterval);
      clearTimeout(disarm);
    };
  }, [pathname, routerKey]);

  return { stuck, routerKey };
}
