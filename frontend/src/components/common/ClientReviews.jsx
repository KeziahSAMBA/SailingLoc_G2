import { useState, useEffect, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaStar, FaRegStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import api from '../../services/api.js';
import { nameToAvatarUrl } from '../../utils/avatar.js';
import { fetchBoundedPublicPages } from '../../services/publicPagination.js';
import SafeImage from './SafeImage.jsx';

function getRoleLabels(t) {
  return {
    proprietaire: t('reviews.roleLabels.proprietaire'),
    locataire: t('reviews.roleLabels.locataire'),
  };
}

function getSortOptions(t) {
  return [
    { value: 'recent', label: t('reviews.sort.recent') },
    { value: 'oldest', label: t('reviews.sort.oldest') },
    { value: 'best', label: t('reviews.sort.best') },
    { value: 'critical', label: t('reviews.sort.critical') },
  ];
}

function getRoleFilters(t) {
  return [
    { value: 'all', label: t('reviews.roleFilters.all') },
    { value: 'locataire', label: t('reviews.roleFilters.locataire') },
    { value: 'proprietaire', label: t('reviews.roleFilters.proprietaire') },
  ];
}

// Données statiques côté API : les pages bornées sont agrégées pour conserver
// l'ensemble des avis publics sans demander au serveur une réponse illimitée.
function fetchReviews(boatId) {
  return fetchBoundedPublicPages(
    ({ page, pageSize }) =>
      api.get('/reviews/public', {
        params: {
          ...(boatId == null ? {} : { id_boat: boatId }),
          page,
          pageSize,
        },
      }),
    { getItemId: (review) => review?.id }
  ).then(({ data }) =>
    data.map((review) => ({
      ...review,
      avatar: review.avatar ?? nameToAvatarUrl(review.name),
    }))
  );
}

// Après édition d'un avis : `fetchReviews` refait toujours un appel réseau (pas
// de cache module ici, chaque page cible un `boatId` différent), le remount de
// ClientReviews via sa clé côté page produit suffit donc à rafraîchir la liste.
export function invalidatePublicReviews() {}

const StarRating = memo(function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) =>
        i < Math.round(rating) ? (
          <FaStar key={i} className="text-sky-500" style={{ fontSize: '13px' }} />
        ) : (
          <FaRegStar key={i} className="text-sky-500" style={{ fontSize: '13px' }} />
        )
      )}
    </div>
  );
});

