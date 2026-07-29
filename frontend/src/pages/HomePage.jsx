import { useEffect, useLayoutEffect, useRef, useState, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bateauVideo from '../assets/video/video_bateau_3.mp4';
import categoryBg from '../assets/image/paysage/cote_azur.jpg';
import productBg from '../assets/image/paysage/crique.jpg';
import SearchBar from '../components/common/SearchBar.jsx';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';
import logoLong from '../assets/image/SL_logo/logo SL long.webp';
import { MdVerified, MdAnchor, MdSearch, MdEventAvailable } from 'react-icons/md';
import { FaShieldAlt, FaHandshake } from 'react-icons/fa';
import Carrousel from '../components/common/Carrousel.jsx';
import ClientReviews from '../components/common/ClientReviews.jsx';
import GhostButton from '../components/common/GhostButton.jsx';
import {
  onCategoryTransitionRequest,
  onProductTransitionRequest,
  setTransitionPayload,
  readTransitionPayload,
  clearTransitionPayload,
  smoothScrollToTop,
  useCategoryNavigate,
  shouldPlayIntro,
  markIntroSeen,
  emitIntroReveal,
  lockScroll,
  unlockScroll,
  HERO_EXIT_DURATION,
  HERO_EXIT_EASING,
  HERO_ENTER_EASING,
  INTRO_SOFT_EASING,
  CATEGORY_ENTER_TOTAL,
  INTRO_BLACK_MS,
  INTRO_WELCOME_HOLD_MS,
  INTRO_REVEAL_LAG_MS,
} from '../hooks/useCategoryTransition.js';

// Fondu des textes de l'intro : apparition et disparition symétriques,
// opacité + légère dérive verticale, au même rythme que le crossfade.
const INTRO_TEXT_FADE = `opacity ${HERO_EXIT_DURATION}ms ${INTRO_SOFT_EASING}, transform ${HERO_EXIT_DURATION}ms ${INTRO_SOFT_EASING}`;

const dotFlowCSS = `
  @keyframes dotMove {
    0%   { left: -20px; opacity: 0; }
    7%  { opacity: 0; }
    28%  { opacity: 1; }
    70%  { opacity: 1; }
    90%  { opacity: 0; }
    100% { left: calc(100% + 20px); opacity: 0; }
  }
  @keyframes categoryBgFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes categoryBgFadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
  @keyframes heroEnterFromRight {
    from { transform: translateX(110vw); }
    to   { transform: none; }
  }
  @keyframes heroEnterFromLeft {
    from { transform: translateX(-110vw); }
    to   { transform: none; }
  }
`;

function DataDots({ active }) {
  const dots = useMemo(
    () =>
      Array.from({ length: 20 }, () => ({
        size: Math.random() * 10 + 4,
        delay: Math.random() * 4,
        duration: Math.random() * 3 + 3,
        offset: Math.random() * 15 - 10,
        opacity: Math.random() * 0.4 + 0.2,
      })),
    []
  );

  return (
    <div
      className="relative flex-1 overflow-hidden self-start"
      style={{ height: '60px', marginTop: '0.6rem', marginLeft: '-1rem', marginRight: '-1rem' }}
    >
      {dots.map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-sky-400"
          style={{
            width: dot.size,
            height: dot.size,
            top: `calc(50% + ${dot.offset}px)`,
            transform: 'translateY(-50%)',
            animation: active ? `dotMove ${dot.duration}s ${dot.delay}s linear infinite` : 'none',
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

function getSteps(t) {
  return [
    {
      num: 1,
      icon: <MdSearch />,
      title: t('home.steps.step1.title'),
      text: t('home.steps.step1.text'),
    },
    {
      num: 2,
      icon: <MdEventAvailable />,
      title: t('home.steps.step2.title'),
      text: t('home.steps.step2.text'),
    },
    {
      num: 3,
      icon: <MdAnchor />,
      title: t('home.steps.step3.title'),
      text: t('home.steps.step3.text'),
    },
  ];
}

function getValueCards(t) {
  return [
    {
      icon: <MdAnchor className="text-3xl text-sky-500" />,
      title: t('home.values.fleet.title'),
      text: t('home.values.fleet.text'),
    },
    {
      icon: <FaShieldAlt className="text-3xl text-sky-500" />,
      title: t('home.values.payment.title'),
      text: t('home.values.payment.text'),
    },
    {
      icon: <FaHandshake className="text-3xl text-sky-500" />,
      title: t('home.values.owners.title'),
      text: t('home.values.owners.text'),
    },
    {
      icon: <MdVerified className="text-3xl text-sky-500" />,
      title: t('home.values.support.title'),
      text: t('home.values.support.text'),
    },
  ];
}

const APP_LINKS = [
  { icon: <SiAppstore />, label: 'App Store', href: 'https://apps.apple.com' },
  { icon: <SiGoogleplay />, label: 'Google Play', href: 'https://play.google.com' },
];

function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goToCategory = useCategoryNavigate();
  const stepsRef = useRef(null);
  const videoRef = useRef(null);
  const searchBarWrapRef = useRef(null);
  const transitioningRef = useRef(false);
  const [dotsActive, setDotsActive] = useState(false);
  // Sortie vers /categorie ou /product/:id en cours : le hero s'anime hors
  // écran et le fond vidéo laisse place (crossfade) à l'image de fond de la
  // page de destination (cf. exitBgSrc, qui varie selon la cible).
  const [exiting, setExiting] = useState(false);
  // Cible de la sortie en cours : seule la sortie vers la page produit
  // rétracte la SearchBar (cf. SearchBar), en douceur, avant la navigation.
  const [exitTarget, setExitTarget] = useState(null);
  const [exitBgSrc, setExitBgSrc] = useState(categoryBg);
  // Arrivée depuis /categorie ou /product/:id : les éléments du hero rentrent
  // depuis leur marge de sortie, la SearchBar revient en FLIP et l'image de
  // fond de la page de départ (transmise via le payload — cf. son propre
  // exitBgSrc/bg) s'efface pour révéler la vidéo.
  const [homeArrival] = useState(() => readTransitionPayload('home'));
  const arrivalBg = homeArrival?.bg ?? categoryBg;
  const [arrivalActive, setArrivalActive] = useState(Boolean(homeArrival));
  // Intro de première visite : machine à phases 'black' → 'video' → 'welcome'
  // → 'reveal' → null (terminée ou pas d'intro).
  const [introPhase, setIntroPhase] = useState(() => (shouldPlayIntro() ? 'black' : null));
  const introActive = introPhase !== null;
  // Sections sous la ligne de flottaison différées pendant les animations
  // d'arrivée (transition ou intro) : leur montage (carrousels motion, avis)
  // en pleine animation faisait saccader l'entrée alors qu'elles sont
  // invisibles à ce moment-là.
  const [belowFoldReady, setBelowFoldReady] = useState(Boolean(!homeArrival && !introActive));

  // Fin des animations d'arrivée (transition ou intro) : montage des sections
  // différées et déverrouillage du défilement, au même moment.
  useEffect(() => {
    if (!arrivalActive && !introActive) {
      setBelowFoldReady(true);
      unlockScroll();
    }
  }, [arrivalActive, introActive]);
  const heroLogoRef = useRef(null);
  // Décalage appliqué au bloc logo pour centrer le logo dans le viewport
  // pendant les premières phases de l'intro.
  const [introOffsetY, setIntroOffsetY] = useState(0);

  // Mesure avant peinture, pendant que le bloc est à sa position naturelle.
  useLayoutEffect(() => {
    if (introPhase === null) return;
    const logo = heroLogoRef.current;
    if (!logo) return;
    const rect = logo.getBoundingClientRect();
    setIntroOffsetY(window.innerHeight / 2 - (rect.top + rect.height / 2));
  }, []);

  // Déroulé temporel de l'intro (les phases pilotent uniquement des styles).
  useEffect(() => {
    if (introPhase === null) return undefined;
    markIntroSeen();
    // Pas de défilement pendant l'intro (sections différées + mise en scène).
    lockScroll();
    const revealAt = INTRO_BLACK_MS + HERO_EXIT_DURATION + INTRO_WELCOME_HOLD_MS;
    // Le header descend après le léger délai qui laisse le bloc logo entamer
    // sa glissade ; l'intro se termine une fois les blocs du bas posés.
    const doneAt = revealAt + INTRO_REVEAL_LAG_MS + CATEGORY_ENTER_TOTAL + 300;
    const timers = [
      setTimeout(() => setIntroPhase('video'), INTRO_BLACK_MS),
      setTimeout(() => setIntroPhase('welcome'), INTRO_BLACK_MS + HERO_EXIT_DURATION),
      setTimeout(() => setIntroPhase('reveal'), revealAt),
      setTimeout(emitIntroReveal, revealAt + INTRO_REVEAL_LAG_MS),
      setTimeout(() => setIntroPhase(null), doneAt),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Nettoyage différé (StrictMode invoque l'initialiseur deux fois en dev)
  // pour ne pas rejouer l'arrivée aux visites suivantes.
  useEffect(() => {
    clearTransitionPayload();
  }, []);

  // Referme la fenêtre d'arrivée une fois les animations posées.
  useEffect(() => {
    if (!arrivalActive) return undefined;
    const timer = setTimeout(() => setArrivalActive(false), HERO_EXIT_DURATION + 300);
    return () => clearTimeout(timer);
  }, [arrivalActive]);

  // FLIP retour de la SearchBar : de sa position dans la barre sticky de
  // /categorie ou /product/:id vers son emplacement au centre du hero.
  useLayoutEffect(() => {
    const from = homeArrival?.searchBarRect;
    const el = searchBarWrapRef.current;
    if (!from || !el) return undefined;
    // Depuis la page produit, la SearchBar y était rétractée à la mesure du
    // rect (elle finit de se redéployer pendant la sortie) : un scale calculé
    // sur ce rect produirait un effet de zoom. On ne garde alors que la
    // continuité de position (translate seul) — déployée, la barre a déjà
    // quasiment la taille naturelle du hero, et son bord gauche est le même
    // rétractée ou déployée.
    const translateOnly = homeArrival?.from === 'product';
    const to = el.getBoundingClientRect();
    el.style.transformOrigin = 'top left';
    el.style.willChange = 'transform';
    el.style.transition = 'none';
    el.style.transform = translateOnly
      ? `translate(${from.left - to.left}px, ${from.top - to.top}px)`
      : `translate(${from.left - to.left}px, ${from.top - to.top}px) ` +
        `scale(${from.width / to.width}, ${from.height / to.height})`;
    let raf2 = null;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        el.style.transition = `transform ${HERO_EXIT_DURATION}ms ${HERO_ENTER_EASING}`;
        el.style.transform = 'none';
      });
    });
    const resetStyles = () => {
      el.style.transform = '';
      el.style.transition = '';
      el.style.transformOrigin = '';
      el.style.willChange = '';
    };
    const cleanupTimer = setTimeout(resetStyles, HERO_EXIT_DURATION + 100);
    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      clearTimeout(cleanupTimer);
      // État neutre pour la seconde passe de StrictMode, qui doit mesurer la
      // position naturelle et non celle déplacée par la première.
      resetStyles();
    };
  }, [homeArrival]);
  const STEPS = useMemo(() => getSteps(t), [t]);
  const VALUE_CARDS = useMemo(() => getValueCards(t), [t]);

  // Séquence de transition vers /categorie ou /product/:id : remontée en haut
  // de page, sortie des éléments du hero (la SearchBar, elle, est mesurée
  // pour l'animation FLIP jouée à l'arrivée) pendant que le fond vidéo laisse
  // place (crossfade) à l'image de fond propre à la page cible, puis
  // navigation réelle.
  useEffect(() => {
    let cancelled = false;
    let navTimer = null;
    const beginExit =
      (target, targetBg) =>
      async ({ to }) => {
        if (transitioningRef.current) return;
        transitioningRef.current = true;
        // Défilement gelé jusqu'à la fin de l'arrivée sur la page cible, qui
        // déverrouille (les sections différées y sont alors montées).
        lockScroll();
        // Précharge ET décode le fond de la page cible pendant la remontée : le
        // décodage du JPEG (~3 Mo) au moment du premier paint ferait saccader
        // le début du crossfade.
        const bg = new window.Image();
        bg.src = targetBg;
        bg.decode?.().catch(() => {});
        await smoothScrollToTop();
        if (cancelled) return;
        setExitBgSrc(targetBg);
        setExiting(true);
        setExitTarget(target);
        setTransitionPayload(target, {
          searchBarRect: searchBarWrapRef.current?.getBoundingClientRect() ?? null,
        });
        navTimer = setTimeout(() => navigate(to), HERO_EXIT_DURATION);
      };
    const unsubCategory = onCategoryTransitionRequest(beginExit('category', categoryBg));
    const unsubProduct = onProductTransitionRequest(beginExit('product', productBg));
    return () => {
      cancelled = true;
      clearTimeout(navTimer);
      unsubCategory();
      unsubProduct();
    };
  }, [navigate]);

  // Styles des trois mouvements de l'intro. Pendant les premières phases le
  // bloc logo est décalé pour centrer le logo dans le viewport et les blocs du
  // bas attendent sous l'écran ; à la phase 'reveal' tout glisse en place.
  const introRevealing = introPhase === 'reveal';
  const introLogoBlockStyle = introActive
    ? {
        transform: introRevealing ? 'none' : `translateY(${introOffsetY}px)`,
        transition: introRevealing
          ? `transform ${HERO_EXIT_DURATION}ms ${HERO_ENTER_EASING}`
          : 'none',
        willChange: 'transform',
      }
    : undefined;
  const introTaglineHidden = introPhase === 'black' || introPhase === 'video';
  const introTaglineStyle = introActive
    ? {
        opacity: introTaglineHidden ? 0 : 1,
        transform: introTaglineHidden ? 'translateY(14px)' : 'none',
        transition: INTRO_TEXT_FADE,
      }
    : undefined;
  // Après le léger délai laissé au bloc logo, la SearchBar et le bloc CTA
  // montent au rythme des transitions de page.
  const introFromBelowStyle = introActive
    ? {
        transform: introRevealing ? 'none' : 'translateY(110vh)',
        transition: introRevealing
          ? `transform ${CATEGORY_ENTER_TOTAL}ms ${HERO_ENTER_EASING} ${INTRO_REVEAL_LAG_MS}ms`
          : 'none',
        willChange: 'transform',
      }
    : undefined;

  // Les blocs du hero quittent l'écran chacun de leur côté (ease-in pour un
  // départ franc) et, au retour de /categorie, rentrent depuis cette même
  // marge (ease-out) — la sortie jouée à rebours.
  const heroSlideStyle = (side) => {
    if (exiting) {
      return {
        transform: `translateX(${side === 'right' ? '110vw' : '-110vw'})`,
        transition: `transform ${HERO_EXIT_DURATION}ms ${HERO_EXIT_EASING}`,
        willChange: 'transform',
      };
    }
    if (arrivalActive) {
      const keyframes = side === 'right' ? 'heroEnterFromRight' : 'heroEnterFromLeft';
      return {
        animation: `${keyframes} ${HERO_EXIT_DURATION}ms ${HERO_ENTER_EASING} both`,
        willChange: 'transform',
      };
    }
    return undefined;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!video.src) video.src = bateauVideo;
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!belowFoldReady || !stepsRef.current) return undefined;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDotsActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(stepsRef.current);
    return () => observer.disconnect();
  }, [belowFoldReady]);

  return (
    <main className="w-full overflow-x-hidden">
      <style>{dotFlowCSS}</style>

      {/* Section 1 — Hero */}
      <section
        id="hero"
        className="relative w-full min-h-screen flex flex-col overflow-hidden px-4"
      >
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex="-1"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-transparent to-[rgb(0,78,87)]" />

        {/* Crossfade façon diaporama : le fond de la page cible (même image +
            même voile sombre, en attachment fixed comme là-bas) recouvre la
            vidéo pendant la sortie — et, à l'arrivée, c'est l'image de la
            page de départ (arrivalBg, transmise via le payload) qui s'efface
            pour révéler la vidéo —, pour un raccord invisible à la
            navigation dans les deux sens. */}
        {(exiting || arrivalActive) && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${exiting ? exitBgSrc : arrivalBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
              animation: `${exiting ? 'categoryBgFadeIn' : 'categoryBgFadeOut'} ${HERO_EXIT_DURATION}ms ease forwards`,
            }}
          />
        )}

        {/* Intro première visite : voile noir opaque qui s'estompe jusqu'au
            voile sombre habituel, révélant la vidéo déjà en lecture derrière.
            Ease-in-out doux (départ et fin progressifs, façon dégradé) plutôt
            que le "ease" standard qui démarre trop brusquement. */}
        {introActive && (
          <div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{
              opacity: introPhase === 'black' ? 1 : 0,
              transition: `opacity ${HERO_EXIT_DURATION}ms ${INTRO_SOFT_EASING}`,
            }}
          />
        )}

        <div className="relative flex-1 flex flex-col items-center justify-center gap-20 text-center">
          <div className="relative" style={introLogoBlockStyle}>
            {introActive && (
              <p
                className="absolute left-1/2 -top-16 w-max text-gray-300 text-xl"
                style={{
                  fontFamily: "'Montserrat Alternates', sans-serif",
                  fontWeight: 600,
                  opacity: introPhase === 'welcome' ? 1 : 0,
                  // translate(-50%, …) : centrage horizontal sur le bloc logo
                  // combiné à la dérive verticale du fondu.
                  transform:
                    introPhase === 'welcome' ? 'translate(-50%, 0)' : 'translate(-50%, 14px)',
                  transition: INTRO_TEXT_FADE,
                }}
              >
                {t('home.hero.welcome')}
              </p>
            )}
            <img
              ref={heroLogoRef}
              src={logoLong}
              alt="SailingLoc, location de bateaux entre particuliers"
              decoding="async"
              fetchPriority="high"
              className="h-20 mx-auto mb-4"
              style={heroSlideStyle('right')}
            />
            <h1
              className="text-gray-300 text-xl"
              style={{ ...heroSlideStyle('left'), ...introTaglineStyle }}
            >
              {t('home.hero.tagline')}
            </h1>
          </div>
          <div ref={searchBarWrapRef} style={introFromBelowStyle}>
            <SearchBar
              light
              retracted={exiting && exitTarget === 'product'}
              retractDuration={HERO_EXIT_DURATION}
            />
          </div>
          <div className="text-center" style={introFromBelowStyle}>
            <p
              className="text-white/70 text-xs mb-2 tracking-widest uppercase"
              style={heroSlideStyle('right')}
            >
              {t('home.hero.mobileApp')}
            </p>
            <div className="flex justify-center gap-2" style={heroSlideStyle('left')}>
              {APP_LINKS.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-medium border border-white/40 hover:bg-white/15 hover:border-white transition-colors"
                >
                  <span className="text-sm">{icon}</span>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sections sous la ligne de flottaison, montées après les animations
          d'arrivée. Le bloc fantôme conserve une hauteur de page (et donc la
          barre de défilement) pour éviter un saut de largeur au montage. */}
      {!belowFoldReady && <div style={{ height: '100vh' }} aria-hidden="true" />}
      {belowFoldReady && (
        <>
          {/* Section 2 — Carrousels bateaux & ports */}
          <section
            id="suggestions"
            className="relative w-full flex flex-col gap-8 px-28 py-10 scroll-mt-[45px] bg-[linear-gradient(to_bottom,rgb(0,78,87)_0%,#EBF5FD_38%,white_53%,white_100%)]"
          >
            <div className="w-full flex flex-col gap-8">
              <Carrousel />
            </div>
          </section>

          <div id="tutoriel" className="border-t border-gray-200 mx-[168px] scroll-mt-[115px]" />

          {/* Section 3 — Tuto */}
          <section className="w-full bg-white flex flex-col items-center px-28 py-8 gap-0">
            <div className="w-full flex flex-col items-center px-16 py-10">
              <div className="text-center mb-10">
                <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-6 underline underline-offset-4">
                  {t('home.steps.kicker')}
                </p>
                <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
                  {t('home.steps.title')}
                </h2>
              </div>

              <div ref={stepsRef} className="flex items-start w-full mb-10">
                {STEPS.map(({ num, icon, title, text }, i) => (
                  <Fragment key={num}>
                    <div className="flex flex-col items-center text-center flex-1 px-4">
                      <div
                        className="w-14 h-14 rounded-full bg-white border border-sky-500 flex items-center justify-center text-sky-500 text-xl font-semibold mb-4"
                        style={{ boxShadow: '0 2px 8px rgba(14,165,233,0.3)' }}
                      >
                        {num}
                      </div>
                      <h3
                        className="font-semibold text-gray-900 flex items-center gap-1.5"
                        style={{ letterSpacing: '-0.01em' }}
                      >
                        <span className="text-sky-500">{icon}</span>
                        {title}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed max-w-xs mt-2">{text}</p>
                    </div>
                    {i < STEPS.length - 1 && <DataDots active={dotsActive} />}
                  </Fragment>
                ))}
              </div>

              <GhostButton
                onClick={() =>
                  document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                <MdSearch className="text-base" />
                {t('home.steps.cta')}
              </GhostButton>
            </div>
          </section>

          <div className="border-t border-gray-200 mx-[168px]" />

          {/* Section 4 — Proposition de valeur */}
          <section
            id="proposition-valeur"
            className="w-full bg-white flex flex-col items-center px-28 py-8 gap-0 scroll-mt-[130px]"
          >
            <div className="text-center mb-10">
              <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-6 underline underline-offset-4">
                {t('home.values.kicker')}
              </p>
              <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
                {t('home.values.title')}
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-6 w-full mb-10">
              {VALUE_CARDS.map(({ icon, title, text }) => (
                <div
                  key={title}
                  className="flex flex-col items-center text-center gap-3 p-8 rounded-2xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_32px_rgba(14,165,233,0.95)] hover:-translate-y-1 transition-all duration-300"
                >
                  <span>{icon}</span>
                  <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <GhostButton onClick={() => navigate('/a-propos')}>{t('home.values.cta')}</GhostButton>
          </section>

          <div id="avis" className="border-t border-gray-200 mx-[168px] scroll-mt-[60px]" />

          {/* Section 5 — Avis clients */}
          <ClientReviews className="py-8">
            <div className="flex flex-col items-center gap-4 mt-10">
              <p className="text-gray-700 font-semibold text-lg">{t('home.reviews.tagline')}</p>
              <GhostButton className="font-semibold text-lg" onClick={() => goToCategory()}>
                {t('home.reviews.cta')} <MdAnchor className="text-base" />
              </GhostButton>
            </div>
          </ClientReviews>
        </>
      )}
    </main>
  );
}

export default HomePage;
