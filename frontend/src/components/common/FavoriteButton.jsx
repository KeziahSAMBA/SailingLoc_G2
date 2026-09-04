import { memo } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa6';

const FavoriteButton = memo(function FavoriteButton({
  isFavorite,
  onToggle,
  size = 22,
  className = '',
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`p-1.5 transition-transform hover:scale-110 ${className}`}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      {isFavorite ? (
        <FaHeart size={size} className="text-red-500" />
      ) : (
        <span className="relative block" style={{ width: size, height: size }}>
          <FaHeart size={size} className="absolute inset-0 text-on-dark/40" />
          <FaRegHeart size={size} className="absolute inset-0 text-on-light/30" />
        </span>
      )}
    </button>
  );
});

export default FavoriteButton;
