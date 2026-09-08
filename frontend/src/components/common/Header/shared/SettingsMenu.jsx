import { createPortal } from 'react-dom';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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

const HEADER_VIEWPORT_MARGIN = 8;
const HEADER_TRANSITION_GUARD_MARGIN_MS = 120;

function approximatelyEqual(first, second, tolerance = 0.5) {
  return first !== null && second !== null && Math.abs(first - second) < tolerance;
}

function SettingsMenu({ scrolled, onOpenChange }) {
  const { t, i18n } = useTranslation();
  const { theme, colorVision, setTheme, setColorVision } = useVisualPreferences();
  const [open, setOpen] = useState(false);
  const [colorVisionOpen, setColorVisionOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState(null);
  const ref = useRef(null);
  const settingsButtonRef = useRef(null);
  const activeGlassesButtonRef = useRef(null);
  const settingsGroupRef = useRef(null);
  const panelRef = useRef(null);
  const pendingFocusRef = useRef(null);
  const focusFrameRef = useRef(null);
  const layoutStateRef = useRef(null);
  const measurementStateRef = useRef({ pending: false, version: 0, width: null });
  const idBase = useId().replace(/[^a-zA-Z0-9_-]/g, '-');
  const settingsPanelId = `${idBase}-settings-panel`;
  const colorVisionMenuId = `${idBase}-color-vision`;

  layoutStateRef.current = {
    open,
    colorVisionOpen,
    panelPosition,
  };

  useClickOutside([[[ref, settingsGroupRef], () => closeMenus(true)]]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      if (colorVisionOpen) {
        pendingFocusRef.current = { target: 'glasses' };
        setColorVisionOpen(false);
      } else {
        closeMenus();
        settingsButtonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [colorVisionOpen, open]);

  function cancelFocusRestore() {
    if (focusFrameRef.current === null) return;
    window.cancelAnimationFrame?.(focusFrameRef.current);
    focusFrameRef.current = null;
  }

  function closeMenus(restoreFocus = false) {
    pendingFocusRef.current = null;
    cancelFocusRestore();
    setOpen(false);
    setColorVisionOpen(false);
    setPanelPosition(null);
    onOpenChange?.(false);
    if (restoreFocus) settingsButtonRef.current?.focus();
  }

  function handleGlassesClick(event) {
    pendingFocusRef.current = null;
    cancelFocusRestore();
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
        className={`w-full overflow-hidden transition-[max-height,opacity] duration-[180ms] ease-out motion-reduce:transition-none ${
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
                onClick={() => handleColorVisionChange(value)}
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

  function renderSettingsPortal() {
    if (!open || typeof document === 'undefined') return null;

    return createPortal(
      <div
        ref={settingsGroupRef}
        id={settingsPanelId}
        role="region"
        aria-label={t('header.settings.label')}
        data-settings-group="true"
        className="flex max-w-[calc(100vw-1rem)] flex-col items-stretch gap-1 text-on-dark"
        style={{
          position: 'fixed',
          top: `${panelPosition?.top ?? 0}px`,
          left: `${panelPosition?.left ?? 0}px`,
          width: panelPosition ? `${panelPosition.width}px` : 'max-content',
          maxWidth: 'calc(100vw - 1rem)',
          maxHeight: 'calc(100vh - 1rem)',
          overflowY: 'auto',
          visibility: panelPosition ? 'visible' : 'hidden',
          pointerEvents: panelPosition ? 'auto' : 'none',
          zIndex: 60,
        }}
      >
        <div
          ref={panelRef}
          data-visual-settings-panel="true"
          data-header-settings-placement="fixed"
          className="w-full rounded-2xl border border-glass/40 p-1 text-on-dark"
          style={{ backgroundColor: 'rgb(var(--sl-header-bar-bg) / 0.95)' }}
        >
          <div
            data-settings-controls="true"
            className="flex w-max max-w-full flex-nowrap items-center justify-end gap-1 sm:gap-2"
          >
            {renderControls()}
          </div>
        </div>
        {renderColorVisionOptions()}
      </div>,
      document.body
    );
  }

  useLayoutEffect(() => {
    if (!open) {
      measurementStateRef.current = {
        ...measurementStateRef.current,
        pending: false,
        width: null,
      };
      return undefined;
    }

    let disposed = false;
    let scheduledFrame = null;
    let scheduledWithAnimationFrame = false;
    let headerTransitionFrame = null;
    let headerTransitionUsesAnimationFrame = false;
    let headerTransitionActive = false;
    let headerTransitionTimeout = null;
    const header = settingsButtonRef.current?.closest('header');

    const measure = () => {
      if (disposed) return;

      const group = settingsGroupRef.current;
      const panel = panelRef.current;
      const trigger = settingsButtonRef.current;
      if (!group || !panel || !trigger) {
        measurementStateRef.current = {
          ...measurementStateRef.current,
          pending: false,
          version: measurementStateRef.current.version + 1,
          width: null,
        };
        return;
      }

      const controls = panel.querySelector('[data-settings-controls]');
      const controlItems = controls ? [...controls.children] : [];
      const controlsStyles = controls ? window.getComputedStyle(controls) : null;
      const controlGap = controlsStyles
        ? Number.parseFloat(controlsStyles.columnGap || controlsStyles.gap) || 0
        : 0;
      const controlsWidth = controlItems.reduce(
        (total, element) => total + element.getBoundingClientRect().width,
        0
      );
      const controlsGaps = Math.max(0, controlItems.length - 1) * controlGap;
      const panelStyles = window.getComputedStyle(panel);
      const panelChrome =
        (Number.parseFloat(panelStyles.paddingLeft) || 0) +
        (Number.parseFloat(panelStyles.paddingRight) || 0) +
        (Number.parseFloat(panelStyles.borderLeftWidth) || 0) +
        (Number.parseFloat(panelStyles.borderRightWidth) || 0);
      const viewportWidth = Math.max(0, document.documentElement.clientWidth || window.innerWidth);
      const maxPanelWidth = Math.max(0, viewportWidth - HEADER_VIEWPORT_MARGIN * 2);
      const width = Math.min(
        controlsWidth + controlsGaps + panelChrome,
        maxPanelWidth || controlsWidth + controlsGaps + panelChrome
      );
      const triggerRect = trigger.getBoundingClientRect();
      const groupHeight = group.getBoundingClientRect().height;
      const viewportHeight = Math.max(
        0,
        document.documentElement.clientHeight || window.innerHeight
      );
      const maxTop = Math.max(HEADER_VIEWPORT_MARGIN, viewportHeight - groupHeight - 8);
      const top = Math.min(triggerRect.bottom + 8, maxTop);
      const minimumRight = HEADER_VIEWPORT_MARGIN + width;
      const maximumRight = Math.max(minimumRight, viewportWidth - HEADER_VIEWPORT_MARGIN);
      const right = Math.min(maximumRight, Math.max(minimumRight, triggerRect.right));
      const left = Math.max(HEADER_VIEWPORT_MARGIN, right - width);
      const nextPosition = { top, left, width };

      measurementStateRef.current = {
        ...measurementStateRef.current,
        pending: false,
        version: measurementStateRef.current.version + 1,
        width,
      };

      setPanelPosition((current) => {
        if (
          current &&
          approximatelyEqual(current.top, nextPosition.top) &&
          approximatelyEqual(current.left, nextPosition.left) &&
          approximatelyEqual(current.width, nextPosition.width)
        ) {
          return current;
        }
        return nextPosition;
      });
    };

    const scheduleMeasure = () => {
      if (disposed) return;

      measurementStateRef.current = {
        ...measurementStateRef.current,
        pending: true,
      };
      if (scheduledFrame !== null) return;

      const callback = () => {
        scheduledFrame = null;
        if (!disposed) measure();
      };

      if (typeof window.requestAnimationFrame === 'function') {
        scheduledWithAnimationFrame = true;
        scheduledFrame = window.requestAnimationFrame(callback);
      } else {
        scheduledWithAnimationFrame = false;
        window.queueMicrotask?.(callback);
      }
    };

    const cancelHeaderTransitionFrame = () => {
      if (headerTransitionFrame === null) return;
      if (headerTransitionUsesAnimationFrame && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(headerTransitionFrame);
      } else {
        window.clearTimeout(headerTransitionFrame);
      }
      headerTransitionFrame = null;
    };

    const cancelHeaderTransitionGuard = () => {
      if (headerTransitionTimeout === null) return;
      window.clearTimeout(headerTransitionTimeout);
      headerTransitionTimeout = null;
    };

    const parseCssTime = (value) => {
      const normalized = String(value || '').trim();
      if (!normalized) return 0;
      const amount = Number.parseFloat(normalized);
      if (!Number.isFinite(amount) || amount < 0) return 0;
      if (normalized.endsWith('ms')) return amount;
      if (normalized.endsWith('s')) return amount * 1000;
      return 0;
    };

    const getHeaderTransitionBudget = () => {
      if (!header) return 0;
      const styles = window.getComputedStyle(header);
      const properties = String(styles.transitionProperty || '')
        .split(',')
        .map((value) => value.trim());
      const durations = String(styles.transitionDuration || '')
        .split(',')
        .map(parseCssTime);
      const delays = String(styles.transitionDelay || '')
        .split(',')
        .map(parseCssTime);
      const count = Math.max(durations.length, delays.length);
      let budget = 0;
      for (let index = 0; index < count; index += 1) {
        const property = properties[index % properties.length] || '';
        if (property && property !== 'all' && property !== 'transform') continue;
        const duration = durations[index % durations.length] || 0;
        const delay = delays[index % delays.length] || 0;
        budget = Math.max(budget, duration + delay);
      }
      return budget;
    };

    const scheduleHeaderTransitionGuard = () => {
      cancelHeaderTransitionGuard();
      const delay = getHeaderTransitionBudget() + HEADER_TRANSITION_GUARD_MARGIN_MS;
      headerTransitionTimeout = window.setTimeout(() => {
        headerTransitionTimeout = null;
        stopHeaderTransitionTracking();
      }, delay);
    };

    const measureHeaderTransitionFrame = () => {
      headerTransitionFrame = null;
      if (disposed || !headerTransitionActive) return;
      measure();
      if (typeof window.requestAnimationFrame === 'function') {
        headerTransitionUsesAnimationFrame = true;
        headerTransitionFrame = window.requestAnimationFrame(measureHeaderTransitionFrame);
      } else {
        headerTransitionUsesAnimationFrame = false;
        headerTransitionFrame = window.setTimeout(measureHeaderTransitionFrame, 16);
      }
    };

    const startHeaderTransitionTracking = () => {
      if (disposed) return;
      headerTransitionActive = true;
      scheduleHeaderTransitionGuard();
      if (headerTransitionFrame === null) measureHeaderTransitionFrame();
    };

    const stopHeaderTransitionTracking = () => {
      if (!headerTransitionActive) return;
      headerTransitionActive = false;
      cancelHeaderTransitionFrame();
      cancelHeaderTransitionGuard();
      scheduleMeasure();
    };

    const isTransformTransition = (event) =>
      event.target === header && (!event.propertyName || event.propertyName === 'transform');
    const handleHeaderTransitionRun = (event) => {
      if (isTransformTransition(event)) startHeaderTransitionTracking();
    };
    const handleHeaderTransitionEnd = (event) => {
      if (isTransformTransition(event)) stopHeaderTransitionTracking();
    };

    header?.addEventListener('transitionrun', handleHeaderTransitionRun);
    header?.addEventListener('transitionstart', handleHeaderTransitionRun);
    header?.addEventListener('transitionend', handleHeaderTransitionEnd);
    header?.addEventListener('transitioncancel', handleHeaderTransitionEnd);

    if (
      header
        ?.getAnimations?.()
        .some(
          (animation) =>
            animation.playState === 'running' &&
            (!animation.transitionProperty || animation.transitionProperty === 'transform')
        )
    ) {
      startHeaderTransitionTracking();
    }

    const resizeObserver =
      typeof window.ResizeObserver === 'function'
        ? new window.ResizeObserver(scheduleMeasure)
        : null;
    const observedGroup = settingsGroupRef.current;
    const observedTrigger = settingsButtonRef.current;
    if (observedGroup) resizeObserver?.observe(observedGroup);
    if (observedTrigger) resizeObserver?.observe(observedTrigger);

    const mutationObserver =
      typeof window.MutationObserver === 'function'
        ? new window.MutationObserver(scheduleMeasure)
        : null;
    if (observedGroup) {
      mutationObserver?.observe(observedGroup, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }

    scheduleMeasure();
    document.fonts?.ready?.then(scheduleMeasure, scheduleMeasure);
    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);
    window.visualViewport?.addEventListener('resize', scheduleMeasure);

    return () => {
      disposed = true;
      if (scheduledFrame !== null) {
        if (scheduledWithAnimationFrame && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(scheduledFrame);
        }
        scheduledFrame = null;
      }
      headerTransitionActive = false;
      cancelHeaderTransitionFrame();
      cancelHeaderTransitionGuard();
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      header?.removeEventListener('transitionrun', handleHeaderTransitionRun);
      header?.removeEventListener('transitionstart', handleHeaderTransitionRun);
      header?.removeEventListener('transitionend', handleHeaderTransitionEnd);
      header?.removeEventListener('transitioncancel', handleHeaderTransitionEnd);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
    };
  }, [colorVisionOpen, i18n.language, open, scrolled, theme]);

  useLayoutEffect(() => {
    if (!open || pendingFocusRef.current?.target !== 'glasses') return undefined;

    let disposed = false;
    const focusRequest = pendingFocusRef.current;

    const scheduleFocusCheck = (callback) => {
      if (disposed || pendingFocusRef.current !== focusRequest) return;
      if (typeof window.requestAnimationFrame === 'function') {
        focusFrameRef.current = window.requestAnimationFrame(() => {
          focusFrameRef.current = null;
          callback();
        });
        return;
      }
      window.queueMicrotask?.(callback);
    };

    const isCurrentLayout = () => {
      const state = layoutStateRef.current;
      const measurement = measurementStateRef.current;
      return (
        state.panelPosition &&
        !measurement.pending &&
        approximatelyEqual(state.panelPosition.width, measurement.width)
      );
    };

    const checkFocus = () => {
      if (disposed || pendingFocusRef.current !== focusRequest) return;

      const currentGlassesButton = settingsGroupRef.current?.querySelector(
        '[data-settings-color-vision-trigger="true"]'
      );
      if (!currentGlassesButton?.isConnected || !isCurrentLayout()) {
        scheduleFocusCheck(checkFocus);
        return;
      }

      const stablePosition = layoutStateRef.current.panelPosition;
      const stableVersion = measurementStateRef.current.version;
      currentGlassesButton.focus();

      scheduleFocusCheck(() => {
        if (disposed || pendingFocusRef.current !== focusRequest) return;

        const latestButton = settingsGroupRef.current?.querySelector(
          '[data-settings-color-vision-trigger="true"]'
        );
        const latestPosition = layoutStateRef.current.panelPosition;
        const stable =
          latestButton === currentGlassesButton &&
          latestButton?.isConnected &&
          document.activeElement === latestButton &&
          latestPosition &&
          stablePosition &&
          approximatelyEqual(latestPosition.top, stablePosition.top) &&
          approximatelyEqual(latestPosition.left, stablePosition.left) &&
          approximatelyEqual(latestPosition.width, stablePosition.width) &&
          measurementStateRef.current.version === stableVersion &&
          isCurrentLayout();

        if (stable) {
          pendingFocusRef.current = null;
          return;
        }
        scheduleFocusCheck(checkFocus);
      });
    };

    scheduleFocusCheck(checkFocus);

    return () => {
      disposed = true;
      cancelFocusRestore();
    };
  }, [colorVisionOpen, i18n.language, open, panelPosition, scrolled]);

  useEffect(
    () => () => {
      pendingFocusRef.current = null;
      cancelFocusRestore();
    },
    []
  );

  function toggleSettings() {
    if (open) {
      closeMenus();
      return;
    }

    setPanelPosition(null);
    setOpen(true);
    onOpenChange?.(true);
  }

  return (
    <>
      <div className="contents" ref={ref}>
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
      </div>
      {renderSettingsPortal()}
    </>
  );
}

export default SettingsMenu;
