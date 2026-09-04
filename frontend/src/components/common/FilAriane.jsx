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

  const linkHoverClass =
    light || compact ? 'hover:text-photo-action-hover' : 'hover:text-surface-link-hover';
  const separatorClass = compact
    ? 'text-photo-compact-link/60'
    : light
      ? 'text-on-dark/60'
      : 'text-content';
  const finalCrumbStyle = {
    color: compact
      ? 'rgb(var(--sl-photo-compact-link))'
      : light
        ? 'rgb(var(--sl-photo-link) / 0.95)'
        : 'rgb(var(--sl-surface-link))',
  };

  return (
    <nav
      className={`inline-flex items-center gap-1.5 py-3 px-3 rounded-full text-xs font-semibold border sm:py-0.5 sm:px-2 ${compact ? 'text-photo-compact-link' : light ? 'text-on-dark' : 'text-on-light'}`}
      style={{
        backgroundColor: compact ? 'transparent' : 'rgb(var(--sl-glass) / 0.1)',
        borderColor: compact ? 'transparent' : 'rgb(var(--sl-glass) / 0.3)',
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
        className={`${linkHoverClass} transition-colors`}
      >
        {t('breadcrumb.home')}
      </Link>
      {crumbs.map(({ label, to }, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={to ?? label} className="flex items-center gap-2">
            <span className={separatorClass}>/</span>
            {isLast ? (
              to === '/categorie' ? (
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="border-0 bg-transparent p-0 font-semibold underline underline-offset-2 cursor-pointer"
                  style={finalCrumbStyle}
                >
                  {label}
                </button>
              ) : (
                <span
                  className="font-semibold underline underline-offset-2"
                  style={finalCrumbStyle}
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
                className={`${linkHoverClass} transition-colors`}
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
