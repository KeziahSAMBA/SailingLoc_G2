import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  memo,
  startTransition,
} from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bateauBg from '../assets/image/paysage/cote_azur.jpg';
import productBg from '../assets/image/paysage/crique.jpg';
import SearchBar from '../components/common/SearchBar.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import MapView from '../components/common/MapView.jsx';
import { MdLocationOn, MdPeople, MdCalendarToday } from 'react-icons/md';
import { FaCrown } from 'react-icons/fa';
import ClientReviews from '../components/common/ClientReviews.jsx';
import Carrousel from '../components/common/Carrousel.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';
import GhostButton from '../components/common/GhostButton.jsx';
import FavoriteButton from '../components/common/FavoriteButton.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { fetchBoats } from '../services/boatService.js';
import { fetchPorts } from '../services/portService.js';
import { trackSiteSearch } from '../utils/matomo.js';
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
  PAGE_SLIDE_CSS,
  CATEGORY_ENTER_STAGGER,
  CATEGORY_ENTER_TOTAL,
  CATEGORY_ENTER_EASING,
  CATEGORY_EXIT_EASING,
  HERO_EXIT_DURATION,
  INTRO_SOFT_EASING,
} from '../hooks/useCategoryTransition.js';

// Fond photo bateau partagé par toutes les sections de la page (résultats,
// carrousels, avis), qui reprennent toutes ce même habillage (image + assombrissement).
const PHOTO_BG_STYLE = {
  backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bateauBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
};

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
            className="absolute top-3 left-3 flex items-center gap-1 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/30"
            style={{
              backgroundColor: 'rgba(14,165,233,0.8)',
              boxShadow: '0 2px 8px rgba(14,165,233,0.5)',
            }}
          >
            <FaCrown style={{ fontSize: '9px' }} />
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
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-baseline gap-1 min-w-0">
            <h3 className="text-[15px] font-bold text-white leading-tight truncate">{name}</h3>
            <span className="text-white/50 flex-shrink-0">-</span>
            <span className="text-[10px] font-bold tracking-widest text-sky-500 uppercase flex-shrink-0">
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
        <div className="flex items-center justify-between gap-1 mb-2 pb-2 border-b border-white/40">
          <span className="text-xs text-white/80 flex items-center gap-1 min-w-0">
            <MdLocationOn className="text-sky-500 flex-shrink-0" style={{ fontSize: '13px' }} />
            <span className="truncate">{location}</span>
          </span>
          {availability?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap justify-end flex-shrink-0">
              <MdCalendarToday
                className="text-sky-500 flex-shrink-0"
                style={{ fontSize: '12px' }}
              />
              {availability.map((period) => (
                <span
                  key={period}
                  className="text-[10px] font-medium px-1 py-0.5 rounded-full backdrop-blur-md"
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
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="flex items-center gap-1 text-xs text-white/70 flex-shrink-0">
            <MdPeople className="text-sky-500" style={{ fontSize: '14px' }} />
            {t('category.card.persons', { count: capacity })}
          </span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <span
              className="text-[9px] font-medium px-1 py-0.5 rounded-full backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(14,165,233,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {skipper ? t('category.card.skipperIncluded') : t('category.card.skipperExcluded')}
            </span>
            <span
              className="text-[9px] font-medium px-1 py-0.5 rounded-full backdrop-blur-md"
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
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[15px] font-bold text-white">{price} €</span>
            <span className="text-xs text-white/70">{t('category.card.perDay')}</span>
          </div>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="text-white text-[11px] font-semibold px-2 py-1 rounded-full transition-all backdrop-blur-md border border-white/40 bg-[rgba(14,165,233,0.55)] shadow-[0_4px_16px_rgba(14,165,233,0.35)] hover:bg-[rgba(10,49,114,0.95)] hover:border-white/20"
          >
            {t('category.card.book')}
          </button>
        </div>
      </div>
    </article>
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
  // Arrivée depuis la transition HomePage → catégorie : les blocs de la page
  // entrent depuis la marge gauche en cascade, et la SearchBar glisse (FLIP)
  // depuis sa position dans le hero de l'accueil jusqu'à son emplacement ici.
  const navigate = useNavigate();
  const [transitionPayload] = useState(() => readTransitionPayload('category'));
  const [enterActive, setEnterActive] = useState(Boolean(transitionPayload));
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
  // Sortie vers la page produit uniquement : son fond (image différente de
  // celui de la catégorie) recouvre le nôtre en fondu, pour un raccord
  // invisible au moment du montage réel de la page produit — cf. exitBgSrc
  // dans ProductPage.jsx pour le même mécanisme joué en sens inverse. Vers
  // l'accueil, inutile : on transmet notre image via le payload de
  // transition (bg ci-dessous), que la HomePage utilise elle-même pour son
  // propre fondu vers la vidéo.
  const [exitBgSrc, setExitBgSrc] = useState(null);
  const searchBarWrapRef = useRef(null);
  // Conteneur des champs de la SearchBar (destination/dates/voyageurs),
  // exposé par le composant : la sortie et l'arrivée y jouent directement
  // leur propre animation de largeur, cf. beginExit et le useLayoutEffect
  // de FLIP plus bas.
  const searchBarFieldsRef = useRef(null);
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
        }, CATEGORY_ENTER_TOTAL);
      };
    const unsubHome = onHomeTransitionRequest(beginExit('home'));
    const unsubProduct = onProductTransitionRequest(beginExit('product'));
    return () => {
      cancelled = true;
      clearTimeout(navTimer);
      unsubHome();
      unsubProduct();
    };
  }, [navigate]);
  // Header fixe (60/80px) + barre sticky (fil d'ariane, filtre, recherche sur
  // une seule ligne, pt réduit en mode compact au scroll ~60px, ~88px en haut
  // de page) : offset réel au-dessus de la carte, pour qu'elle tienne entière
  // dans l'écran visible.
  const mapStickyTop = (scrolled ? 60 : 80) + (scrolled ? 64 : 76);

  // Ancrage manuel des entrées du menu burger : espace (px) laissé au-dessus
  // de chaque section quand on y saute depuis le menu. Un seul endroit à
  // modifier par section pour caler l'atterrissage pile sur son titre —
  // augmenter la valeur atterrit plus haut dans la section, la baisser
  // atterrit plus bas. "Nos bateaux" n'y figure pas : elle remonte
  // simplement en haut de page (anchor: 'top' dans Header.jsx / HeaderLocataire.jsx).
  const ANCHOR_OFFSETS = {
    suggestions: 30, // menu burger : "Nos suggestions"
    avis: 20, // menu burger : "Avis & commentaires"
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
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Titres "Liste des propositions" / "N bateaux disponibles" : fondu simple
  // (même traitement que le "Bienvenue sur" de l'intro HomePage), rejoue à
  // chaque arrivée sur la page et s'inverse dès la sortie. Son apparition est
  // calée sur l'atterrissage commun de la cascade des autres blocs
  // (CATEGORY_ENTER_TOTAL) pour donner l'illusion que tout arrive ensemble —
  // sans quoi le fondu, plus court, finissait avant eux. Sans cascade
  // (arrivée directe, pas de transitionPayload), apparition immédiate.
  const [titlesVisible, setTitlesVisible] = useState(false);
  useEffect(() => {
    const delay = transitionPayload ? Math.max(CATEGORY_ENTER_TOTAL - HERO_EXIT_DURATION, 0) : 0;
    const timer = setTimeout(() => setTitlesVisible(true), delay);
    return () => clearTimeout(timer);
  }, [transitionPayload]);
  useEffect(() => {
    if (exiting) setTitlesVisible(false);
  }, [exiting]);
  const titleFadeStyle = {
    opacity: titlesVisible ? 1 : 0,
    transform: titlesVisible ? 'none' : 'translateY(14px)',
    transition: `opacity ${HERO_EXIT_DURATION}ms ${INTRO_SOFT_EASING}, transform ${HERO_EXIT_DURATION}ms ${INTRO_SOFT_EASING}`,
  };

  // Fenêtre d'entrée : assez large pour couvrir les blocs montés en retard
  // (la grille des fiches attend la réponse de l'API). Une fois refermée, plus
  // aucun style d'animation — sinon un bloc remonté plus tard (ex. passage
  // "aucun résultat" → résultats via les filtres) rejouerait sa glissade.
  useEffect(() => {
    if (!enterActive) return undefined;
    // Marge après l'atterrissage commun pour couvrir une grille de fiches
    // montée en retard (API lente) sans lui couper son animation en vol.
    const timer = setTimeout(() => setEnterActive(false), CATEGORY_ENTER_TOTAL + 1500);
    return () => clearTimeout(timer);
  }, [enterActive]);

  // FLIP de la SearchBar : on part de sa position mesurée sur la page de
  // départ (hero de l'accueil, ou barre encore rétractée de la page produit)
  // puis on laisse la transition la ramener à sa place naturelle.
  useLayoutEffect(() => {
    const from = transitionPayload?.searchBarRect;
    const el = searchBarWrapRef.current;
    if (!from || !el) return undefined;
    // Depuis la page produit uniquement : séquence en deux temps, comme
    // HomePage → catégorie mais lue à l'envers — là-bas la barre arrive déjà
    // à sa place avant de changer de taille (translate+scale d'un bloc qui a
    // toujours sa forme finale) ; ici elle change de forme (déploiement des
    // champs, en parallèle direct sur leur nœud — un scale du bloc entier
    // déformerait le texte) avant de se déplacer. Depuis l'accueil (hero à
    // une tout autre échelle), pas de mécanisme de rétraction en jeu :
    // translate + scale simultanés du bloc entier, sur ce seul cas.
    const translateOnly = transitionPayload?.from === 'product';
    const to = el.getBoundingClientRect();
    el.style.transformOrigin = 'top left';
    el.style.willChange = 'transform';
    el.style.transition = 'none';
    el.style.transform = translateOnly
      ? `translate(${from.left - to.left}px, ${from.top - to.top}px)`
      : `translate(${from.left - to.left}px, ${from.top - to.top}px) ` +
        `scale(${from.width / to.width}, ${from.height / to.height})`;
    const fieldsEl = searchBarFieldsRef.current;
    if (translateOnly && fieldsEl) {
      // Repart de l'état rétracté de la page produit.
      fieldsEl.style.transition = 'none';
      fieldsEl.style.maxWidth = '0px';
      fieldsEl.style.opacity = '0';
    }
    // Force le reflow avant d'activer la transition (comme le fait le
    // mécanisme interne de la SearchBar, cf. son propre useLayoutEffect) : un
    // seul rAF suffit alors, pas deux — sinon la translation démarrait un
    // cran plus tard que la cascade des autres blocs (une simple animation
    // CSS, active dès le tout premier rendu) et atterrissait après elle au
    // lieu d'en même temps.
    void el.offsetWidth;
    // Durée totale partagée entre les deux étapes (et non ajoutée bout à
    // bout) : la séquence complète doit tout de même atterrir à
    // CATEGORY_ENTER_TOTAL, en même temps que le reste de la cascade d'entrée.
    const deployDuration = Math.round(CATEGORY_ENTER_TOTAL / 2);
    const moveDuration = CATEGORY_ENTER_TOTAL - deployDuration;
    let phaseTimer = null;
    const raf = window.requestAnimationFrame(() => {
      if (translateOnly && fieldsEl) {
        const natural = fieldsEl.scrollWidth;
        fieldsEl.style.transition = `max-width ${deployDuration}ms ${CATEGORY_ENTER_EASING}, opacity ${deployDuration}ms ${CATEGORY_ENTER_EASING}`;
        fieldsEl.style.maxWidth = `${natural}px`;
        fieldsEl.style.opacity = '1';
        phaseTimer = setTimeout(() => {
          // Lève le plafond figé (comme le mécanisme interne de la
          // SearchBar une fois déployée) avant d'enchaîner sur la
          // translation.
          fieldsEl.style.transition = 'none';
          fieldsEl.style.maxWidth = 'none';
          el.style.transition = `transform ${moveDuration}ms ${CATEGORY_ENTER_EASING}`;
          el.style.transform = 'none';
        }, deployDuration);
      } else {
        el.style.transition = `transform ${CATEGORY_ENTER_TOTAL}ms ${CATEGORY_ENTER_EASING}`;
        el.style.transform = 'none';
      }
    });
    const resetStyles = () => {
      el.style.transform = '';
      el.style.transition = '';
      el.style.transformOrigin = '';
      el.style.willChange = '';
      if (fieldsEl) {
        // Cible réellement déployée (pas une chaîne vide) : effacer le style
        // figerait la largeur à 0 (SearchBar rend toujours retracted=false
        // ici, mais son style ne serait alors plus écrasé par rien) —
        // StrictMode, qui rejoue ce nettoyage avant même le premier rAF,
        // verrait alors une SearchBar entièrement repliée.
        fieldsEl.style.maxWidth = 'none';
        fieldsEl.style.opacity = '1';
        fieldsEl.style.transition = '';
      }
    };
    const cleanupTimer = setTimeout(resetStyles, CATEGORY_ENTER_TOTAL + 100);
    return () => {
      window.cancelAnimationFrame(raf);
      clearTimeout(phaseTimer);
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
    const duration = CATEGORY_ENTER_TOTAL - order * CATEGORY_ENTER_STAGGER;
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
  // pour que tous atterrissent à CATEGORY_ENTER_TOTAL pile.
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

  // Variante pour les blocs qui montent en retard (la grille des fiches attend
  // la réponse de l'API) : le délai est recalé sur l'horloge globale de la
  // cascade au moment du montage — négatif si le départ est déjà passé, ce qui
  // fait reprendre l'animation en cours de vol pour atterrir à
  // CATEGORY_ENTER_TOTAL en même temps que les autres blocs. Le style est figé
  // au premier calcul : le recalculer à chaque rendu redémarrerait l'animation.
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
    setVisibleCount(8);
  }, [searchParams.toString()]);

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
    <main className="w-full min-h-screen pt-20 bg-white overflow-x-clip">
      <style>{PAGE_SLIDE_CSS}</style>
      <div>
        {/* Fond photo bateau — englobe le strip sous le header, la searchbar et les résultats.
            min-h-screen : garantit une couverture plein écran même quand le
            contenu (chargement en cours, peu de résultats) est plus court
            que le viewport. */}
        <div className="relative min-h-screen" style={PHOTO_BG_STYLE}>
          {/* Crossfade vers le fond de la page produit pendant la sortie : se
              pose derrière les blocs (qui glissent hors écran par-dessus) et
              atterrit à pleine opacité pile pour le montage réel de la page
              produit, qui utilise nativement cette même image. */}
          {exitBgSrc && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${exitBgSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                animation: `pageBgFadeIn ${CATEGORY_ENTER_TOTAL}ms ease forwards`,
              }}
            />
          )}

          {/* Section 0 — Strip sous le header uniquement */}
          <section className="relative w-full -mt-20" style={{ height: '80px' }} />

          {/* Section 1 — Searchbar sticky */}
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
            {/* pt réduit en mode compact (scroll) : la barre se resserre sur ses
                composants au lieu de garder l'aération du haut de page. */}
            <div
              className="flex items-center gap-4 pb-2 pl-28"
              style={{
                paddingTop: scrolled ? '8px' : '20px',
                transition: 'padding-top 0.3s ease',
              }}
            >
              <div style={slideInStyle(1)}>
                <Breadcrumb light compact={scrolled} />
              </div>
              <div style={slideInStyle(0)}>
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
              <div ref={searchBarWrapRef}>
                <SearchBar light compact={scrolled} fieldsElRef={searchBarFieldsRef} />
              </div>
            </div>
          </section>

          {/* Section 2 — Listings + Carte 55/45 : fiches agrandies (largeur donc
              hauteur, via l'aspect-ratio de l'image) au détriment de la carte. */}
          <div className="flex items-start gap-6 px-28 py-5">
            {/* Listings — 55% */}
            <div className="w-[55%] flex flex-col gap-5 relative">
              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex items-end justify-between">
                  <div className="flex flex-col items-start gap-3" style={titleFadeStyle}>
                    <p className="text-xs font-bold tracking-widest uppercase underline underline-offset-4 text-sky-500">
                      {t('category.results.kicker')}
                    </p>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
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
                  <div className="grid grid-cols-2 gap-4" style={slideInStyleLate('cards', 4)}>
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

            {/* Carte — 45% */}
            {/* Offset sticky = hauteur du header fixe + hauteur de la barre filtre/recherche/fil
                d'ariane (toutes deux sticky au-dessus) + un petit espace de respiration. */}
            <aside
              className="w-[45%] sticky flex flex-col gap-2"
              style={{ top: `${mapStickyTop}px`, transition: 'top 0.3s ease' }}
            >
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
                    className="text-[10px] font-semibold flex items-center gap-1.5"
                    style={{ color: '#16a34a' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    {t('category.map.live')}
                  </span>
                </div>
                <div style={{ height: `calc(100vh - ${mapStickyTop}px - 56px)` }}>
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
              <p className="text-[10px] text-gray-400 text-center px-2">{t('category.map.hint')}</p>
            </aside>
          </div>
        </div>

        {/* Section 3+4 — Carrousels et avis clients : même fond photo que la
            section bateaux ci-dessus (deux containers séparés mais même image
            en background-attachment: fixed, donc raccord invisible), en thème
            glassmorphism (verre) pour rester lisibles dessus — carrousel
            inspiré du thème sombre de la HomePage, avis du thème `light` de
            la ProductPage. Différée pendant l'entrée ; le bloc fantôme
            conserve la hauteur (et la barre de défilement). */}
        <div className="relative" style={PHOTO_BG_STYLE}>
          {belowFoldReady ? (
            <section
              id="suggestions"
              className="relative w-full flex flex-col gap-8 px-28 py-10"
              style={{ scrollMarginTop: ANCHOR_OFFSETS.suggestions }}
            >
              <Carrousel glass />
            </section>
          ) : (
            <div style={{ height: '60vh' }} aria-hidden="true" />
          )}

          {belowFoldReady && (
            <ClientReviews
              light
              wide
              id="avis"
              className="py-10"
              style={{ scrollMarginTop: ANCHOR_OFFSETS.avis }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

export default CategoryPage;
