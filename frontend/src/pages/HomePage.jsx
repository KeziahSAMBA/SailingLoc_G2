import { useEffect, useRef, useState, useMemo, Fragment } from 'react';
import bateauVideo from '../assets/video/video_bateau_3.mp4';
import SearchBar from '../components/common/SearchBar.jsx';
import { SiAppstore, SiGoogleplay } from 'react-icons/si';
import logoLong from '../assets/image/SL_logo/logo SL long.webp';
import { MdVerified, MdAnchor, MdSearch, MdEventAvailable } from 'react-icons/md';
import { FaShieldAlt, FaHandshake } from 'react-icons/fa';
import Carrousel from '../components/common/Carrousel.jsx';
import ClientReviews from '../components/common/ClientReviews.jsx';
import GhostButton from '../components/common/GhostButton.jsx';

const dotFlowCSS = `
  @keyframes dotMove {
    0%   { left: -20px; opacity: 0; }
    7%  { opacity: 0; }
    28%  { opacity: 1; }
    70%  { opacity: 1; }
    90%  { opacity: 0; }
    100% { left: calc(100% + 20px); opacity: 0; }
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

const STEPS = [
  {
    num: 1,
    icon: <MdSearch />,
    title: 'Recherchez',
    text: 'Utilisez nos filtres précis pour trouver le bateau idéal selon vos dates et votre budget.',
  },
  {
    num: 2,
    icon: <MdEventAvailable />,
    title: 'Réservez',
    text: 'Échangez avec le propriétaire et confirmez votre réservation en quelques clics via notre interface sécurisée.',
  },
  {
    num: 3,
    icon: <MdAnchor />,
    title: 'Naviguez',
    text: "Le jour J, faites l'état des lieux, recevez les clés et profitez de votre aventure sur l'eau.",
  },
];

const VALUE_CARDS = [
  {
    icon: <MdAnchor className="text-3xl text-sky-500" />,
    title: 'Flotte sélectionnée',
    text: 'Chaque bateau est vérifié et validé par notre équipe pour garantir qualité et sécurité à bord.',
  },
  {
    icon: <FaShieldAlt className="text-3xl text-sky-500" />,
    title: 'Paiement sécurisé',
    text: 'Vos transactions sont protégées de bout en bout. Réservez en toute confiance, sans mauvaise surprise.',
  },
  {
    icon: <FaHandshake className="text-3xl text-sky-500" />,
    title: 'Propriétaires passionnés',
    text: 'Louez directement auprès de marins expérimentés qui partagent leur passion et leurs conseils.',
  },
  {
    icon: <MdVerified className="text-3xl text-sky-500" />,
    title: 'Assistance 7j/7',
    text: 'Notre équipe est disponible à tout moment pour vous accompagner avant, pendant et après votre sortie.',
  },
];

const APP_LINKS = [
  { icon: <SiAppstore />, label: 'App Store', href: 'https://apps.apple.com' },
  { icon: <SiGoogleplay />, label: 'Google Play', href: 'https://play.google.com' },
];

function HomePage() {
  const stepsRef = useRef(null);
  const videoRef = useRef(null);
  const [dotsActive, setDotsActive] = useState(false);

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
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDotsActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (stepsRef.current) observer.observe(stepsRef.current);
    return () => observer.disconnect();
  }, []);

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
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-b from-transparent to-[rgb(0,78,87)]" />

        <div className="relative flex-1 flex flex-col items-center justify-center gap-20 text-center">
          <div>
            <img src={logoLong} alt="SailingLoc" className="h-20 mx-auto mb-4" />
            <p className="text-gray-300 text-xl">
              Réservez le bateau de vos rêves auprès de propriétaires passionnés dans tous les ports
              de France
            </p>
          </div>
          <SearchBar />
          <div className="text-center">
            <p className="text-white/70 text-xs mb-2 tracking-widest uppercase">
              Rejoignez notre application mobile
            </p>
            <div className="flex justify-center gap-2">
              {APP_LINKS.map(({ icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
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

      {/* Section 2 — Carrousels bateaux & ports */}
      <section
        id="suggestions"
        className="relative w-full flex flex-col gap-8 px-28 py-10 scroll-mt-6 bg-[linear-gradient(to_bottom,rgb(0,78,87)_0%,#EBF5FD_38%,white_53%,white_100%)]"
      >
        <div className="w-full flex flex-col gap-8">
          <Carrousel />
        </div>
      </section>

      <div id="tutoriel" className="border-t border-gray-200 mx-[168px] scroll-mt-28" />

      {/* Section 3 — Tuto */}
      <section className="w-full bg-white flex flex-col items-center px-28 py-8 gap-0">
        <div className="w-full flex flex-col items-center rounded-2xl border border-black/15 shadow-[0_8px_48px_rgba(0,0,0,0.18)] px-16 py-10">
          <div className="text-center mb-10">
            <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-6 underline underline-offset-4">
              Comment ça marche ?
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
              Réserver un bateau n'a jamais été aussi simple
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

          <GhostButton>
            <MdSearch className="text-base" />
            Lancer ma recherche
          </GhostButton>
        </div>
      </section>

      <div className="border-t border-gray-200 mx-[168px]" />

      {/* Section 4 — Proposition de valeur */}
      <section className="w-full bg-white flex flex-col items-center px-28 py-8 gap-0">
        <div className="text-center mb-10">
          <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-6 underline underline-offset-4">
            Pourquoi nous choisir ?
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
            L'expérience marine réinventée
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

        <GhostButton>En savoir plus</GhostButton>
      </section>

      <div id="avis" className="border-t border-gray-200 mx-[168px] scroll-mt-10" />

      {/* Section 5 — Avis clients */}
      <ClientReviews className="py-8">
        <div className="flex flex-col items-center gap-4 mt-10">
          <p className="text-gray-700 font-semibold text-lg">
            L'horizon n'attend pas. Votre bateau non plus.
          </p>
          <GhostButton className="font-semibold text-lg">
            Trouver mon bateau <MdAnchor className="text-base" />
          </GhostButton>
        </div>
      </ClientReviews>
    </main>
  );
}

export default HomePage;