const ReviewCard = memo(function ReviewCard({
  name,
  role,
  rating,
  date,
  text,
  owner_reply: ownerReply,
  avatar,
  created_at,
  light = false,
  onEdit = null,
  onDelete = null,
}) {
  const { t, i18n } = useTranslation();
  const roleLabels = getRoleLabels(t);
  const displayedDate = created_at
    ? new Date(created_at).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : date;
  return (
    <div
      className={`flex min-w-0 flex-col gap-1.5 px-3 py-2 sm:gap-2 sm:px-5 sm:py-3 ${light ? 'rounded-xl border border-glass/15 bg-surface/5' : ''}`}
      style={
        light ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } : undefined
      }
    >
      <div className="flex items-center gap-2">
        <SafeImage
          src={avatar}
          alt={t('accessibility.profileImageAlt', { name })}
          fallbackSrc={nameToAvatarUrl(name)}
          fallback={null}
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          className="h-7 w-7 flex-shrink-0 rounded-full object-cover sm:h-9 sm:w-9"
        />
        <div className="flex flex-col">
          <span
            className={`text-xs font-semibold leading-tight sm:text-sm ${light ? 'text-on-dark' : 'text-gray-800'}`}
          >
            {name}
          </span>
          {role && (
            <span className="text-[11px] font-semibold text-sky-500 sm:text-xs">
              {roleLabels[role] ?? role}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StarRating rating={rating} />
        <span className={`text-[11px] sm:text-xs ${light ? 'text-on-dark/50' : 'text-gray-400'}`}>
          {displayedDate}
        </span>
      </div>
      <p
        className={`break-words text-xs leading-relaxed sm:text-sm ${light ? 'text-on-dark/80' : 'text-gray-600'}`}
      >
        {text}
      </p>
      {ownerReply && (
        <div
          className={`rounded-lg border-l-2 px-3 py-2 ${light ? 'border-sky-400/60 bg-surface/5' : 'border-sky-500/60 bg-sky-50'}`}
        >
          <p className={`text-xs font-semibold ${light ? 'text-sky-300' : 'text-info'}`}>
            {t('boatReviews.ownerReply')}
          </p>
          <p
            className={`mt-0.5 break-words text-sm leading-relaxed ${light ? 'text-on-dark/80' : 'text-gray-600'}`}
          >
            {ownerReply}
          </p>
        </div>
      )}
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-3">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className={`text-xs font-semibold transition hover:underline ${light ? 'text-sky-300 hover:text-sky-200' : 'text-info hover:text-sky-700'}`}
            >
              {t('boatReviews.edit')}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className={`text-xs font-semibold transition hover:underline ${light ? 'text-red-300 hover:text-red-200' : 'text-red-600 hover:text-red-700'}`}
            >
              {t('boatReviews.delete')}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

function sortReviews(reviews, sort) {
  const sorted = [...reviews];
  if (sort === 'recent')
    return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sort === 'oldest')
    return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (sort === 'best') return sorted.sort((a, b) => b.rating - a.rating);
  if (sort === 'critical') return sorted.sort((a, b) => a.rating - b.rating);
  return sorted;
}

const PAGE_SIZE = 3;

// Mêmes surfaces "verre" que les blocs des pages catégorie/produit sur fond photo.
const GLASS_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderColor: 'rgba(255,255,255,0.2)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

export default function ClientReviews({
  id,
  className = 'py-8',
  style,
  light = false,
  wide = false,
  boatId = null,
  commentsOnly = false,
  currentUserId = null,
  onEditReview = null,
  onDeleteReview = null,
  children,
}) {
  const { t } = useTranslation();
  const sortOptions = getSortOptions(t);
  const roleFilters = getRoleFilters(t);
  const [reviews, setReviews] = useState([]);
  const [sort, setSort] = useState('recent');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadReviews = () => {
      fetchReviews(boatId)
        .then((data) => {
          if (!cancelled) {
            setReviews(commentsOnly ? data.filter((review) => review.text?.trim()) : data);
          }
        })
        .catch((err) => {
          if (!cancelled) console.error(err);
        });
    };
    loadReviews();
    window.addEventListener('focus', loadReviews);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadReviews);
    };
  }, [boatId, commentsOnly]);

  // Page produit (boatId fourni) : uniquement les avis locataire liés à ce
  // bateau précis — les filtres de rôle habituels (Tous/Locataires/
  // Propriétaires) n'ont plus lieu d'être, un seul rôle est jamais affiché.
  const filtered = useMemo(() => {
    if (boatId != null) return reviews.filter((r) => r.role === 'locataire' && r.boatId === boatId);
    return roleFilter === 'all' ? reviews : reviews.filter((r) => r.role === roleFilter);
  }, [reviews, roleFilter, boatId]);
  const sorted = useMemo(() => sortReviews(filtered, sort), [filtered, sort]);
  // Mode boatId : une seule rangée de 3 (grille grid-cols-3 ci-dessous) plutôt
  // que les 2 rangées de 3 du mode standard.
  const pageSize = boatId != null ? 3 : PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = useMemo(
    () => sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize),
    [sorted, currentPage, pageSize]
  );

  function handleSort(value) {
    setSort(value);
    setPage(0);
  }

  function handleRoleFilter(value) {
    setRoleFilter(value);
    setPage(0);
  }

  const sortSelect = (
    <select
      value={sort}
      onChange={(e) => handleSort(e.target.value)}
      className={`text-sm border rounded-full px-3 py-1 cursor-pointer focus:outline-none ${
        light
          ? 'border-glass/30 text-on-dark bg-surface/10 focus:border-sky-400 focus:text-sky-300'
          : 'border-gray-200 text-gray-600 bg-surface focus:border-sky-400 focus:text-sky-500'
      }`}
    >
      {sortOptions.map((opt) => (
        <option key={opt.value} value={opt.value} className="text-gray-900">
          {opt.label}
        </option>
      ))}
    </select>
  );

  const body = (
    <>
      {boatId != null ? (
        // Titre discret (même gabarit que l'en-tête "Embarcations
        // similaires" du Carrousel) plutôt que le gros kicker/h2 centré
        // habituel — cette instance n'affiche que les avis locataire de ce
        // bateau, pas besoin d'un bloc aussi proéminent. Tri juste à côté,
        // sur la même ligne, comme le lien "Voir toute la flotte" du Carrousel.
        <div className="w-full flex flex-wrap items-center gap-4">
          <h2
            className={`font-semibold ${light ? 'text-on-dark drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]' : 'text-gray-900'}`}
            style={{ fontSize: '20px', lineHeight: '22px' }}
          >
            {t('reviews.productTitle')}
          </h2>
          {sortSelect}
        </div>
      ) : (
        <>
          <div className="text-center mb-2">
            <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-4 underline underline-offset-4">
              {t('reviews.kicker')}
            </p>
            <h2
              className={`text-lg font-semibold sm:text-3xl md:text-4xl ${light ? 'text-on-dark drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]' : 'text-gray-900'}`}
            >
              {t('reviews.title')}
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <div className="flex flex-wrap justify-center gap-2">
              {roleFilters.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleRoleFilter(opt.value)}
                  className={`px-3 py-1 rounded-full text-sm font-semibold border transition-all duration-200 ${
                    roleFilter === opt.value
                      ? 'bg-action text-on-dark border-sky-500 shadow-sm'
                      : light
                        ? 'bg-surface/5 text-on-dark border-glass/30 hover:border-sky-400 hover:text-sky-300'
                        : 'bg-surface text-gray-600 border-gray-200 hover:border-sky-400 hover:text-sky-500'
                  }`}
                  style={
                    light && roleFilter !== opt.value
                      ? { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }
                      : undefined
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {sortSelect}
          </div>
        </>
      )}

      {sorted.length === 0 ? (
        <p className={`text-sm py-4 ${light ? 'text-on-dark/70' : 'text-gray-500'}`}>
          {t('reviews.empty')}
        </p>
      ) : (
        <>
          {/* Grille 2×2 — pleine largeur en mode boatId (bloc avis étalé
              jusqu'aux marges de la page plutôt que resserré comme le
              carrousel/avis standard). */}
          <div
            className={`w-full grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 ${boatId != null ? 'lg:grid-cols-3' : 'md:w-3/4 md:grid-cols-3'}`}
          >
            {visible.map((review) => (
              <ReviewCard
                key={review.id ?? `${review.name}_${review.created_at}`}
                light={light}
                onEdit={
                  onEditReview && currentUserId === review.id_user
                    ? () => onEditReview(review.id)
                    : null
                }
                onDelete={
                  onDeleteReview && currentUserId === review.id_user
                    ? () => onDeleteReview(review.id)
                    : null
                }
                {...review}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                light
                  ? 'border-glass/30 bg-surface/10 text-on-dark hover:border-sky-400 hover:text-sky-300'
                  : 'border-gray-200 bg-surface text-gray-600 hover:border-sky-500 hover:text-sky-500 shadow-sm'
              }`}
            >
              <FaChevronLeft size={13} />
            </button>

            <span className={`text-sm font-medium ${light ? 'text-on-dark/80' : 'text-gray-500'}`}>
              {currentPage + 1} / {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                light
                  ? 'border-glass/30 bg-surface/10 text-on-dark hover:border-sky-400 hover:text-sky-300'
                  : 'border-gray-200 bg-surface text-gray-600 hover:border-sky-500 hover:text-sky-500 shadow-sm'
              }`}
            >
              <FaChevronRight size={13} />
            </button>
          </div>
        </>
      )}

      {children}
    </>
  );

  return (
    <section
      id={id}
      className={
        light && !wide
          ? `w-full flex flex-col items-start gap-5 px-4 sm:px-8 lg:pl-16 lg:pr-16 xl:pl-28 xl:pr-24 ${className}`
          : `w-full flex flex-col items-center gap-5 px-4 sm:px-8 lg:px-16 xl:px-28 ${!light ? 'bg-surface' : ''} ${className}`
      }
      style={style}
    >
      {light && !wide ? (
        <div
          className="flex w-full max-w-[919.9px] flex-col items-center gap-5 rounded-2xl border px-3 py-6 sm:px-8 lg:px-10 lg:py-8"
          style={GLASS_STYLE}
        >
          {body}
        </div>
      ) : boatId != null ? (
        // Étalé jusqu'aux marges de la page (px-28 du <section> ci-dessus),
        // pas resserré sur la largeur de la carte de localisation en dessous.
        <div className="w-full flex flex-col items-center gap-5">{body}</div>
      ) : (
        body
      )}
    </section>
  );
}
