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

function SettingsMenu({ scrolled }) {
  const { t, i18n } = useTranslation();
  const { theme, colorVision, setTheme, setColorVision } = useVisualPreferences();
  const [open, setOpen] = useState(false);
  const [colorVisionOpen, setColorVisionOpen] = useState(false);
  const ref = useRef(null);
  const settingsButtonRef = useRef(null);
  const activeGlassesButtonRef = useRef(null);
  const desktopGlassesButtonRef = useRef(null);
  const mobileGlassesButtonRef = useRef(null);
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, '-');
  const colorVisionMenuIds = {
    desktop: `${idBase}-desktop-color-vision`,
    mobile: `${idBase}-mobile-color-vision`,
  };

  useClickOutside([
    [
      ref,
      () => {
        setOpen(false);
        setColorVisionOpen(false);
      },
    ],
  ]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      if (colorVisionOpen) {
        setColorVisionOpen(false);
        activeGlassesButtonRef.current?.focus();
      } else {
        setOpen(false);
        settingsButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [colorVisionOpen, open]);

  function closeMenus() {
    setOpen(false);
    setColorVisionOpen(false);
  }

  function handleGlassesClick(event) {
    activeGlassesButtonRef.current = event.currentTarget;
    setColorVisionOpen((value) => !value);
  }

  function handleColorVisionChange(value) {
    setColorVision(colorVision === value ? 'standard' : value);
  }

  function renderColorVisionOptions(menuId) {
    return (
      <div
        id={menuId}
        role="group"
        aria-label={t('header.settings.colorVisionOptions')}
        aria-hidden={!colorVisionOpen}
        className={`absolute right-0 top-full z-50 mt-1 grid w-max min-w-[11rem] transition-[grid-template-rows,opacity] duration-[180ms] ease-out motion-reduce:transition-none ${
          colorVisionOpen
            ? 'grid-rows-[1fr] opacity-100 pointer-events-auto'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="min-h-0 overflow-hidden rounded-xl border border-glass/20 bg-slate-900/95 shadow-xl">
          <div className="flex flex-col py-1">
            {COLOR_VISION_PROFILES.map(({ value, labelKey }) => {
              const selected = colorVision === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={t(labelKey)}
                  aria-pressed={selected}
                  tabIndex={colorVisionOpen ? 0 : -1}
                  onClick={() => handleColorVisionChange(value)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium text-on-dark transition-colors hover:bg-surface/10"
                >
                  <span>{t(labelKey)}</span>
                  {selected && <FiCheck size={14} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderControls(variant) {
    const colorVisionMenuId = colorVisionMenuIds[variant];
    const glassesButtonRef =
      variant === 'desktop' ? desktopGlassesButtonRef : mobileGlassesButtonRef;
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
            tabIndex={controlTabIndex}
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
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={t(
            theme === 'dark' ? 'header.settings.lightMode' : 'header.settings.darkMode'
          )}
          title={t(theme === 'dark' ? 'header.settings.lightMode' : 'header.settings.darkMode')}
          aria-pressed={theme === 'dark'}
          tabIndex={controlTabIndex}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-on-dark opacity-60 drop-shadow-md"
        >
          {theme === 'dark' ? <FiSun size={20} /> : <FiMoon size={20} />}
        </button>
        <div className="relative flex shrink-0">
          <button
            ref={glassesButtonRef}
            type="button"
            onClick={handleGlassesClick}
            aria-label={t('header.settings.colorblindMode')}
            title={t('header.settings.colorblindMode')}
            aria-pressed={colorVision !== 'standard'}
            aria-expanded={colorVisionOpen}
            aria-haspopup="true"
            aria-controls={colorVisionMenuId}
            tabIndex={controlTabIndex}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-on-dark opacity-60 drop-shadow-md"
          >
            <FaGlasses size={20} />
          </button>
          {renderColorVisionOptions(colorVisionMenuId)}
        </div>
      </>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        ref={settingsButtonRef}
        type="button"
        onClick={() => {
          if (open) setColorVisionOpen(false);
          setOpen((value) => !value);
        }}
        aria-label={t('header.settings.label')}
        title={t('header.settings.label')}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center justify-center rounded-full p-3 text-on-dark transition-colors hover:bg-surface/10"
      >
        <FiSettings size={scrolled ? 18 : 20} />
      </button>

      {/* Web : glissement horizontal vers la gauche, sans fond. */}
      <div
        aria-hidden={!open}
        className={`absolute right-full top-1/2 hidden -translate-y-1/2 items-center gap-2.5 pr-2 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:flex ${
          open
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-3 opacity-0 pointer-events-none'
        }`}
      >
        {renderControls('desktop')}
      </div>

      {/* Mobile : glissement horizontal vers la gauche, fond glassmorphism. */}
      <div
        aria-hidden={!open}
        className={`absolute right-full top-1/2 mr-2 flex -translate-y-1/2 items-center gap-2.5 rounded-2xl border border-glass/15 p-2 shadow-xl transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:hidden ${
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
        {renderControls('mobile')}
      </div>
    </div>
  );
}

export default SettingsMenu;
