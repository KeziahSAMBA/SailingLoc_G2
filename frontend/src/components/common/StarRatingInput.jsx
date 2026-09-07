import { useTranslation } from 'react-i18next';
import { FaStar, FaRegStar } from 'react-icons/fa';

const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-photo-action focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

// Sélecteur de note 1→5 cliquable, partagé par les formulaires d'avis
// (fiche locataire, pop-up « Mes réservations »).
function StarRatingInput({ value, onChange, size = 20 }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={t('renterProfile.reviewForm.ratingValue', { n })}
          aria-pressed={value === n}
          className={`rounded ${FOCUS}`}
        >
          {n <= value ? (
            <FaStar className="text-photo-action" style={{ fontSize: `${size}px` }} />
          ) : (
            <FaRegStar className="text-photo-action/70" style={{ fontSize: `${size}px` }} />
          )}
        </button>
      ))}
    </div>
  );
}

export default StarRatingInput;
