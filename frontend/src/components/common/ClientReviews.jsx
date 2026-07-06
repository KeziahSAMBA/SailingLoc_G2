import { useState, useEffect, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaStar, FaRegStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import api from '../../services/api.js';
import { nameToAvatarUrl } from '../../utils/avatar.js';

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

// Données statiques côté API : un seul fetch pour toute la session,
// partagé entre tous les montages du composant sur les différentes pages.
let reviewsCache = null;
let reviewsPromise = null;

function fetchReviews() {
  if (reviewsCache) return Promise.resolve(reviewsCache);
  if (!reviewsPromise) {
    reviewsPromise = api
      .get('/reviews/public')
      .then(({ data }) => {
        reviewsCache = data.map((r) => ({ ...r, avatar: r.avatar ?? nameToAvatarUrl(r.name) }));
        return reviewsCache;
      })
      .catch((err) => {
        reviewsPromise = null;
        throw err;
      });
  }
  return reviewsPromise;
}

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

const ReviewCard = memo(function ReviewCard({ name, role, rating, date, text, avatar }) {
  const { t } = useTranslation();
  const roleLabels = getRoleLabels(t);
  return (
    <div className="flex flex-col gap-2 py-3 px-5">
      <div className="flex items-center gap-2">
        <img
          src={avatar}
          alt={name}
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex flex-col">
          <span className="text-gray-800 font-semibold text-sm leading-tight">{name}</span>
          {role && (
            <span className="text-sky-500 text-xs font-semibold">{roleLabels[role] ?? role}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StarRating rating={rating} />
        <span className="text-gray-400 text-xs">{date}</span>
      </div>
      <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
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

const PAGE_SIZE = 6;

export default function ClientReviews({ id, className = 'py-8', children }) {
  const { t } = useTranslation();
  const sortOptions = getSortOptions(t);
  const roleFilters = getRoleFilters(t);
  const [reviews, setReviews] = useState([]);
  const [sort, setSort] = useState('recent');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchReviews()
      .then((data) => {
        if (!cancelled) setReviews(data);
      })
      .catch((err) => {
        if (!cancelled) console.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (roleFilter === 'all' ? reviews : reviews.filter((r) => r.role === roleFilter)),
    [reviews, roleFilter]
  );
  const sorted = useMemo(() => sortReviews(filtered, sort), [filtered, sort]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = useMemo(
    () => sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [sorted, currentPage]
  );

  function handleSort(value) {
    setSort(value);
    setPage(0);
  }

  function handleRoleFilter(value) {
    setRoleFilter(value);
    setPage(0);
  }

  return (
    <section
      id={id}
      className={`w-full bg-white flex flex-col items-center gap-5 px-28 ${className}`}
    >
      <div className="text-center mb-2">
        <p className="text-sm font-semibold tracking-widest text-sky-500 uppercase mb-4 underline underline-offset-4">
          {t('reviews.kicker')}
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">{t('reviews.title')}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          {roleFilters.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRoleFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-sm font-semibold border transition-all duration-200 ${
                roleFilter === opt.value
                  ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-sky-400 hover:text-sky-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => handleSort(e.target.value)}
          className="text-sm border border-gray-200 rounded-full px-3 py-1 text-gray-600 bg-white cursor-pointer focus:outline-none focus:border-sky-400 focus:text-sky-500"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grille 2×2 */}
      <div className="w-3/4 grid grid-cols-3 gap-6">
        {visible.map((review) => (
          <ReviewCard key={review.id ?? `${review.name}_${review.created_at}`} {...review} />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 bg-white text-gray-600 hover:border-sky-500 hover:text-sky-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
        >
          <FaChevronLeft size={13} />
        </button>

        <span className="text-sm text-gray-500 font-medium">
          {currentPage + 1} / {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage === totalPages - 1}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-gray-200 bg-white text-gray-600 hover:border-sky-500 hover:text-sky-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
        >
          <FaChevronRight size={13} />
        </button>
      </div>

      {children}
    </section>
  );
}
