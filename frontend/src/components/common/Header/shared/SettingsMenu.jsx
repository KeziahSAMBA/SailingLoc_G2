import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSettings, FiMoon } from 'react-icons/fi';
import { FaGlasses } from 'react-icons/fa';
import { useClickOutside } from './useClickOutside.js';
import { LANGUAGES } from './languages.js';

// Icône unique regroupant langue (fonctionnelle) et, pour l'instant à titre
// d'annonce, les futurs modes sombre/daltonien — partagée par le header
// public et les headers de dashboard. Les icônes glissent hors de l'icône
// paramètres elle-même (pas de panneau de texte), horizontalement vers la
// gauche des deux côtés — desktop sans fond, mobile avec un fond
// glassmorphism (cf. les deux variantes ci-dessous, gérées par sm:).
function SettingsMenu({ scrolled }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useClickOutside([[ref, () => setOpen(false)]]);

  const icons = (
    <>
      {LANGUAGES.map(({ code, Flag, label }) => (
        <button
          key={code}
          onClick={() => {
            i18n.changeLanguage(code);
            setOpen(false);
          }}
          aria-label={label}
          title={label}
          className="flex shrink-0 items-center justify-center rounded-md p-2.5 transition-transform hover:scale-110"
        >
          <span
            className="block overflow-hidden rounded-[3px]"
            style={{
              width: '26px',
              height: '18px',
              opacity: i18n.language === code ? 1 : 0.6,
              boxShadow: '0 0 0 1px rgba(255,255,255,0.5)',
            }}
          >
            <Flag className="w-full h-full block" />
          </span>
        </button>
      ))}
      <button
        type="button"
        disabled
        aria-label={t('header.settings.darkMode')}
        title={t('header.settings.darkMode')}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-white opacity-60 drop-shadow-md"
      >
        <FiMoon size={20} />
      </button>
      <button
        type="button"
        disabled
        aria-label={t('header.settings.colorblindMode')}
        title={t('header.settings.colorblindMode')}
        className="flex h-11 w-11 shrink-0 items-center justify-center text-white opacity-60 drop-shadow-md"
      >
        <FaGlasses size={20} />
      </button>
    </>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('header.settings.label')}
        title={t('header.settings.label')}
        className="flex items-center justify-center rounded-full p-3 text-white transition-colors hover:bg-white/10"
      >
        <FiSettings size={scrolled ? 18 : 20} />
      </button>

      {/* Web : glissement horizontal vers la gauche, sans fond. */}
      <div
        className={`absolute right-full top-1/2 hidden -translate-y-1/2 items-center gap-2.5 pr-2 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:flex ${
          open
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-3 opacity-0 pointer-events-none'
        }`}
      >
        {icons}
      </div>

      {/* Mobile : glissement horizontal vers la gauche, fond glassmorphism. */}
      <div
        className={`absolute right-full top-1/2 mr-2 flex -translate-y-1/2 items-center gap-2.5 rounded-2xl border border-white/15 p-2 shadow-xl transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:hidden ${
          open
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-3 opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        {icons}
      </div>
    </div>
  );
}

export default SettingsMenu;
