import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Transitions orchestrées entre HomePage et CategoryPage, dans les deux sens.
// Tous les liens vers /categorie passent par useCategoryNavigate(), ceux vers
// l'accueil par useHomeNavigate() : depuis la page opposée, le hook délègue à
// la page courante (via un événement) qui remonte en haut, joue sa sortie et
// le crossfade avant de naviguer réellement ; sinon navigation directe (idem
// si l'utilisateur préfère réduire les animations). Le payload module-level
// transmet la position de la SearchBar à la page d'arrivée pour l'animation
// FLIP (un état React ne survivrait pas au démontage de la page de départ) ;
// `target` identifie la page destinataire.

const CATEGORY_EVENT = 'sailingloc:category-transition';
const HOME_EVENT = 'sailingloc:home-transition';

// Durées partagées entre la sortie et l'entrée, dans les deux sens.
export const HERO_EXIT_DURATION = 1400;
export const CATEGORY_ENTER_DURATION = 1300;
export const CATEGORY_ENTER_STAGGER = 200;
// Dernier rang de la cascade d'entrée de /categorie (0 = FilterBar … 5 = MapView).
export const CATEGORY_ENTER_LAST_ORDER = 5;
// Instant d'atterrissage commun de la cascade : départs décalés, arrivée
// unique. Sert aussi de « vitesse de transition de page » de référence pour
// la révélation de l'intro (header, SearchBar, CTA).
export const CATEGORY_ENTER_TOTAL =
  CATEGORY_ENTER_DURATION + CATEGORY_ENTER_LAST_ORDER * CATEGORY_ENTER_STAGGER;

// Paires d'easings miroir : l'entrée est la sortie jouée à rebours.
export const CATEGORY_ENTER_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
export const CATEGORY_EXIT_EASING = 'cubic-bezier(0.64, 0, 0.78, 0.39)';
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

function useTransitionNavigate(fromPath, matchesTarget, eventName) {
  const navigate = useNavigate();
  const location = useLocation();
  const onFromPage = location.pathname === fromPath;
  return useCallback(
    (to) => {
      if (onFromPage && matchesTarget(to) && !prefersReducedMotion()) {
        window.dispatchEvent(new window.CustomEvent(eventName, { detail: { to } }));
      } else {
        navigate(to);
      }
    },
    [navigate, onFromPage, matchesTarget, eventName]
  );
}

const isCategoryTarget = (to) => to.startsWith('/categorie');
const isHomeTarget = (to) => to === '/';

// Remplaçant de navigate() pour les liens menant à /categorie ; toute autre
// destination est naviguée telle quelle.
export function useCategoryNavigate() {
  const goTo = useTransitionNavigate('/', isCategoryTarget, CATEGORY_EVENT);
  return useCallback((to = '/categorie') => goTo(to), [goTo]);
}

// Remplaçant de navigate() pour les liens menant à l'accueil.
export function useHomeNavigate() {
  const goTo = useTransitionNavigate('/categorie', isHomeTarget, HOME_EVENT);
  return useCallback((to = '/') => goTo(to), [goTo]);
}

// ─── Intro de première visite (HomePage) ─────────────────────────────────────
// Splash joué une fois par session, uniquement si la session s'ouvre sur la
// home : logo seul sur fond noir, crossfade vers la vidéo, textes d'accueil,
// puis grand déballage (header compris, d'où l'événement de révélation).

const INTRO_SEEN_KEY = 'sailingloc:intro-seen';
const INTRO_REVEAL_EVENT = 'sailingloc:intro-reveal';

// Page d'entrée réelle de la session, figée au premier chargement du bundle :
// si l'utilisateur arrive par une autre page, l'intro ne se joue pas, même
// s'il navigue vers la home ensuite (le header, déjà monté, serait visible).
const sessionEntryPath = window.location.pathname;

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

export function emitIntroReveal() {
  window.dispatchEvent(new window.CustomEvent(INTRO_REVEAL_EVENT));
}

// Les headers (public et dashboard) démarrent cachés au-dessus de l'écran
// pendant l'intro et descendent quand la HomePage émet la révélation.
// Garde-fou temporel : jamais plus de 12 s sans header, quoi qu'il arrive.
export function useIntroHeaderReveal() {
  const [hidden, setHidden] = useState(shouldPlayIntro);
  useEffect(() => {
    if (!hidden) return undefined;
    const reveal = () => setHidden(false);
    window.addEventListener(INTRO_REVEAL_EVENT, reveal);
    const safety = setTimeout(reveal, 12000);
    return () => {
      window.removeEventListener(INTRO_REVEAL_EVENT, reveal);
      clearTimeout(safety);
    };
  }, [hidden]);
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
