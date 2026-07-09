import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCookieConsent } from '../../hooks/useCookieConsent.jsx';
import { loadMatomo, trackPageView, disableMatomo } from '../../utils/matomo.js';

// Pont entre le consentement cookies et Matomo (ne rend rien).
// - Consentement « mesure d'audience » donné → charge le script et trace les
//   vues de page à chaque changement de route (SPA).
// - Consentement absent, refusé ou retiré → rien n'est chargé ; si le script
//   tournait déjà, l'envoi s'arrête et les cookies Matomo sont purgés (CNIL).
function MatomoTracker() {
  const location = useLocation();
  const { consent } = useCookieConsent();
  const allowed = consent?.analytics === true;

  useEffect(() => {
    if (allowed) loadMatomo();
    else disableMatomo();
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    // setTimeout : laisse aux pages le temps de poser leur document.title.
    const id = setTimeout(() => trackPageView(location.pathname + location.search), 300);
    return () => clearTimeout(id);
  }, [allowed, location.pathname, location.search]);

  return null;
}

export default MatomoTracker;
