import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Breadcrumb({ light = false }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const pathLabels = { categorie: t('breadcrumb.categorie') };

  return (
    <nav
      className={`flex items-center gap-2 py-1 px-4 rounded-full text-xs ${light ? 'text-white' : 'text-black'}`}
    >
      <Link
        to="/"
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
              <span className="font-semibold" style={{ color: 'rgba(14,165,233,0.95)' }}>
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
