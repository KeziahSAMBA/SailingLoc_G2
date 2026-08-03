import categoryBg from '../../assets/image/paysage/cote_azur.jpg';
import productBg from '../../assets/image/paysage/crique.jpg';
import contactBg from '../../assets/image/paysage/contact_bg.jpg';
import aboutBg from '../../assets/image/paysage/about_bg.jpg';
import legalBg from '../../assets/image/portrait/cgu.jpg';
import logoLong from '../../assets/image/SL_logo/logo SL long.webp';

const LEGAL_PATHS = ['/cgu', '/cgv', '/politique-de-confidentialite', '/mentions-legales'];

// Même fond que la page en cours (ou vers laquelle on navigue), pour que
// l'écran de chargement/no-connexion se fonde dedans plutôt que de trancher
// dessus — la home (fond vidéo) et le reste (dashboards, documents...)
// retombent sur le même océan que la home utilise elle-même par défaut
// (cf. HomePage.jsx, exitBgSrc initial).
function resolveBackground(pathname) {
  if (pathname.startsWith('/categorie')) return categoryBg;
  if (pathname.startsWith('/product')) return productBg;
  if (pathname.startsWith('/contact')) return contactBg;
  if (pathname.startsWith('/a-propos')) return aboutBg;
  if (LEGAL_PATHS.some((p) => pathname.startsWith(p))) return legalBg;
  return categoryBg;
}

const PULSE_CSS = `
  @keyframes pageLoadGateFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pageLoadGatePulse {
    0%, 100% { opacity: 0.55; transform: scale(0.97); }
    50%      { opacity: 1; transform: scale(1); }
  }
`;

// Écran plein écran, sans bouton ni texte : le fond de la page visée + le
// logo qui respire, le temps que la navigation aboutisse ou que le réseau
// revienne (cf. usePageLoadGate.js, qui pilote l'affichage et le remontage).
function PageLoadGateScreen({ pathname }) {
  const bg = resolveBackground(pathname);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(3,24,30,0.72), rgba(3,35,39,0.8)), url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        animation: 'pageLoadGateFadeIn 300ms ease both',
      }}
    >
      <style>{PULSE_CSS}</style>
      <span className="sr-only">Chargement en cours…</span>
      <img
        src={logoLong}
        alt=""
        aria-hidden="true"
        className="h-14 w-auto max-w-[70vw] object-contain sm:h-16"
        style={{ animation: 'pageLoadGatePulse 1.8s ease-in-out infinite' }}
      />
    </div>
  );
}

export default PageLoadGateScreen;
