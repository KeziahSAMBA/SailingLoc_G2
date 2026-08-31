import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bateauVideo from '../assets/video/video_bateau_3.mp4';
import logoLong from '../assets/image/SL_logo/logo SL long.webp';
import contactBg from '../assets/image/paysage/contact_bg.jpg';
import aboutBg from '../assets/image/paysage/about_bg.jpg';
import legalBg from '../assets/image/portrait/cgu.jpg';
import dashboardBg from '../assets/image/paysage/dashboard_bg.jpg';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';
import { MdAdd } from 'react-icons/md';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import { getBoats } from '../services/proprietaireService.js';
import { usePageSlideTransition } from '../hooks/usePageTransition.js';
import SafeImage from '../components/common/SafeImage.jsx';
import {
  PAGE_SLIDE_CSS,
  NAV_ENTER_TOTAL,
  PHOTO_OVERLAY_STATIC_PAGE,
  PHOTO_OVERLAY_DASHBOARD,
  readTransitionPayload,
  clearTransitionPayload,
  prefersReducedMotion,
} from '../hooks/useCategoryTransition.js';

// Le voile du crossfade doit être identique au pixel près à celui que la page
// affiche réellement (cf. PHOTO_OVERLAY_* dans useCategoryTransition.js) :
// contact/à propos/légal partagent tous PHOTO_OVERLAY_STATIC_PAGE, mais un
// des 3 tableaux de bord (arrivée) a son propre voile bg-black/40.
function overlayFor(bg) {
  if (bg === dashboardBg) return PHOTO_OVERLAY_DASHBOARD;
  return PHOTO_OVERLAY_STATIC_PAGE;
}

// Cascade d'entrée/sortie de la page : 0 logo+accroche, 1 carrousel de
// bateaux, 2 CTA app mobile — même rythme que les autres pages navigables
// (Contact, À propos, pages légales — cf. useCategoryTransition.js).
const HOME_PROPRIO_ENTER_TOTAL = NAV_ENTER_TOTAL;

// Vers ces pages, notre fond vidéo fait un crossfade vers leur propre photo
// avant de naviguer — raccord invisible, comme entre Home/Contact/À
// propos/légal (cf. usePageSlideTransition). Les 4 pages légales partagent la
// même photo (cf. LegalLayout.jsx : heroBg).
const HOME_PROPRIO_STATIC_BG_TARGETS = {
  '/contact': contactBg,
  '/a-propos': aboutBg,
  '/mentions-legales': legalBg,
  '/cgu': legalBg,
  '/cgv': legalBg,
  '/politique-de-confidentialite': legalBg,
};

// Symétrique de categoryBgFadeIn/Out (HomePage.jsx) : ici en local, cette page
// étant seule à avoir besoin de réatteler une photo de départ à la vidéo
// (fade out) plutôt que l'inverse (fade in vers une photo de destination).
const bgFadeCSS = `
  @keyframes homeProprioBgFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes homeProprioBgFadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
`;

const APP_LINKS = [
  { icon: <SiAppstore />, label: 'App Store', href: 'https://apps.apple.com' },
  { icon: <SiGoogleplay />, label: 'Google Play', href: 'https://play.google.com' },
];

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

// Même palette de statuts que ProprietaireBoats.jsx / ProprietaireDashboard.jsx.
const BOAT_STATUS_CLS = {
  draft: 'bg-slate-500/15 text-white/80',
  pending: 'bg-amber-500/15 text-amber-300',
  published: 'bg-emerald-500/15 text-emerald-300',
  refused: 'bg-red-500/15 text-red-300',
};

// Styles de focus clavier communs aux cartes cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

function OwnerBoatCard({ boat, t }) {
  const statusCls = BOAT_STATUS_CLS[boat.status] || 'bg-slate-500/15 text-white/80';
  return (
    <Link
      to={`/proprietaire/bateaux/${boat.id_boat}/modifier`}
      className={`group flex h-64 w-52 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl transition-colors hover:border-[#5AB4EC]/60 sm:w-60 ${FOCUS_RING}`}
    >
      <div className="relative h-36 w-full shrink-0 bg-white/10">
        {boat.image ? (
          <SafeImage
            src={boat.image}
            alt={t('proprietaireBoats.boatAlt', { name: boat.name })}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            fallbackClassName="flex h-full w-full items-center justify-center text-3xl text-white/40"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center text-3xl text-white/40"
          >
            ⛵
          </span>
        )}
        <span
          className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}
        >
          {t(`proprietaireBoats.status.${boat.status}`, { defaultValue: boat.status })}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3 text-left">
        <span className="truncate text-sm font-medium text-white">{boat.name}</span>
        <span className="truncate text-xs text-white/70">
          {[boat.type, boat.port?.city].filter(Boolean).join(' · ')}
        </span>
        <span className="mt-auto text-xs font-semibold text-[#5AB4EC]">
          {t('proprietaireDashboard.perDay', { price: EURO.format(boat.daily_price ?? 0) })}
        </span>
      </div>
    </Link>
  );
}

function AddBoatCard({ t }) {
  return (
    <Link
      to="/proprietaire/bateaux/nouveau"
      className={`flex h-64 w-52 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/30 bg-white/5 p-6 text-center text-white/80 transition-colors hover:border-[#5AB4EC] hover:bg-white/10 hover:text-white sm:w-60 ${FOCUS_RING}`}
    >
      <MdAdd className="text-3xl" />
      <span className="text-sm font-semibold">{t('homeProprio.hero.addBoat')}</span>
    </Link>
  );
}

