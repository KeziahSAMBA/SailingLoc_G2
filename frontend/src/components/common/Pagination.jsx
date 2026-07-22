const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

// Au-delà de 7 pages, les numéros sont repliés (1 … 4 5 6 … 12) pour que la
// barre tienne sur une ligne en mobile. La fenêtre s'élargit près des bords
// pour qu'une page du milieu reste atteignable en un clic depuis la page 1.
function pageItems(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  let from = current - 1;
  let to = current + 1;
  if (current <= 4) {
    from = 2;
    to = 5;
  } else if (current >= total - 3) {
    from = total - 4;
    to = total - 1;
  }

  const items = [1];
  if (from > 2) items.push('…');
  for (let n = from; n <= to; n += 1) items.push(n);
  if (to < total - 1) items.push('…');
  items.push(total);
  return items;
}

/**
 * Pagination réutilisable : décompte à gauche, contrôles à droite.
 * `page` est la page courante (1-indexée), `total` le nombre d'éléments filtrés.
 */
function Pagination({ page, pageSize, total, onChange, label = 'Éléments', className = '' }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={`Pagination — ${label.toLowerCase()}`}
      className={`flex flex-wrap items-center justify-between gap-3 ${className}`}
    >
      <p className="text-xs text-white/60" aria-live="polite">
        {label} {first} à {last} sur {total}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={`rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_RING}`}
        >
          Précédent
        </button>
        {pageItems(page, pageCount).map((item, i) =>
          item === '…' ? (
            <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-sm text-white/40">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Page ${item}`}
              className={`min-w-[2rem] rounded-full px-2.5 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                item === page
                  ? 'bg-sky-500 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === pageCount}
          className={`rounded-full px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${FOCUS_RING}`}
        >
          Suivant
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
