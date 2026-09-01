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
  const textColor = scrolled ? '#0A3172' : '#fff';
  const hoverBg = scrolled ? 'rgba(10, 49, 114, 0.06)' : 'rgba(255, 255, 255, 0.1)';
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
        color: danger ? '#e05252' : textColor,
        borderTop: borderTop
          ? `1px solid ${scrolled ? 'rgba(10,49,114,0.15)' : 'rgba(255,255,255,0.2)'}`
          : 'none',
        marginTop: borderTop ? '6px' : 0,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = danger ? 'rgba(224, 82, 82, 0.08)' : hoverBg)
      }
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </a>
  );
}

export default PanelLink;
