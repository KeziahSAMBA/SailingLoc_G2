import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
  startTransition,
} from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bateauBg from '../assets/image/paysage/cote_azur.jpg';
import productBg from '../assets/image/paysage/crique.jpg';
import contactBg from '../assets/image/paysage/contact_bg.jpg';
import aboutBg from '../assets/image/paysage/about_bg.jpg';
import legalBg from '../assets/image/portrait/cgu.jpg';
import dashboardBg from '../assets/image/paysage/dashboard_bg.jpg';
import SearchBar from '../components/common/SearchBar.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import MapView from '../components/common/MapView.jsx';
import { MdClose, MdLocationOn, MdPeople, MdCalendarToday, MdSearch } from 'react-icons/md';
import { FaChevronLeft, FaChevronRight, FaCrown } from 'react-icons/fa';
import ClientReviews from '../components/common/ClientReviews.jsx';
import Carrousel from '../components/common/Carrousel.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';
import GhostButton from '../components/common/GhostButton.jsx';
import FavoriteButton from '../components/common/FavoriteButton.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { fetchBoats } from '../services/boatService.js';
import { fetchPorts } from '../services/portService.js';
import { trackSiteSearch } from '../utils/analyticsClient.js';
import { correctPortPosition, scatterBoatPosition } from '../utils/mapPosition.js';
import {
  readTransitionPayload,
  clearTransitionPayload,
  setTransitionPayload,
  onHomeTransitionRequest,
  onProductTransitionRequest,
  useProductNavigate,
  smoothScrollToTop,
  lockScroll,
  unlockScroll,
  prefersReducedMotion,
  PAGE_SLIDE_CSS,
  PHOTO_OVERLAY_BOAT,
  PHOTO_OVERLAY_STATIC_PAGE,
  PHOTO_OVERLAY_DASHBOARD,
  CATEGORY_ENTER_EASING,
  CATEGORY_EXIT_EASING,
  NAV_ENTER_DURATION,
  NAV_ENTER_STAGGER,
  CATEGORY_PRODUCT_NAV_TOTAL as CATEGORY_NAV_TOTAL,
  INTRO_SOFT_EASING,
} from '../hooks/useCategoryTransition.js';
import { onPageExitRequest, isOnDashboardPage } from '../hooks/usePageTransition.js';

