import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  prefersReducedMotion,
  lockScroll,
  unlockScroll,
  smoothScrollToTop,
  setTransitionPayload,
  CATEGORY_ENTER_STAGGER,
  CATEGORY_ENTER_EASING,
  CATEGORY_EXIT_EASING,
} from './useCategoryTransition.js';

// Transition générique de sortie/entrée, pour les pages qui gèrent elles-mêmes
// leur propre glissade (contrairement aux hooks de useCategoryTransition.js,
// ciblés sur des paires de pages précises Home/Catégorie/Produit) : ici,
// n'importe quelle destination déclenche la sortie de la page courante si
// elle fait partie de EXIT_TRANSITION_PAGES ; l'entrée, elle, se rejoue à
// chaque montage de la page, quelle que soit l'origine (pas besoin de
// coopération de la page de départ).

const PAGE_EXIT_EVENT = 'sailingloc:page-exit-transition';

// Pages équipées de leur propre animation de sortie — à étendre page par page.
const EXIT_TRANSITION_PAGES = ['/contact', '/a-propos'];

const isOnPath = (pathname, base) => pathname === base || pathname.startsWith(`${base}/`);

// Exportée : les pages listées dans STATIC_EXIT_AWARE_PAGES (qui gèrent leur
// propre sortie, cf. plus bas) s'y abonnent aussi pour le cas « page →
// page statique » ci-dessous.
export function onPageExitRequest(handler) {
  const listener = (e) => handler(e.detail);
  window.addEventListener(PAGE_EXIT_EVENT, listener);
  return () => window.removeEventListener(PAGE_EXIT_EVENT, listener);
}

// Pages qui gèrent elles-mêmes leur sortie vers une page statique
// (contact/à propos), en plus de leur propre système d'entrée/sortie pour
// d'autres destinations (FLIP de la SearchBar, crossfade vidéo...) : cf.
// leur abonnement à onPageExitRequest dans CategoryPage.jsx / HomePage.jsx /
// ProductPage.jsx.
const STATIC_EXIT_AWARE_PAGES = ['/', '/categorie', '/product'];

// Remplaçant de navigate() utilisable depuis n'importe quel composant
// (headers, footer, liens internes) : n'intercepte que si la page courante
// fait partie de EXIT_TRANSITION_PAGES. Dans ce cas, un lien vers cette même
// page se comporte comme les autres liens de nav vers la page courante
// ailleurs dans l'appli (ex. "Découvrir" déjà sur /categorie) : remontée en
// haut, pas de navigate() (qui empilerait une entrée d'historique redondante
// et casserait la détection de premier chargement basée sur location.key,
// cf. usePageSlideTransition) ni d'animation de sortie (sans cette garde, la
// navigation vers soi-même ne remonte jamais le composant, et la page
// resterait figée à mi-sortie). Restreint à onExitPage : ailleurs dans
// l'appli, un navigate() vers la page courante peut légitimement porter un
// nouvel état (ex. ouvrir une conversation précise dans la messagerie).
//
// Cas symétrique — depuis une page de STATIC_EXIT_AWARE_PAGES vers une page
// statique (contact/à propos) : ces pages gèrent elles-mêmes leur cascade de
// sortie et ne doivent pas en jouer une pour CHAQUE destination — la modale
// de connexion, par exemple, laisse la page de fond montée
// (backgroundLocation), et une sortie y resterait glissée hors écran
// indéfiniment. On ne l'intercepte donc que vers une destination connue de
// EXIT_TRANSITION_PAGES, sur le modèle destination-par-destination de
// useHomeNavigate/useProductNavigate (useCategoryTransition.js).
export function usePageExitNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const onExitPage = EXIT_TRANSITION_PAGES.some((base) => isOnPath(location.pathname, base));
  const onStaticExitAwarePage = STATIC_EXIT_AWARE_PAGES.some((base) =>
    isOnPath(location.pathname, base)
  );
  return useCallback(
    (to, options) => {
      const samePage = to === location.pathname;
      if (onExitPage && samePage) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const shouldIntercept =
        (onExitPage && !samePage) || (onStaticExitAwarePage && EXIT_TRANSITION_PAGES.includes(to));
      if (shouldIntercept && !prefersReducedMotion()) {
        window.dispatchEvent(new window.CustomEvent(PAGE_EXIT_EVENT, { detail: { to, options } }));
      } else {
        navigate(to, options);
      }
    },
    [navigate, onExitPage, onStaticExitAwarePage, location.pathname]
  );
}

