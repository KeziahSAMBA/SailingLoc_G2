import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdAnchor, MdVerified } from 'react-icons/md';
import { FaHandshake } from 'react-icons/fa';
import aboutBg from '../assets/image/paysage/about_bg.jpg';
import Carrousel from '../components/common/Carrousel.jsx';
import { unlockScroll } from '../hooks/useCategoryTransition.js';

// Focus clavier visible sur fond clair — même convention que ContactPage.
const FOCUS_LIGHT =
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

// Cartes glassmorphism, comme les sections de la page d'accueil.
const cardClass =
  'rounded-2xl border border-white/20 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-[5px]';

// Taille et format des cartes Valeurs : même modèle que la Section 4
// (proposition de valeur) de l'accueil, en gardant les couleurs glassmorphism.
const valueCardClass =
  'flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/5 p-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-[5px] transition-all duration-300 hover:-translate-y-1 sm:p-8';

const PHOTO_BG_STYLE = {
  backgroundImage: `linear-gradient(rgba(3,24,30,0.62), rgba(3,35,39,0.72)), url(${aboutBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
};

function AboutPage() {
  const { t } = useTranslation();

  // Une navigation interrompant l'intro ou une transition de catalogue peut
  // laisser les écouteurs globaux de molette/tactile actifs. Cette page n'a
  // aucune animation nécessitant ce verrou : elle le libère dès son montage.
  useEffect(() => {
    unlockScroll();
  }, []);

  const STATS = [
    { value: '50+', label: t('aboutPage.stats.boats') },
    { value: '11', label: t('aboutPage.stats.destinations') },
    { value: '2023', label: t('aboutPage.stats.founded') },
    { value: '4,8/5', label: t('aboutPage.stats.rating') },
  ];

  const VALUES = [
    {
      icon: <MdVerified aria-hidden="true" className="text-3xl text-sky-500" />,
      title: t('aboutPage.values.trust.title'),
      text: t('aboutPage.values.trust.text'),
    },
    {
      icon: <MdAnchor aria-hidden="true" className="text-3xl text-sky-500" />,
      title: t('aboutPage.values.passion.title'),
      text: t('aboutPage.values.passion.text'),
    },
    {
      icon: <FaHandshake aria-hidden="true" className="text-3xl text-sky-500" />,
      title: t('aboutPage.values.simplicity.title'),
      text: t('aboutPage.values.simplicity.text'),
    },
  ];

  // SEO / onglet navigateur : titre de page dédié.
  useEffect(() => {
    document.title = t('aboutPage.pageTitle');
  }, [t]);

  return (
    <main className="w-full overflow-x-clip text-white" style={PHOTO_BG_STYLE}>
      {/* Hero de la page À propos + présentation */}
      <section
        id="about-hero"
        className="relative flex min-h-[100svh] w-full scroll-mt-[80px] flex-col items-center justify-center overflow-hidden px-4 pb-10 pt-[96px]"
      >
        <div className="relative text-center">
          <h1 className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl">
            {t('aboutPage.hero.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
            {t('aboutPage.hero.tagline')}
          </p>
        </div>

        <div
          id="about-story"
          aria-labelledby="story-title"
          className="mt-10 w-full max-w-6xl scroll-mt-[180px]"
        >
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
                {t('aboutPage.story.kicker')}
              </p>
              <h2
                id="story-title"
                className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl"
              >
                {t('aboutPage.story.title')}
              </h2>
              <p className="mt-6 leading-relaxed text-white/70">{t('aboutPage.story.p1')}</p>
              <p className="mt-4 leading-relaxed text-white/70">{t('aboutPage.story.p2')}</p>
            </div>

            <ul className="grid grid-cols-2 gap-4 sm:gap-6">
              {STATS.map(({ value, label }) => (
                <li key={label} className={`${cardClass} text-center`}>
                  <p className="text-3xl font-bold text-sky-300">{value}</p>
                  <p className="mt-1 text-sm text-white/65">{label}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl border-t border-white/15" />

      {/* Valeurs */}
      <section
        id="about-values"
        aria-labelledby="values-title"
        className="w-full scroll-mt-[130px] px-4 py-10 sm:px-8 lg:px-16 xl:px-28"
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
              {t('aboutPage.values.kicker')}
            </p>
            <h2
              id="values-title"
              className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl"
            >
              {t('aboutPage.values.title')}
            </h2>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
            {VALUES.map(({ icon, title, text }) => (
              <li key={title} className={valueCardClass}>
                <span>{icon}</span>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                <p className="text-xs leading-relaxed text-white/65">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-4xl border-t border-white/15" />

      {/* Destinations */}
      <section
        id="about-destinations"
        aria-labelledby="destinations-title"
        className="w-full scroll-mt-[60px] px-4 py-10 sm:px-8 lg:px-16 xl:px-28"
      >
        <div className="mb-10 text-center">
          <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
            {t('aboutPage.destinations.kicker')}
          </p>
          <h2
            id="destinations-title"
            className="text-2xl font-semibold text-white sm:text-3xl md:text-4xl"
          >
            {t('aboutPage.destinations.title')}
          </h2>
        </div>

        <Carrousel theme="dark" portsOnly />
      </section>

      {/* CTA final — même style que le CTA de la Section 5 de l'accueil */}
      <section
        id="about-cta"
        aria-labelledby="cta-title"
        className="w-full scroll-mt-[80px] px-4 pb-10 pt-2"
      >
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 text-center">
          <h2 id="cta-title" className="text-base font-semibold text-white sm:text-lg">
            {t('aboutPage.cta.title')}
          </h2>
          <p className="text-sm text-white/70">{t('aboutPage.cta.text')}</p>
          <Link
            to="/categorie"
            className={`mt-1 flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-2xl transition hover:bg-white/20 ${FOCUS_LIGHT}`}
          >
            {t('aboutPage.cta.browse')} <MdAnchor className="text-base" />
          </Link>
          <Link
            to="/contact"
            className={`text-sm font-medium text-sky-300 hover:text-sky-200 hover:underline ${FOCUS_LIGHT}`}
          >
            {t('aboutPage.cta.contact')}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
