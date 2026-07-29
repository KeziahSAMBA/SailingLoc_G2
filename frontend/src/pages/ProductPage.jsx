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
import bateauBg from '../assets/image/paysage/crique.jpg';
import categoryBg from '../assets/image/paysage/cote_azur.jpg';
import SearchBar from '../components/common/SearchBar.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';
import MapView from '../components/common/MapView.jsx';
import Carrousel from '../components/common/Carrousel.jsx';
import ClientReviews from '../components/common/ClientReviews.jsx';
import GhostButton from '../components/common/GhostButton.jsx';
import FavoriteButton from '../components/common/FavoriteButton.jsx';
import ShareButton from '../components/common/ShareButton.jsx';
import DateRangePicker from '../components/common/DateRangePicker.jsx';
import {
  MdLocationOn,
  MdVerified,
  MdInfoOutline,
  MdStraighten,
  MdPeople,
  MdPerson,
  MdBadge,
  MdChatBubbleOutline,
} from 'react-icons/md';
import { useFavorites } from '../hooks/useFavorites.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { fetchBoats, fetchBoatsFresh } from '../services/boatService.js';
import { correctPortPosition, scatterBoatPosition } from '../utils/mapPosition.js';
import {
  getBookings as getLocataireBookings,
  createBookingReview,
} from '../services/locataireService.js';
import { contactBoatOwner } from '../services/messageService.js';
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

