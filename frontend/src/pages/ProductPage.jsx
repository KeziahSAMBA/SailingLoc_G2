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
import contactBg from '../assets/image/paysage/contact_bg.jpg';
import aboutBg from '../assets/image/paysage/about_bg.jpg';
import legalBg from '../assets/image/portrait/cgu.jpg';
import dashboardBg from '../assets/image/paysage/dashboard_bg.jpg';
import SearchBar from '../components/common/SearchBar.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';
import MapView from '../components/common/MapView.jsx';
import Carrousel from '../components/common/Carrousel.jsx';
import ClientReviews, { invalidatePublicReviews } from '../components/common/ClientReviews.jsx';
import BoatReviews from '../components/common/BoatReviews.jsx';
import GhostButton from '../components/common/GhostButton.jsx';
import FavoriteButton from '../components/common/FavoriteButton.jsx';
import ShareButton from '../components/common/ShareButton.jsx';
import DateRangePicker from '../components/common/DateRangePicker.jsx';
import SafeImage from '../components/common/SafeImage.jsx';
import SeoMetadata from '../components/common/SeoMetadata.jsx';
import {
  MdLocationOn,
  MdVerified,
  MdInfoOutline,
  MdStraighten,
  MdPeople,
  MdPerson,
  MdBadge,
  MdChatBubbleOutline,
  MdSearch,
  MdClose,
} from 'react-icons/md';
import { useFavorites } from '../hooks/useFavorites.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { deleteMyReview } from '../services/reviewService.js';
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
  PHOTO_OVERLAY_BOAT,
  PHOTO_OVERLAY_STATIC_PAGE,
  PHOTO_OVERLAY_DASHBOARD,
  NAV_ENTER_STAGGER,
  CATEGORY_PRODUCT_NAV_TOTAL as CATEGORY_ENTER_TOTAL,
  CATEGORY_ENTER_EASING,
  CATEGORY_EXIT_EASING,
  prefersReducedMotion,
} from '../hooks/useCategoryTransition.js';
import { onPageExitRequest, isOnDashboardPage } from '../hooks/usePageTransition.js';

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

const GALLERY_GAP = 12;

// Écart maximal toléré entre le ratio natif d'une photo et le ratio de la
// case dédiée avant d'accepter un recadrage : une photo déjà proche du
// format de la galerie s'affiche intacte (aucun recadrage nécessaire), une
// photo trop éloignée (ex. un portrait serré dans une galerie très large)
// est recadrée pour mieux occuper l'espace — mais seulement jusqu'à ce
// facteur d'écart, jamais jusqu'à coller pile le ratio de la case entière.
const MAX_RATIO_DEVIATION = 1.4;

function clampRatioTowardTarget(ratio, target) {
  return Math.min(Math.max(target, ratio / MAX_RATIO_DEVIATION), ratio * MAX_RATIO_DEVIATION);
}

// Toutes les répartitions en lignes qui respectent l'ordre des photos (seuls
// des voisins peuvent partager une ligne) : un « mask » de n-1 bits, un bit
// par frontière entre deux photos consécutives, posé (nouvelle ligne) ou non
// (même ligne). 2^(n-1) combinaisons — négligeable pour n ≤ 5 (image
// principale + 4 vignettes) — plutôt qu'une heuristique fixe qui devinerait
// au hasard qui va avec qui.
function consecutivePartitions(items) {
  const breakCount = items.length - 1;
  const partitions = [];
  for (let mask = 0; mask < 1 << breakCount; mask++) {
    const rows = [[items[0]]];
    for (let i = 0; i < breakCount; i++) {
      if (mask & (1 << i)) rows.push([items[i + 1]]);
      else rows[rows.length - 1].push(items[i + 1]);
    }
    partitions.push(rows);
  }
  return partitions;
}

