const CLS =
  'flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap ' +
  'bg-surface text-brand-text border border-brand-text ' +
  'shadow-[0_2px_8px_rgba(10,49,114,0.3)] ' +
  'hover:bg-action hover:text-action-text hover:shadow-[0_4px_16px_rgba(0,0,0,0.5)] ' +
  'transition-colors duration-200';

export default function GhostButton({ children, href, onClick, className = '' }) {
  const cls = `${CLS} ${className}`;
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
