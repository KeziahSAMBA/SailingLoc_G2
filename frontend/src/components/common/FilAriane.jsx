import { useLocation, Link } from 'react-router-dom';

const PATH_LABELS = {
  categorie: 'Catégorie',
};

function Breadcrumb({ light = false }) {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

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
        Accueil
      </Link>
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const label = PATH_LABELS[seg] ?? seg;
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