function OwnerBoatsCarousel({ boats, loading, t }) {
  const trackRef = useRef(null);

  function scroll(dir) {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  return (
    // sm:max-w-[760px] = exactement 3 cartes (240px) + 2 espacements (16px)
    // visibles à la fois ; au-delà, on défile via les flèches.
    <div className="relative w-full sm:max-w-[760px]">
      {!loading && (
        <>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={t('carrousel.prev')}
            className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white shadow-lg transition-colors hover:bg-black/50 sm:-left-4"
          >
            <FaChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={t('carrousel.next')}
            className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white shadow-lg transition-colors hover:bg-black/50 sm:-right-4"
          >
            <FaChevronRight size={14} />
          </button>
        </>
      )}

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {loading
          ? Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="h-64 w-52 shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/5 sm:w-60"
              />
            ))
          : boats.map((boat) => <OwnerBoatCard key={boat.id_boat} boat={boat} t={t} />)}
      </div>
    </div>
  );
}

function HomePageProprio() {
  const { t } = useTranslation();
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  // Gère à la fois la navigation (le footer et le header propriétaire
  // traitent `/` comme une page « exit-aware », cf. STATIC_EXIT_AWARE_PAGES
  // dans usePageTransition.js, et passent par cet événement plutôt que par un
  // navigate() direct), la cascade de sortie/entrée des 3 blocs ci-dessous, et
  // (via staticBgTargets) le crossfade de sortie vidéo → photo de la cible.
  const { slide, exitBgSrc } = usePageSlideTransition(HOME_PROPRIO_ENTER_TOTAL, {
    staticBgTargets: HOME_PROPRIO_STATIC_BG_TARGETS,
    dashboardBg,
  });

  // Arrivée depuis Contact/À propos/une page légale : leur propre sortie a
  // transmis leur photo de fond (cf. usePageSlideTransition côté départ,
  // ownBg) pour ce crossfade en sens inverse — elle s'efface pour révéler la
  // vidéo déjà en lecture derrière. Lecture sans effet de bord (StrictMode) :
  // nettoyage séparé ci-dessous.
  const [homeArrival] = useState(() => readTransitionPayload('home'));
  const [arrivalActive, setArrivalActive] = useState(
    () => Boolean(homeArrival) && !prefersReducedMotion()
  );

  useEffect(() => {
    clearTransitionPayload();
  }, []);

  useEffect(() => {
    if (!arrivalActive) return undefined;
    const timer = setTimeout(() => setArrivalActive(false), HOME_PROPRIO_ENTER_TOTAL + 300);
    return () => clearTimeout(timer);
  }, [arrivalActive]);

  useEffect(() => {
    document.title = t('homeProprio.pageTitle');
  }, [t]);

  useEffect(() => {
    getBoats()
      .then((res) => setBoats(res.data.boats ?? []))
      .catch(() => setBoats([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="relative w-full overflow-x-clip">
      <style>
        {PAGE_SLIDE_CSS}
        {bgFadeCSS}
      </style>
      <section className="relative flex min-h-screen w-full flex-col overflow-hidden px-4 pb-10 pt-16 sm:px-6 sm:pt-20">
        <video
          autoPlay
          loop
          muted
          playsInline
          src={bateauVideo}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />

        {/* Crossfade vidéo ↔ photo : en sortie, la photo de la page cible
            (exitBgSrc) recouvre la vidéo ; à l'arrivée, c'est l'inverse, la
            photo de la page de départ (homeArrival.bg) s'efface pour révéler
            la vidéo. Raccord invisible dans les deux sens. */}
        {(exitBgSrc || (arrivalActive && homeArrival)) && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `${overlayFor(exitBgSrc || homeArrival.bg)}, url(${exitBgSrc || homeArrival.bg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
              animation: `${exitBgSrc ? 'homeProprioBgFadeIn' : 'homeProprioBgFadeOut'} ${HOME_PROPRIO_ENTER_TOTAL}ms ease forwards`,
            }}
          />
        )}

        <div className="relative flex flex-1 flex-col items-center gap-6 py-6 text-center sm:gap-8">
          <div style={slide(0)}>
            <img
              src={logoLong}
              alt="SailingLoc"
              className="mx-auto mb-3 h-9 max-w-[70vw] object-contain sm:h-11 lg:h-12"
            />
            <p className="mx-auto max-w-2xl px-2 text-sm leading-relaxed text-gray-300 sm:text-base lg:text-lg">
              {t('homeProprio.hero.tagline')}
            </p>
          </div>

          <div
            className="flex w-full flex-1 flex-col items-center justify-center gap-4"
            style={slide(1, 'right')}
          >
            <div className="flex w-full max-w-[1020px] items-baseline justify-center gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/70">
                {t('proprietaireLayout.nav.boats')}
              </h2>
              <Link
                to="/proprietaire/bateaux"
                className={`rounded text-xs font-medium text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
              >
                {t('proprietaireDashboard.seeAll')}
              </Link>
            </div>
            <div className="flex w-full max-w-[1020px] flex-col items-center gap-4 sm:flex-row sm:items-stretch sm:justify-center">
              <OwnerBoatsCarousel boats={boats} loading={loading} t={t} />
              <AddBoatCard t={t} />
            </div>
          </div>

          <div className="mt-auto text-center" style={slide(2)}>
            <p className="mb-2 text-xs uppercase tracking-widest text-white/70">
              {t('home.hero.mobileApp')}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {APP_LINKS.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs font-medium text-white transition-colors hover:border-white hover:bg-white/15"
                >
                  <span className="text-sm">{icon}</span>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HomePageProprio;
