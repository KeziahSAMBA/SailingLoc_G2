import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Transitions orchestrées entre HomePage, CategoryPage et ProductPage, dans
// tous les sens. Tous les liens vers /categorie passent par
// useCategoryNavigate(), ceux vers l'accueil par useHomeNavigate(), ceux vers
// /product/:id par useProductNavigate() : depuis une page animée, le hook
// délègue à la page courante (via un événement) qui remonte en haut, joue sa
// sortie et le crossfade avant de naviguer réellement ; sinon navigation
// directe (idem si l'utilisateur préfère réduire les animations). Le payload
// module-level transmet la position de la SearchBar à la page d'arrivée pour
// l'animation FLIP (un état React ne survivrait pas au démontage de la page
// de départ) ; `target` identifie la page destinataire.

const CATEGORY_EVENT = 'sailingloc:category-transition';
const HOME_EVENT = 'sailingloc:home-transition';
const PRODUCT_EVENT = 'sailingloc:product-transition';

// Durées partagées entre la sortie et l'entrée, dans les deux sens.
// Réservées à la toute première arrivée sur le site (intro vidéo de la home,
// et révélation du header — cf. useIntroHeaderReveal — pour une home ou un
// dashboard) : ce sont les SEULES transitions qui gardent ce rythme
// cinématique. Toute navigation ultérieure entre pages utilise les constantes
// NAV_* ci-dessous, bien plus courtes.
export const HERO_EXIT_DURATION = 1400;
export const CATEGORY_ENTER_DURATION = 1300;
export const CATEGORY_ENTER_STAGGER = 200;
// Dernier rang de la cascade d'entrée de /categorie (0 = FilterBar … 5 = MapView).
export const CATEGORY_ENTER_LAST_ORDER = 5;
// Instant d'atterrissage commun de la cascade : départs décalés, arrivée
// unique. Sert aussi de « vitesse de transition » de référence pour la
// révélation de l'intro (header, SearchBar, CTA) — pas pour la navigation
// courante, cf. NAV_ENTER_TOTAL ci-dessous.
export const CATEGORY_ENTER_TOTAL =
  CATEGORY_ENTER_DURATION + CATEGORY_ENTER_LAST_ORDER * CATEGORY_ENTER_STAGGER;

// Rythme de toute navigation entre pages APRÈS la première arrivée (Home,
// Contact, À propos, pages légales) : un temps commun, identique quel que
// soit le nombre de blocs de la page (2 pour les pages légales, 7 pour
// Contact/À propos) — chaque page espace ses blocs différemment (cf.
// NAV_ENTER_STAGGER) mais tous atterrissent pile à NAV_ENTER_TOTAL. Sortie et
// entrée utilisent cette même valeur des deux côtés (cf.
// beginExitToStatic/slide() dans usePageTransition.js) : clic → page
// réellement posée = 2 × NAV_ENTER_TOTAL, soit ~2400 ms pour 1200 ms/côté.
export const NAV_ENTER_TOTAL = 1200;
// Catégorie ↔ Produit sont les deux pages les plus consultées (comparaison
// répétée de bateaux) : rythme dédié, plus court, pour ne pas peser sur un
// aller-retour fréquent — 2 × 500 ms = ~1000 ms au total, contre 2400 ms
// pour le reste du site.
export const CATEGORY_PRODUCT_NAV_TOTAL = 500;
// Espacement entre blocs d'une même cascade (departs décalés, arrivée
// commune au total du groupe concerné) — cf. slide()/slideInStyle() dans
// usePageTransition.js et les pages à cascade (Catégorie, Produit).
export const NAV_ENTER_STAGGER = 30;
// Durée de référence d'une simple transition sans cascade (ex. fondu du
// titre de la page catégorie, calé pour finir pile à l'atterrissage commun).
export const NAV_ENTER_DURATION = 250;
// Pas de cascade à plusieurs blocs sur la home (hors intro) : sortie/arrivée
// du hero et FLIP de la SearchBar utilisent directement NAV_ENTER_TOTAL (la
// home n'est pas dans le groupe rapide Catégorie/Produit).
export const HOME_NAV_DURATION = NAV_ENTER_TOTAL;

// Paires d'easings miroir : l'entrée est la sortie jouée à rebours.
export const CATEGORY_ENTER_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
export const CATEGORY_EXIT_EASING = 'cubic-bezier(0.64, 0, 0.78, 0.39)';

