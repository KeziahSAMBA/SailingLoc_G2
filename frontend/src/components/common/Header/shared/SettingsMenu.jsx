import { createPortal } from 'react-dom';
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

function SettingsMenu({ scrolled, onOpenChange, panelContainerRef }) {
  const { t, i18n } = useTranslation();
  const { theme, colorVision, setTheme, setColorVision } = useVisualPreferences();
  const [open, setOpen] = useState(false);
  const [colorVisionOpen, setColorVisionOpen] = useState(false);
  const ref = useRef(null);
  const settingsButtonRef = useRef(null);
  const activeGlassesButtonRef = useRef(null);
  const panelRef = useRef(null);
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, '-');
  const settingsPanelId = `${idBase}-settings-panel`;
  const colorVisionMenuId = `${idBase}-color-vision`;

  useClickOutside([
    [
      [ref, panelRef],
      () => {
        closeMenus();
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
        closeMenus();
        settingsButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [colorVisionOpen, open]);

  function closeMenus() {
    setOpen(false);
    setColorVisionOpen(false);
    onOpenChange?.(false);
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
        className={`grid transition-[grid-template-rows,opacity] duration-[180ms] ease-out motion-reduce:transition-none ${
          colorVisionOpen
            ? 'grid-rows-[1fr] opacity-100 pointer-events-auto'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="grid grid-cols-1 gap-1 border-t border-glass/20 pt-2 sm:grid-cols-3">
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
                  className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-lg border-2 px-3 py-2 text-left text-xs font-medium text-on-dark transition-colors hover:bg-surface/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark ${
                    selected ? 'border-on-dark' : 'border-transparent'
                  }`}
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
            className="relative flex shrink-0 items-center justify-center rounded-md p-2.5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
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
              <Flag className="w-full h-full block" />
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
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
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
        <div className="flex min-w-0 shrink-0">
          <button
            ref={activeGlassesButtonRef}
            type="button"
            onClick={handleGlassesClick}
            aria-label={t('header.settings.colorblindMode')}
            title={t('header.settings.colorblindMode')}
            aria-pressed={colorVision !== 'standard'}
            aria-expanded={colorVisionOpen}
            aria-haspopup="true"
            aria-controls={colorVisionMenuId}
            tabIndex={controlTabIndex}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-on-dark opacity-60 drop-shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
          >
            <FaGlasses size={20} />
          </button>
        </div>
      </>
    );
  }

  function renderPanel() {
    return (
      <div
        ref={panelRef}
        id={settingsPanelId}
        role="region"
        aria-label={t('header.settings.label')}
        data-visual-settings-panel="true"
        className="max-h-[calc(100vh-1rem)] overflow-y-auto rounded-2xl border border-glass/40 p-2 text-on-dark shadow-xl"
        style={{
          backgroundColor: 'rgb(var(--sl-header-settings-bg) / 0.96)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(14px)',
        }}
      >
        <div className="grid grid-cols-1 items-center gap-1 sm:grid-cols-4 sm:gap-2">
          {renderControls()}
        </div>
        {renderColorVisionOptions()}
      </div>
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

  const panel =
    open && panelContainerRef?.current
      ? createPortal(renderPanel(), panelContainerRef.current)
      : null;

  return (
    <div className="relative" ref={ref}>
      <button
        ref={settingsButtonRef}
        type="button"
        onClick={toggleSettings}
        aria-label={t('header.settings.label')}
        title={t('header.settings.label')}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={settingsPanelId}
        className="flex items-center justify-center rounded-full p-3 text-on-dark transition-colors hover:bg-surface/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark"
      >
        <FiSettings size={scrolled ? 18 : 20} />
      </button>
      {panel}
    </div>
  );
}

export default SettingsMenu;
