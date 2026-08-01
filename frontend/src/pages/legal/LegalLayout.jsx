import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import heroBg from '../../assets/image/portrait/cgu.jpg';
import aboutBg from '../../assets/image/paysage/about_bg.jpg';
import categoryBg from '../../assets/image/paysage/cote_azur.jpg';
import contactBg from '../../assets/image/paysage/contact_bg.jpg';
import { usePageSlideTransition } from '../../hooks/usePageTransition.js';
import {
  PAGE_SLIDE_CSS,
  PHOTO_OVERLAY_BOAT,
  PHOTO_OVERLAY_STATIC_PAGE,
  NAV_ENTER_TOTAL,
} from '../../hooks/useCategoryTransition.js';

// Focus clavier visible sur fond sombre — même convention que ContactPage/AboutPage.
const FOCUS_LIGHT =
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

// Les quatre documents légaux, navigables entre eux via des onglets.
// Libellés réutilisés du footer.
const TABS = [
  { to: '/mentions-legales', labelKey: 'footer.infoLinks.legal' },
  { to: '/cgu', labelKey: 'footer.infoLinks.terms' },
  { to: '/cgv', labelKey: 'footer.infoLinks.sales' },
  { to: '/politique-de-confidentialite', labelKey: 'footer.infoLinks.privacy' },
];

// Photo de fond pleine page + voile sombre, comme les pages contact et à propos.
const PHOTO_BG_STYLE = {
  backgroundImage: `linear-gradient(rgba(3,24,30,0.62), rgba(3,35,39,0.72)), url(${heroBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed',
};

// Cascade titre (0) puis bloc (1) : atterrissage commun à NAV_ENTER_TOTAL,
// départs décalés, même mécanique que ContactPage/AboutPage (cf.
// useCategoryTransition.js).
const LEGAL_ENTER_TOTAL = NAV_ENTER_TOTAL;

// En sortie vers l'une de ces pages, notre propre fond (cgu.jpg) fait un
// crossfade vers le sien avant de naviguer : raccord invisible, comme entre
// Home/Catégorie/Produit/Contact/À propos (cf. usePageSlideTransition).
const LEGAL_STATIC_BG_TARGETS = {
  '/categorie': categoryBg,
  '/contact': contactBg,
  '/a-propos': aboutBg,
};

// Enveloppe commune des pages légales : hero, onglets, avertissement projet
// fictif, colonne de lecture — le tout dans un même encadré glassmorphism.
// Le contenu (sections) est fourni par chaque page.
function LegalLayout({ title, pageTitle, updated, children }) {
  const { t } = useTranslation();
  const location = useLocation();
  // Navigation entre les 4 pages légales via les onglets ci-dessous : pas de
  // transition entre elles (state posé par leur NavLink), seulement en
  // provenance/partance d'une page hors du groupe.
  const fromLegalNav = location.state?.fromLegalNav === true;
  const { slide, exitBgSrc } = usePageSlideTransition(LEGAL_ENTER_TOTAL, {
    ownBg: heroBg,
    staticBgTargets: LEGAL_STATIC_BG_TARGETS,
    skipEnter: fromLegalNav,
  });

  // SEO / onglet navigateur : titre de page dédié.
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return (
    <main className="relative w-full overflow-x-clip text-white" style={PHOTO_BG_STYLE}>
      <style>{PAGE_SLIDE_CSS}</style>
      {/* Crossfade vers le fond de la destination pendant la sortie : se pose
          derrière les blocs (qui glissent hors écran par-dessus) et atterrit
          à pleine opacité pile pour le montage réel de la page cible, qui
          utilise nativement cette même image. */}
      {exitBgSrc && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `${exitBgSrc === categoryBg ? PHOTO_OVERLAY_BOAT : PHOTO_OVERLAY_STATIC_PAGE}, url(${exitBgSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            animation: `pageBgFadeIn ${LEGAL_ENTER_TOTAL}ms ease forwards`,
          }}
        />
      )}
      {/* Titre, directement sur la photo comme les hero contact/à propos */}
      <section className="relative flex min-h-[32vh] w-full flex-col items-center justify-center px-4 pt-[96px]">
        <div className="text-center" style={slide(0, 'left')}>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-white/70">
            {t('legalLayout.updatedLabel', { date: updated })}
          </p>
        </div>
      </section>

      {/* Encadré glassmorphism : onglets + avertissement + document */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
        <div
          className="rounded-2xl border border-white/20 bg-white/5 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-[5px] sm:p-8"
          style={slide(1, 'right')}
        >
          {/* Navigation entre documents légaux, toujours sur une seule ligne */}
          <nav
            aria-label={t('legalLayout.navAria')}
            className="-mx-1 w-full overflow-x-auto px-1 pb-1"
          >
            <ul className="flex w-max min-w-full flex-nowrap justify-center gap-2">
              {TABS.map(({ to, labelKey }) => (
                <li key={to} className="shrink-0">
                  <NavLink
                    to={to}
                    state={{ fromLegalNav: true }}
                    className={({ isActive }) =>
                      `inline-block whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${FOCUS_LIGHT} ${
                        isActive
                          ? 'bg-[#0A3172] text-white shadow'
                          : 'border border-white/30 text-white/75 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {t(labelKey)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-6 rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-100">
            {t('legalLayout.disclaimer')}
          </p>
          {children}
        </div>
      </div>
    </main>
  );
}

// Section numérotée d'un document légal (h2 + paragraphes).
export function LegalSection({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-white/70">{children}</div>
    </section>
  );
}

export default LegalLayout;
