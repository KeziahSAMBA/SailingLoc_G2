import { createContext, useCallback, useState } from 'react';

// Gestion du consentement cookies (RGPD / recommandations CNIL).
//
// Cookies exemptés (déposés sans consentement, simplement listés dans le
// panneau) : session d'authentification, préférence de langue
// (`sailingloc_lang`), et la mémorisation du choix de consentement ci-dessous.
//
// Finalités soumises à consentement : rien ne doit se déposer tant que
// l'utilisateur n'a pas fait de choix explicite. Avant de charger un script
// tiers (analytics, pub…), toujours vérifier la finalité correspondante via
// useCookieConsent() (React) ou getStoredConsent() (hors React).

const STORAGE_KEY = 'sailingloc_cookie_consent';

// À incrémenter si les finalités ou les partenaires changent : le consentement
// stocké devient caduc et la bannière est représentée.
// v2 : mesure d'audience passée de Google Analytics à Matomo self-hosted.
const CONSENT_VERSION = 2;

// CNIL : le choix (accord OU refus) est conservé ~6 mois, puis on redemande.
const CONSENT_TTL_MS = 6 * 30 * 24 * 60 * 60 * 1000;

// Finalités non essentielles, désactivées par défaut (opt-in strict).
// N'ajouter une finalité que si elle est réellement utilisée (et incrémenter
// CONSENT_VERSION pour redemander le consentement).
export const PURPOSES = ['analytics', 'ads', 'personalization'];

const REFUSED_ALL = Object.fromEntries(PURPOSES.map((p) => [p, false]));
const ACCEPTED_ALL = Object.fromEntries(PURPOSES.map((p) => [p, true]));

// Lit le choix stocké ; null si absent, expiré ou d'une version obsolète.
// Utilisable hors React (ex. chargeur de script analytics).
export function getStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CONSENT_VERSION) return null;
    const age = Date.now() - new Date(parsed.date).getTime();
    if (!parsed.date || Number.isNaN(age) || age > CONSENT_TTL_MS) return null;
    return { ...REFUSED_ALL, ...parsed.purposes };
  } catch {
    return null;
  }
}

const CookieConsentContext = createContext({
  consent: null,
  acceptAll: () => {},
  refuseAll: () => {},
  savePreferences: () => {},
  openPreferences: () => {},
  preferencesOpen: false,
  closePreferences: () => {},
});

export function CookieConsentProvider({ children }) {
  // null = aucun choix valide → la bannière doit s'afficher.
  const [consent, setConsent] = useState(getStoredConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

  const persist = useCallback((purposes) => {
    const normalized = { ...REFUSED_ALL, ...purposes };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: CONSENT_VERSION,
        date: new Date().toISOString(),
        purposes: normalized,
      })
    );
    setConsent(normalized);
    setPreferencesOpen(false);
  }, []);

  const acceptAll = useCallback(() => persist(ACCEPTED_ALL), [persist]);
  const refuseAll = useCallback(() => persist(REFUSED_ALL), [persist]);
  const savePreferences = useCallback((purposes) => persist(purposes), [persist]);

  const openPreferences = useCallback(() => setPreferencesOpen(true), []);
  const closePreferences = useCallback(() => setPreferencesOpen(false), []);

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        acceptAll,
        refuseAll,
        savePreferences,
        openPreferences,
        preferencesOpen,
        closePreferences,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export default CookieConsentContext;
