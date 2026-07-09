import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PURPOSES } from '../../context/CookieConsentContext.jsx';
import { useCookieConsent } from '../../hooks/useCookieConsent.jsx';

// Bannière de consentement cookies conforme aux règles CNIL :
// - « Tout accepter » et « Tout refuser » au même niveau (mêmes taille/couleur/écran) ;
// - lien de paramétrage finalité par finalité ;
// - qui dépose et pour quoi faire, indiqué dans la bannière et détaillé par
//   finalité dans le panneau ;
// - rien n'est déposé tant qu'aucun choix n'est fait (voir CookieConsentContext).

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2';

// Boutons Accepter/Refuser : classe strictement identique (exigence CNIL).
// Bleu foncé du site : contraste suffisant avec le texte blanc (a11y).
const choiceBtnClass = `rounded-full bg-[#0A3172] px-6 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#0d3d8c] ${FOCUS_RING}`;

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${FOCUS_RING} ${
        checked ? 'bg-[#0A3172]' : 'bg-slate-300'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function PreferencesPanel({ onClose }) {
  const { t } = useTranslation();
  const { consent, savePreferences } = useCookieConsent();

  // Opt-in strict : tout est décoché par défaut tant qu'aucun choix n'existe.
  const [choices, setChoices] = useState(() =>
    Object.fromEntries(PURPOSES.map((p) => [p, consent?.[p] ?? false]))
  );

  // Fermeture clavier (Échap) — le choix précédent (ou l'absence de choix) est conservé.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Verrouille le scroll de la page tant que le panneau est ouvert : seule la
  // liste des finalités défile, pas le fond.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        {/* En-tête fixe : titre + fermeture restent visibles pendant le défilement. */}
        <div className="mb-3 flex shrink-0 items-start justify-between gap-4">
          <h2 id="cookie-prefs-title" className="text-lg font-semibold text-slate-900">
            {t('cookieConsent.prefs.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('cookieConsent.prefs.close')}
            className={`rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 ${FOCUS_RING}`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Zone défilante : intro, cookies exemptés et finalités. overscroll-contain
            évite que le défilement se propage à la page une fois en butée. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <p className="mb-5 text-sm leading-relaxed text-slate-600">
            {t('cookieConsent.prefs.intro')}
          </p>

          {/* Cookies exemptés : listés pour information, non désactivables. */}
          <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              {t('cookieConsent.prefs.essentialTitle')}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {t('cookieConsent.prefs.essentialDesc')}
            </p>
          </section>

          {/* Finalités soumises à consentement, une par une. */}
          <ul className="space-y-3">
            {PURPOSES.map((purpose) => {
              const name = t(`cookieConsent.prefs.purposes.${purpose}.name`);
              return (
                <li
                  key={purpose}
                  className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {t(`cookieConsent.prefs.purposes.${purpose}.desc`)}
                    </p>
                  </div>
                  <Switch
                    checked={choices[purpose]}
                    onChange={(value) => setChoices((prev) => ({ ...prev, [purpose]: value }))}
                    label={t('cookieConsent.prefs.toggleAria', { name })}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        {/* Pied fixe : le bouton d'enregistrement reste toujours accessible. */}
        <button
          type="button"
          onClick={() => savePreferences(choices)}
          className={`mt-5 w-full shrink-0 ${choiceBtnClass}`}
        >
          {t('cookieConsent.prefs.save')}
        </button>
      </div>
    </div>
  );
}

function CookieConsentBanner() {
  const { t } = useTranslation();
  const { consent, acceptAll, refuseAll, openPreferences, preferencesOpen, closePreferences } =
    useCookieConsent();

  if (preferencesOpen) return <PreferencesPanel onClose={closePreferences} />;
  if (consent) return null;

  return (
    <section
      role="dialog"
      aria-label={t('cookieConsent.banner.title')}
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.15)] sm:p-6"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-900">
            {t('cookieConsent.banner.title')}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {t('cookieConsent.banner.body')}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:shrink-0">
          {/* Refuser et Accepter : strictement identiques (CNIL). */}
          <button type="button" onClick={refuseAll} className={choiceBtnClass}>
            {t('cookieConsent.banner.refuseAll')}
          </button>
          <button type="button" onClick={acceptAll} className={choiceBtnClass}>
            {t('cookieConsent.banner.acceptAll')}
          </button>
          <button
            type="button"
            onClick={openPreferences}
            className={`rounded-full border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${FOCUS_RING}`}
          >
            {t('cookieConsent.banner.customize')}
          </button>
        </div>
      </div>
    </section>
  );
}

export default CookieConsentBanner;