// Glissades partagées par les pages à cascade (catégorie, produit). Des
// @keyframes plutôt que des transitions : certains blocs ne montent qu'à la
// réponse de l'API, bien après le premier rendu, et une animation se joue au
// montage de l'élément quel que soit ce moment.
export const PAGE_SLIDE_CSS = `
  @keyframes categorySlideInLeft {
    from { transform: translateX(-110vw); }
    to   { transform: none; }
  }
  @keyframes categorySlideInRight {
    from { transform: translateX(110vw); }
    to   { transform: none; }
  }
  @keyframes categorySlideOutLeft {
    from { transform: none; }
    to   { transform: translateX(-110vw); }
  }
  @keyframes categorySlideOutRight {
    from { transform: none; }
    to   { transform: translateX(110vw); }
  }
  @keyframes pageBgFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
`;

// Voiles partagés par-dessus les images de fond en crossfade (pageBgFadeIn
// ci-dessus) : garantit un raccord invisible entre deux pages qui n'ont pas
// exactement le même voile — celui de la page d'ARRIVÉE, pas celle de départ,
// pour que l'image affichée pendant le fondu soit identique au pixel près à
// celle que la page cible affichera dès son montage.
export const PHOTO_OVERLAY_BOAT = 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5))';
export const PHOTO_OVERLAY_STATIC_PAGE = 'linear-gradient(rgba(3,24,30,0.62), rgba(3,35,39,0.72))';

export const HERO_EXIT_EASING = 'cubic-bezier(0.5, 0, 0.75, 0.2)';
export const HERO_ENTER_EASING = 'cubic-bezier(0.25, 0.8, 0.5, 1)';
// Ease-in-out doux (départ et fin progressifs, façon dégradé) pour les fondus
// de l'intro et la descente du header : contrairement à l'ease-out ci-dessus,
// le mouvement reste perceptible jusqu'au bout — indispensable pour les
// trajets courts (header) qui sembleraient sinon arrêtés à mi-parcours.
export const INTRO_SOFT_EASING = 'cubic-bezier(0.45, 0.05, 0.55, 0.95)';

// Péremption du payload : consommé uniquement si la page d'arrivée est montée
// juste après la sortie — évite de rejouer l'entrée sur une visite ultérieure
// si une transition a été interrompue en cours de route.
const PAYLOAD_MAX_AGE_MS = 5000;

let payload = null;

export function setTransitionPayload(target, data) {
  payload = { target, ...data, at: Date.now() };
}

// Lecture sans effet de bord : utilisable comme initialiseur de useState, que
// StrictMode invoque deux fois en dev — le nettoyage se fait séparément via
// clearTransitionPayload() dans un useEffect au montage.
export function readTransitionPayload(target) {
  if (!payload || payload.target !== target) return null;
  if (Date.now() - payload.at > PAYLOAD_MAX_AGE_MS) return null;
  return payload;
}

