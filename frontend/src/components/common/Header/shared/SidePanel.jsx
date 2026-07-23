function SidePanel({ side, open, scrolled, width, children, darkerOverlay = false }) {
  const panelTop = scrolled ? '60px' : 'clamp(64px, 6vw, 80px)';
  const isLeft = side === 'left';

  return (
    <div
      className={`fixed ${isLeft ? 'left-0' : 'right-0'} overflow-hidden`}
      style={{
        top: panelTop,
        width,
        height: `calc(100vh - ${panelTop})`,
        backgroundColor: scrolled
          ? 'rgba(255, 255, 255, 0.95)'
          : darkerOverlay
            ? 'rgba(0, 0, 0, 0.45)'
            : 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(14px)',
        [isLeft ? 'borderRight' : 'borderLeft']: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: isLeft ? '4px 0 24px rgba(0,0,0,0.2)' : '-4px 0 24px rgba(0,0,0,0.2)',
        transform: open ? 'translateX(0)' : `translateX(${isLeft ? '-100%' : '100%'})`,
        pointerEvents: open ? 'auto' : 'none',
        transition: 'top 0.3s ease, height 0.3s ease, transform 0.3s ease',
      }}
    >
      {children}
    </div>
  );
}

export default SidePanel;
