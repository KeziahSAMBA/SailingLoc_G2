import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const BTN_CLS =
  'flex h-9 w-9 items-center justify-center rounded-full border border-glass/30 bg-surface/10 text-on-dark transition hover:border-sky-400 hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

// Pagination « précédent / n / total / suivant » pour les listes d'avis.
export default function ReviewPagination({ page, totalPages, onChange }) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label={t('reviewFilters.prevPage')}
        className={BTN_CLS}
      >
        <FaChevronLeft size={13} aria-hidden />
      </button>
      <span className="text-sm font-medium text-on-dark/80">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages - 1}
        aria-label={t('reviewFilters.nextPage')}
        className={BTN_CLS}
      >
        <FaChevronRight size={13} aria-hidden />
      </button>
    </div>
  );
}
