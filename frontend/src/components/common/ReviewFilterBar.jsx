import { useTranslation } from 'react-i18next';
import { SORT_KEYS, RATING_KEYS } from '../../utils/reviewSort.js';

const SELECT_CLS =
  'cursor-pointer rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm text-white outline-none transition focus:border-sky-400';

// Barre de tri (date/note) et de filtre par note, partagée par la section avis
// de la publication et le tableau « Avis reçus » du propriétaire.
export default function ReviewFilterBar({ sort, onSortChange, rating, onRatingChange }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-xs font-medium text-white/70">
        {t('reviewFilters.sortLabel')}
        <select value={sort} onChange={(e) => onSortChange(e.target.value)} className={SELECT_CLS}>
          {SORT_KEYS.map((key) => (
            <option key={key} value={key} className="text-gray-900">
              {t(`reviews.sort.${key}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs font-medium text-white/70">
        {t('reviewFilters.ratingLabel')}
        <select
          value={rating}
          onChange={(e) => onRatingChange(e.target.value)}
          className={SELECT_CLS}
        >
          {RATING_KEYS.map((key) => (
            <option key={key} value={key} className="text-gray-900">
              {key === 'all'
                ? t('reviewFilters.allRatings')
                : t('reviewFilters.stars', { count: Number(key) })}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