export function clearTransitionPayload() {
  payload = null;
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Abonnements des pages aux demandes de transition ; retournent le cleanup.
export function onCategoryTransitionRequest(handler) {
  const listener = (e) => handler(e.detail);
  window.addEventListener(CATEGORY_EVENT, listener);
  return () => window.removeEventListener(CATEGORY_EVENT, listener);
}

export function onHomeTransitionRequest(handler) {
  const listener = (e) => handler(e.detail);
  window.addEventListener(HOME_EVENT, listener);
  return () => window.removeEventListener(HOME_EVENT, listener);
}

export function onProductTransitionRequest(handler) {
  const listener = (e) => handler(e.detail);
  window.addEventListener(PRODUCT_EVENT, listener);
  return () => window.removeEventListener(PRODUCT_EVENT, listener);
}

// La page produit est paramétrée (/product/:id) : correspondance par préfixe,
// contrairement aux autres pages de départ comparées à l'exact.
const isOnPath = (pathname, base) =>
  pathname === base || (base !== '/' && pathname.startsWith(`${base}/`));

function useTransitionNavigate(fromPaths, matchesTarget, eventName) {
  const navigate = useNavigate();
  const location = useLocation();
  const onFromPage = fromPaths.some((base) => isOnPath(location.pathname, base));
  return useCallback(
    // `extra` (optionnel) : détails supplémentaires fusionnés dans
    // l'événement, ex. le nom du bateau (cf. useProductNavigate depuis
    // Carrousel) pour que la page d'arrivée l'affiche dès son premier rendu
    // sans attendre la réponse de l'API.
    (to, extra) => {
      if (onFromPage && matchesTarget(to) && !prefersReducedMotion()) {
        window.dispatchEvent(new window.CustomEvent(eventName, { detail: { to, ...extra } }));
      } else {
        navigate(to);
      }
    },
    [navigate, onFromPage, matchesTarget, eventName]
  );
}

const isCategoryTarget = (to) => to.startsWith('/categorie');
const isHomeTarget = (to) => to === '/';
const isProductTarget = (to) => to.startsWith('/product/');

// Remplaçant de navigate() pour les liens menant à /categorie ; toute autre
// destination est naviguée telle quelle.
export function useCategoryNavigate() {
  const goTo = useTransitionNavigate(['/', '/product'], isCategoryTarget, CATEGORY_EVENT);
  return useCallback((to = '/categorie') => goTo(to), [goTo]);
}

// Remplaçant de navigate() pour les liens menant à l'accueil.
export function useHomeNavigate() {
  const goTo = useTransitionNavigate(['/categorie', '/product'], isHomeTarget, HOME_EVENT);
  return useCallback((to = '/') => goTo(to), [goTo]);
}

// Remplaçant de navigate() pour les liens menant à /product/:id. Depuis la
// page produit elle-même (bateaux similaires), navigation directe : le
// composant reste monté au changement d'id, il n'y a pas d'entrée à rejouer.
export function useProductNavigate() {
  return useTransitionNavigate(['/', '/categorie'], isProductTarget, PRODUCT_EVENT);
}

// ─── Intro de première visite (HomePage) ─────────────────────────────────────
// Splash joué une fois par session, uniquement si la session s'ouvre sur la
// home : logo seul sur fond noir, crossfade vers la vidéo, textes d'accueil,
// puis grand déballage (header compris, d'où l'événement de révélation).

const INTRO_SEEN_KEY = 'sailingloc:intro-seen';
const INTRO_REVEALED_KEY = 'sailingloc:intro-revealed';
const INTRO_REVEAL_EVENT = 'sailingloc:intro-reveal';

// Page d'entrée réelle de la session, figée au premier chargement du bundle :
// si l'utilisateur arrive par une autre page, l'intro ne se joue pas, même
// s'il navigue vers la home ensuite (le header, déjà monté, serait visible).
const sessionEntryPath = window.location.pathname;

// Démarrage de l'intro (HomePage uniquement) : une seule fois par session,
// posé dès le montage pour ne pas la rejouer (StrictMode, remontage...).
export function shouldPlayIntro() {
  return (
    sessionEntryPath === '/' &&
    !window.sessionStorage.getItem(INTRO_SEEN_KEY) &&
    !prefersReducedMotion()
  );
}

export function markIntroSeen() {
  window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
}

// Un header en attente de révélation (isIntroPending, ci-dessous) : distinct
// de shouldPlayIntro(), qui bascule à false dès le montage de la HomePage —
// avant même que la révélation ait eu lieu. Un header connecté qui se monte
// en cours de route (le temps que /refresh résolve le rôle) doit encore
// pouvoir s'accrocher à la révélation à venir tant qu'elle n'a pas eu lieu.
function isIntroPending() {
  return (
    sessionEntryPath === '/' &&
    !window.sessionStorage.getItem(INTRO_REVEALED_KEY) &&
    !prefersReducedMotion()
  );
}

export function emitIntroReveal() {
  window.sessionStorage.setItem(INTRO_REVEALED_KEY, '1');
  window.dispatchEvent(new window.CustomEvent(INTRO_REVEAL_EVENT));
}

// Chronologie de l'intro (ms) : logo seul sur fond noir, crossfade vers la
// vidéo (HERO_EXIT_DURATION), palier textes d'accueil, puis léger délai avant
// le grand déballage (header, SearchBar, CTA) — voir HomePage.jsx, qui
// consomme ces mêmes constantes pour construire sa propre timeline.
export const INTRO_BLACK_MS = 900;
export const INTRO_WELCOME_HOLD_MS = 2600;
export const INTRO_REVEAL_LAG_MS = 400;
// Instant de la révélation du header depuis le montage de la HomePage —
// réutilisé tel quel par le header dashboard pour reproduire exactement le
// même délai d'apparition quand il n'y a pas de HomePage à observer.
export const INTRO_HEADER_REVEAL_DELAY_MS =
  INTRO_BLACK_MS + HERO_EXIT_DURATION + INTRO_WELCOME_HOLD_MS + INTRO_REVEAL_LAG_MS;

// ─── Révélation du header seul (arrivée directe sur un dashboard) ───────────
// Si la session s'ouvre (vrai chargement du navigateur, pas une navigation
// interne après connexion) directement sur /locataire ou /proprietaire, il
// n'y a pas de HomePage pour émettre la révélation : le header se la
// déclenche donc lui-même après INTRO_HEADER_REVEAL_DELAY_MS, via exactement
// le même événement/écouteur/garde-fou que le header de base.

const DASHBOARD_HEADER_SEEN_KEY = 'sailingloc:dashboard-header-seen';
const DASHBOARD_HEADER_REVEAL_PATHS = ['/locataire', '/proprietaire'];

function isDashboardHeaderEntry() {
  return DASHBOARD_HEADER_REVEAL_PATHS.some(
    (base) => sessionEntryPath === base || sessionEntryPath.startsWith(`${base}/`)
  );
}

function shouldPlayDashboardHeaderReveal() {
  return (
    isDashboardHeaderEntry() &&
    !window.sessionStorage.getItem(DASHBOARD_HEADER_SEEN_KEY) &&
    !prefersReducedMotion()
  );
}

// Les headers démarrent cachés au-dessus de l'écran et descendent au signal
// de révélation (même événement, même garde-fou 12 s dans les deux cas) :
// émis par la HomePage pendant l'intro, ou par le header dashboard lui-même
// (isDashboard=true) après le même délai, à sa toute première apparition de
// la session.
export function useIntroHeaderReveal(isDashboard = false) {
  const [mode] = useState(() => {
    if (isIntroPending()) return 'intro';
    if (isDashboard && shouldPlayDashboardHeaderReveal()) return 'dashboard';
    return null;
  });
  const [hidden, setHidden] = useState(mode !== null);

  useEffect(() => {
    if (mode === null) return undefined;
    const reveal = () => setHidden(false);
    window.addEventListener(INTRO_REVEAL_EVENT, reveal);
    const safety = setTimeout(reveal, 12000);
    let dashboardTimer = null;
    if (mode === 'dashboard') {
      window.sessionStorage.setItem(DASHBOARD_HEADER_SEEN_KEY, '1');
      dashboardTimer = setTimeout(emitIntroReveal, INTRO_HEADER_REVEAL_DELAY_MS);
    }
    return () => {
      window.removeEventListener(INTRO_REVEAL_EVENT, reveal);
      clearTimeout(safety);
      clearTimeout(dashboardTimer);
    };
  }, [mode]);

  return hidden;
}

// ─── Verrou de défilement pendant les transitions ────────────────────────────
// Bloque molette, tactile et clavier le temps des animations de changement de
// page (et de l'intro) : les sections sous la ligne de flottaison étant
// montées en différé, un scroll pendant l'animation montrerait du vide.
// On bloque les événements plutôt que de passer overflow à hidden : masquer
// la barre de défilement élargirait la page de ~15 px en plein mouvement.

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

let scrollLockCleanup = null;

function isEditableTarget(target) {
  return (
    target instanceof window.HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}

export function lockScroll() {
  if (scrollLockCleanup) return;
  const preventScroll = (e) => e.preventDefault();
  const preventScrollKeys = (e) => {
    if (SCROLL_KEYS.has(e.key) && !isEditableTarget(e.target)) e.preventDefault();
  };
  window.addEventListener('wheel', preventScroll, { passive: false });
  window.addEventListener('touchmove', preventScroll, { passive: false });
  window.addEventListener('keydown', preventScrollKeys);
  // Garde-fou : une transition interrompue (navigation ailleurs en plein vol)
  // ne doit jamais laisser la page verrouillée.
  const safety = setTimeout(unlockScroll, 15000);
  scrollLockCleanup = () => {
    window.removeEventListener('wheel', preventScroll);
    window.removeEventListener('touchmove', preventScroll);
    window.removeEventListener('keydown', preventScrollKeys);
    clearTimeout(safety);
  };
}

export function unlockScroll() {
  if (!scrollLockCleanup) return;
  scrollLockCleanup();
  scrollLockCleanup = null;
}

// Attend la fin du scroll fluide vers le haut (résout immédiatement si déjà en
// haut ; garde-fou temporel car aucun événement "scrollend" fiable partout).
export function smoothScrollToTop() {
  return new Promise((resolve) => {
    if (window.scrollY <= 1) {
      resolve();
      return;
    }
    const poll = setInterval(() => {
      if (window.scrollY <= 1) finish();
    }, 80);
    const safety = setTimeout(finish, 2500);
    function finish() {
      clearInterval(poll);
      clearTimeout(safety);
      resolve();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
