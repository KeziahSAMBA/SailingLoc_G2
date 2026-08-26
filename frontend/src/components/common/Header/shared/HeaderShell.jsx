import {
  CATEGORY_ENTER_TOTAL,
  INTRO_SOFT_EASING,
} from '../../../../hooks/useCategoryTransition.js';

/**
 * Coquille commune aux headers public et dashboard : positionnement fixed,
 * hauteur/masquage animés au scroll et à l'intro, calque de fond.
 */
function HeaderShell({ scrolled, introHidden, children }) {
  return (
    <header
      className="fixed top-0 left-0 z-50 flex w-full items-center px-4 sm:px-6 lg:px-12"
      style={{
        height: scrolled ? '60px' : 'clamp(64px, 6vw, 80px)',
        transform: introHidden ? 'translateY(-110%)' : 'none',
        transition: `height 0.3s ease, transform ${CATEGORY_ENTER_TOTAL}ms ${INTRO_SOFT_EASING}`,
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
          backgroundColor: scrolled ? 'rgba(10, 49, 114, 0.95)' : 'rgba(255, 255, 255, 0.05)',
          borderBottom: '1px solid rgba(90, 180, 236, 0.2)',
          boxShadow: scrolled ? '0 2px 12px rgba(10, 49, 114, 0.08)' : 'none',
          transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
        }}
      />

      {children}
    </header>
  );
}

export default HeaderShell;
