import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGlasses } from 'react-icons/fa';
import { FiCheck, FiMoon, FiSettings, FiSun } from 'react-icons/fi';
import { useVisualPreferences } from '../../../../context/VisualPreferencesContext.jsx';
import { useClickOutside } from './useClickOutside.js';
import { LANGUAGES } from './languages.js';

const COLOR_VISION_PROFILES = [
  { value: 'protanopia', labelKey: 'header.settings.protanopia' },
  { value: 'deuteranopia', labelKey: 'header.settings.deuteranopia' },
  { value: 'tritanopia', labelKey: 'header.settings.tritanopia' },
];

function SettingsMenu({ scrolled, onOpenChange }) {
  const { t, i18n } = useTranslation();
  const { theme, colorVision, setTheme, setColorVision } = useVisualPreferences();
  const [open, setOpen] = useState(false);
  const [colorVisionOpen, setColorVisionOpen] = useState(false);
  const ref = useRef(null);
  const settingsButtonRef = useRef(null);
  const activeGlassesButtonRef = useRef(null);
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, '-');
  const settingsPanelId = `${idBase}-settings-panel`;
  const colorVisionMenuId = `${idBase}-color-vision`;

  useClickOutside([[ref, () => closeMenus(true)]]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      if (colorVisionOpen) {
        setColorVisionOpen(false);
        activeGlassesButtonRef.current?.focus();
      } else {
        closeMenus();
        settingsButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [colorVisionOpen, open]);

  function closeMenus(restoreFocus = false) {
    setOpen(false);
    setColorVisionOpen(false);
    onOpenChange?.(false);
    if (restoreFocus) settingsButtonRef.current?.focus();
  }

  function handleGlassesClick(event) {
    activeGlassesButtonRef.current = event.currentTarget;
    setColorVisionOpen((value) => !value);
  }

  function handleColorVisionChange(value) {
    setColorVision(colorVision === value ? 'standard' : value);
  }

  function renderColorVisionOptions() {
    return (
      <div
        id={colorVisionMenuId}
        role="group"
        aria-label={t('header.settings.colorVisionOptions')}
        aria-hidden={!colorVisionOpen}
        data-settings-color-vision-options="true"
        className={`absolute inset-x-0 top-full mt-1 overflow-hidden transition-[max-height,opacity] duration-[180ms] ease-out motion-reduce:transition-none ${
          colorVisionOpen
            ? 'max-h-48 opacity-100 pointer-events-auto'
            : 'max-h-0 opacity-0 pointer-events-none'
        }`}
        style={{ display: colorVisionOpen ? 'block' : 'none' }}
      >
        <div
          data-settings-color-vision-block="true"
          className="flex w-full min-w-0 flex-col gap-1 overflow-hidden rounded-2xl border border-glass/40 p-1"
          style={{ backgroundColor: 'rgb(var(--sl-header-bar-bg) / 0.95)' }}
        >
          {COLOR_VISION_PROFILES.map(({ value, labelKey }) => {
            const selected = colorVision === value;
            return (
              <button
                key={value}
                type="button"
                aria-label={t(labelKey)}
                aria-pressed={selected}
                tabIndex={colorVisionOpen ? 0 : -1}
                onClick={() => {
                  handleColorVisionChange(value);
                  closeMenus();
                }}
                className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 text-left text-xs font-medium leading-tight text-on-dark transition-colors hover:bg-surface/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark ${
                  selected ? 'border-on-dark' : 'border-transparent'
                }`}
              >
                <span
                  className="min-w-0 flex-1 whitespace-normal break-words"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {t(labelKey)}
                </span>
                {selected && <FiCheck size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderControls() {
    const controlTabIndex = open ? 0 : -1;

    return (
      <>
        {LANGUAGES.map(({ code, Flag, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              i18n.changeLanguage(code);
              closeMenus();
            }}
            aria-label={label}
            title={label}
            aria-pressed={i18n.language === code}
            tabIndex={controlTabIndex}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md p-2.5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
          >
            <span
              className={`block overflow-hidden rounded-[3px] ${
                i18n.language === code
                  ? 'ring-2 ring-on-dark ring-offset-2 ring-offset-transparent'
                  : ''
              }`}
              style={{
                width: '26px',
                height: '18px',
                opacity: i18n.language === code ? 1 : 0.6,
                boxShadow: '0 0 0 1px rgb(var(--sl-glass) / 0.5)',
              }}
            >
              <Flag className="block h-full w-full" />
            </span>
            {i18n.language === code && (
              <FiCheck
                size={12}
                aria-hidden="true"
                className="absolute bottom-0.5 right-0.5 text-on-dark drop-shadow-md"
              />
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setTheme(theme === 'dark' ? 'light' : 'dark');
            closeMenus();
          }}
          aria-label={t(
            theme === 'dark' ? 'header.settings.lightMode' : 'header.settings.darkMode'
          )}
          title={t(theme === 'dark' ? 'header.settings.lightMode' : 'header.settings.darkMode')}
          aria-pressed={theme === 'dark'}
          tabIndex={controlTabIndex}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-on-dark opacity-60 drop-shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
        >
          {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>
        <button
          ref={activeGlassesButtonRef}
          type="button"
          onClick={handleGlassesClick}
          aria-label={t('header.settings.colorblindMode')}
          title={t('header.settings.colorblindMode')}
          aria-pressed={colorVision !== 'standard'}
          aria-expanded={colorVisionOpen}
          aria-controls={colorVisionMenuId}
          data-settings-color-vision-trigger="true"
          tabIndex={controlTabIndex}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-on-dark opacity-60 drop-shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
        >
          <FaGlasses size={20} />
        </button>
      </>
    );
  }

  function toggleSettings() {
    if (open) {
      closeMenus();
      return;
    }

    setOpen(true);
    onOpenChange?.(true);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        ref={settingsButtonRef}
        type="button"
        onClick={toggleSettings}
        aria-label={t('header.settings.label')}
        title={t('header.settings.label')}
        aria-expanded={open}
        aria-controls={settingsPanelId}
        className="flex items-center justify-center rounded-full p-3 text-on-dark transition-colors hover:bg-surface/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
      >
        <FiSettings size={scrolled ? 18 : 20} />
      </button>

      {/* Panneau ancré à côté de l'icône et glissement horizontal vers la
          gauche à l'ouverture — visuel d'origine (sans fond), rejoué ici sur
          les contrôles actuels (thème, daltonisme, langue). Les options
          daltoniennes sont positionnées en absolute (top-full), strictement
          sous la rangée d'icônes : hors du flux, leur déploiement ne fait
          donc plus bouger/recentrer le groupe (qui reste ancré sur l'icône
          via top-1/2 + -translate-y-1/2, calculé sur sa propre hauteur).
          Chaque choix (langue, thème, profil daltonien) referme tout le
          panneau au clic. */}
      <div
        id={settingsPanelId}
        role="region"
        aria-label={t('header.settings.label')}
        aria-hidden={!open}
        data-settings-group="true"
        className={`absolute right-full top-1/2 z-50 max-w-[calc(100vw-1rem)] -translate-y-1/2 pr-2 text-on-dark transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          open
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-3 opacity-0 pointer-events-none'
        }`}
      >
        <div
          data-visual-settings-panel="true"
          data-settings-controls="true"
          className="flex w-max max-w-full flex-nowrap items-center justify-end gap-1 sm:gap-2"
        >
          {renderControls()}
        </div>
        {renderColorVisionOptions()}
      </div>
    </div>
  );
}

export default SettingsMenu;