// À poser dans le composant de page lui-même (ContactPage, AboutPage...) :
// orchestre la sortie (remontée en haut, glissade, navigation réelle) et
// fournit `slide(order, from)` pour l'entrée en cascade et la sortie inversée
// de chaque bloc, sur le modèle de CategoryPage (cf. useCategoryTransition.js).
//
// `bgHandoff` (optionnel) permet un raccord de fond invisible avec les autres
// pages, sur le même principe que Home ↔ Catégorie/Produit :
//   - `ownBg` : notre propre image de fond, transmise par payload à l'accueil
//     (page vidéo — sans équivalent statique à elle, c'est SA propre entrée
//     qui doit s'en charger, cf. HomePage.jsx) quand on y navigue ;
//   - `staticBgTargets` : `{ [chemin]: image }` — pour chaque destination
//     listée (catégorie, ou la page statique sœur contact/à propos), NOTRE
//     propre fond fait un crossfade vers cette image avant de naviguer (page
//     statique comme nous — inutile qu'elle rejoue quoi que ce soit à
//     l'arrivée, le raccord est déjà invisible à son montage).
export function usePageSlideTransition(totalDuration, bgHandoff = {}) {
  const { ownBg, staticBgTargets } = bgHandoff;
  const navigate = useNavigate();
  const location = useLocation();
  // react-router ne donne la clé "default" qu'à l'entrée d'historique du tout
  // premier chargement du navigateur sur cette URL (accès direct ou
  // actualisation) : dans ce cas il n'y a pas de page précédente quittée,
  // donc pas d'entrée à jouer. Toute navigation interne (même vers une page
  // déjà visitée dans la session) reçoit une clé générée, différente.
  const [enterActive, setEnterActive] = useState(
    () => location.key !== 'default' && !prefersReducedMotion()
  );
  const [exiting, setExiting] = useState(false);
  // Crossfade de sortie vers une cible de bgHandoff.staticBgTargets ci-dessus :
  // se pose derrière les blocs qui glissent hors écran par-dessus, et
  // atterrit à pleine opacité pile pour le montage réel de la page cible, qui
  // utilise nativement cette même image.
  const [exitBgSrc, setExitBgSrc] = useState(null);
  const transitioningRef = useRef(false);

  // Sécurité : libère un verrou de défilement laissé par une transition
  // interrompue ailleurs (navigation directe en plein vol).
  useEffect(() => {
    unlockScroll();
  }, []);

  // Fenêtre d'entrée : une fois refermée, plus aucun style d'animation.
  useEffect(() => {
    if (!enterActive) return undefined;
    const timer = setTimeout(() => setEnterActive(false), totalDuration + 300);
    return () => clearTimeout(timer);
  }, [enterActive, totalDuration]);

  // Séquence de sortie : remontée en haut, glissade des blocs, puis
  // navigation réelle une fois la cascade terminée.
  useEffect(() => {
    let cancelled = false;
    let navTimer = null;
    const unsubscribe = onPageExitRequest(async ({ to, options }) => {
      if (transitioningRef.current) return;
      transitioningRef.current = true;
      lockScroll();
      await smoothScrollToTop();
      if (cancelled) return;
      const targetBg = staticBgTargets?.[to];
      if (targetBg) setExitBgSrc(targetBg);
      setExiting(true);
      navTimer = setTimeout(() => {
        unlockScroll();
        // Vers l'accueil (fond vidéo, sans équivalent statique) : c'est à
        // elle de fondre depuis notre image — cf. HomePage.jsx, qui lit ce
        // même payload.
        if (to === '/' && ownBg) setTransitionPayload('home', { bg: ownBg });
        navigate(to, options);
      }, totalDuration);
    });
    return () => {
      cancelled = true;
      clearTimeout(navTimer);
      unsubscribe();
    };
  }, [navigate, totalDuration, ownBg, staticBgTargets]);

  const slide = useCallback(
    (order, from = 'left') => {
      if (exiting) {
        const keyframes = from === 'left' ? 'categorySlideOutLeft' : 'categorySlideOutRight';
        const duration = totalDuration - order * CATEGORY_ENTER_STAGGER;
        return {
          animation: `${keyframes} ${duration}ms ${CATEGORY_EXIT_EASING} both`,
          willChange: 'transform',
        };
      }
      if (enterActive) {
        const keyframes = from === 'left' ? 'categorySlideInLeft' : 'categorySlideInRight';
        const delay = order * CATEGORY_ENTER_STAGGER;
        return {
          animation: `${keyframes} ${totalDuration - delay}ms ${CATEGORY_ENTER_EASING} ${delay}ms both`,
          willChange: 'transform',
        };
      }
      return undefined;
    },
    [exiting, enterActive, totalDuration]
  );

  return { slide, exitBgSrc };
}
