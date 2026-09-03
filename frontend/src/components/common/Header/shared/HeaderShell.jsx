import { useLayoutEffect, useRef, useState } from 'react';
import {
  CATEGORY_ENTER_TOTAL,
  INTRO_SOFT_EASING,
} from '../../../../hooks/useCategoryTransition.js';

/**
 * Coquille commune aux headers public et dashboard : positionnement fixed,
 * hauteur/masquage animés au scroll et à l'intro, calque de fond.
 */
function HeaderShell({ scrolled, introHidden, settingsOpen = false, settingsPanelRef, children }) {
  const headerRef = useRef(null);
  const barRef = useRef(null);
  const [settingsHeight, setSettingsHeight] = useState(0);
  const baseHeight = scrolled ? '60px' : 'clamp(64px, 6vw, 80px)';

  useLayoutEffect(() => {
    const header = headerRef.current;
    const bar = barRef.current;
    if (!header || !bar) return undefined;

    const updateReservedHeight = () => {
      if (!settingsOpen) {
        setSettingsHeight(0);
        return;
      }

      const headerHeight = header.getBoundingClientRect().height;
      const barHeight = bar.getBoundingClientRect().height;
      setSettingsHeight(Math.max(0, headerHeight - barHeight));
    };

    updateReservedHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateReservedHeight);
      return () => window.removeEventListener('resize', updateReservedHeight);
    }

    const observer = new ResizeObserver(updateReservedHeight);
    observer.observe(header);
    if (settingsPanelRef?.current) observer.observe(settingsPanelRef.current);
    return () => observer.disconnect();
  }, [scrolled, settingsOpen, settingsPanelRef]);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 z-50 flex w-full flex-col items-stretch"
        style={{
          minHeight: baseHeight,
          transform: introHidden ? 'translateY(-110%)' : 'none',
          transition: `min-height 0.3s ease, transform ${CATEGORY_ENTER_TOTAL}ms ${INTRO_SOFT_EASING}`,
        }}
      >
        {/*
          Background lives on its own layer (not on <header> itself) because a
          backdrop-filter on an element makes it a new containing block for
          fixed-position descendants — which would break the SidePanel(s)' own
          backdrop-filter (they're nested inside <header>).
        */}
        <div
          className="absolute left-0 right-0 top-0 -z-10"
          style={{
            height: baseHeight,
            backgroundColor:
              scrolled || settingsOpen
                ? 'rgb(var(--sl-header-bar-bg) / 0.95)'
                : 'rgb(var(--sl-glass) / 0.05)',
            borderBottom: '1px solid rgb(var(--sl-brand) / 0.2)',
            boxShadow: scrolled ? '0 2px 12px rgb(var(--sl-brand-navy) / 0.08)' : 'none',
            transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
          }}
        />

        <div
          ref={barRef}
          data-header-bar="true"
          className="flex w-full shrink-0 items-center px-4 sm:px-6 lg:px-12"
          style={{ height: baseHeight }}
        >
          {children}
        </div>

        <div
          ref={settingsPanelRef}
          aria-hidden={!settingsOpen}
          className={settingsOpen ? 'mx-2 mb-2 min-w-0' : 'hidden'}
          style={{ maxHeight: 'calc(100vh - 1rem)' }}
        />
      </header>

      <div
        aria-hidden="true"
        data-header-settings-spacer="true"
        style={{ height: `${settingsHeight}px`, pointerEvents: 'none' }}
      />
    </>
  );
}

export default HeaderShell;
