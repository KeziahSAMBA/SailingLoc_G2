// Mesure d'audience Matomo (self-hosted, conteneur `matomo` du docker-compose).
//
// Conformité CNIL : ce module ne doit JAMAIS être appelé sans la finalité
// « mesure d'audience » du consentement cookies (voir MatomoTracker.jsx, qui
// vérifie useCookieConsent() avant tout appel). Rien n'est chargé ni envoyé
// sans accord ; le retrait de l'accord stoppe l'envoi et purge les cookies.
//
// Les cookies Matomo (_pk_id : 13 mois, _pk_ses : 30 min) respectent le
// plafond CNIL de 13 mois. La rétention des données (25 mois max) se règle
// dans l'interface Matomo : Administration → Confidentialité → Suppression
// des anciennes données.

const SITE_ID = '1';

let loaded = false;
let disabled = false;

function matomoBaseUrl() {
  const url = import.meta.env.VITE_MATOMO_URL;
  return url ? `${url.replace(/\/+$/, '')}/` : null;
}

// Charge le script de tracking. À n'appeler qu'avec le consentement
// « analytics ». Sans VITE_MATOMO_URL (Matomo non déployé), no-op silencieux.
export function loadMatomo() {
  const base = matomoBaseUrl();
  if (!base) return;
  disabled = false;
  if (loaded) return;
  loaded = true;

  window._paq = window._paq || [];
  window._paq.push(['enableLinkTracking']);
  window._paq.push(['setTrackerUrl', `${base}matomo.php`]);
  window._paq.push(['setSiteId', SITE_ID]);

  const script = document.createElement('script');
  script.async = true;
  script.src = `${base}matomo.js`;
  document.head.appendChild(script);
}

// Enregistre une vue de page (SPA : appelé à chaque changement de route).
export function trackPageView(path) {
  if (!loaded || disabled) return;
  window._paq.push(['setCustomUrl', path]);
  window._paq.push(['setDocumentTitle', document.title]);
  window._paq.push(['trackPageView']);
}

// Enregistre une recherche interne (rapport « Comportement → Recherches sur
// le site »). Matomo ne détecte pas nos recherches tout seul : notre paramètre
// d'URL s'appelle `destination`, pas `q`/`search`, d'où l'appel explicite.
export function trackSiteSearch(keyword, resultsCount) {
  if (!loaded || disabled) return;
  window._paq.push(['trackSiteSearch', keyword, false, resultsCount]);
}

// Retrait du consentement : on cesse tout envoi et on supprime les cookies
// first-party déjà posés par Matomo (_pk_*).
export function disableMatomo() {
  if (!loaded) return;
  disabled = true;
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0].trim();
    if (name.startsWith('_pk_')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}
