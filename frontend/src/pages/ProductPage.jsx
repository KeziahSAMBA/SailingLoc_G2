import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  startTransition,
} from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bateauBg from '../assets/image/paysage/cote_azur.jpg';
import SearchBar from '../components/common/SearchBar.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';
import MapView from '../components/common/MapView.jsx';
import Carrousel from '../components/common/Carrousel.jsx';
import ClientReviews from '../components/common/ClientReviews.jsx';
import GhostButton from '../components/common/GhostButton.jsx';
import FavoriteButton from '../components/common/FavoriteButton.jsx';
import DateRangePicker from '../components/common/DateRangePicker.jsx';
import { MdLocationOn, MdPeople, MdStraighten, MdVerified, MdInfoOutline } from 'react-icons/md';
import { useFavorites } from '../hooks/useFavorites.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { fetchBoats } from '../services/boatService.js';
import {
  readTransitionPayload,
  clearTransitionPayload,
  setTransitionPayload,
  onHomeTransitionRequest,
  onCategoryTransitionRequest,
  useCategoryNavigate,
  smoothScrollToTop,
  lockScroll,
  unlockScroll,
  PAGE_SLIDE_CSS,
  CATEGORY_ENTER_STAGGER,
  CATEGORY_ENTER_TOTAL,
  CATEGORY_ENTER_EASING,
  CATEGORY_EXIT_EASING,
} from '../hooks/useCategoryTransition.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Même sémantique (bornes incluses, comparaison au jour près) que le
// calendrier de la SearchBar, appliquée ici au seul bateau consulté.
function isWithinRange(day, startStr, endStr) {
  const day0 = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const start = new Date(startStr);
  const end = new Date(endStr);
  const start0 = new Date(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  ).getTime();
  const end0 = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()).getTime();
  return day0 >= start0 && day0 <= end0;
}

// Jours facturés : bornes incluses, comme les disponibilités du calendrier.
function countDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  return Math.round((new Date(endStr) - new Date(startStr)) / 86400000) + 1;
}

// Mêmes surfaces "verre" que les blocs de la page catégorie.
const GLASS_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderColor: 'rgba(255,255,255,0.2)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

