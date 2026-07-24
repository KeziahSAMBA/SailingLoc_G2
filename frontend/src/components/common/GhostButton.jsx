import { Link } from 'react-router-dom';

const CLS =
  'flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap ' +
  'bg-white text-[rgba(14,165,233,0.95)] border border-[rgba(14,165,233,0.95)] ' +
  'shadow-[0_2px_8px_rgba(10,49,114,0.3)] ' +
  'hover:bg-[rgba(14,165,233,0.95)] hover:text-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)] ' +
  'transition-colors duration-200';

export default function GhostButton({ children, href, to, onClick, className = '' }) {
  const cls = `${CLS} ${className}`;
  if (to) {
    return (
      <Link to={to} onClick={onClick} className={cls}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
