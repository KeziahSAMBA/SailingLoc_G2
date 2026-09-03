import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.webp';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-glass focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

// Petit voilier qui chavire sur les vagues — illustration décorative du 404.
function CapsizedBoat() {
  return (
    <svg
      width="180"
      height="120"
      viewBox="0 0 180 120"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      {/* Voilier incliné (en perdition) */}
      <g transform="rotate(24 90 60)" stroke="#fff" strokeWidth="3" strokeLinecap="round">
        {/* coque */}
        <path d="M55 78 L70 92 H110 L125 78 Z" fill="rgba(255,255,255,0.15)" />
        {/* mât */}
        <line x1="90" y1="78" x2="90" y2="28" />
        {/* voile */}
        <path d="M90 30 L118 72 H90 Z" fill="rgba(90,180,236,0.45)" stroke="#5AB4EC" />
        <path d="M88 36 L66 70 H88 Z" fill="rgba(255,255,255,0.2)" />
      </g>
      {/* éclaboussures */}
      <circle cx="46" cy="86" r="3" fill="#5AB4EC" />
      <circle cx="138" cy="80" r="2.5" fill="#5AB4EC" />
      <circle cx="128" cy="68" r="2" fill="#fff" opacity="0.7" />
      {/* vagues */}
      <path
        d="M8 100 Q 22 90 36 100 T 64 100 T 92 100 T 120 100 T 148 100 T 176 100"
        stroke="#5AB4EC"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M20 112 Q 34 103 48 112 T 76 112 T 104 112 T 132 112 T 160 112"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Page affichée pour toute route inconnue (catch-all du routeur).
// Plein écran photo + voile sombre, comme le héro de la page d'accueil
// (indispensable aussi pour que le header, écrit en blanc, reste lisible).
function NotFoundPage() {
  // SEO / onglet navigateur : titre de page dédié.
  useEffect(() => {
    document.title = 'Page introuvable — SailingLoc';
  }, []);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      <img
        src={bateauBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-overlay/60" />

      <div className="relative">
        <CapsizedBoat />
        <p aria-hidden="true" className="mt-2 text-7xl font-bold text-on-dark">
          4<span className="text-brand">0</span>4
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-on-dark md:text-3xl">
          Vous avez dérivé hors des eaux connues
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-content-soft md:text-base">
          Cette page n&apos;existe pas (ou a coulé corps et biens). Pas de panique : reprenez le cap
          avec l&apos;un de ces liens.
        </p>

        <nav aria-label="Liens de secours" className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className={`rounded-full bg-surface px-6 py-2.5 text-sm font-semibold text-brand-navy shadow transition hover:bg-page ${FOCUS_RING}`}
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            to="/categorie"
            className={`rounded-full border border-glass/50 px-6 py-2.5 text-sm font-semibold text-on-dark transition hover:bg-surface/15 ${FOCUS_RING}`}
          >
            Découvrir les bateaux
          </Link>
          <Link
            to="/contact"
            className={`rounded-full border border-glass/50 px-6 py-2.5 text-sm font-semibold text-on-dark transition hover:bg-surface/15 ${FOCUS_RING}`}
          >
            Contact &amp; aide
          </Link>
        </nav>
      </div>
    </main>
  );
}

export default NotFoundPage;