// Pastilles d'information, reprises des fiches produit de la page catégorie.
const PILL_STYLE = {
  backgroundColor: 'rgba(14,165,233,0.15)',
  color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.3)',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function ProductPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const boatId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const goToCategory = useCategoryNavigate();
  const { user } = useAuth();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [scrolled, setScrolled] = useState(false);

  // Arrivée depuis la transition accueil/catégorie → produit : les blocs de la
  // page entrent depuis les marges en cascade, et la SearchBar glisse (FLIP)
  // depuis sa position sur la page de départ jusqu'à son emplacement ici.
  const [transitionPayload] = useState(() => readTransitionPayload('product'));
  const [enterActive, setEnterActive] = useState(Boolean(transitionPayload));
  // Sections sous la ligne de flottaison (specs, carte, carrousel, avis)
  // différées pendant l'animation d'entrée : leur montage en pleine cascade
  // ferait saccader l'arrivée alors qu'elles sont hors écran à ce moment-là.
  const [belowFoldReady, setBelowFoldReady] = useState(!transitionPayload);
  // Sortie vers l'accueil ou la catégorie : les blocs rejouent leur entrée à rebours.
  const [exiting, setExiting] = useState(false);
  const searchBarWrapRef = useRef(null);
  const transitioningRef = useRef(false);
  // Horloge de la cascade d'entrée + styles figés des blocs montés en retard
  // (le contenu attend la réponse de l'API, cf. slideInStyleLate).
  const enterStartRef = useRef(Date.now());
  const lateAnimCache = useRef({});

  // Fin de l'animation d'entrée : montage des sections différées et
  // déverrouillage du défilement, au même moment.
  useEffect(() => {
    if (!enterActive) {
      setBelowFoldReady(true);
      unlockScroll();
    }
  }, [enterActive]);

  // Nettoyage différé (et non dans l'initialiseur ci-dessus, que StrictMode
  // invoque deux fois en dev) pour ne pas rejouer l'entrée aux visites suivantes.
  useEffect(() => {
    clearTransitionPayload();
  }, []);

  // Fenêtre d'entrée : assez large pour couvrir les blocs montés en retard
  // (tout le contenu attend la réponse de l'API). Une fois refermée, plus
  // aucun style d'animation.
  useEffect(() => {
    if (!enterActive) return undefined;
    const timer = setTimeout(() => setEnterActive(false), CATEGORY_ENTER_TOTAL + 1500);
    return () => clearTimeout(timer);
  }, [enterActive]);

  // Séquence de transition vers l'accueil ou la catégorie : remontée en haut
  // de page, sortie des blocs (la SearchBar, elle, est mesurée pour l'animation
  // FLIP jouée à l'arrivée), puis navigation réelle.
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
        await smoothScrollToTop();
        if (cancelled) return;
        setExiting(true);
        setTransitionPayload(target, {
          searchBarRect: searchBarWrapRef.current?.getBoundingClientRect() ?? null,
        });
        navTimer = setTimeout(() => navigate(to), CATEGORY_ENTER_TOTAL);
      };
    const unsubHome = onHomeTransitionRequest(beginExit('home'));
    const unsubCategory = onCategoryTransitionRequest(beginExit('category'));
    return () => {
      cancelled = true;
      clearTimeout(navTimer);
      unsubHome();
      unsubCategory();
    };
  }, [navigate]);

  // FLIP de la SearchBar : on part de sa position mesurée sur la page de
  // départ (translate + scale inverses appliqués avant peinture) puis on
  // laisse la transition la ramener à sa place naturelle.
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
    let raf2 = null;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        el.style.transition = `transform ${CATEGORY_ENTER_TOTAL}ms ${CATEGORY_ENTER_EASING}`;
        el.style.transform = 'none';
      });
    });
    const resetStyles = () => {
      el.style.transform = '';
      el.style.transition = '';
      el.style.transformOrigin = '';
      el.style.willChange = '';
    };
    const cleanupTimer = setTimeout(resetStyles, CATEGORY_ENTER_TOTAL + 100);
    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      clearTimeout(cleanupTimer);
      // État neutre pour la seconde passe de StrictMode, qui doit mesurer la
      // position naturelle et non celle déplacée par la première.
      resetStyles();
    };
  }, [transitionPayload]);

  // Sortie : l'entrée jouée à rebours, chaque bloc vers sa marge d'origine.
  function slideOutStyle(order, from) {
    const keyframes = from === 'left' ? 'categorySlideOutLeft' : 'categorySlideOutRight';
    const duration = CATEGORY_ENTER_TOTAL - order * CATEGORY_ENTER_STAGGER;
    return {
      animation: `${keyframes} ${duration}ms ${CATEGORY_EXIT_EASING} both`,
      willChange: 'transform',
    };
  }

  // Entrée décalée des blocs depuis les marges (direction alternée par bloc) :
  // départs décalés mais atterrissage commun à CATEGORY_ENTER_TOTAL pile.
  function slideInStyle(order, from = 'left') {
    if (exiting) return slideOutStyle(order, from);
    if (!enterActive) return undefined;
    const keyframes = from === 'left' ? 'categorySlideInLeft' : 'categorySlideInRight';
    const delay = order * CATEGORY_ENTER_STAGGER;
    return {
      animation: `${keyframes} ${CATEGORY_ENTER_TOTAL - delay}ms ${CATEGORY_ENTER_EASING} ${delay}ms both`,
      willChange: 'transform',
    };
  }

  // Variante pour les blocs montés en retard (le contenu attend la réponse de
  // l'API) : délai recalé sur l'horloge globale de la cascade au moment du
  // montage — négatif si le départ est déjà passé, l'animation reprend alors
  // en cours de vol. Style figé au premier calcul (le recalculer à chaque
  // rendu redémarrerait l'animation).
  function slideInStyleLate(key, order, from = 'left') {
    if (exiting) return slideOutStyle(order, from);
    if (!enterActive) return undefined;
    const cache = lateAnimCache.current;
    if (!cache[key]) {
      const keyframes = from === 'left' ? 'categorySlideInLeft' : 'categorySlideInRight';
      const intendedStart = order * CATEGORY_ENTER_STAGGER;
      const delay = intendedStart - (Date.now() - enterStartRef.current);
      cache[key] = {
        animation: `${keyframes} ${CATEGORY_ENTER_TOTAL - intendedStart}ms ${CATEGORY_ENTER_EASING} ${delay}ms both`,
        willChange: 'transform',
      };
    }
    return cache[key];
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ─── Données ────────────────────────────────────────────────────────────────
  // Pas d'endpoint GET /boats/:id côté API : on lit la liste publique (mise en
  // cache de session par boatService) et on y retrouve le bateau demandé.
  const [boats, setBoats] = useState([]);
  // Évite le flash « bateau introuvable » pendant le chargement initial.
  const [boatsLoaded, setBoatsLoaded] = useState(false);

  useEffect(() => {
    fetchBoats()
      .then(({ data }) => startTransition(() => setBoats(data)))
      .catch(() => {})
      .finally(() => startTransition(() => setBoatsLoaded(true)));
  }, []);

  const boat = useMemo(() => boats.find((b) => b.id_boat === boatId) ?? null, [boats, boatId]);
  const price = boat ? Number(boat.daily_price) : 0;
  const images = boat?.images ?? [];
  const thumbs = images.slice(1, 3);
  const typeLabel = boat ? t(`carrousel.boatType.${boat.type}`, { defaultValue: boat.type }) : '';
  const isAvailable = (boat?.availabilities?.length ?? 0) > 0;

  // Sélection de dates du panneau de réservation.
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  useEffect(() => {
    setStart('');
    setEnd('');
  }, [boatId]);

  // Un jour est réservable s'il tombe dans une période d'ouverture du bateau
  // et qu'aucune réservation active (pending/confirmed) ne le couvre.
  const isDateAvailable = useCallback(
    (day) => {
      if (!boat) return false;
      const inOpenWindow = (boat.availabilities || []).some((a) =>
        isWithinRange(day, a.start_date, a.end_date)
      );
      if (!inOpenWindow) return false;
      const isBooked = (boat.booked_ranges || []).some((r) =>
        isWithinRange(day, r.start_date, r.end_date)
      );
      return !isBooked;
    },
    [boat]
  );

  const dayCount = countDays(start, end);
  const total = dayCount * price;

  // Pas encore d'API publique de réservation : le CTA amène un visiteur à se
  // connecter (pop-up par-dessus la page, comme pour les favoris).
  function handleBook() {
    if (!user) {
      navigate('/login', { state: { backgroundLocation: location } });
    }
  }

  const portLat = Number(boat?.port?.latitude);
  const portLng = Number(boat?.port?.longitude);
  const portMarkers =
    boat?.port && Number.isFinite(portLat) && Number.isFinite(portLng)
      ? [
          {
            id: boat.port.id_port,
            lat: portLat,
            lng: portLng,
            title: boat.port.city,
            subtitle: boat.port.name ?? boat.port.country,
            available: true,
          },
        ]
      : [];

  const portLabel = boat?.port
    ? [boat.port.name, boat.port.city, boat.port.country].filter(Boolean).join(', ')
    : '';

  // Lignes du tableau de spécifications : seuls les champs renseignés s'affichent.
  const specRows = boat
    ? [
        [t('product.specs.type'), typeLabel],
        boat.size != null && [
          t('product.specs.length'),
          t('product.header.lengthValue', { size: Number(boat.size) }),
        ],
        boat.engine && [t('product.specs.engine'), boat.engine],
        boat.capacity != null && [
          t('product.specs.capacity'),
          t('category.card.persons', { count: boat.capacity }),
        ],
        boat.build_year != null && [t('product.specs.year'), boat.build_year],
        [
          t('product.specs.license'),
          boat.license_required
            ? t('category.card.licenseRequired')
            : t('category.card.noLicenseRequired'),
        ],
        [
          t('product.specs.skipper'),
          boat.with_skipper
            ? t('category.card.skipperIncluded')
            : t('category.card.skipperExcluded'),
        ],
        boat.port && [t('product.specs.port'), portLabel],
      ].filter(Boolean)
    : [];

  const similarTo = useMemo(
    () => (boat ? { id: boat.id_boat, type: boat.type, portCity: boat.port?.city ?? null } : null),
    [boat]
  );

  const breadcrumbItems = [
    { label: t('breadcrumb.categorie'), to: '/categorie' },
    { label: boat?.name ?? '…', to: `/product/${id}` },
  ];

  // Header fixe (60/80px) + barre recherche/fil d'ariane sticky (~116px) :
  // offset réel au-dessus du panneau de réservation sticky.
  const panelStickyTop = (scrolled ? 60 : 80) + 116;

  return (
    // overflow-x-clip (et non hidden : hidden créerait un conteneur de scroll
    // qui casserait les sticky) évite l'ascenseur horizontal pendant l'entrée
    // des blocs depuis la marge droite (translateX(110vw)).
    <main className="w-full min-h-screen pt-20 bg-white overflow-x-clip">
      <style>{PAGE_SLIDE_CSS}</style>
      <div>
        {/* Fond photo bateau — même image fixe que la page catégorie, pour un
            raccord invisible pendant les transitions dans les deux sens. */}
        <div
          className="relative"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bateauBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          {/* Section 0 — Strip sous le header uniquement */}
          <section className="relative w-full -mt-20" style={{ height: '80px' }} />

          {/* Section 1 — Searchbar + fil d'ariane sticky */}
          <section
            className="z-40"
            style={{
              position: 'sticky',
              top: scrolled ? '60px' : '80px',
              backgroundColor: scrolled ? 'rgba(255,255,255,0.1)' : 'transparent',
              backdropFilter: scrolled ? 'blur(5px)' : 'none',
              WebkitBackdropFilter: scrolled ? 'blur(5px)' : 'none',
              borderBottom: scrolled ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              transition: 'top 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease',
            }}
          >
            <div className="flex items-center gap-8 pt-8 pl-28">
              <div ref={searchBarWrapRef}>
                <SearchBar light compact={scrolled} />
              </div>
            </div>
            <div className="pb-2 pl-28" style={slideInStyle(0)}>
              <Breadcrumb light compact={scrolled} items={breadcrumbItems} />
            </div>
          </section>

          {/* Section 2 — Galerie + infos (2/3) et panneau de réservation (1/3) */}
          {!boatsLoaded && <div style={{ height: '70vh' }} aria-hidden="true" />}
          {boatsLoaded && !boat && (
            <div
              className="flex flex-col items-center gap-4 px-28 py-24 text-center"
              style={slideInStyleLate('notFound', 1)}
            >
              <h1 className="text-2xl font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                {t('product.notFound.title')}
              </h1>
              <p className="text-sm text-white/80">{t('product.notFound.text')}</p>
              <GhostButton onClick={() => goToCategory()}>{t('product.notFound.cta')}</GhostButton>
            </div>
          )}
          {boat && (
            <div className="flex items-start gap-6 px-28 py-5 pb-12">
              {/* Colonne principale — 2/3 */}
              <div className="w-2/3 flex flex-col gap-5">
                {/* Galerie : image principale + deux vues secondaires */}
                <div className="grid grid-cols-3 gap-4" style={slideInStyleLate('gallery', 1)}>
                  <div
                    className={`relative rounded-3xl overflow-hidden border border-white/50 shadow-[0_8px_32px_rgba(14,165,233,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] group ${
                      thumbs.length > 0 ? 'col-span-2 row-span-2' : 'col-span-3'
                    }`}
                    style={thumbs.length > 0 ? undefined : { aspectRatio: '16/9' }}
                  >
                    <img
                      src={images[0]?.url ?? ''}
                      alt={boat.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div
                      className="absolute top-3 left-3 flex items-center gap-1 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/30"
                      style={{
                        backgroundColor: 'rgba(14,165,233,0.8)',
                        boxShadow: '0 2px 8px rgba(14,165,233,0.5)',
                      }}
                    >
                      {typeLabel}
                    </div>
                    <FavoriteButton
                      isFavorite={favoriteIds.has(boat.id_boat)}
                      onToggle={() => toggleFavorite(boat.id_boat)}
                      size={26}
                      className="absolute top-3 right-3 z-10"
                    />
                    <p className="absolute bottom-4 left-4 text-white text-lg font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
                      {boat.name}
                      {boat.build_year != null && ` - ${boat.build_year}`}
                    </p>
                  </div>
                  {thumbs.map((img) => (
                    <div
                      key={img.url}
                      className="relative rounded-3xl overflow-hidden border border-white/50 shadow-[0_8px_32px_rgba(14,165,233,0.15)]"
                      style={{ aspectRatio: '7/5' }}
                    >
                      <img
                        src={img.url}
                        alt={boat.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>

                {/* Nom, pastilles d'info et description */}
                <div
                  className="rounded-2xl border p-6 flex flex-col gap-4"
                  style={{ ...GLASS_STYLE, ...slideInStyleLate('info', 2) }}
                >
                  {boat.port && (
                    <p className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-sky-500">
                      <MdLocationOn style={{ fontSize: '14px' }} />
                      {portLabel}
                    </p>
                  )}
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                    {boat.name}
                  </h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    {boat.size != null && (
                      <span
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full backdrop-blur-md"
                        style={PILL_STYLE}
                      >
                        <MdStraighten className="text-sky-400" style={{ fontSize: '13px' }} />
                        {t('product.header.lengthValue', { size: Number(boat.size) })}
                      </span>
                    )}
                    {boat.capacity != null && (
                      <span
                        className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full backdrop-blur-md"
                        style={PILL_STYLE}
                      >
                        <MdPeople className="text-sky-400" style={{ fontSize: '13px' }} />
                        {t('category.card.persons', { count: boat.capacity })}
                      </span>
                    )}
                    <span
                      className="text-[11px] font-medium px-2 py-1 rounded-full backdrop-blur-md"
                      style={PILL_STYLE}
                    >
                      {boat.with_skipper
                        ? t('category.card.skipperIncluded')
                        : t('category.card.skipperExcluded')}
                    </span>
                    <span
                      className="text-[11px] font-medium px-2 py-1 rounded-full backdrop-blur-md"
                      style={PILL_STYLE}
                    >
                      {boat.license_required
                        ? t('category.card.licenseRequired')
                        : t('category.card.noLicenseRequired')}
                    </span>
                    <span className="text-xs font-semibold text-white ml-1">
                      {boat.avg_rating != null ? (
                        <>
                          <span className="text-amber-400">★</span> {boat.avg_rating}
                          {boat.review_count > 0 && (
                            <span className="text-white/70">
                              {' '}
                              ({t('product.header.reviews', { count: boat.review_count })})
                            </span>
                          )}
                        </>
                      ) : (
                        t('category.card.new')
                      )}
                    </span>
                  </div>
                  {boat.description && (
                    <p className="text-sm text-white/80 leading-relaxed">{boat.description}</p>
                  )}
                </div>
              </div>

              {/* Panneau de réservation — 1/3, sticky sous les barres fixes */}
              <aside
                className="w-1/3 sticky flex flex-col gap-3"
                style={{ top: `${panelStickyTop}px`, transition: 'top 0.3s ease' }}
              >
                {/* L'animation s'applique aux blocs internes et non à l'<aside>
                    sticky, dont le style transition (top) doit rester. */}
                <div
                  className="flex flex-col rounded-2xl border overflow-hidden"
                  style={{
                    borderColor: 'rgba(255,255,255,0.2)',
                    ...slideInStyleLate('panel', 3, 'right'),
                  }}
                >
                  <div className="flex items-center justify-between px-5 py-4" style={GLASS_STYLE}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-white">{price} €</span>
                      <span className="text-xs text-white/70">{t('category.card.perDay')}</span>
                    </div>
                    <span
                      className="text-[10px] font-semibold flex items-center gap-1.5"
                      style={{ color: isAvailable ? '#16a34a' : '#f59e0b' }}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block ${
                          isAvailable ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      {isAvailable
                        ? t('product.booking.available')
                        : t('product.booking.unavailable')}
                    </span>
                  </div>
                  <div
                    className="flex flex-col gap-4 px-5 py-4 border-t"
                    style={{ ...GLASS_STYLE, borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <p className="text-[10px] font-bold tracking-widest uppercase text-sky-500">
                      {t('product.booking.selectDates')}
                    </p>
                    <div
                      className="flex justify-center rounded-full border"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderColor: 'rgba(255,255,255,0.3)',
                      }}
                    >
                      <DateRangePicker
                        start={start}
                        end={end}
                        onChangeStart={setStart}
                        onChangeEnd={setEnd}
                        isDateAvailable={isDateAvailable}
                        light
                      />
                    </div>

                    {dayCount > 0 && (
                      <div className="flex flex-col gap-2 border-t border-white/20 pt-3">
                        <div className="flex justify-between text-xs text-white/80">
                          <span>{t('product.booking.days', { count: dayCount, price })}</span>
                          <span>{total} €</span>
                        </div>
                        {boat.with_skipper && (
                          <div className="flex justify-between text-xs text-white/80">
                            <span>{t('product.booking.skipperService')}</span>
                            <span>{t('product.booking.free')}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline border-t border-white/20 pt-2">
                          <span className="text-sm font-semibold text-white">
                            {t('product.booking.total')}
                          </span>
                          <span className="text-xl font-bold text-sky-400">{total} €</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleBook}
                      className="w-full text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-all backdrop-blur-md border border-white/40 bg-[rgba(14,165,233,0.55)] shadow-[0_4px_16px_rgba(14,165,233,0.35)] hover:bg-[rgba(10,49,114,0.95)] hover:border-white/20"
                    >
                      {t('product.booking.book')}
                    </button>
                    <p className="text-[10px] text-white/60 text-center uppercase tracking-wide">
                      {t('product.booking.noCharge')}
                    </p>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-white/80">
                      <MdVerified className="text-sky-400" style={{ fontSize: '14px' }} />
                      {t('product.booking.secure')}
                    </p>
                  </div>
                </div>

                {/* Besoin d'aide ? */}
                <div
                  className="rounded-2xl border p-4 flex items-start gap-3"
                  style={{ ...GLASS_STYLE, ...slideInStyleLate('help', 4, 'right') }}
                >
                  <MdInfoOutline className="text-sky-400 flex-shrink-0 mt-0.5 text-lg" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-white">
                      {t('product.booking.help.title')}
                    </p>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {t('product.booking.help.text')}
                    </p>
                    <Link
                      to="/contact"
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      {t('product.booking.help.cta')}
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>

        {/* Sections sous la ligne de flottaison, montées après l'animation
            d'entrée ; le bloc fantôme conserve la hauteur (et la barre de
            défilement). */}
        {!belowFoldReady && <div style={{ height: '60vh' }} aria-hidden="true" />}
        {belowFoldReady && boat && (
          <>
            {/* Section 3 — Spécifications techniques */}
            <section
              id="specifications"
              className="w-full bg-white flex flex-col items-center px-28 py-10 scroll-mt-[130px]"
            >
              <div className="text-center mb-10">
                <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-6 underline underline-offset-4">
                  {t('product.specs.kicker')}
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
                  {t('product.specs.title')}
                </h2>
                <p className="text-sm text-gray-500 mt-4">{t('product.specs.subtitle')}</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-x-16">
                {specRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4 py-3 border-b border-gray-100"
                  >
                    <span className="text-xs font-semibold tracking-widest uppercase text-gray-400">
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 text-right">{value}</span>
                  </div>
                ))}
              </div>
              {boat.equipment?.length > 0 && (
                <div className="w-full mt-10 flex flex-col items-center gap-4">
                  <p className="text-xs font-bold tracking-widest uppercase text-sky-500">
                    {t('product.specs.equipment')}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {boat.equipment.map((eq) => (
                      <span
                        key={eq.id_equipment}
                        className="text-xs font-medium px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-100"
                      >
                        {eq.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="border-t border-gray-200 mx-[168px]" />

            {/* Section 4 — Localisation */}
            <section
              id="localisation"
              className="w-full bg-white flex flex-col items-center px-28 py-10 scroll-mt-[130px]"
            >
              <div className="text-center mb-10">
                <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-6 underline underline-offset-4">
                  {t('product.location.kicker')}
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
                  {t('product.location.title')}
                </h2>
                {boat.port && (
                  <p className="text-sm text-gray-500 mt-4">
                    {t('product.location.subtitle', { port: portLabel })}
                  </p>
                )}
              </div>
              <div
                className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.1)]"
                style={{ height: '420px' }}
              >
                <MapView
                  markers={portMarkers}
                  className="h-full !rounded-none !border-0"
                  emptyLabel={t('category.map.empty')}
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center px-2 mt-2">
                {t('category.map.hint')}
              </p>
            </section>

            <div className="border-t border-gray-200 mx-[168px]" />

            {/* Section 5 — Embarcations similaires */}
            <section
              id="suggestions"
              className="relative w-full flex flex-col gap-8 px-28 py-10 scroll-mt-[140px] bg-white"
            >
              <Carrousel theme="light" similarTo={similarTo} />
            </section>
          </>
        )}

        {/* Section 6 — Avis clients */}
        {belowFoldReady && <ClientReviews id="avis" className="py-10 scroll-mt-[60px]" />}
      </div>
    </main>
  );
}

export default ProductPage;
