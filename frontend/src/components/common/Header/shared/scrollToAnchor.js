// Scroll fluide vers une ancre de la page courante, ou navigation + scroll
// différé si l'ancre est sur une autre page (le temps que celle-ci se monte).
export function scrollToAnchor(
  anchor,
  targetPath = '/',
  { pathname, pageExitNavigate, closeMenu }
) {
  closeMenu();
  const scroll = () => {
    if (anchor === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };
  if (pathname === targetPath) {
    scroll();
  } else {
    pageExitNavigate(targetPath);
    setTimeout(scroll, 300);
  }
}