// Fond photo bateau partagé par le haut de page et la section avis, qui
// reprennent tous deux ce même habillage (image + assombrissement).
const PHOTO_BG_STYLE = {
  backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bateauBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
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
  const { showToast } = useToast();
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
  // Sortie vers la catégorie uniquement : notre fond (image différente de la
  // sienne) recouvre le sien en fondu, pour un raccord invisible au moment du
  // montage réel de la page catégorie — cf. le même mécanisme en sens
  // inverse dans CategoryPage.jsx. Vers l'accueil, inutile : on transmet
  // plutôt notre image via le payload de transition (bg ci-dessous), que la
  // HomePage utilise elle-même pour son propre fondu vers la vidéo — sans
  // quoi la sortie détournerait par l'image de la catégorie.
  const [exitBgSrc, setExitBgSrc] = useState(null);
  const searchBarWrapRef = useRef(null);
  // Conteneur des champs de la SearchBar (destination/dates/voyageurs),
  // exposé par le composant : la sortie et l'arrivée y jouent directement
  // leur propre animation de largeur, cf. beginExit et le useLayoutEffect
  // de FLIP plus bas.
  const searchBarFieldsRef = useRef(null);
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
        if (target === 'category') {
          // Précharge ET décode le fond de la catégorie pendant la remontée :
          // le décodage du JPEG au moment du premier paint ferait saccader le
          // début du crossfade.
          const bg = new window.Image();
          bg.src = categoryBg;
          bg.decode?.().catch(() => {});
        }
        await smoothScrollToTop();
        if (cancelled) return;
        if (target === 'category') setExitBgSrc(categoryBg);
        setExiting(true);
        // Payload posé à la toute fin de la sortie, pas à son départ : seul
        // le `top` du bandeau sticky doit avoir fini de se reposer — mesuré
        // trop tôt, le FLIP de la page d'arrivée partirait d'une position
        // périmée et corrigerait en plein vol.
        navTimer = setTimeout(() => {
          setTransitionPayload(target, {
            searchBarRect: searchBarWrapRef.current?.getBoundingClientRect() ?? null,
            bg: bateauBg,
            from: 'product',
          });
          navigate(to);
        }, CATEGORY_ENTER_TOTAL);
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

  // FLIP de la SearchBar en deux temps, comme catégorie/accueil ← produit
  // mais lue à l'envers — là-bas la barre arrive déjà à sa place avant de
  // changer de taille ; ici elle se déplace d'abord (encore à sa taille de
  // départ, translate sans scale : un scale du bloc entier déformerait le
  // texte/les champs), puis seulement ensuite se rétracte (en parallèle
  // direct sur le nœud des champs). Depuis la catégorie ou l'accueil
  // uniquement (les deux ont une barre déployée, contrairement à la barre
  // produit elle-même). Le bord gauche de la barre, lui, est le même
  // rétractée ou déployée : mesurer `to` avant la rétraction reste donc
  // valide pour la translation.
  useLayoutEffect(() => {
    const from = transitionPayload?.searchBarRect;
    const el = searchBarWrapRef.current;
    const hasContinuity =
      transitionPayload?.from === 'category' || transitionPayload?.from === 'home';
    if (!from || !el || !hasContinuity) return undefined;
    const to = el.getBoundingClientRect();
    el.style.willChange = 'transform';
    el.style.transition = 'none';
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    const fieldsEl = searchBarFieldsRef.current;
    if (fieldsEl) {
      // Repart de l'état déployé de la page catégorie.
      fieldsEl.style.transition = 'none';
      fieldsEl.style.maxWidth = 'none';
      fieldsEl.style.opacity = '1';
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
    // Part plus généreuse pour la rétractation (60/40) : sur un partage égal,
    // elle se rétrécissait un peu trop vite pour rester fluide.
    const moveDuration = Math.round(CATEGORY_ENTER_TOTAL * 0.4);
    const retractDuration = CATEGORY_ENTER_TOTAL - moveDuration;
    let phaseTimer = null;
    const raf = window.requestAnimationFrame(() => {
      el.style.transition = `transform ${moveDuration}ms ${CATEGORY_ENTER_EASING}`;
      el.style.transform = 'none';
      phaseTimer = setTimeout(() => {
        if (fieldsEl) {
          // max-width ne peut pas s'interpoler depuis 'none' (mot-clé, pas
          // une longueur) : on le fige d'abord en pixels (valeur identique,
          // aucun changement visuel) avant d'amorcer la vraie transition
          // vers 0 — sans ce détour, la rétractation sauterait d'un coup au
          // lieu de se rétrécir progressivement.
          const natural = fieldsEl.scrollWidth;
          fieldsEl.style.transition = 'none';
          fieldsEl.style.maxWidth = `${natural}px`;
          void fieldsEl.offsetWidth;
          fieldsEl.style.transition = `max-width ${retractDuration}ms ${CATEGORY_ENTER_EASING}, opacity ${retractDuration}ms ${CATEGORY_ENTER_EASING}`;
          fieldsEl.style.maxWidth = '0px';
          fieldsEl.style.opacity = '0';
        }
      }, moveDuration);
    });
    const resetStyles = () => {
      el.style.transform = '';
      el.style.transition = '';
      el.style.willChange = '';
      if (fieldsEl) {
        // Cible réellement rétractée (pas une chaîne vide) : effacer le
        // style figerait la largeur naturelle du contenu (SearchBar rend
        // toujours retracted=true ici, mais son style ne serait alors plus
        // écrasé par rien) — StrictMode, qui rejoue ce nettoyage avant même
        // le premier rAF, verrait alors une SearchBar grande ouverte.
        fieldsEl.style.maxWidth = '0px';
        fieldsEl.style.opacity = '0';
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
  const thumbs = images.slice(1, 5);
  const typeLabel = boat ? t(`carrousel.boatType.${boat.type}`, { defaultValue: boat.type }) : '';
  const isAvailable = (boat?.availabilities?.length ?? 0) > 0;
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (!boat || user?.role !== 'locataire') {
      setReviewBooking(null);
      return undefined;
    }
    let cancelled = false;
    const requestedBookingId = Number(location.state?.reviewBookingId);
    getLocataireBookings()
      .then(({ data }) => {
        if (cancelled) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eligible = (data.bookings || []).find((booking) => {
          const endDate = new Date(booking.end_date);
          endDate.setHours(0, 0, 0, 0);
          return (
            booking.boat?.id_boat === boat.id_boat &&
            booking.status === 'confirmed' &&
            endDate < today &&
            !booking.reviewed &&
            (!Number.isInteger(requestedBookingId) || booking.id_booking === requestedBookingId)
          );
        });
        setReviewBooking(eligible || null);
      })
      .catch(() => {
        if (!cancelled) setReviewBooking(null);
      });
    return () => {
      cancelled = true;
    };
  }, [boat, user?.role, location.state?.reviewBookingId]);

  async function handleProductReviewSubmit(e) {
    e.preventDefault();
    const cleanComment = reviewComment.trim();
    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError(t('locataireReservations.reviewModal.ratingRequired'));
      return;
    }
    if (cleanComment.length < 10) {
      setReviewError(t('locataireReservations.reviewModal.commentTooShort'));
      return;
    }
    setReviewSaving(true);
    setReviewError('');
    try {
      await createBookingReview(reviewBooking.id_booking, reviewRating, cleanComment);
      setReviewBooking(null);
      setReviewRating(0);
      setReviewComment('');
      showToast(t('locataireReservations.toasts.reviewSubmitted'), 'success');
    } catch (err) {
      setReviewError(err.response?.data?.message || t('locataireReservations.toasts.reviewError'));
    } finally {
      setReviewSaving(false);
    }
  }

  // Sélection de dates du panneau de réservation.
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  useEffect(() => {
    setStart('');
    setEnd('');
  }, [boatId]);

  // Rafraîchit les disponibilités au moment où le locataire ouvre le
  // calendrier : les données de la page peuvent dater (cache 60 s + temps
  // passé sur la page), et un créneau a pu être confirmé entre-temps.
  const refreshAvailability = useCallback(() => {
    fetchBoatsFresh()
      .then(({ data }) => startTransition(() => setBoats(data)))
      .catch(() => {});
  }, []);

  // Un jour est réservable s'il tombe dans une période d'ouverture du bateau
  // et qu'aucune réservation confirmée (payée) ne le couvre — les demandes
  // « pending » d'autres locataires ne bloquent pas le créneau.
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

  // Entrée du tunnel de réservation : visiteur → login (pop-up par-dessus la
  // page, comme pour les favoris) ; locataire avec dates choisies → tunnel.
  const [bookingHint, setBookingHint] = useState('');
  useEffect(() => setBookingHint(''), [boatId, start, end]);

  function handleBook() {
    if (!user) {
      navigate('/login', { state: { backgroundLocation: location } });
      return;
    }
    if (user.role !== 'locataire') {
      setBookingHint(t('product.booking.locataireOnly'));
      return;
    }
    if (!start || !end) {
      setBookingHint(t('product.booking.missingDates'));
      return;
    }
    navigate(`/reservation/${boatId}?start=${start}&end=${end}`);
  }

  const [contactBusy, setContactBusy] = useState(false);
  const [contactHint, setContactHint] = useState('');

  async function handleContactOwner() {
    if (!user) {
      navigate('/login', { state: { backgroundLocation: location } });
      return;
    }
    if (user.role !== 'locataire') {
      setContactHint(t('product.ownerContact.locataireOnly'));
      return;
    }

    setContactBusy(true);
    setContactHint('');
    try {
      const { data } = await contactBoatOwner(boatId);
      navigate('/locataire/messages', {
        state: { openUser: data.owner, boatName: data.boat_name },
      });
    } catch (err) {
      const message = err.response?.data?.message || t('product.ownerContact.error');
      setContactHint(message);
      showToast(message, 'error');
    } finally {
      setContactBusy(false);
    }
  }

  const portLat = Number(boat?.port?.latitude);
  const portLng = Number(boat?.port?.longitude);
  const hasPortCoords = boat?.port && Number.isFinite(portLat) && Number.isFinite(portLng);
  const portMarkers = hasPortCoords
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

  // Position individuelle du bateau (dispersée autour du port, cf. mapPosition.js) :
  // la carte de localisation se centre/zoome dessus plutôt que sur le port en
  // général, pour désigner précisément le bateau consulté.
  const boatMapMarker = hasPortCoords
    ? (() => {
        const { lat, lng } = correctPortPosition(boat.port.city, portLat, portLng);
        return {
          id: boat.id_boat,
          ...scatterBoatPosition(boat.id_boat, lat, lng),
          price: Number(boat.daily_price),
          name: boat.name,
          city: boat.port.city,
        };
      })()
    : null;

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
    // Nom transmis par la page catégorie via le payload en attendant la
    // réponse de l'API : sans lui, le passage « … » → nom élargit la
    // breadcrumb et repousse la SearchBar en plein FLIP (effet de rebond).
    { label: boat?.name ?? transitionPayload?.boatName ?? '…', to: `/product/${id}` },
  ];

  // Header fixe (60/80px) + barre fil d'ariane/recherche sticky, compactée au
  // scroll (pt 20px → 8px, soit ~72px puis ~60px) : offset réel au-dessus du
  // panneau de réservation sticky.
  const panelStickyTop = (scrolled ? 60 : 80) + (scrolled ? 64 : 76);

  // Ancrage manuel des entrées du menu burger : espace (px) laissé au-dessus
  // de chaque section quand on y saute depuis le menu. Un seul endroit à
  // modifier par section pour caler l'atterrissage pile sur son titre —
  // augmenter la valeur atterrit plus haut dans la section, la baisser
  // atterrit plus bas. "Location" n'y figure pas : elle remonte simplement
  // en haut de page (anchor: 'top' dans Header.jsx / HeaderLocataire.jsx).
  const ANCHOR_OFFSETS = {
    specifications: 100, // menu burger : "Caractéristiques"
    avis: 230, // menu burger : "Avis & commentaires"
    localisation: 60, // menu burger : "Emplacement"
    suggestions: 285, // menu burger : "Suggestions"
  };

  return (
    // overflow-x-clip (et non hidden : hidden créerait un conteneur de scroll
    // qui casserait les sticky) évite l'ascenseur horizontal pendant l'entrée
    // des blocs depuis la marge droite (translateX(110vw)).
    <main className="w-full min-h-screen pt-20 bg-white overflow-x-clip">
      <style>{PAGE_SLIDE_CSS}</style>
      <div>
        {/* Fond photo bateau — image propre à la page produit ; le raccord
            invisible aux transitions est assuré par le crossfade ci-dessous
            plutôt que par une image partagée avec la catégorie.
            min-h-screen : garantit une couverture plein écran même quand le
            contenu (chargement en cours, bateau introuvable) est plus court
            que le viewport. */}
        <div className="relative min-h-screen" style={PHOTO_BG_STYLE}>
          {/* Crossfade vers le fond de la page cible pendant la sortie : se
              pose derrière les blocs (qui glissent hors écran par-dessus) et
              atterrit à pleine opacité pile pour le montage réel de la page
              suivante, qui utilise nativement cette même image. */}
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

          {/* Section 1 — Searchbar + fil d'ariane sticky */}
          <section className="relative z-40 w-full">
            {/* pt réduit en mode compact (scroll) : la barre se resserre sur ses
                composants au lieu de garder l'aération du haut de page. */}
            <div
              className="flex items-center gap-4 pb-2 pl-28"
              style={{
                paddingTop: scrolled ? '8px' : '20px',
                transition: 'padding-top 0.3s ease',
              }}
            >
              <div style={slideInStyle(0)}>
                <Breadcrumb light compact={scrolled} items={breadcrumbItems} />
              </div>
              <div ref={searchBarWrapRef}>
                <SearchBar light compact={scrolled} retracted fieldsElRef={searchBarFieldsRef} />
              </div>
            </div>
          </section>

          {/* Section 2 — Galerie + infos (2/3) et panneau de réservation (1/3) */}
          {!boatsLoaded && <div style={{ height: '70vh' }} aria-hidden="true" />}
          {boatsLoaded && !boat && (
            <div
              className="flex flex-col items-center gap-4 px-4 py-24 text-center sm:px-8 lg:px-20"
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
            <div className="flex flex-col items-stretch gap-6 px-4 py-5 pb-12 sm:px-8 lg:px-16 xl:flex-row xl:items-start xl:pl-28 xl:pr-20">
              {/* Colonne principale */}
              <div className="contents xl:flex xl:min-w-0 xl:flex-1 xl:flex-col xl:gap-5">
                {/* Galerie : image principale + vues secondaires (jusqu'à 4) */}
                <div
                  className="order-1 grid h-[340px] grid-cols-1 grid-rows-1 gap-2 sm:h-[440px] sm:gap-4 xl:order-none xl:grid-cols-4 xl:grid-rows-2"
                  style={slideInStyleLate('gallery', 1)}
                >
                  <div
                    className={`relative overflow-hidden rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(14,165,233,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] group sm:rounded-3xl ${
                      thumbs.length > 0
                        ? 'col-span-1 row-span-1 xl:col-span-2 xl:row-span-2'
                        : 'col-span-1 row-span-1 xl:col-span-4 xl:row-span-2'
                    }`}
                  >
                    <img
                      src={images[0]?.url ?? ''}
                      alt={boat.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  {thumbs.map((img) => (
                    <div
                      key={img.url}
                      className={`relative hidden overflow-hidden rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(14,165,233,0.15)] sm:rounded-3xl xl:block ${
                        thumbs.length === 1 ? 'xl:col-span-2 xl:row-span-2' : ''
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={boat.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>

                {/* Spécifications : juste sous la galerie, dans la même
                    colonne que les photos plutôt qu'après toute la ligne
                    (aside compris) — montées après l'animation d'entrée. */}
                {!belowFoldReady && (
                  <div
                    className="order-3 xl:order-none"
                    style={{ height: '60vh' }}
                    aria-hidden="true"
                  />
                )}
                {belowFoldReady && (
                  <>
                    {/* Section 3 — Spécifications techniques. Montée après la
                        cascade d'entrée mais son haut dépasse dans le viewport :
                        fondu discret à l'apparition (un pop sec sinon), et
                        sortie avec les autres blocs — sans quoi elle resterait
                        figée à l'écran pendant que tout le reste s'en va. */}
                    <section
                      id="specifications"
                      className="relative w-full flex flex-col items-start py-6"
                      style={{
                        scrollMarginTop: ANCHOR_OFFSETS.specifications,
                        ...(exiting
                          ? slideOutStyle(2, 'left')
                          : transitionPayload && {
                              animation: 'pageBgFadeIn 400ms ease both',
                            }),
                      }}
                    >
                      <div
                        className="flex w-full max-w-[919.9px] flex-col items-center gap-6 rounded-2xl border px-4 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:px-10"
                        style={GLASS_STYLE}
                      >
                        <div className="text-center">
                          <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-6 underline underline-offset-4">
                            {t('product.specs.kicker')}
                          </p>
                          <h2 className="text-2xl font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:text-3xl md:text-4xl">
                            {t('product.specs.title')}
                          </h2>
                          <p className="text-sm text-white/70 mt-4">
                            {t('product.specs.subtitle')}
                          </p>
                        </div>
                        <div className="grid w-full grid-cols-1 gap-x-8 md:grid-cols-2 lg:gap-x-16">
                          {specRows.map(([label, value]) => (
                            <div
                              key={label}
                              className="flex items-start justify-between gap-4 border-b border-white/15 py-3 sm:items-baseline"
                            >
                              <span className="text-xs font-semibold tracking-widest uppercase text-white/60">
                                {label}
                              </span>
                              <span className="text-sm font-semibold text-white text-right">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                        {boat.equipment?.length > 0 && (
                          <div className="w-full flex flex-col items-center gap-4 pt-2 border-t border-white/15">
                            <p className="text-xs font-bold tracking-widest uppercase text-sky-500">
                              {t('product.specs.equipment')}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {boat.equipment.map((eq) => (
                                <span
                                  key={eq.id_equipment}
                                  className="text-xs font-medium px-3 py-1 rounded-full backdrop-blur-md"
                                  style={{
                                    backgroundColor: 'rgba(14,165,233,0.15)',
                                    color: '#ffffff',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                  }}
                                >
                                  {eq.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </>
                )}
              </div>

              {/* Panneau info + réservation — largeur fixe, sticky sous les barres fixes */}
              <aside
                className="shrink-0 sticky flex flex-col gap-3"
                style={{
                  width: '384px',
                  top: `${panelStickyTop}px`,
                  transition: 'top 0.3s ease',
                }}
              >
                {/* Nom, pastilles d'info et description */}
                <div
                  className="flex w-full flex-col gap-3 rounded-2xl border px-4 py-3 sm:px-5"
                  style={{
                    minHeight: '200px',
                    ...GLASS_STYLE,
                    // Colonne de droite : entre et sort par la marge droite,
                    // comme les deux blocs en dessous — par la gauche, il
                    // traverserait la galerie en plein vol.
                    ...slideInStyleLate('info', 2, 'right'),
                  }}
                >
                  {/* Nom + type de bateau, favoris aligné à droite */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h2 className="text-lg font-bold text-white tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                        {boat.name}
                      </h2>
                      <span className="text-white/50">-</span>
                      <span className="text-xs font-bold tracking-widest text-sky-500 uppercase">
                        {typeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <ShareButton url={window.location.href} title={boat.name} size={18} />
                      <FavoriteButton
                        isFavorite={favoriteIds.has(boat.id_boat)}
                        onToggle={() => toggleFavorite(boat.id_boat)}
                        size={20}
                      />
                    </div>
                  </div>

                  {/* Lieu */}
                  {boat.port && (
                    <p className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-sky-500">
                      <MdLocationOn style={{ fontSize: '13px' }} />
                      {portLabel}
                    </p>
                  )}

                  {/* Info : longueur, capacité, skipper, permis */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      boat.size != null && {
                        icon: MdStraighten,
                        label: t('product.header.lengthValue', { size: Number(boat.size) }),
                      },
                      boat.capacity != null && {
                        icon: MdPeople,
                        label: t('category.card.persons', { count: boat.capacity }),
                      },
                      {
                        icon: MdPerson,
                        label: boat.with_skipper
                          ? t('category.card.skipperIncluded')
                          : t('category.card.skipperExcluded'),
                      },
                      {
                        icon: MdBadge,
                        label: boat.license_required
                          ? t('category.card.licenseRequired')
                          : t('category.card.noLicenseRequired'),
                      },
                    ]
                      .filter(Boolean)
                      .map(({ icon: Icon, label }) => (
                        <span
                          key={label}
                          className="flex items-center gap-1 text-[11px] font-medium text-white px-1.5 py-0.5 rounded-full backdrop-blur-md"
                          style={{
                            backgroundColor: 'rgba(14,165,233,0.15)',
                            border: '1px solid rgba(255,255,255,0.3)',
                          }}
                        >
                          <Icon className="text-sky-400" style={{ fontSize: '12px' }} />
                          {label}
                        </span>
                      ))}
                  </div>

                  {/* Description */}
                  {boat.description && (
                    <p className="text-xs text-white/80 leading-snug">{boat.description}</p>
                  )}

                  {/* Rating + nombre de commentaires */}
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    {boat.review_count > 0 ? (
                      <>
                        <span className="text-amber-400">★</span> {boat.avg_rating}
                        <span className="text-white/70">
                          {' '}
                          ({t('product.header.ratings', { count: boat.review_count })}) ·{' '}
                          <a
                            href="#avis"
                            className="rounded underline underline-offset-2 transition hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                          >
                            {t('product.header.comments', { count: boat.comment_count })}
                          </a>
                        </span>
                      </>
                    ) : (
                      t('product.header.noReviews')
                    )}
                  </p>
                </div>

                {/* L'animation s'applique aux blocs internes et non à l'<aside>
                    sticky, dont le style transition (top) doit rester. */}
                {reviewBooking && (
                  <form
                    onSubmit={handleProductReviewSubmit}
                    className="flex w-full flex-col gap-3 rounded-2xl border p-4"
                    style={GLASS_STYLE}
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-sky-400">
                        {t('locataireReservations.reviewModal.title')}
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        {t('locataireReservations.reviewModal.moderationHint')}
                      </p>
                    </div>
                    <fieldset>
                      <legend className="mb-1 text-xs font-medium text-white/70">
                        {t('locataireReservations.reviewModal.ratingLabel')}
                      </legend>
                      <div className="flex gap-1.5" role="radiogroup">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={reviewRating === value}
                            aria-label={t('locataireReservations.reviewModal.starLabel', {
                              count: value,
                            })}
                            onClick={() => {
                              setReviewRating(value);
                              setReviewError('');
                            }}
                            className={`text-2xl leading-none transition hover:scale-110 ${
                              value <= reviewRating ? 'text-amber-300' : 'text-white/30'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <label
                      htmlFor="product-review-comment"
                      className="text-xs font-medium text-white/70"
                    >
                      {t('locataireReservations.reviewModal.commentLabel')}
                    </label>
                    <textarea
                      id="product-review-comment"
                      rows={4}
                      maxLength={1000}
                      value={reviewComment}
                      onChange={(e) => {
                        setReviewComment(e.target.value);
                        setReviewError('');
                      }}
                      placeholder={t('locataireReservations.reviewModal.commentPlaceholder')}
                      className="w-full resize-y rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-sky-400"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-white/50">{reviewComment.length}/1000</span>
                      <button
                        type="submit"
                        disabled={reviewSaving}
                        className="rounded-full bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewSaving
                          ? t('locataireReservations.reviewModal.submitting')
                          : t('locataireReservations.reviewModal.submit')}
                      </button>
                    </div>
                    {reviewError && (
                      <p role="alert" className="text-xs font-medium text-red-300">
                        {reviewError}
                      </p>
                    )}
                  </form>
                )}

                <div
                  className="relative z-20 flex w-full flex-col rounded-2xl border"
                  style={{
                    minHeight: '195px',
                    borderColor: 'rgba(255,255,255,0.2)',
                    ...slideInStyleLate('panel', 3, 'right'),
                  }}
                >
                  <div
                    className="flex flex-col items-start gap-2 rounded-t-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    style={GLASS_STYLE}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-white">{price} €</span>
                      <span className="text-xs text-white/70">
                        {t('category.card.perDay')} · {t('product.booking.taxIncluded')}
                      </span>
                    </div>
                    <span
                      className="flex items-center gap-1.5 text-[10px] font-semibold"
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
                    className="flex flex-col gap-3 px-4 py-3 border-t rounded-b-2xl"
                    style={{ ...GLASS_STYLE, borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <p className="text-[10px] font-bold tracking-widest uppercase text-sky-500 text-center">
                      {t('product.booking.selectDates')}
                    </p>
                    <div
                      className="flex max-w-full self-center justify-center rounded-full border"
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
                        onOpen={refreshAvailability}
                        light
                        panelPlacement="top-right"
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
                      className="self-center text-white text-sm font-semibold px-6 py-2 rounded-full transition-all backdrop-blur-md border border-white/40 bg-[rgba(14,165,233,0.55)] shadow-[0_4px_16px_rgba(14,165,233,0.35)] hover:bg-[rgba(10,49,114,0.95)] hover:border-white/20"
                    >
                      {t('product.booking.book')}
                    </button>
                    {bookingHint && (
                      <p role="status" className="text-xs text-center font-semibold text-amber-300">
                        {bookingHint}
                      </p>
                    )}
                    <p className="text-[10px] text-white/60 text-center uppercase tracking-wide">
                      {t('product.booking.noCharge')}
                    </p>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-white/80">
                      <MdVerified className="text-sky-400" style={{ fontSize: '14px' }} />
                      {t('product.booking.secure')}
                    </p>
                    <div className="border-t border-white/20 pt-3 text-center">
                      <p className="mb-2 text-xs text-white/70">{t('product.ownerContact.text')}</p>
                      <button
                        type="button"
                        onClick={handleContactOwner}
                        disabled={contactBusy}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:border-sky-300 hover:bg-sky-500/25 disabled:cursor-wait disabled:opacity-60"
                      >
                        <MdChatBubbleOutline aria-hidden="true" className="text-lg text-sky-300" />
                        {contactBusy
                          ? t('product.ownerContact.opening')
                          : t('product.ownerContact.cta')}
                      </button>
                      {contactHint && (
                        <p role="status" className="mt-2 text-xs font-semibold text-amber-300">
                          {contactHint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Besoin d'aide ? */}
                <div
                  className="rounded-2xl border p-3 flex items-start gap-2"
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

        {/* Section 4+5+6 — Avis clients, puis localisation, puis embarcations
            similaires : même fond photo (trois containers séparés mais même
            image en background-attachment: fixed, donc raccord invisible),
            en thème glassmorphism (verre) pour rester lisibles dessus — même
            traitement que le carrousel/avis de la CategoryPage. */}
        <div className="relative" style={PHOTO_BG_STYLE}>
          {belowFoldReady && (
            <ClientReviews
              light
              wide
              boatId={boatId}
              id="avis"
              className="py-10"
              style={{ scrollMarginTop: ANCHOR_OFFSETS.avis }}
            />
          )}

          {/* Localisation : MapView focalisé sur le bateau consulté (pin
              prix à sa position dispersée), centré dans la page, avec un
              titre discret au-dessus (même gabarit que le titre "avis" et
              l'en-tête "Embarcations similaires" du Carrousel) plutôt qu'un
              gros kicker/h2. focusZoom : niveau de zoom appliqué en arrivant
              sur la carte — à ajuster ici si besoin (18 = très rapproché ;
              MapView.jsx retombe sur BOAT_FOCUS_ZOOM, 18 aussi, si cette prop
              est omise). */}
          {belowFoldReady && boat && (
            <section
              id="localisation"
              className="relative w-full flex flex-col items-center gap-3 py-10"
              style={{ scrollMarginTop: ANCHOR_OFFSETS.localisation }}
            >
              <div className="w-full max-w-[919.9px] flex items-baseline gap-3">
                <h2
                  className="font-semibold text-white"
                  style={{ fontSize: '20px', lineHeight: '22px' }}
                >
                  {t('product.location.title')}
                </h2>
                {portLabel && (
                  <span className="text-white/70 ml-4" style={{ fontSize: '16px' }}>
                    {portLabel}
                  </span>
                )}
              </div>
              <div className="w-full max-w-[919.9px]" style={{ height: '420px' }}>
                <MapView
                  markers={portMarkers}
                  boatMarkers={boatMapMarker ? [boatMapMarker] : []}
                  focusBoat={boatMapMarker}
                  focusZoom={12}
                  className="h-full"
                  emptyLabel={t('category.map.empty')}
                />
              </div>
            </section>
          )}

          {belowFoldReady && boat && (
            <section
              id="suggestions"
              className="relative w-full flex flex-col gap-8 px-28 py-10"
              style={{ scrollMarginTop: ANCHOR_OFFSETS.suggestions }}
            >
              <Carrousel similarTo={similarTo} />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default ProductPage;
