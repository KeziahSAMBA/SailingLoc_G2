/**
 * A link row inside a SidePanel.
 * - stretch: fills the flex parent evenly (used in fixed-height item lists)
 * - compact (default): natural height with vertical padding (used in longer menus)
 */
function PanelLink({ href = '#', onClick, danger, scrolled, stretch, borderTop, children }) {
  const textColor = scrolled ? '#0A3172' : '#fff';
  const hoverBg = scrolled ? 'rgba(10, 49, 114, 0.06)' : 'rgba(255, 255, 255, 0.1)';

  function handleClick(e) {
    e.preventDefault();
    onClick?.(e);
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className={
        stretch
          ? 'flex items-center flex-1 px-5 text-base font-medium transition-colors'
          : 'flex flex-col justify-center px-5 py-4 text-sm font-medium transition-colors'
      }
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
