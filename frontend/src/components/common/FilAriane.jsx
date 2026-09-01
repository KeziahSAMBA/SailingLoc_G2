import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCategoryNavigate, useHomeNavigate } from '../../hooks/useCategoryTransition.js';

function Breadcrumb({ light = false, compact = false, items = null }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const goHome = useHomeNavigate();
  const goToCategory = useCategoryNavigate();
  const segments = pathname.split('/').filter(Boolean);
  const pathLabels = { categorie: t('breadcrumb.categorie') };

  // Par défaut le fil se construit sur les segments de l'URL ; `items` permet
  // aux pages dont les segments ne sont pas parlants (ex. /product/:id) de
  // fournir leurs propres étapes [{ label, to }] après « Accueil ».
  const crumbs =
    items ??
    segments.map((seg, i) => ({
      label: pathLabels[seg] ?? seg,
      to: '/' + segments.slice(0, i + 1).join('/'),
    }));

  return (
    <nav
      className={`inline-flex items-center gap-1.5 py-3 px-3 rounded-full text-xs font-semibold border sm:py-0.5 sm:px-2 ${compact ? 'text-[#0A527A]' : light ? 'text-white' : 'text-black'}`}
      style={{
        backgroundColor: compact ? 'transparent' : 'rgba(255,255,255,0.1)',
        borderColor: compact ? 'transparent' : 'rgba(255,255,255,0.3)',
        backdropFilter: compact ? 'none' : 'blur(40px)',
        WebkitBackdropFilter: compact ? 'none' : 'blur(40px)',
      }}
    >
      <Link
        to="/"
        onClick={(e) => {
          // Laisse le navigateur gérer les ouvertures en nouvel onglet
          // (ctrl/cmd/shift/clic molette) sans intercepter le lien.
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          goHome();
        }}
        className={
          light ? 'hover:text-white/70 transition-colors' : 'hover:text-sky-700 transition-colors'
        }
      >
        {t('breadcrumb.home')}
      </Link>
      {crumbs.map(({ label, to }, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={to ?? label} className="flex items-center gap-2">
            <span
              className={compact ? 'text-[#0A527A]/60' : light ? 'text-white/60' : 'text-gray-900'}
            >
              /
            </span>
            {isLast ? (
              to === '/categorie' ? (
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="border-0 bg-transparent p-0 font-semibold underline underline-offset-2 cursor-pointer"
                  style={{ color: compact ? '#0A3172' : 'rgba(14,165,233,0.95)' }}
                >
                  {label}
                </button>
              ) : (
                <span
                  className="font-semibold underline underline-offset-2"
                  style={{ color: compact ? '#0A3172' : 'rgba(14,165,233,0.95)' }}
                >
                  {label}
                </span>
              )
            ) : (
              <Link
                to={to}
                onClick={(e) => {
                  // Même interception que le lien Accueil : les liens vers
                  // /categorie jouent la transition de page.
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  if (!to.startsWith('/categorie')) return;
                  e.preventDefault();
                  goToCategory(to);
                }}
                className="hover:text-sky-700 transition-colors"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
