import { useLayoutEffect, useRef, useState } from 'react';
import {
  CATEGORY_ENTER_TOTAL,
  INTRO_SOFT_EASING,
} from '../../../../hooks/useCategoryTransition.js';

/**
 * Coquille commune aux headers public et dashboard : positionnement fixed,
 * hauteur/masquage animés au scroll et à l'intro, calque de fond.
 */
function HeaderShell({ scrolled, introHidden, settingsOpen = false, children }) {
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
      // The settings row is now part of the header bar itself.  Use the
      // resolved minimum height as the baseline so the spacer reserves only
      // the additional row height and does not shift the page by the whole
      // fixed header height when the panel opens.
      const baseBarHeight = Number.parseFloat(window.getComputedStyle(bar).minHeight);
      setSettingsHeight(
        Math.max(0, headerHeight - (Number.isFinite(baseBarHeight) ? baseBarHeight : 0))
      );
    };

    updateReservedHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateReservedHeight);
      return () => window.removeEventListener('resize', updateReservedHeight);
    }

    const observer = new ResizeObserver(updateReservedHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [scrolled, settingsOpen]);

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
          className="absolute inset-0 -z-10"
          style={{
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
          style={{ minHeight: baseHeight }}
        >
          {children}
        </div>
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
