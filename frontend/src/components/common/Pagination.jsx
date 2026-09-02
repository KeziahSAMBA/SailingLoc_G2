import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0';

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

// Variante compacte : trois pages contiguës au maximum, avec une ellipse de
// chaque côté lorsqu'une partie de la pagination est masquée.
function compactPageItems(current, total) {
  if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1);

  const from = Math.max(1, Math.min(current - 1, total - 2));
  const to = Math.min(total, from + 2);
  const items = [];
  if (from > 1) items.push('…');
  for (let n = from; n <= to; n += 1) items.push(n);
  if (to < total) items.push('…');
  return items;
}

/**
 * Pagination réutilisable : décompte à gauche, contrôles à droite.
 * `page` est la page courante (1-indexée), `total` le nombre d'éléments filtrés.
 */
function Pagination({
  page,
  pageSize,
  total,
  onChange,
  label = 'Éléments',
  className = '',
  compactWindow,
}) {
  const { t } = useTranslation();
  const outletContext = useOutletContext();
  const isCompactWindow = compactWindow ?? outletContext?.compactPagination ?? false;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const items = isCompactWindow ? compactPageItems(page, pageCount) : pageItems(page, pageCount);
  const navLayout = isCompactWindow
    ? 'flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3'
    : 'flex flex-wrap items-center justify-between gap-3';
  const controlsLayout = isCompactWindow
    ? 'flex w-full flex-nowrap items-center justify-center gap-0.5 sm:w-auto sm:gap-1'
    : 'flex flex-wrap items-center gap-1';
  const directionSize = isCompactWindow
    ? 'shrink-0 px-1.5 py-1.5 text-xs min-[375px]:px-2 min-[375px]:text-sm sm:px-3'
    : 'px-3 py-1.5 text-sm';
  const pageSizeClass = isCompactWindow
    ? 'min-w-[1.75rem] shrink-0 px-1 py-1.5 text-xs min-[375px]:min-w-[2rem] min-[375px]:px-2 min-[375px]:text-sm'
    : 'min-w-[2rem] px-2.5 py-1.5 text-sm';

  return (
    <nav
      aria-label={t('pagination.aria', { label: label.toLocaleLowerCase() })}
      className={`${navLayout} ${className}`}
    >
      <p
        className={`text-xs text-on-dark/60 ${isCompactWindow ? 'text-center sm:text-left' : ''}`}
        aria-live="polite"
      >
        {t('pagination.range', { label, first, last, total })}
      </p>
      <div className={controlsLayout}>
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={`rounded-full font-medium text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${directionSize} ${FOCUS_RING}`}
        >
          {t('pagination.previous')}
        </button>
        {items.map((item, i) =>
          item === '…' ? (
            <span
              key={`gap-${i}`}
              aria-hidden="true"
              className={`text-on-dark/40 ${
                isCompactWindow
                  ? 'shrink-0 px-0.5 text-xs min-[375px]:px-1 min-[375px]:text-sm'
                  : 'px-1 text-sm'
              }`}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item)}
              aria-current={item === page ? 'page' : undefined}
              aria-label={t('pagination.page', { n: item })}
              className={`rounded-full font-medium transition ${pageSizeClass} ${FOCUS_RING} ${
                item === page
                  ? 'bg-action text-on-dark'
                  : 'text-on-dark/80 hover:bg-surface/10 hover:text-on-dark'
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
          className={`rounded-full font-medium text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${directionSize} ${FOCUS_RING}`}
        >
          {t('pagination.next')}
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
