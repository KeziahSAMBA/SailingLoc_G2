import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdAnchor, MdVerified } from 'react-icons/md';
import { FaHandshake } from 'react-icons/fa';
import aboutBg from '../assets/image/paysage/about_bg.jpg';
import boatImg from '../assets/image/image_bateau/bateau_searchbar.webp';
import Carrousel from '../components/common/Carrousel.jsx';
import { unlockScroll } from '../hooks/useCategoryTransition.js';

// Focus clavier visible sur fond clair — même convention que ContactPage.
const FOCUS_LIGHT =
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

// Cartes blanches ombrées, comme les sections de la page d'accueil.
const cardClass =
  'rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl';

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
      {/* Hero de la page À propos */}
      <section className="relative flex min-h-[45vh] w-full flex-col items-center justify-center overflow-hidden px-4 pt-[96px]">
        <div className="relative text-center">
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            {t('aboutPage.hero.title')}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
            {t('aboutPage.hero.tagline')}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl border-t border-white/15" />

      {/* Présentation */}
      <section aria-labelledby="story-title" className="w-full px-4 py-14">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl md:grid-cols-2 md:p-8">
          <div>
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
              {t('aboutPage.story.kicker')}
            </p>
            <h2 id="story-title" className="text-3xl font-semibold text-white md:text-4xl">
              {t('aboutPage.story.title')}
            </h2>
            <p className="mt-6 leading-relaxed text-white/70">{t('aboutPage.story.p1')}</p>
            <p className="mt-4 leading-relaxed text-white/70">{t('aboutPage.story.p2')}</p>
          </div>
          <img
            src={boatImg}
            alt={t('aboutPage.story.imageAlt')}
            loading="lazy"
            className="h-72 w-full rounded-2xl border border-white/30 object-cover shadow-[0_8px_32px_rgba(0,0,0,0.24)] md:h-96"
          />
        </div>

        {/* Chiffres clés */}
        <ul className="mx-auto mt-14 grid w-full max-w-5xl grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map(({ value, label }) => (
            <li key={label} className={`${cardClass} text-center`}>
              <p className="text-3xl font-bold text-sky-300">{value}</p>
              <p className="mt-1 text-sm text-white/65">{label}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto max-w-4xl border-t border-white/15" />

      {/* Valeurs */}
      <section aria-labelledby="values-title" className="w-full px-4 py-14">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
              {t('aboutPage.values.kicker')}
            </p>
            <h2 id="values-title" className="text-3xl font-semibold text-white md:text-4xl">
              {t('aboutPage.values.title')}
            </h2>
          </div>

          <ul className="grid gap-6 sm:grid-cols-3">
            {VALUES.map(({ icon, title, text }) => (
              <li key={title} className={`${cardClass} text-center`}>
                <span className="mx-auto inline-block">{icon}</span>
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-4xl border-t border-white/15" />

      {/* Destinations */}
      <section aria-labelledby="destinations-title" className="w-full px-4 py-14">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-10 text-center">
            <p className="mb-6 text-sm font-semibold uppercase tracking-widest text-sky-400 underline underline-offset-4">
              {t('aboutPage.destinations.kicker')}
            </p>
            <h2 id="destinations-title" className="text-3xl font-semibold text-white md:text-4xl">
              {t('aboutPage.destinations.title')}
            </h2>
          </div>

          <Carrousel theme="dark" portsOnly />
        </div>
      </section>

      {/* CTA final */}
      <section aria-labelledby="cta-title" className="w-full px-4 pb-16 pt-2">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/20 bg-white/10 px-6 py-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <h2 id="cta-title" className="text-2xl font-semibold text-white md:text-3xl">
            {t('aboutPage.cta.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/70">{t('aboutPage.cta.text')}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/categorie"
              className={`rounded-full border border-white/40 bg-[rgba(14,165,233,0.55)] px-8 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(14,165,233,0.35)] backdrop-blur-md transition hover:border-white/20 hover:bg-[rgba(10,49,114,0.95)] ${FOCUS_LIGHT}`}
            >
              {t('aboutPage.cta.browse')}
            </Link>
            <Link
              to="/contact"
              className={`rounded-full border border-white/40 bg-white/10 px-8 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 ${FOCUS_LIGHT}`}
            >
              {t('aboutPage.cta.contact')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AboutPage;
