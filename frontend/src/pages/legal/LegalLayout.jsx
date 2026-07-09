import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import heroBg from '../../assets/image/paysage/cote_azur.jpg';

// Focus clavier visible sur fond clair — même convention que ContactPage/AboutPage.
const FOCUS_LIGHT =
  'rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2';

// Les quatre documents légaux, navigables entre eux via des onglets.
// Libellés réutilisés du footer (seule la navigation est traduite : le contenu
// juridique fait foi en français uniquement).
const TABS = [
  { to: '/mentions-legales', labelKey: 'footer.infoLinks.legal' },
  { to: '/cgu', labelKey: 'footer.infoLinks.terms' },
  { to: '/cgv', labelKey: 'footer.infoLinks.sales' },
  { to: '/politique-de-confidentialite', labelKey: 'footer.infoLinks.privacy' },
];

// Enveloppe commune des pages légales : hero, onglets, avertissement projet
// fictif, colonne de lecture. Le contenu (sections) est fourni par chaque page.
function LegalLayout({ title, pageTitle, updated, children }) {
  const { t } = useTranslation();

  // SEO / onglet navigateur : titre de page dédié.
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return (
    <main className="w-full bg-white">
      {/* Hero photo + voile sombre, comme les pages contact et à propos */}
      <section className="relative flex min-h-[32vh] w-full flex-col items-center justify-center overflow-hidden px-4 pt-[96px]">
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative text-center">
          <h1 className="text-3xl font-semibold text-white md:text-4xl">{title}</h1>
          <p className="mt-3 text-sm text-gray-300">Dernière mise à jour : {updated}</p>
        </div>
      </section>

      {/* Navigation entre documents légaux */}
      <nav aria-label="Documents légaux" className="w-full px-4 pt-8">
        <ul className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-2">
          {TABS.map(({ to, labelKey }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `inline-block rounded-full px-4 py-2 text-xs font-semibold transition ${FOCUS_LIGHT} ${
                    isActive
                      ? 'bg-[#0A3172] text-white shadow'
                      : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                {t(labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Contenu du document */}
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          SailingLoc est un projet pédagogique fictif : aucune location, aucun paiement ni aucun
          engagement contractuel réel n&apos;est possible via ce site. Les présents documents sont
          rédigés à titre d&apos;exercice et ne constituent pas un conseil juridique.
        </p>
        {children}
      </div>
    </main>
  );
}

// Section numérotée d'un document légal (h2 + paragraphes).
export function LegalSection({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  );
}

export default LegalLayout;
