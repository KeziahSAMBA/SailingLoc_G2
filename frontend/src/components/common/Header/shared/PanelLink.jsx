/**
 * A link row inside a SidePanel.
 * - stretch: fills the flex parent evenly (used in fixed-height item lists)
 * - compact (default): natural height with vertical padding (used in longer menus)
 * - large: text-base instead of text-sm; defaults to `stretch` when omitted
 *   (historical coupling, kept for callers that don't care), pass it
 *   explicitly to control size independently of the layout mode.
 * - large={false} specifically means "small on mobile only" — the burger
 *   panel's section-title rows stay visible above `lg` too (only the
 *   menu-title rows get `lg:hidden`), so this reverts to the original
 *   large/flex-1 look at `lg` and up instead of staying small everywhere.
 */
function PanelLink({ href = '#', onClick, danger, scrolled, stretch, large, borderTop, children }) {
  const textColor = scrolled
    ? 'rgb(var(--sl-header-panel-scrolled-text))'
    : 'rgb(var(--sl-header-text))';
  const hoverBg = scrolled
    ? 'rgb(var(--sl-header-panel-scrolled-hover) / 0.06)'
    : 'rgb(var(--sl-glass) / 0.1)';
  const smallOnMobileOnly = large === false;
  const isLarge = large ?? stretch;
  const textSize = smallOnMobileOnly ? 'text-sm lg:text-base' : isLarge ? 'text-base' : 'text-sm';
  const layout =
    stretch && !smallOnMobileOnly && isLarge
      ? 'flex items-center flex-1 px-5'
      : stretch
        ? 'flex items-center px-5 py-5 lg:flex-1 lg:py-0'
        : 'flex flex-col justify-center px-5 py-4';

  function handleClick(e) {
    e.preventDefault();
    onClick?.(e);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`${layout} ${textSize} font-medium transition-colors`}
      style={{
        color: danger ? 'rgb(var(--sl-header-panel-danger))' : textColor,
        borderTop: borderTop
          ? `1px solid ${scrolled ? 'rgb(var(--sl-header-panel-scrolled-separator) / 0.15)' : 'rgb(var(--sl-glass) / 0.2)'}`
          : 'none',
        marginTop: borderTop ? '6px' : 0,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = danger
          ? 'rgb(var(--sl-header-panel-danger) / 0.08)'
          : hoverBg)
      }
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </a>
  );
}

export default PanelLink;