// Empile les photos de la galerie par lignes sans jamais déformer une image :
// chaque ligne est dimensionnée pour occuper exactement toute la largeur
// dispo, puis l'ensemble des lignes est réduit d'un bloc (jamais agrandi
// au-delà de cette largeur) si leur hauteur cumulée dépasse l'espace dédié.
// Chaque photo garde son ratio natif SAUF s'il est trop éloigné du ratio de
// la case dédiée (clampRatioTowardTarget) : dans ce cas seulement, un léger
// recadrage (object-fit: cover côté rendu) comble l'écart — plafonné, jamais
// jusqu'à coller pile la forme de la case. Plusieurs répartitions en lignes
// sont possibles pour un même jeu de photos (côte à côte vs empilé) : on les
// évalue toutes et on garde celle dont l'aire réellement occupée, une fois
// mise à l'échelle, remplit le mieux l'espace dédié.
function layoutGalleryRows(items, containerWidth, containerHeight, gap) {
  if (!containerWidth || !containerHeight || items.length === 0) return [];

  const containerRatio = containerWidth / containerHeight;
  const adjustedItems = items.map((item) => ({
    ...item,
    ratio: clampRatioTowardTarget(item.ratio, containerRatio),
  }));

  let best = null;
  for (const rows of consecutivePartitions(adjustedItems)) {
    const sizedRows = rows.map((row) => {
      const sumRatios = row.reduce((sum, it) => sum + it.ratio, 0);
      const rowGaps = gap * (row.length - 1);
      return { items: row, height: (containerWidth - rowGaps) / sumRatios };
    });
    const interRowGaps = gap * (sizedRows.length - 1);
    const naturalTotalHeight = sizedRows.reduce((sum, r) => sum + r.height, 0) + interRowGaps;
    const scale =
      naturalTotalHeight > containerHeight
        ? (containerHeight - interRowGaps) / (naturalTotalHeight - interRowGaps)
        : 1;
    const utilization = (scale * scale * (naturalTotalHeight - interRowGaps)) / containerHeight;
    if (!best || utilization > best.utilization) {
      best = { sizedRows, scale, utilization };
    }
  }

  return best.sizedRows.map((r) => ({ items: r.items, height: r.height * best.scale }));
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
// L'attachement (fixed vs scroll) est piloté par la classe
// .product-photo-background (cf. PRODUCT_RESPONSIVE_CSS) et non ici, pour
// rester réactif au breakpoint plutôt que figé au premier rendu.
const PHOTO_BG_STYLE = {
  backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bateauBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

// Comportement mobile propre à la page produit : le fond "fixed" est coûteux
// et saccade sur mobile (même traitement que .category-photo-background dans
// CategoryPage.jsx), donc réservé à xl (≥80rem) et un simple scroll en dessous.
// Ancrage des entrées du menu burger : espace laissé au-dessus de chaque
// section pour ne pas atterrir sous le bandeau fixe/sticky (fil d'ariane +
// recherche). Valeurs de base calées pour desktop (xl, bandeau sticky sur une
// seule ligne) et mobile (en dessous de md, bandeau replié/fixed) — les deux
// aboutissent à une hauteur de bandeau quasi identique, d'où une seule valeur
// commune. Entre md et xl, la recherche reste dépliée en permanence (plus de
// bouton loupe replié) : le bandeau y est nettement plus haut, d'où le
// palier intermédiaire qui ajoute la différence.
const PRODUCT_RESPONSIVE_CSS = `
  .product-photo-background {
    background-attachment: scroll;
  }

  @media (min-width: 80rem) {
    .product-photo-background {
      background-attachment: fixed;
    }
  }

  #specifications { scroll-margin-top: 100px; }
  #avis { scroll-margin-top: 230px; }
  #localisation { scroll-margin-top: 60px; }
  #suggestions { scroll-margin-top: 285px; }

  /* En dessous de md : "avis" descend un peu (atterrit plus bas dans la
     section) et "localisation" remonte un peu (atterrit plus haut). */
  @media (max-width: 47.9375rem) {
    #avis { scroll-margin-top: 150px; }
    #localisation { scroll-margin-top: 100px; }
  }

  @media (min-width: 48rem) and (max-width: 79.9375rem) {
    #specifications { scroll-margin-top: calc(100px + 2.75rem); }
    #avis { scroll-margin-top: calc(230px + 2.75rem); }
    #localisation { scroll-margin-top: calc(60px + 2.75rem); }
    #suggestions { scroll-margin-top: calc(285px + 2.75rem); }
  }
`;

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
  // Barre sticky (fil d'Ariane + recherche) : repliée par défaut sur mobile,
  // dépliée via le bouton loupe — même mécanique que CategoryPage.
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState(false);
  // N'a plus lieu d'être une fois la section "Suggestions" atteinte, comme
  // sur CategoryPage — cachée dès que #suggestions entre dans le viewport.
  const [searchBarHidden, setSearchBarHidden] = useState(false);

  // Édition d'un avis : déclenchée depuis sa carte dans ClientReviews, rendue
  // par BoatReviews au-dessus de la liste. `reviewsVersion` remonte la liste
  // après enregistrement, son cache module étant partagé pour la session.
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewsVersion, setReviewsVersion] = useState(0);
  const refreshReviews = useCallback(() => {
    invalidatePublicReviews();
    setReviewsVersion((v) => v + 1);
  }, []);
  const handleEditingChange = useCallback(
    (next, saved) => {
      setEditingReviewId(next);
      if (saved) refreshReviews();
    },
    [refreshReviews]
  );
  const handleDeleteReview = useCallback(
    async (idReview) => {
      if (!window.confirm(t('boatReviews.deleteConfirm'))) return;
      try {
        await deleteMyReview(idReview);
        setEditingReviewId((current) => (current === idReview ? null : current));
        refreshReviews();
        showToast(t('boatReviews.deleted'), 'success');
      } catch (err) {
        showToast(err.response?.data?.message || t('boatReviews.deleteError'), 'error');
      }
    },
    [refreshReviews, showToast, t]
  );

  // Arrivée depuis la transition accueil/catégorie → produit : les blocs de la
  // page entrent depuis les marges en cascade, et la SearchBar glisse (FLIP)
  // depuis sa position sur la page de départ jusqu'à son emplacement ici.
  const [transitionPayload] = useState(() => readTransitionPayload('product'));
  // Entrée animée, au sens large : soit la cascade orchestrée par la page de
  // départ (payload ci-dessus), soit — à défaut (actualisation, accès direct,
  // ou provenance d'une page sans intégration dédiée comme contact/à propos)
  // — la même cascade générique rejouée sans FLIP (la SearchBar entre alors
  // comme un bloc de plus, cf. son style plus bas). Figé au montage : ne doit
  // pas retomber à false quand `enterActive` referme la fenêtre d'entrée.
  const [animatedEntry] = useState(() => Boolean(transitionPayload) || !prefersReducedMotion());
  const [enterActive, setEnterActive] = useState(animatedEntry);
  // Sections sous la ligne de flottaison (specs, carte, carrousel, avis)
  // différées pendant l'animation d'entrée : leur montage en pleine cascade
  // ferait saccader l'arrivée alors qu'elles sont hors écran à ce moment-là.
  const [belowFoldReady, setBelowFoldReady] = useState(!animatedEntry);
  // FLIP continu (transform DOM direct, cf. useLayoutEffect ci-dessous) :
  // seulement depuis l'accueil, et seulement au-delà de md — en dessous, la
  // SearchBar est repliée (fixed, pastille + bouton loupe) et n'a plus rien à
  // voir visuellement avec sa forme sur Home/Category : un FLIP entre ces
  // deux formes ferait un mouvement/redimensionnement incohérent, donc sur
  // mobile elle suit le même traitement que les autres blocs (glissement
  // latéral simple, cf. plus bas).
  const [isMobileSearchBar] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const hasSearchBarContinuity = transitionPayload?.from === 'home' && !isMobileSearchBar;
  // Depuis la catégorie : même taille et même emplacement (fitContentOnTablet
  // des deux côtés) que sur cette page-ci, donc aucun mouvement à jouer — la
  // SearchBar reste simplement immobile pendant que le reste de la cascade
  // anime autour d'elle.
  const arrivedFromCategory = transitionPayload?.from === 'category' && !isMobileSearchBar;
  // Sortie vers l'accueil ou la catégorie : les blocs rejouent leur entrée à rebours.
  const [exiting, setExiting] = useState(false);
  // Sortie vers la catégorie ou une page statique (contact/à propos) : notre
  // fond (image différente de la sienne) recouvre le nôtre en fondu, pour un
  // raccord invisible au moment du montage réel de la page cible — cf. le
  // même mécanisme en sens inverse dans CategoryPage.jsx. Vers l'accueil,
  // inutile : on transmet plutôt notre image via le payload de transition
  // (bg ci-dessous), que la HomePage utilise elle-même pour son propre
  // fondu vers la vidéo — sans quoi la sortie détournerait par l'image de
  // la catégorie.
  const [exitBgSrc, setExitBgSrc] = useState(null);
  // Sortie générique (contact/à propos) en cours : distingue ce cas de la
  // sortie vers catégorie/accueil pour le style de la SearchBar plus bas (qui
  // glisse comme un bloc de plus au lieu de suivre le FLIP).
  const [exitIsGeneric, setExitIsGeneric] = useState(false);
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
  // aucun style d'animation — marge réseau, pas un temps d'animation.
  useEffect(() => {
    if (!enterActive) return undefined;
    const timer = setTimeout(() => setEnterActive(false), CATEGORY_ENTER_TOTAL + 800);
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
    // Sortie vers une page statique (contact/à propos) : même cascade et
    // même crossfade que vers la catégorie, mais sans payload à transmettre —
    // ces pages rejouent leur propre entrée sur la seule base de la
    // navigation (cf. usePageSlideTransition), sans rien attendre de nous.
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
      }, CATEGORY_ENTER_TOTAL);
    };
    const unsubHome = onHomeTransitionRequest(beginExit('home'));
    const unsubCategory = onCategoryTransitionRequest(beginExit('category'));
    const unsubStatic = onPageExitRequest(beginExitToStatic);
    return () => {
      cancelled = true;
      clearTimeout(navTimer);
      unsubStatic();
      unsubHome();
      unsubCategory();
    };
  }, [navigate]);

  // FLIP de la SearchBar depuis la catégorie ou l'accueil : translation seule
  // (jamais de scale) — la SearchBar ne doit changer de position que d'un
  // pixel à l'autre, jamais de taille. Category (fitContentOnTablet) rend sa
  // barre plus étroite que celle de Product (pleine largeur) : un scale basé
  // sur le ratio des deux rects ferait visiblement grossir/rétrécir la barre
  // à l'arrivée, ce qu'on veut justement éviter.
  useLayoutEffect(() => {
    const from = transitionPayload?.searchBarRect;
    const el = searchBarWrapRef.current;
    if (!from || !el || !hasSearchBarContinuity) return undefined;
    const to = el.getBoundingClientRect();
    el.style.transformOrigin = 'top left';
    el.style.willChange = 'transform';
    el.style.transition = 'none';
    el.style.transform = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
    // Force le reflow avant d'activer la transition : un seul rAF suffit
    // alors, pas deux — sinon la translation démarrait un cran plus tard que
    // la cascade des autres blocs et atterrissait après elle au lieu d'en
    // même temps.
    void el.offsetWidth;
    const raf = window.requestAnimationFrame(() => {
      el.style.transition = `transform ${CATEGORY_ENTER_TOTAL}ms ${CATEGORY_ENTER_EASING}`;
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
    const cleanupTimer = setTimeout(resetStyles, CATEGORY_ENTER_TOTAL + 100);
    return () => {
      window.cancelAnimationFrame(raf);
      clearTimeout(cleanupTimer);
      // Remet l'élément à l'état neutre : StrictMode rejoue cet effet en dev,
      // et la seconde passe doit mesurer la position naturelle, pas celle
      // déplacée par la première.
      resetStyles();
    };
  }, [transitionPayload, hasSearchBarContinuity]);

  // Sortie : l'entrée jouée à rebours, chaque bloc vers sa marge d'origine.
  function slideOutStyle(order, from) {
    const keyframes = from === 'left' ? 'categorySlideOutLeft' : 'categorySlideOutRight';
    const duration = CATEGORY_ENTER_TOTAL - order * NAV_ENTER_STAGGER;
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
    const delay = order * NAV_ENTER_STAGGER;
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
      const intendedStart = order * NAV_ENTER_STAGGER;
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

  // Barre sticky masquée dès qu'on atteint les suggestions, comme sur
  // CategoryPage : plus lieu d'être une fois qu'on parcourt les embarcations
  // similaires plutôt que la fiche de ce bateau-ci.
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

  // Focus automatique du champ destination à l'ouverture du panneau de
  // recherche mobile (même comportement que CategoryPage).
  useEffect(() => {
    if (!mobileSearchExpanded) return undefined;
    const frame = window.requestAnimationFrame(() => {
      searchBarWrapRef.current?.querySelector('input[type="text"]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mobileSearchExpanded]);

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
  // Galerie : image principale + jusqu'à 4 secondaires, agencées par
  // layoutGalleryRows selon leur ratio réel (cf. plus bas).
  const galleryImages = useMemo(
    () => (images.length ? images.slice(0, 5) : [{ key: 'boat-fallback', url: '' }]),
    [images]
  );

  // Ratio (largeur/hauteur naturelle) de chaque photo, connu une fois chargée
  // — persistant en ref (pas d'état par url) pour ne provoquer qu'un seul
  // re-render groupé par photo plutôt qu'une cascade de re-renders liés.
  const galleryRatiosRef = useRef({});
  const [galleryRatioTick, setGalleryRatioTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    galleryImages.forEach(({ url }) => {
      if (!url || galleryRatiosRef.current[url]) return;
      const probe = new window.Image();
      probe.onload = () => {
        if (cancelled || galleryRatiosRef.current[url]) return;
        galleryRatiosRef.current[url] = probe.naturalWidth / probe.naturalHeight;
        setGalleryRatioTick((n) => n + 1);
      };
      probe.src = url;
    });
    return () => {
      cancelled = true;
    };
  }, [galleryImages]);

  // Espace réellement dispo pour la galerie (dépend du breakpoint via les
  // classes Tailwind sur le conteneur, cf. rendu plus bas) — mesuré plutôt que
  // recalculé en JS pour rester la seule source de vérité côté CSS.
  const galleryContainerRef = useRef(null);
  const [galleryContainerSize, setGalleryContainerSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = galleryContainerRef.current;
    // Le conteneur n'existe qu'une fois `boat` chargé (rendu conditionnel) :
    // sans `boat` en dépendance, cet effet mesurerait une ref encore nulle au
    // montage et ne se relancerait jamais après le fetch.
    if (!el) return undefined;
    const measure = () =>
      setGalleryContainerSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new window.ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [boat]);

  // Ratio par défaut (paysage) tant qu'une photo n'a pas encore fini de
  // charger — la plupart des photos bateau le sont, meilleure estimation
  // qu'un carré avant d'avoir la vraie valeur.
  const galleryLayout = useMemo(
    () =>
      layoutGalleryRows(
        galleryImages.map((img, i) => ({
          key: img.url ?? i,
          url: img.url,
          ratio: (img.url && galleryRatiosRef.current[img.url]) || 1.5,
        })),
        galleryContainerSize.width,
        galleryContainerSize.height,
        GALLERY_GAP
      ),
    // galleryRatioTick force le recalcul quand une photo finit de charger ;
    // galleryRatiosRef lui-même n'est pas une dépendance réactive.
    [galleryImages, galleryContainerSize, galleryRatioTick]
  );
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
    setMobileSearchExpanded(false);
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

  // Header fixe (clamp(4rem,6vw,5rem), 3.75rem une fois compacté au scroll) +
  // barre fil d'ariane/recherche sticky : offset réel au-dessus du panneau de
  // réservation sticky — même formule que categoryHeaderHeight/categoryMapTop
  // dans CategoryPage.jsx (la barre occupe la même hauteur dans les deux pages).
  const productHeaderHeight = scrolled ? '3.75rem' : 'clamp(4rem, 6vw, 5rem)';
  const panelStickyTop = scrolled ? '7.75rem' : 'calc(clamp(4rem, 6vw, 5rem) + 4.75rem)';

  // Ancrage des entrées du menu burger (#specifications, #avis, #localisation,
  // #suggestions) : scroll-margin-top désormais posé en CSS dans
  // PRODUCT_RESPONSIVE_CSS plutôt qu'en style inline, car la hauteur du
  // bandeau fixe/sticky (fil d'ariane + recherche) au-dessus varie par palier
  // selon le breakpoint (repliée en dessous de md, dépliée de md à xl) — un
  // style inline React ne peut pas s'ajuster par media query.

  return (
    // overflow-x-clip (et non hidden : hidden créerait un conteneur de scroll
    // qui casserait les sticky) évite l'ascenseur horizontal pendant l'entrée
    // des blocs depuis la marge droite (translateX(110vw)).
    <main className="w-full min-h-[100svh] pt-[clamp(4rem,6vw,5rem)] bg-surface overflow-x-clip">
      <SeoMetadata product={boat} productMode />
      <style>{`${PAGE_SLIDE_CSS}\n${PRODUCT_RESPONSIVE_CSS}`}</style>
      <div>
        {/* Fond photo bateau — image propre à la page produit ; le raccord
            invisible aux transitions est assuré par le crossfade ci-dessous
            plutôt que par une image partagée avec la catégorie.
            min-h-[100svh] : garantit une couverture plein écran (petite
            hauteur de viewport mobile) même quand le contenu (chargement en
            cours, bateau introuvable) est plus court que le viewport. */}
        <div className="product-photo-background relative min-h-[100svh]" style={PHOTO_BG_STYLE}>
          {/* Crossfade vers le fond de la page cible pendant la sortie : se
              pose derrière les blocs (qui glissent hors écran par-dessus) et
              atterrit à pleine opacité pile pour le montage réel de la page
              suivante, qui utilise nativement cette même image. */}
          {exitBgSrc && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `${
                  exitBgSrc === categoryBg
                    ? PHOTO_OVERLAY_BOAT
                    : exitBgSrc === dashboardBg
                      ? PHOTO_OVERLAY_DASHBOARD
                      : PHOTO_OVERLAY_STATIC_PAGE
                }, url(${exitBgSrc})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                animation: `pageBgFadeIn ${CATEGORY_ENTER_TOTAL}ms ease forwards`,
              }}
            />
          )}

          {/* Section 0 — Strip sous le header uniquement */}
          <section className="relative -mt-[clamp(4rem,6vw,5rem)] h-[clamp(4rem,6vw,5rem)] w-full" />

          {/* Section 1 — Fil d'ariane + recherche, même mécanique que
              CategoryPage : repliée derrière un bouton loupe et fixed
              (au-dessus du flux) en dessous de md, dépliée et sticky à partir
              de md, sur une seule ligne à partir de xl. */}
          <section
            className={`fixed inset-x-0 z-40 w-full transition-transform duration-300 md:sticky xl:pb-4 ${
              searchBarHidden ? '-translate-y-full pointer-events-none' : 'translate-y-0'
            }`}
            style={{
              top: productHeaderHeight,
              backgroundColor: scrolled ? 'rgba(255,255,255,0.1)' : 'transparent',
              backdropFilter: scrolled ? 'blur(5px)' : 'none',
              WebkitBackdropFilter: scrolled ? 'blur(5px)' : 'none',
              transition: 'top 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease',
            }}
          >
            {/* pt réduit en mode compact (scroll) : la barre se resserre sur ses
                composants au lieu de garder l'aération du haut de page. */}
            <div
              className="flex flex-col gap-0 px-4 pb-2 sm:px-8 lg:px-16 xl:relative xl:flex-row xl:items-center xl:gap-4 xl:pl-28 xl:pr-20"
              style={{
                paddingTop: scrolled ? '8px' : '20px',
                transition: 'padding-top 0.3s ease',
              }}
            >
              <div className="mb-2 flex w-full flex-wrap items-center gap-x-3 gap-y-2 xl:mb-0 xl:w-auto xl:flex-nowrap xl:gap-4">
                <div className="flex-none" style={slideInStyle(0)}>
                  <Breadcrumb light compact={scrolled} items={breadcrumbItems} />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileSearchExpanded((expanded) => !expanded)}
                  aria-expanded={mobileSearchExpanded}
                  aria-controls="product-mobile-search"
                  aria-label={
                    mobileSearchExpanded ? t('cookieConsent.prefs.close') : t('searchBar.search')
                  }
                  className="ml-auto flex min-h-10 min-w-10 flex-none items-center justify-center rounded-full border border-action-deep bg-action-hover text-action-text shadow-lg transition-colors hover:bg-brand-navy md:hidden"
                >
                  {mobileSearchExpanded ? (
                    <MdClose className="text-lg" aria-hidden="true" />
                  ) : (
                    <MdSearch className="text-lg" aria-hidden="true" />
                  )}
                </button>
              </div>
              {/* Avec continuité catégorie/accueil : le FLIP (ci-dessus) prend
                  le relai via une manipulation directe du style, la barre ne
                  doit donc recevoir aucun style React concurrent ici. Sans
                  continuité — arrivée directe/actualisation, ou départ vers
                  une page statique (contact/à propos, cf. exitIsGeneric) —
                  elle entre/sort comme un bloc de plus, avec le reste de la
                  cascade. */}
              <div
                id="product-mobile-search"
                ref={searchBarWrapRef}
                className={`w-full min-w-0 transition-[max-height,margin,opacity,transform] duration-300 motion-reduce:transition-none md:mt-0 md:max-h-none md:translate-y-0 md:overflow-visible md:opacity-100 md:pointer-events-auto md:[&>form]:ml-0 md:[&>form]:mr-auto xl:absolute xl:inset-y-0 xl:right-20 xl:w-auto xl:flex xl:items-center xl:pt-[18px] xl:[&>form]:mx-0 ${
                  mobileSearchExpanded
                    ? 'mt-0 max-h-[24rem] opacity-100'
                    : 'pointer-events-none max-h-0 -translate-y-2 overflow-hidden opacity-0'
                }`}
                style={
                  exiting
                    ? exitIsGeneric || isMobileSearchBar
                      ? slideOutStyle(0, 'right')
                      : undefined
                    : hasSearchBarContinuity || arrivedFromCategory
                      ? undefined
                      : slideInStyle(0, 'right')
                }
              >
                <SearchBar light compact={scrolled} fitContentOnTablet />
              </div>
            </div>
          </section>
          {/* Compense le retrait du flux par le "fixed" ci-dessus en dessous
              de md (redevenu sticky, donc déjà dans le flux, à partir de là).
              Volontairement plus bas que la hauteur réelle de la barre
              repliée (fond transparent tant qu'on n'a pas scrollé) : le fil
              d'ariane/bouton flotte sur le haut de la galerie plutôt que de
              la repousser, pour remonter l'image au maximum. */}
          <div className="h-[4rem] md:hidden" aria-hidden="true" />

          {/* Section 2 — Galerie + infos (2/3) et panneau de réservation (1/3) */}
          {!boatsLoaded && <div style={{ height: '70vh' }} aria-hidden="true" />}
          {boatsLoaded && !boat && (
            <div
              className="flex flex-col items-center gap-4 px-4 py-24 text-center sm:px-8 lg:px-20"
              style={slideInStyleLate('notFound', 1)}
            >
              <h1 className="text-2xl font-bold text-on-dark drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                {t('product.notFound.title')}
              </h1>
              <p className="text-sm text-on-dark/80">{t('product.notFound.text')}</p>
              <GhostButton onClick={() => goToCategory()}>{t('product.notFound.cta')}</GhostButton>
            </div>
          )}
          {boat && (
            <div className="flex flex-col items-stretch gap-6 px-4 py-5 pb-12 sm:px-8 lg:px-16 xl:flex-row xl:items-start xl:pl-28 xl:pr-20">
              {/* Colonne principale */}
              <div className="contents xl:flex xl:min-w-0 xl:flex-[7_3_0%] xl:flex-col xl:gap-5">
                {/* Galerie : image principale + vues secondaires (jusqu'à 4),
                    agencées par layoutGalleryRows selon leur ratio réel — jamais
                    recadrées ni déformées. L'espace dédié (hauteur fixe) reste
                    identique à avant ; un vide résiduel est accepté si
                    l'agencement naturel est plus compact que cet espace. */}
                <div
                  ref={galleryContainerRef}
                  className="order-1 relative h-[395px] sm:h-[495px] xl:order-none"
                  style={slideInStyleLate('gallery', 1)}
                >
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ gap: GALLERY_GAP }}
                  >
                    {galleryLayout.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="flex items-center"
                        style={{ gap: GALLERY_GAP }}
                      >
                        {row.items.map((item) => (
                          <SafeImage
                            key={item.key}
                            src={item.url}
                            alt={t('carrousel.boatImageAlt', { name: boat.name })}
                            loading={rowIndex === 0 ? undefined : 'lazy'}
                            decoding="async"
                            className="rounded-2xl object-cover"
                            fallbackClassName="flex items-center justify-center rounded-2xl bg-photo-surface text-4xl"
                            style={{
                              height: `${row.height}px`,
                              width: `${row.height * item.ratio}px`,
                              display: 'block',
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
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
                      className="relative order-3 w-full flex flex-col items-start py-6 xl:order-none"
                      style={{
                        ...(exiting
                          ? slideOutStyle(2, 'left')
                          : animatedEntry && {
                              animation: 'pageBgFadeIn 400ms ease both',
                            }),
                      }}
                    >
                      <div
                        className="flex w-full max-w-[919.9px] flex-col items-center gap-6 rounded-2xl border px-4 py-6 sm:gap-8 sm:px-8 sm:py-8 lg:px-10"
                        style={GLASS_STYLE}
                      >
                        <div className="text-center">
                          <p className="text-sm font-semibold tracking-widest text-photo-action uppercase mb-6 underline underline-offset-4">
                            {t('product.specs.kicker')}
                          </p>
                          <h2 className="text-2xl font-semibold text-on-dark drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:text-3xl md:text-4xl">
                            {t('product.specs.title')}
                          </h2>
                          <p className="text-sm text-on-dark/70 mt-4">
                            {t('product.specs.subtitle')}
                          </p>
                        </div>
                        <div className="grid w-full grid-cols-1 gap-x-8 md:grid-cols-2 lg:gap-x-16">
                          {specRows.map(([label, value]) => (
                            <div
                              key={label}
                              className="flex items-start justify-between gap-4 border-b border-glass/15 py-3 sm:items-baseline"
                            >
                              <span className="text-xs font-semibold tracking-widest uppercase text-on-dark/60">
                                {label}
                              </span>
                              <span className="text-sm font-semibold text-on-dark text-right">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                        {boat.equipment?.length > 0 && (
                          <div className="w-full flex flex-col items-center gap-4 pt-2 border-t border-glass/15">
                            <p className="text-xs font-bold tracking-widest uppercase text-photo-action">
                              {t('product.specs.equipment')}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              {boat.equipment.map((eq) => (
                                <span
                                  key={eq.id_equipment}
                                  className="text-xs font-medium px-3 py-1 rounded-full backdrop-blur-md"
                                  style={{
                                    backgroundColor: 'rgb(var(--sl-photo-action-fill) / 0.15)',
                                    color: 'rgb(var(--sl-photo-text))',
                                    border: '1px solid rgb(var(--sl-glass) / 0.3)',
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

              {/* Panneau info + réservation — pleine largeur et empilé après la
                  galerie sur mobile (items-stretch du parent lui donne déjà
                  100% de large) ; largeur fixe et sticky réservés à xl, où il
                  redevient la colonne latérale à droite de la galerie. */}
              <aside
                className="order-2 w-full shrink-0 flex flex-col gap-3 xl:order-none xl:sticky xl:flex-[3_1_0%] xl:min-w-[530px]"
                style={{
                  top: panelStickyTop,
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
                      <h1 className="text-lg font-bold text-on-dark tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                        {boat.name}
                      </h1>
                      <span className="text-on-dark/50">-</span>
                      <span className="text-xs font-bold tracking-widest text-photo-action uppercase">
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
                    <p className="flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-photo-action">
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
                          className="flex items-center gap-1 text-[11px] font-medium text-on-dark px-1.5 py-0.5 rounded-full backdrop-blur-md"
                          style={{
                            backgroundColor: 'rgb(var(--sl-photo-action-fill) / 0.15)',
                            border: '1px solid rgb(var(--sl-glass) / 0.3)',
                          }}
                        >
                          <Icon className="text-photo-icon" style={{ fontSize: '12px' }} />
                          {label}
                        </span>
                      ))}
                  </div>

                  {/* Description */}
                  {boat.description && (
                    <p className="text-xs text-on-dark/80 leading-snug">{boat.description}</p>
                  )}

                  {/* Rating + nombre de commentaires */}
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-on-dark">
                    {boat.review_count > 0 ? (
                      <>
                        <span className="text-warning-bright">★</span> {boat.avg_rating}
                        <span className="text-on-dark/70">
                          {' '}
                          ({t('product.header.ratings', { count: boat.review_count })}) ·{' '}
                          <a href="#avis" className="underline transition hover:text-on-dark">
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
                      <p className="text-xs font-bold uppercase tracking-widest text-photo-action">
                        {t('locataireReservations.reviewModal.title')}
                      </p>
                      <p className="mt-1 text-xs text-on-dark/70">
                        {t('locataireReservations.reviewModal.moderationHint')}
                      </p>
                    </div>
                    <fieldset>
                      <legend className="mb-1 text-xs font-medium text-on-dark/70">
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
                              value <= reviewRating ? 'text-warning-pale' : 'text-on-dark/30'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <label
                      htmlFor="product-review-comment"
                      className="text-xs font-medium text-on-dark/70"
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
                      className="w-full resize-y rounded-lg border border-glass/30 bg-surface/10 px-3 py-2 text-sm text-on-dark placeholder-on-dark outline-none focus:border-action-bright"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-content-light">
                        {reviewComment.length}/1000
                      </span>
                      <button
                        type="submit"
                        disabled={reviewSaving}
                        className="rounded-full bg-action-bright px-4 py-2 text-xs font-bold text-on-light transition hover:bg-action-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewSaving
                          ? t('locataireReservations.reviewModal.submitting')
                          : t('locataireReservations.reviewModal.submit')}
                      </button>
                    </div>
                    {reviewError && (
                      <p role="alert" className="text-xs font-medium text-danger-pale">
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
                      <span className="text-2xl font-bold text-on-dark">{price} €</span>
                      <span className="text-xs text-on-dark/70">
                        {t('category.card.perDay')} · {t('product.booking.taxIncluded')}
                      </span>
                    </div>
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                        isAvailable ? 'text-success' : 'text-warning'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block ${
                          isAvailable ? 'bg-success animate-pulse' : 'bg-warning'
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
                    <p className="text-[10px] font-bold tracking-widest uppercase text-photo-action text-center">
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
                      <div className="flex flex-col gap-2 border-t border-glass/20 pt-3">
                        <div className="flex justify-between text-xs text-on-dark/80">
                          <span>{t('product.booking.days', { count: dayCount, price })}</span>
                          <span>{total} €</span>
                        </div>
                        {boat.with_skipper && (
                          <div className="flex justify-between text-xs text-on-dark/80">
                            <span>{t('product.booking.skipperService')}</span>
                            <span>{t('product.booking.free')}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-baseline border-t border-glass/20 pt-2">
                          <span className="text-sm font-semibold text-on-dark">
                            {t('product.booking.total')}
                          </span>
                          <span className="text-xl font-bold text-photo-action">{total} €</span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleBook}
                      className="self-center text-photo-text text-sm font-semibold px-6 py-2 rounded-full transition-all backdrop-blur-md border border-glass/40 bg-photo-action-fill/55 shadow-[0_4px_16px_rgba(14,165,233,0.35)] hover:bg-header-bar-bg/95 hover:border-glass/20"
                    >
                      {t('product.booking.book')}
                    </button>
                    {bookingHint && (
                      <p
                        role="status"
                        className="text-xs text-center font-semibold text-warning-pale"
                      >
                        {bookingHint}
                      </p>
                    )}
                    <p className="text-[10px] text-on-dark/60 text-center uppercase tracking-wide">
                      {t('product.booking.noCharge')}
                    </p>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-on-dark/80">
                      <MdVerified className="text-photo-icon" style={{ fontSize: '14px' }} />
                      {t('product.booking.secure')}
                    </p>
                    <div className="border-t border-glass/20 pt-3 text-center">
                      <p className="mb-2 text-xs text-on-dark/70">
                        {t('product.ownerContact.text')}
                      </p>
                      <button
                        type="button"
                        onClick={handleContactOwner}
                        disabled={contactBusy}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-glass/40 bg-surface/10 px-5 py-2 text-sm font-semibold text-photo-text transition hover:border-photo-action-hover hover:bg-photo-action/25 disabled:cursor-wait disabled:opacity-60"
                      >
                        <MdChatBubbleOutline
                          aria-hidden="true"
                          className="text-lg text-photo-action-hover"
                        />
                        {contactBusy
                          ? t('product.ownerContact.opening')
                          : t('product.ownerContact.cta')}
                      </button>
                      {contactHint && (
                        <p role="status" className="mt-2 text-xs font-semibold text-warning-pale">
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
                  <MdInfoOutline className="text-photo-icon flex-shrink-0 mt-0.5 text-lg" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-on-dark">
                      {t('product.booking.help.title')}
                    </p>
                    <p className="text-xs text-on-dark/70 leading-relaxed">
                      {t('product.booking.help.text')}
                    </p>
                    <Link
                      to="/contact"
                      className="text-xs font-semibold text-photo-action hover:text-photo-action-hover transition-colors"
                    >
                      {t('product.booking.help.cta')}
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* Section 4+5+6 — Avis clients, puis localisation, puis embarcations
              similaires : même container que la galerie/réservation
              ci-dessus (un seul fond photo continu, pas deux containers
              séparés) pour éviter un raccord visible en
              background-attachment: scroll sur mobile — même traitement que
              le carrousel/avis de la CategoryPage. */}
          {/* Dépôt d'avis (locataire ayant une réservation terminée sur ce
              bateau) et édition de son propre avis, déclenchée depuis sa carte
              dans la liste ci-dessous. */}
          {belowFoldReady && (
            <BoatReviews
              idBoat={boatId}
              user={user}
              formOnly
              className="pt-10"
              editingReviewId={editingReviewId}
              onEditingChange={handleEditingChange}
            />
          )}

          {belowFoldReady && (
            <ClientReviews
              key={reviewsVersion}
              light
              wide
              boatId={boatId}
              commentsOnly
              id="avis"
              className="py-10"
              currentUserId={user?.id_user ?? null}
              onEditReview={setEditingReviewId}
              onDeleteReview={handleDeleteReview}
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
              className="relative w-full flex flex-col items-center gap-3 px-4 py-10 sm:px-8 lg:px-16"
            >
              <div className="w-full max-w-[919.9px] flex items-baseline gap-3">
                <h2
                  className="font-semibold text-on-dark"
                  style={{ fontSize: '20px', lineHeight: '22px' }}
                >
                  {t('product.location.title')}
                </h2>
                {portLabel && (
                  <span className="text-on-dark/70 ml-4" style={{ fontSize: '16px' }}>
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
              className="relative w-full flex flex-col gap-8 px-4 py-10 sm:px-8 lg:px-16 xl:px-28"
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
