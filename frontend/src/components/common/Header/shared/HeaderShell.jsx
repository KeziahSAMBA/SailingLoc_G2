import {
  CATEGORY_ENTER_TOTAL,
  INTRO_SOFT_EASING,
} from '../../../../hooks/useCategoryTransition.js';

function HeaderShell({ scrolled, introHidden, children }) {
  const baseHeight = scrolled ? '60px' : 'clamp(64px, 6vw, 80px)';

  return (
    <header
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
          backgroundColor: scrolled
            ? 'rgb(var(--sl-header-bar-bg) / 0.95)'
            : 'rgb(var(--sl-glass-fill) / 0.05)',
          borderBottom: '1px solid rgb(var(--sl-brand) / 0.2)',
          boxShadow: scrolled ? '0 2px 12px rgb(var(--sl-brand-navy) / 0.08)' : 'none',
          transition: 'box-shadow 0.3s ease, background-color 0.3s ease',
        }}
      />

      <div
        data-header-bar="true"
        className="flex h-full w-full shrink-0 items-center px-4 sm:px-6 lg:px-12"
        style={{ height: baseHeight, minHeight: baseHeight }}
      >
        {children}
      </div>
    </header>
  );
}

export default HeaderShell;
