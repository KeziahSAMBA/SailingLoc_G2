import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useHomeNavigate } from '../../hooks/useCategoryTransition.js';

function Breadcrumb({ light = false, compact = false }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const goHome = useHomeNavigate();
  const segments = pathname.split('/').filter(Boolean);
  const pathLabels = { categorie: t('breadcrumb.categorie') };

  return (
    <nav
      className={`inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs border ${light ? 'text-white' : 'text-black'}`}
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
          light ? 'hover:text-white/70 transition-colors' : 'hover:text-sky-600 transition-colors'
        }
      >
        {t('breadcrumb.home')}
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const label = pathLabels[seg] ?? seg;
        const isLast = i === segments.length - 1;
        return (
          <span key={path} className="flex items-center gap-2">
            <span className={light ? 'text-white/60' : 'text-gray-900'}>/</span>
            {isLast ? (
              <span
                className="font-semibold"
                style={{ color: compact ? '#0A3172' : 'rgba(14,165,233,0.95)' }}
              >
                {label}
              </span>
            ) : (
              <Link to={path} className="hover:text-sky-600 transition-colors">
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
