import { useLayoutEffect, useRef } from 'react';

function SidePanel({ id, side, open, scrolled, width, children, darkerOverlay = false }) {
  const panelTop = scrolled ? '60px' : 'clamp(64px, 6vw, 80px)';
  const isLeft = side === 'left';
  const panelRef = useRef(null);

  useLayoutEffect(() => {
    if (panelRef.current) panelRef.current.inert = !open;
  }, [open]);

  return (
    <div
      ref={panelRef}
      id={id}
      aria-hidden={!open}
      className={`fixed ${isLeft ? 'left-0' : 'right-0'} overflow-hidden`}
      style={{
        top: panelTop,
        width,
        height: `calc(100vh - ${panelTop})`,
        backgroundColor: scrolled
          ? 'rgb(var(--sl-surface) / 0.95)'
          : darkerOverlay
            ? 'rgb(var(--sl-overlay) / 0.45)'
            : 'rgb(var(--sl-overlay) / 0.25)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(14px)',
        [isLeft ? 'borderRight' : 'borderLeft']: '1px solid rgb(var(--sl-glass) / 0.15)',
        boxShadow: isLeft
          ? '4px 0 24px rgb(var(--sl-overlay) / 0.2)'
          : '-4px 0 24px rgb(var(--sl-overlay) / 0.2)',
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