// Fond photo bateau partagé par toutes les sections de la page (résultats,
// carrousels, avis), qui reprennent toutes ce même habillage (image + assombrissement).
const PHOTO_BG_STYLE = {
  backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bateauBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

// Comportements propres a la page categorie. Le fond fixe reste reserve aux
// grands ecrans (il est couteux et saccade sur plusieurs navigateurs mobiles),
// tandis que la carte devient un plateau sticky que les annonces recouvrent.
const CATEGORY_RESPONSIVE_CSS = `
  .category-photo-background {
    background-attachment: scroll;
  }

  .category-map-panel {
    top: var(--category-header-height);
  }

  .category-map-canvas {
    height: clamp(18rem, 48svh, 30rem);
  }

  .category-current-track {
    scrollbar-width: none;
  }

  .category-current-track::-webkit-scrollbar {
    display: none;
  }

  .category-secondary-carousels > div > :first-child {
    display: none;
  }

  .category-secondary-carousels h2 {
    color: rgb(255 255 255) !important;
    text-shadow: 0 0.125rem 0.375rem rgb(0 0 0 / 45%);
  }

  .category-secondary-carousels h2 + a {
    color: rgb(255 255 255 / 78%) !important;
    text-shadow: 0 0.125rem 0.375rem rgb(0 0 0 / 45%);
  }

  .category-page-reviews {
    scroll-margin-top: calc(var(--category-header-height) + 1rem);
  }

  @media (min-width: 64rem) {
    .category-page-reviews {
      scroll-margin-top: 1.25rem;
    }
  }

  @media (min-width: 80rem) {
    .category-photo-background {
      background-attachment: fixed;
    }

    .category-map-panel {
      top: var(--category-map-top);
      height: calc(100svh - var(--category-map-top));
    }

    .category-map-canvas {
      height: clamp(20rem, calc(100svh - var(--category-map-top) - 3.5rem), 48rem);
    }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const toBoatCard = (boat) => ({
  id: boat.id_boat,
  image: boat.images[0]?.url ?? '',
  badge: null,
  rating: boat.avg_rating,
  reviewCount: boat.review_count ?? 0,
  type: boat.type,
  name: boat.name,
  location: boat.port?.city ?? '',
  portLat: Number(boat.port?.latitude),
  portLng: Number(boat.port?.longitude),
  capacity: boat.capacity,
  skipper: boat.with_skipper,
  licenseRequired: boat.license_required,
  bookingCount: boat.booking_count ?? 0,
  price: Number(boat.daily_price),
  availability: boat.availabilities
    .slice(0, 2)
    .map((a) => `${fmtDate(a.start_date)} – ${fmtDate(a.end_date)}`),
  rawAvailabilities: boat.availabilities,
});

// "Coup de cœur" : intersection stricte popularité + note, pas juste un seuil de
// note isolé — sinon un bateau jamais réservé mais bien noté decrocherait le badge.
// Bornes calibrées sur le seed actuel (~48 bateaux) pour retomber dans une
// fourchette de 5 à 10 bateaux ; à ajuster si le volume de données change.
const COUP_DE_COEUR_MIN_BOOKINGS = 2;
const COUP_DE_COEUR_MIN_RATING = 4;
const COUP_DE_COEUR_MAX_COUNT = 10;

function computeCoupDeCoeurIds(boats) {
  return new Set(
    boats
      .filter(
        (b) =>
          b.bookingCount >= COUP_DE_COEUR_MIN_BOOKINGS &&
          (b.rating ?? 0) >= COUP_DE_COEUR_MIN_RATING
      )
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.bookingCount - a.bookingCount)
      .slice(0, COUP_DE_COEUR_MAX_COUNT)
      .map((b) => b.id)
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Mémoïsée : la page se re-rend plusieurs fois pendant les animations de
// transition (données, recadrages de la carte) et re-rendre les fiches à
// chaque fois fait saccader la cascade — leurs props sont stables.
const BoatListingCard = memo(function BoatListingCard({
  id,
  image,
  badge,
  rating,
  reviewCount,
  type,
  name,
  location,
  capacity,
  skipper,
  licenseRequired,
  price,
  availability,
  isFavorite,
  onToggleFavorite,
  highlighted,
  onSelect,
}) {
  const { t } = useTranslation();
  return (
    <article
      id={`boat-${id}`}
      onClick={() => onSelect?.(id)}
      className={`relative rounded-3xl overflow-hidden border hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(14,165,233,0.35)] hover:border-white/70 transition-all duration-300 group cursor-pointer shadow-[0_8px_32px_rgba(14,165,233,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] ${highlighted ? 'border-sky-400 ring-4 ring-sky-400/60' : 'border-white/50'}`}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '7/5' }}>
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
        {badge && (
          <div
            className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-white/30 px-2.5 py-1 text-[0.5625rem] font-bold uppercase tracking-wider text-white backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(14,165,233,0.8)',
              boxShadow: '0 2px 8px rgba(14,165,233,0.5)',
            }}
          >
            <FaCrown style={{ fontSize: '0.5625rem' }} />
            {badge === 'coup_de_coeur' ? t('category.badge.topPick') : badge}
          </div>
        )}
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(id)}
          size={26}
          className="absolute top-3 right-3 z-10"
        />
      </div>

      <div
        className="relative p-3 border-t"
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0.3)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Nom + type */}
        <div className="mb-2 flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-1">
            <h3 className="max-w-full truncate text-[0.9375rem] font-bold leading-tight text-white">
              {name}
            </h3>
            <span className="text-white/50 flex-shrink-0">-</span>
            <span className="flex-shrink-0 text-[0.625rem] font-bold uppercase tracking-widest text-sky-500">
              {type}
            </span>
          </div>
          <span className="text-xs font-semibold text-white flex-shrink-0">
            {rating != null ? (
              <>
                <span className="text-amber-400">★</span> {rating}
                {reviewCount > 0 && <span className="text-white/70"> ({reviewCount})</span>}
              </>
            ) : (
              t('category.card.new')
            )}
          </span>
        </div>

        {/* Lieu + dates */}
        <div className="mb-2 flex flex-col items-start gap-2 border-b border-white/40 pb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-1">
          <span className="text-xs text-white/80 flex items-center gap-1 min-w-0">
            <MdLocationOn
              className="flex-shrink-0 text-sky-500"
              style={{ fontSize: '0.8125rem' }}
            />
            <span className="truncate">{location}</span>
          </span>
          {availability?.length > 0 && (
            <div className="flex flex-wrap items-center justify-start gap-1 sm:justify-end">
              <MdCalendarToday
                className="text-sky-500 flex-shrink-0"
                style={{ fontSize: '0.75rem' }}
              />
              {availability.map((period) => (
                <span
                  key={period}
                  className="rounded-full px-1 py-0.5 text-[0.625rem] font-medium backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(14,165,233,0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {period}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Personnes + badges skipper/permis */}
        <div className="mb-2 flex flex-col items-start gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <span className="flex items-center gap-1 text-xs text-white/70 flex-shrink-0">
            <MdPeople className="text-sky-500" style={{ fontSize: '0.875rem' }} />
            {t('category.card.persons', { count: capacity })}
          </span>
          <div className="flex flex-wrap items-center justify-start gap-1 2xl:justify-end">
            <span
              className="rounded-full px-1 py-0.5 text-[0.5625rem] font-medium backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(14,165,233,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {skipper ? t('category.card.skipperIncluded') : t('category.card.skipperExcluded')}
            </span>
            <span
              className="rounded-full px-1 py-0.5 text-[0.5625rem] font-medium backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(14,165,233,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {licenseRequired
                ? t('category.card.licenseRequired')
                : t('category.card.noLicenseRequired')}
            </span>
          </div>
        </div>

        {/* Prix + Réserver */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="text-[0.9375rem] font-bold text-white">{price} €</span>
            <span className="text-xs text-white/70">{t('category.card.perDay')}</span>
          </div>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="flex min-h-10 items-center rounded-full border border-white/40 bg-[rgba(14,165,233,0.55)] px-3 py-1 text-[0.6875rem] font-semibold text-white shadow-[0_4px_16px_rgba(14,165,233,0.35)] backdrop-blur-md transition-all hover:border-white/20 hover:bg-[rgba(10,49,114,0.95)] sm:min-h-0"
          >
            {t('category.card.book')}
          </button>
        </div>
      </div>
    </article>
  );
});

const CurrentAnnouncementsCarousel = memo(function CurrentAnnouncementsCarousel({
  boats,
  favoriteIds,
  onToggleFavorite,
  onSelect,
}) {
  const { t } = useTranslation();
  const trackRef = useRef(null);
  const [navigation, setNavigation] = useState({ canPrev: false, canNext: false });

  const syncNavigation = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const tolerance = parseFloat(window.getComputedStyle(document.documentElement).fontSize) / 4;
    const nextNavigation = {
      canPrev: track.scrollLeft > tolerance,
      canNext: track.scrollLeft + track.clientWidth < track.scrollWidth - tolerance,
    };
    setNavigation((current) =>
      current.canPrev === nextNavigation.canPrev && current.canNext === nextNavigation.canNext
        ? current
        : nextNavigation
    );
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    syncNavigation();
    const observer = new window.ResizeObserver(syncNavigation);
    observer.observe(track);
    return () => observer.disconnect();
  }, [boats.length, syncNavigation]);

  const scrollOneCard = useCallback((direction) => {
    const track = trackRef.current;
    const firstCard = track?.firstElementChild;
    if (!track || !firstCard) return;
    const styles = window.getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    track.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: 'smooth',
    });
  }, []);

  if (boats.length === 0) return null;

  return (
    <div className="relative w-full">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-xl font-semibold leading-tight text-white">
          {t('carrousel.sections.current')}
        </h2>
        <Link
          to="/categorie"
          className="text-base text-white/70 transition-colors hover:text-white sm:ml-4"
        >
          {t('carrousel.sections.currentLink')} →
        </Link>
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          onScroll={syncNavigation}
          className="category-current-track flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 touch-pan-x"
        >
          {boats.map((boat) => (
            <article
              key={boat.id}
              onClick={() => onSelect(boat.id)}
              className="group relative aspect-[16/10] min-w-0 flex-[0_0_100%] snap-start cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-white/5 p-4 shadow-lg backdrop-blur-md md:flex-[0_0_calc((100%-1rem)/2)] xl:flex-[0_0_calc((100%-2rem)/3)]"
            >
              <div className="relative h-full overflow-hidden rounded-xl border border-white/20">
                <img
                  src={boat.image}
                  alt={boat.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black/90" />
                <FavoriteButton
                  isFavorite={favoriteIds.has(boat.id)}
                  onToggle={() => onToggleFavorite(boat.id)}
                  size={26}
                  className="absolute right-3 top-3 z-10"
                />
                <div className="absolute inset-x-0 bottom-0 min-w-0 p-3 text-white">
                  <h3 className="truncate text-sm font-bold sm:text-base">{boat.name}</h3>
                  <p className="mt-1 truncate text-xs font-semibold text-white/80">
                    {[boat.location, `${boat.capacity} pers.`, `${boat.price} €/j`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p className="mt-1 truncate text-xs text-white/70">
                    {boat.rating != null
                      ? `★ ${boat.rating}${boat.reviewCount > 0 ? ` (${boat.reviewCount})` : ''}`
                      : t('category.card.new')}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollOneCard(-1)}
          disabled={!navigation.canPrev}
          aria-label={t('carrousel.prev')}
          className="absolute left-1 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-lg backdrop-blur-md transition disabled:pointer-events-none disabled:opacity-0"
        >
          <FaChevronLeft className="block text-sm" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scrollOneCard(1)}
          disabled={!navigation.canNext}
          aria-label={t('carrousel.next')}
          className="absolute right-1 top-1/2 z-20 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white shadow-lg backdrop-blur-md transition disabled:pointer-events-none disabled:opacity-0"
        >
          <FaChevronRight className="block text-sm" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_BOAT_TYPE_FILTERS = {
  voilier: false,
  catamaran: false,
  trimaran: false,
  moteur: false,
  peniche: false,
  jet_ski: false,
  hors_bord: false,
  gulet: false,
};

function CategoryPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  // Barre sticky (fil d'Ariane + filtre + recherche) : n'a plus lieu d'être
  // une fois qu'on quitte la section "Nos bateaux" pour les carrousels de
  // suggestions — cachée dès que #suggestions entre dans le viewport.
  const [searchBarHidden, setSearchBarHidden] = useState(false);
  // Arrivée depuis la transition HomePage → catégorie : les blocs de la page
  // entrent depuis la marge gauche en cascade, et la SearchBar glisse (FLIP)
  // depuis sa position dans le hero de l'accueil jusqu'à son emplacement ici.
  const navigate = useNavigate();
  const location = useLocation();
  const [transitionPayload] = useState(() => readTransitionPayload('category'));
  // Arrivée générique (ex. depuis Contact/About, sans payload FLIP) : même
  // cascade que ci-dessus, mais la SearchBar glisse comme un bloc de plus
  // (depuis la droite) plutôt que de rejouer le FLIP — cf. son style plus bas.
  const [enterActive, setEnterActive] = useState(
    () => Boolean(transitionPayload) || (location.key !== 'default' && !prefersReducedMotion())
  );
  // Sections sous la ligne de flottaison (carrousels, avis) différées pendant
  // l'animation d'entrée : leur montage en pleine cascade faisait saccader
  // l'arrivée alors qu'elles sont hors écran à ce moment-là.
  const [belowFoldReady, setBelowFoldReady] = useState(!transitionPayload);

  // Fin de l'animation d'entrée : montage des sections différées et
  // déverrouillage du défilement, au même moment.
  useEffect(() => {
    if (!enterActive) {
      setBelowFoldReady(true);
      unlockScroll();
    }
  }, [enterActive]);
  // Sortie vers l'accueil ou la page produit en cours : les blocs rejouent
  // leur entrée à rebours.
  const [exiting, setExiting] = useState(false);
  // Sortie vers la page produit ou une page statique (contact/à propos)
  // uniquement : leur fond (image différente de celui de la catégorie)
  // recouvre le nôtre en fondu, pour un raccord invisible au moment du
  // montage réel de la page cible — cf. exitBgSrc dans ProductPage.jsx pour
  // le même mécanisme joué en sens inverse, et dans usePageTransition.js
  // pour contact/à propos. Vers l'accueil, inutile : on transmet notre image
  // via le payload de transition (bg ci-dessous), que la HomePage utilise
  // elle-même pour son propre fondu vers la vidéo.
  const [exitBgSrc, setExitBgSrc] = useState(null);
  // Sortie générique (contact/à propos) en cours : distingue ce cas de la
  // sortie vers accueil/produit pour le style de la SearchBar plus bas (qui
  // glisse comme un bloc de plus au lieu de suivre le FLIP).
  const [exitIsGeneric, setExitIsGeneric] = useState(false);
  const searchBarWrapRef = useRef(null);
  const transitioningRef = useRef(false);
  // Horloge de la cascade d'entrée + styles figés des blocs montés en retard
  // (cf. slideInStyleLate).
  const enterStartRef = useRef(Date.now());
  const lateAnimCache = useRef({});
  // Copie stable des bateaux pour la séquence de sortie (effet monté une seule
  // fois : sa closure ne voit pas les états ultérieurs) — sert à transmettre
  // le nom du bateau cliqué à la page produit via le payload.
  const boatsRef = useRef([]);

  // Nettoyage différé (et non dans l'initialiseur ci-dessus, que StrictMode
  // invoque deux fois en dev) pour ne pas rejouer l'entrée aux visites suivantes.
  useEffect(() => {
    clearTransitionPayload();
  }, []);

  // Séquence de transition vers l'accueil ou la page produit : remontée en
  // haut de page, sortie des blocs (la SearchBar, elle, est mesurée pour
  // l'animation FLIP jouée à l'arrivée), puis navigation réelle.
  useEffect(() => {
    let cancelled = false;
    let navTimer = null;
    const beginExit =
      (target) =>
      async ({ to }) => {
        if (transitioningRef.current) return;
        transitioningRef.current = true;
        // Défilement gelé jusqu'à la fin de l'arrivée sur la page cible, qui
        // déverrouille (les sections différées y sont alors montées).
        lockScroll();
        if (target === 'product') {
          // Précharge ET décode le fond de la page produit pendant la
          // remontée : le décodage du JPEG au moment du premier paint ferait
          // saccader le début du crossfade.
          const bg = new window.Image();
          bg.src = productBg;
          bg.decode?.().catch(() => {});
        }
        await smoothScrollToTop();
        if (cancelled) return;
        if (target === 'product') setExitBgSrc(productBg);
        setExiting(true);
        const productId = Number(to.match(/^\/product\/(\d+)/)?.[1]);
        // Payload posé à la toute fin de la sortie, pas à son départ : seul
        // le `top` du bandeau sticky doit avoir fini de se reposer (sa
        // transition 60→80px joue pendant la remontée) avant de mesurer le
        // rect de la SearchBar — mesuré trop tôt, le FLIP de la page
        // d'arrivée partirait d'une position périmée et corrigerait en plein
        // vol.
        navTimer = setTimeout(() => {
          setTransitionPayload(target, {
            searchBarRect: searchBarWrapRef.current?.getBoundingClientRect() ?? null,
            bg: bateauBg,
            from: 'category',
            // Nom du bateau cliqué : la breadcrumb produit l'affiche dès son
            // premier rendu — sinon elle passe de « … » au nom à la réponse
            // de l'API, s'élargit, et repousse la SearchBar en plein FLIP
            // (effet de rebond).
            boatName: boatsRef.current.find((b) => b.id === productId)?.name ?? null,
          });
          navigate(to);
        }, CATEGORY_NAV_TOTAL);
      };
    // Sortie vers une page statique (contact/à propos) : même cascade, sans
    // payload à transmettre — ces pages rejouent leur propre entrée sur la
    // seule base de la navigation (cf. usePageSlideTransition), sans rien
    // attendre de la page de départ.
    const beginExitToStatic = async ({ to, options }) => {
      if (transitioningRef.current) return;
      transitioningRef.current = true;
      lockScroll();
      await smoothScrollToTop();
      if (cancelled) return;
      setExitBgSrc(
        to === '/a-propos'
          ? aboutBg
          : to === '/contact'
            ? contactBg
            : isOnDashboardPage(to)
              ? dashboardBg
              : legalBg
      );
      setExitIsGeneric(true);
      setExiting(true);
      navTimer = setTimeout(() => {
        navigate(to, options);
      }, CATEGORY_NAV_TOTAL);
    };
    const unsubHome = onHomeTransitionRequest(beginExit('home'));
    const unsubProduct = onProductTransitionRequest(beginExit('product'));
    const unsubStatic = onPageExitRequest(beginExitToStatic);
    return () => {
      cancelled = true;
      clearTimeout(navTimer);
      unsubHome();
      unsubProduct();
      unsubStatic();
    };
  }, [navigate]);
  // Hauteurs relatives partagees par le bandeau et la carte sticky. Sur les
  // petits ecrans la carte se cale sous le header ; sur desktop elle tient
  // aussi compte de la barre de recherche et de filtres.
  const categoryHeaderHeight = scrolled ? '3.75rem' : 'clamp(4rem, 6vw, 5rem)';
  const categoryMapTop = scrolled ? '7.75rem' : 'calc(clamp(4rem, 6vw, 5rem) + 4.75rem)';

  // Ancrage manuel des entrées du menu burger : espace relatif laissé au-dessus
  // de chaque section quand on y saute depuis le menu. Un seul endroit à
  // modifier par section pour caler l'atterrissage pile sur son titre —
  // augmenter la valeur atterrit plus haut dans la section, la baisser
  // atterrit plus bas. "Nos bateaux" n'y figure pas : elle remonte
  // simplement en haut de page (anchor: 'top' dans Header.jsx / HeaderLocataire.jsx).
  // "Avis" n'y figure pas non plus : son offset doit varier avec la hauteur du
  // header (fixed, recouvre toujours le haut du viewport) et est donc géré en
  // CSS (.category-page-reviews dans CATEGORY_RESPONSIVE_CSS) plutôt qu'en
  // valeur fixe ici.
  const ANCHOR_OFFSETS = {
    suggestions: '1.875rem', // menu burger : "Nos suggestions"
  };
  const [ports, setPorts] = useState([]);
  const [boats, setBoats] = useState([]);
  useEffect(() => {
    boatsRef.current = boats;
  }, [boats]);
  // Évite le flash « aucune offre ne correspond… » pendant le chargement
  // initial (visible en plein milieu de l'animation d'entrée).
  const [boatsLoaded, setBoatsLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [mapBounds, setMapBounds] = useState(null);
  const [highlightedBoatId, setHighlightedBoatId] = useState(null);
  const [focusBoat] = useState(null);
  const { favoriteIds, toggleFavorite } = useFavorites();

  const [boatTypeFilters, setBoatTypeFilters] = useState(EMPTY_BOAT_TYPE_FILTERS);
  const [licenseFilter, setLicenseFilter] = useState('any');
  const [skipperFilter, setSkipperFilter] = useState('any');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('relevance');
  const [coupDeCoeurFilter, setCoupDeCoeurFilter] = useState(false);

  function resetFilters() {
    setBoatTypeFilters(EMPTY_BOAT_TYPE_FILTERS);
    setLicenseFilter('any');
    setSkipperFilter('any');
    setPriceRange({ min: '', max: '' });
    setSortBy('relevance');
    setCoupDeCoeurFilter(false);
  }

  const destinationQuery = (searchParams.get('destination') ?? '').trim().toLowerCase();
  const startQuery = searchParams.get('start');
  const endQuery = searchParams.get('end');
  const travelersQuery = Number(searchParams.get('travelers')) || null;

  // Matomo « Recherches sur le site » : une entrée par destination cherchée,
  // avec le nombre de bateaux correspondants (no-op sans consentement analytics).
  useEffect(() => {
    if (!destinationQuery || boats.length === 0) return;
    const results = boats.filter((b) => b.location.toLowerCase().includes(destinationQuery)).length;
    trackSiteSearch(destinationQuery, results);
  }, [destinationQuery, boats]);
  const activeBoatTypes = Object.keys(boatTypeFilters).filter((key) => boatTypeFilters[key]);
  const minPrice = Number(priceRange.min) || null;
  const maxPrice = Number(priceRange.max) || null;

  const filteredBoats = boats
    .filter((boat) => {
      if (destinationQuery && !boat.location.toLowerCase().includes(destinationQuery)) return false;
      if (travelersQuery && boat.capacity < travelersQuery) return false;
      if (startQuery && endQuery) {
        const reqStart = new Date(startQuery);
        const reqEnd = new Date(endQuery);
        const hasOverlap = boat.rawAvailabilities.some((a) => {
          const availStart = new Date(a.start_date);
          const availEnd = new Date(a.end_date);
          return availStart <= reqEnd && availEnd >= reqStart;
        });
        if (!hasOverlap) return false;
      }
      if (activeBoatTypes.length > 0 && !activeBoatTypes.includes(boat.type)) return false;
      if (coupDeCoeurFilter && boat.badge !== 'coup_de_coeur') return false;
      if (skipperFilter === 'included' && !boat.skipper) return false;
      if (skipperFilter === 'excluded' && boat.skipper) return false;
      if (licenseFilter === 'not_required' && boat.licenseRequired) return false;
      if (licenseFilter === 'required' && !boat.licenseRequired) return false;
      if (minPrice && boat.price < minPrice) return false;
      if (maxPrice && boat.price > maxPrice) return false;
      if (mapBounds) {
        const { lat, lng } = correctPortPosition(boat.location, boat.portLat, boat.portLng);
        if (
          lat < mapBounds.south ||
          lat > mapBounds.north ||
          lng < mapBounds.west ||
          lng > mapBounds.east
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'popularity') return b.bookingCount - a.bookingCount;
      return travelersQuery ? a.capacity - b.capacity : 0;
    });

  // Un port est "lancé" (marqueur coloré) dès qu'il a au moins un bateau publié ;
  // sinon il reste grisé "Bientôt disponible", quels que soient les filtres actifs.
  const launchedCities = new Set(boats.map((b) => b.location));
  const matchCountByCity = filteredBoats.reduce((acc, b) => {
    acc[b.location] = (acc[b.location] ?? 0) + 1;
    return acc;
  }, {});

  const mapMarkers = ports
    .filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)))
    .map((p) => {
      const launched = launchedCities.has(p.city);
      const { lat, lng } = correctPortPosition(p.city, Number(p.latitude), Number(p.longitude));
      return {
        id: p.id_port,
        lat,
        lng,
        title: p.city,
        subtitle: p.country,
        available: launched,
        badge: launched ? (matchCountByCity[p.city] ?? 0) : null,
      };
    });

  // Recadre la carte sur les ports correspondant à la destination recherchée ;
  // sans destination, on recadre sur les ports disponibles (tous en France pour
  // l'instant) plutôt que sur l'ensemble des ports (dont certains à l'étranger,
  // "bientôt disponibles"), qui ferait dézoomer inutilement sur toute l'Europe.
  const focusMapMarkers = destinationQuery
    ? mapMarkers.filter((m) => m.title.toLowerCase().includes(destinationQuery))
    : mapMarkers.filter((m) => m.available);

  // Pins bateaux individuels (avec prix), affichés par MapView au-delà d'un certain
  // niveau de zoom — dispersés artificiellement autour du port (cf. scatterBoatPosition).
  const boatMapMarkers = filteredBoats
    .filter((b) => Number.isFinite(b.portLat) && Number.isFinite(b.portLng))
    .map((b) => {
      const { lat, lng } = correctPortPosition(b.location, b.portLat, b.portLng);
      return {
        id: b.id,
        ...scatterBoatPosition(b.id, lat, lng),
        price: b.price,
        name: b.name,
        city: b.location,
      };
    });

  useEffect(() => {
    const rootRem = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    const onScroll = () => setScrolled(Math.max(window.scrollY, 0) > rootRem * 0.625);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const el = document.getElementById('suggestions');
    if (!el) {
      setSearchBarHidden(false);
      return undefined;
    }
    const observer = new window.IntersectionObserver(
      ([entry]) => setSearchBarHidden(entry.isIntersecting),
      { rootMargin: '0px 0px -60% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [belowFoldReady]);

  // Titres "Liste des propositions" / "N bateaux disponibles" : fondu simple
  // (même traitement que le "Bienvenue sur" de l'intro HomePage), rejoue à
  // chaque arrivée sur la page et s'inverse dès la sortie. Son apparition est
  // calée sur l'atterrissage commun de la cascade des autres blocs
  // (CATEGORY_NAV_TOTAL) pour donner l'illusion que tout arrive ensemble —
  // sans quoi le fondu, plus court, finissait avant eux. Sans cascade
  // (arrivée directe, pas de transitionPayload), apparition immédiate.
  const [titlesVisible, setTitlesVisible] = useState(false);
  useEffect(() => {
    const delay = transitionPayload ? Math.max(CATEGORY_NAV_TOTAL - NAV_ENTER_DURATION, 0) : 0;
    const timer = setTimeout(() => setTitlesVisible(true), delay);
    return () => clearTimeout(timer);
  }, [transitionPayload]);
  useEffect(() => {
    if (exiting) setTitlesVisible(false);
  }, [exiting]);
  const titleFadeStyle = {
    opacity: titlesVisible ? 1 : 0,
    transform: titlesVisible ? 'none' : 'translateY(14px)',
    transition: `opacity ${NAV_ENTER_DURATION}ms ${INTRO_SOFT_EASING}, transform ${NAV_ENTER_DURATION}ms ${INTRO_SOFT_EASING}`,
  };

  // Fenêtre d'entrée : assez large pour couvrir les blocs montés en retard
  // (la grille des fiches attend la réponse de l'API). Une fois refermée, plus
  // aucun style d'animation — sinon un bloc remonté plus tard (ex. passage
  // "aucun résultat" → résultats via les filtres) rejouerait sa glissade.
  useEffect(() => {
    if (!enterActive) return undefined;
    // Marge après l'atterrissage commun pour couvrir une grille de fiches
    // montée en retard (API lente) sans lui couper son animation en vol —
    // fenêtre de tolérance réseau, pas un temps d'animation à raccourcir.
    const timer = setTimeout(() => setEnterActive(false), CATEGORY_NAV_TOTAL + 800);
    return () => clearTimeout(timer);
  }, [enterActive]);

  // FLIP de la SearchBar : translate + scale simultanés du bloc entier,
  // depuis sa position mesurée sur la page de départ (accueil ou produit,
  // toutes deux avec une barre déployée désormais) jusqu'à sa place ici.
  useLayoutEffect(() => {
    const from = transitionPayload?.searchBarRect;
    const el = searchBarWrapRef.current;
    if (!from || !el) return undefined;
    const to = el.getBoundingClientRect();
    el.style.transformOrigin = 'top left';
    el.style.willChange = 'transform';
    el.style.transition = 'none';
    el.style.transform =
      `translate(${from.left - to.left}px, ${from.top - to.top}px) ` +
      `scale(${from.width / to.width}, ${from.height / to.height})`;
    // Force le reflow avant d'activer la transition : un seul rAF suffit
    // alors, pas deux — sinon la translation démarrait un cran plus tard que
    // la cascade des autres blocs (une simple animation CSS, active dès le
    // tout premier rendu) et atterrissait après elle au lieu d'en même temps.
    void el.offsetWidth;
    const raf = window.requestAnimationFrame(() => {
      el.style.transition = `transform ${CATEGORY_NAV_TOTAL}ms ${CATEGORY_ENTER_EASING}`;
      el.style.transform = 'none';
    });
    const resetStyles = () => {
      el.style.transition = 'none';
      el.style.transform = 'none';
      // Force le navigateur à acter l'annulation immédiatement (transition
      // coupée à la volée) avant que quoi que ce soit d'autre ne mesure cet
      // élément — StrictMode démonte l'effet quelques ms après le rAF,
      // transition à peine commencée : sans ce flush, la 2de passe
      // mesurerait une position encore quasi identique à `from`, et plus
      // aucune animation visible ne jouerait.
      void el.getBoundingClientRect();
      el.style.transformOrigin = '';
      el.style.willChange = '';
      el.style.transition = '';
      el.style.transform = '';
    };
    const cleanupTimer = setTimeout(resetStyles, CATEGORY_NAV_TOTAL + 100);
    return () => {
      window.cancelAnimationFrame(raf);
      clearTimeout(cleanupTimer);
      // Remet l'élément à l'état neutre : StrictMode rejoue cet effet en dev,
      // et la seconde passe doit mesurer la position naturelle, pas celle
      // déplacée par la première.
      resetStyles();
    };
  }, [transitionPayload]);

  // Sortie de page : l'entrée jouée à rebours — tous les blocs partent en
  // même temps et disparaissent en cascade inversée (la map d'abord, la
  // barre de filtres en dernier), chacun vers sa marge d'origine.
  function slideOutStyle(order, from) {
    const keyframes = from === 'left' ? 'categorySlideOutLeft' : 'categorySlideOutRight';
    const duration = CATEGORY_NAV_TOTAL - order * NAV_ENTER_STAGGER;
    return {
      animation: `${keyframes} ${duration}ms ${CATEGORY_EXIT_EASING} both`,
      // Promeut le bloc sur sa propre couche de composition avant le premier
      // déplacement (évite la re-rasterisation en début d'animation).
      willChange: 'transform',
    };
  }

  // Entrée décalée des blocs depuis les marges (direction alternée par bloc),
  // en écho à la sortie des éléments du hero. Hors fenêtre : aucun style.
  // Chaque bloc part avec son décalage mais sa durée est allongée d'autant,
  // pour que tous atterrissent à CATEGORY_NAV_TOTAL pile.
  function slideInStyle(order, from = 'left') {
    if (exiting) return slideOutStyle(order, from);
    if (!enterActive) return undefined;
    const keyframes = from === 'left' ? 'categorySlideInLeft' : 'categorySlideInRight';
    const delay = order * NAV_ENTER_STAGGER;
    return {
      animation: `${keyframes} ${CATEGORY_NAV_TOTAL - delay}ms ${CATEGORY_ENTER_EASING} ${delay}ms both`,
      willChange: 'transform',
    };
  }

  // Variante pour les blocs qui montent en retard (la grille des fiches attend
  // la réponse de l'API) : le délai est recalé sur l'horloge globale de la
  // cascade au moment du montage — négatif si le départ est déjà passé, ce qui
  // fait reprendre l'animation en cours de vol pour atterrir à
  // CATEGORY_NAV_TOTAL en même temps que les autres blocs. Le style est figé
  // au premier calcul : le recalculer à chaque rendu redémarrerait l'animation.
  function slideInStyleLate(key, order, from = 'left') {
    if (exiting) return slideOutStyle(order, from);
    if (!enterActive) return undefined;
    const cache = lateAnimCache.current;
    if (!cache[key]) {
      const keyframes = from === 'left' ? 'categorySlideInLeft' : 'categorySlideInRight';
      const intendedStart = order * NAV_ENTER_STAGGER;
      const delay = intendedStart - (Date.now() - enterStartRef.current);
      cache[key] = {
        animation: `${keyframes} ${CATEGORY_NAV_TOTAL - intendedStart}ms ${CATEGORY_ENTER_EASING} ${delay}ms both`,
        willChange: 'transform',
      };
    }
    return cache[key];
  }

  useEffect(() => {
    setVisibleCount(8);
    setMobileSearchExpanded(false);
  }, [searchParams.toString()]);

  useEffect(() => {
    if (!mobileSearchExpanded) return undefined;
    const frame = window.requestAnimationFrame(() => {
      searchBarWrapRef.current?.querySelector('input[type="text"]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mobileSearchExpanded]);

  // startTransition : les gros re-rendus de données (48 bateaux + marqueurs)
  // passent en priorité basse pour que React puisse laisser respirer les
  // animations d'entrée en cours.
  useEffect(() => {
    fetchPorts()
      .then(({ data }) => startTransition(() => setPorts(data)))
      .catch(() => {});

    fetchBoats()
      .then(({ data }) => {
        const mapped = data.map(toBoatCard);
        const coupDeCoeurIds = computeCoupDeCoeurIds(mapped);
        startTransition(() =>
          setBoats(
            mapped.map((b) => ({
              ...b,
              badge: coupDeCoeurIds.has(b.id) ? 'coup_de_coeur' : null,
            }))
          )
        );
      })
      .catch(() => {})
      .finally(() => startTransition(() => setBoatsLoaded(true)));
  }, []);

  // Clic sur un pin bateau : révèle la carte correspondante dans la liste (en
  // augmentant visibleCount si besoin) puis scroll+surligne dessus.
  function handleBoatMapSelect(boat) {
    const idx = filteredBoats.findIndex((b) => b.id === boat.id);
    if (idx === -1) return;
    if (idx >= visibleCount) setVisibleCount(idx + 1);
    setHighlightedBoatId(boat.id);
  }

  // Clic sur une fiche produit : ouvre la page produit correspondante, avec
  // la transition de sortie (cascade inversée) avant la navigation réelle.
  const goToProduct = useProductNavigate();
  const handleBoatCardClick = useCallback(
    (boatId) => {
      goToProduct(`/product/${boatId}`);
    },
    [goToProduct]
  );

  const currentAnnouncementBoats = useMemo(() => {
    const featured = [
      ...boats.filter((boat) => boat.type === 'voilier').slice(0, 3),
      ...boats.filter((boat) => boat.type === 'jet_ski').slice(0, 3),
      ...boats.filter((boat) => !boat.licenseRequired).slice(0, 3),
    ];
    return [...new Map(featured.map((boat) => [boat.id, boat])).values()];
  }, [boats]);

  useEffect(() => {
    if (highlightedBoatId == null) return undefined;
    document
      .getElementById(`boat-${highlightedBoatId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlightedBoatId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightedBoatId, visibleCount]);

  return (
    // overflow-x-clip (et non hidden : hidden créerait un conteneur de scroll
    // qui casserait les sticky) évite l'ascenseur horizontal pendant l'entrée
    // des blocs depuis la marge droite (translateX(110vw)).
    <main
      className="min-h-[100svh] w-full overflow-x-clip bg-white pt-[clamp(4rem,6vw,5rem)]"
      style={{
        '--category-header-height': categoryHeaderHeight,
        '--category-map-top': categoryMapTop,
      }}
    >
      <style>{`${PAGE_SLIDE_CSS}\n${CATEGORY_RESPONSIVE_CSS}`}</style>
      <div>
        {/* Fond photo bateau — englobe tout : strip sous le header, searchbar,
            résultats, carrousels et avis. Une seule image continue plutôt que
            deux containers séparés, pour éviter un raccord visible sur mobile
            (background-attachment: scroll, cf. CATEGORY_RESPONSIVE_CSS). Le
            min-h-screen sur ce seul container garantit une couverture plein
            écran même quand le contenu (chargement en cours, peu de résultats)
            est plus court que le viewport. */}
        <div className="category-photo-background relative min-h-[100svh]" style={PHOTO_BG_STYLE}>
          {/* Crossfade vers le fond de la page produit pendant la sortie : se
              pose derrière les blocs (qui glissent hors écran par-dessus) et
              atterrit à pleine opacité pile pour le montage réel de la page
              produit, qui utilise nativement cette même image. */}
          {exitBgSrc && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `${
                  exitBgSrc === contactBg || exitBgSrc === aboutBg || exitBgSrc === legalBg
                    ? PHOTO_OVERLAY_STATIC_PAGE
                    : exitBgSrc === dashboardBg
                      ? PHOTO_OVERLAY_DASHBOARD
                      : PHOTO_OVERLAY_BOAT
                }, url(${exitBgSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                animation: `pageBgFadeIn ${CATEGORY_NAV_TOTAL}ms ease forwards`,
              }}
            />
          )}

          {/* Section 0 — Strip sous le header uniquement */}
          <section className="relative -mt-[clamp(4rem,6vw,5rem)] h-[clamp(4rem,6vw,5rem)] w-full" />

          {/* Section 1 — Searchbar sticky */}
          <section
            className={`fixed inset-x-0 z-20 w-full transition-transform duration-300 md:sticky ${
              searchBarHidden ? '-translate-y-full pointer-events-none' : 'translate-y-0'
            }`}
            style={{
              top: 'var(--category-header-height)',
              backgroundColor: scrolled ? 'rgba(255,255,255,0.1)' : 'transparent',
              backdropFilter: scrolled ? 'blur(5px)' : 'none',
              WebkitBackdropFilter: scrolled ? 'blur(5px)' : 'none',
              transition: 'top 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease',
            }}
          >
            {/* pt réduit en mode compact (scroll) : la barre se resserre sur ses
                composants au lieu de garder l'aération du haut de page. */}
            <div
              className="flex flex-col gap-0 px-4 pb-2 sm:px-8 lg:px-16 xl:flex-row xl:items-center xl:gap-4 xl:pl-28 xl:pr-20"
              style={{
                paddingTop: scrolled ? '0.5rem' : '1.25rem',
                transition: 'padding-top 0.3s ease',
              }}
            >
              {/* Le fil d'Ariane et les filtres partagent la meme ligne tant
                  que leur largeur cumulee tient. Le retour se fait naturellement
                  sur les ecrans les plus etroits, sans largeur fixe. */}
              <div className="mb-2 flex w-full flex-wrap items-center gap-x-3 gap-y-2 md:gap-2 xl:mb-0 xl:w-auto xl:flex-nowrap xl:gap-4">
                <div className="flex-none" style={slideInStyle(1)}>
                  <Breadcrumb light compact={scrolled} />
                </div>
                <div
                  className="min-w-0 flex-none md:flex-1 md:basis-[12rem] xl:min-w-[15rem] xl:flex-none xl:basis-auto"
                  style={slideInStyle(0)}
                >
                  <FilterBar
                    light
                    compact={scrolled}
                    boatTypeFilters={boatTypeFilters}
                    onBoatTypeChange={setBoatTypeFilters}
                    licenseFilter={licenseFilter}
                    onLicenseFilterChange={setLicenseFilter}
                    skipperFilter={skipperFilter}
                    onSkipperFilterChange={setSkipperFilter}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    priceRange={priceRange}
                    onPriceRangeChange={setPriceRange}
                    coupDeCoeurFilter={coupDeCoeurFilter}
                    onCoupDeCoeurFilterChange={setCoupDeCoeurFilter}
                    onReset={resetFilters}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSearchExpanded((expanded) => !expanded)}
                  aria-expanded={mobileSearchExpanded}
                  aria-controls="category-mobile-search"
                  aria-label={
                    mobileSearchExpanded ? t('cookieConsent.prefs.close') : t('searchBar.search')
                  }
                  className="ml-auto flex min-h-10 min-w-10 flex-none items-center justify-center rounded-full border border-sky-600 bg-sky-700 text-white shadow-lg transition-colors hover:bg-sky-800 md:hidden"
                >
                  {mobileSearchExpanded ? (
                    <MdClose className="text-lg" aria-hidden="true" />
                  ) : (
                    <MdSearch className="text-lg" aria-hidden="true" />
                  )}
                </button>
              </div>
              {/* Vers/depuis l'accueil ou le produit : le FLIP (ci-dessus, à
                  l'arrivée) prend le relai via une manipulation directe du
                  style, la barre ne doit donc recevoir aucun style concurrent
                  ici. Arrivée ou sortie générique (contact/à propos) : elle
                  glisse comme un bloc de plus, avec le reste de la cascade. */}
              <div
                id="category-mobile-search"
                ref={searchBarWrapRef}
                className={`w-full min-w-0 transition-[max-height,margin,opacity,transform] duration-300 motion-reduce:transition-none md:mt-0 md:max-h-none md:translate-y-0 md:overflow-visible md:opacity-100 md:pointer-events-auto md:[&>form]:ml-0 md:[&>form]:mr-auto xl:flex-1 xl:[&>form]:mx-auto ${
                  mobileSearchExpanded
                    ? 'mt-0 max-h-[24rem] opacity-100'
                    : 'pointer-events-none max-h-0 -translate-y-2 overflow-hidden opacity-0'
                }`}
                style={
                  exiting
                    ? exitIsGeneric
                      ? slideOutStyle(2, 'right')
                      : undefined
                    : !transitionPayload
                      ? slideInStyle(2, 'right')
                      : undefined
                }
              >
                <SearchBar light compact={scrolled} fitContentOnTablet />
              </div>
            </div>
          </section>
          <div className="h-[7.25rem] md:hidden" aria-hidden="true" />

          {/* Section 2 — Sur mobile/tablette, la carte precede les annonces et
              reste sticky pendant qu'elles la recouvrent. A partir de xl, la
              grille retrouve la repartition desktop 55/45. */}
          <div className="flex flex-col px-4 py-5 sm:px-8 lg:px-16 xl:grid xl:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] xl:items-start xl:gap-6 xl:px-28">
            {/* Listings */}
            <div className="relative order-2 z-10 -mt-[clamp(4rem,12svh,7rem)] flex min-w-0 flex-col gap-5 rounded-[2rem] border-t border-white/50 bg-white/10 p-4 shadow-[0_-1.5rem_3rem_rgba(0,0,0,0.28)] backdrop-blur-[40px] sm:p-6 lg:p-8 xl:order-1 xl:col-start-1 xl:mt-0 xl:rounded-none xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-none">
              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col items-start gap-3" style={titleFadeStyle}>
                    <p className="text-xs font-bold tracking-widest uppercase underline underline-offset-4 text-sky-500">
                      {t('category.results.kicker')}
                    </p>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:text-2xl">
                      {t('category.results.title')}
                    </h2>
                  </div>
                  <span className="text-sm text-white/80 font-medium" style={titleFadeStyle}>
                    {t('category.results.count', { count: filteredBoats.length })}
                  </span>
                </div>

                {filteredBoats.length === 0 ? (
                  boatsLoaded && (
                    <p className="text-sm text-white/80 py-6" style={slideInStyle(4)}>
                      {t('category.results.empty')}
                    </p>
                  )
                ) : (
                  <div
                    className="grid grid-cols-1 gap-4 md:grid-cols-2"
                    style={slideInStyleLate('cards', 4)}
                  >
                    {filteredBoats.slice(0, visibleCount).map((boat) => (
                      <BoatListingCard
                        key={boat.id}
                        {...boat}
                        isFavorite={favoriteIds.has(boat.id)}
                        onToggleFavorite={toggleFavorite}
                        highlighted={highlightedBoatId === boat.id}
                        onSelect={handleBoatCardClick}
                      />
                    ))}
                  </div>
                )}

                {visibleCount < filteredBoats.length && (
                  <div className="flex justify-center py-2">
                    <GhostButton onClick={() => setVisibleCount((n) => n + 4)}>
                      {t('category.results.loadMore')}
                    </GhostButton>
                  </div>
                )}
              </div>
            </div>

            {/* Carte */}
            {/* Offset sticky = hauteur du header fixe + hauteur de la barre filtre/recherche/fil
                d'ariane (toutes deux sticky au-dessus) + un petit espace de respiration.
                height = espace restant sous ce point jusqu'au bas du viewport, avec le
                contenu centré dedans (justify-center) : la carte (plus courte que cet
                espace sur sm/lg) se retrouve centrée entre le sous-header et le bas de
                page au lieu de rester collée en haut avec un vide en dessous. */}
            <aside className="category-map-panel order-1 z-0 -mt-12 flex w-full min-w-0 flex-col justify-start gap-2 transition-[top,height] duration-300 xl:sticky xl:order-2 xl:col-start-2 xl:mt-0 xl:justify-center">
              {/* L'animation d'entrée s'applique au bloc interne et non à
                  l'<aside> sticky, dont le style transition (top) doit rester. */}
              <div
                className="flex flex-col rounded-2xl border overflow-hidden"
                style={{ borderColor: 'rgba(255,255,255,0.2)', ...slideInStyle(5, 'right') }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <p className="text-xs font-bold tracking-widest uppercase text-sky-500">
                    {t('category.map.title')}
                  </p>
                  <span
                    className="flex items-center gap-1.5 text-[0.625rem] font-semibold"
                    style={{ color: '#16a34a' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    {t('category.map.live')}
                  </span>
                </div>
                <div className="category-map-canvas">
                  <MapView
                    markers={mapMarkers}
                    boatMarkers={boatMapMarkers}
                    focusMarkers={focusMapMarkers}
                    focusBoat={focusBoat}
                    className="h-full !rounded-none !border-0"
                    emptyLabel={t('category.map.empty')}
                    onBoatSelect={handleBoatMapSelect}
                    onBoundsChange={(bounds) =>
                      setMapBounds({
                        north: bounds.getNorth(),
                        south: bounds.getSouth(),
                        east: bounds.getEast(),
                        west: bounds.getWest(),
                      })
                    }
                  />
                </div>
              </div>
              <p className="px-2 text-center text-[0.625rem] text-gray-300">
                {t('category.map.hint')}
              </p>
            </aside>
          </div>
          {/* Section 3+4 — Carrousels et avis clients : même fond photo que la
            section bateaux ci-dessus, dans la MÊME enveloppe (une seule image
            continue, plus de raccord entre les deux sur mobile où
            background-attachment reste "scroll" — cf. category-photo-background
            ci-dessus), en thème glassmorphism (verre) pour rester lisibles
            dessus — carrousel inspiré du thème sombre de la HomePage, avis du
            thème `light` de la ProductPage. Différée pendant l'entrée ; le
            bloc fantôme conserve la hauteur (et la barre de défilement). */}
          {belowFoldReady ? (
            <section
              id="suggestions"
              className="relative flex w-full flex-col gap-8 px-4 py-8 sm:px-8 lg:px-16 xl:px-28 xl:py-10"
              style={{ scrollMarginTop: ANCHOR_OFFSETS.suggestions }}
            >
              <CurrentAnnouncementsCarousel
                boats={currentAnnouncementBoats}
                favoriteIds={favoriteIds}
                onToggleFavorite={toggleFavorite}
                onSelect={handleBoatCardClick}
              />
              <div className="category-secondary-carousels">
                <Carrousel glass />
              </div>
            </section>
          ) : (
            <div style={{ height: '60vh' }} aria-hidden="true" />
          )}

          {belowFoldReady && (
            <ClientReviews
              light
              wide
              id="avis"
              className="category-page-reviews !px-4 py-8 sm:!px-8 sm:[&>.grid]:!grid-cols-2 lg:!px-16 xl:!px-28 xl:py-10 xl:[&>.grid]:!w-3/4 xl:[&>.grid]:!grid-cols-3 [&>.grid]:!w-full [&>.grid]:!grid-cols-1"
            />
          )}
        </div>
      </div>
    </main>
  );
}

export default CategoryPage;
