import { useState, useEffect } from 'react';
import { FaStar, FaRegStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import api from '../../services/api.js';

function nameToAvatarUrl(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const gender = Math.abs(hash) % 2 === 0 ? 'women' : 'men';
  const index = (Math.abs(hash) % 70) + 1;
  return `https://randomuser.me/api/portraits/${gender}/${index}.jpg`;
}

const ROLE_LABELS = { proprietaire: 'Propriétaire', locataire: 'Locataire' };

function StarRating({ rating }) {
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
}

function ReviewCard({ name, role, rating, date, text }) {
  return (
    <div className="flex flex-col gap-2 py-3 px-5">
      <div className="flex items-center gap-2">
        <img
          src={nameToAvatarUrl(name)}
          alt={name}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex flex-col">
          <span className="text-gray-800 font-semibold text-sm leading-tight">{name}</span>
          {role && (
            <span className="text-sky-500 text-xs font-semibold">{ROLE_LABELS[role] ?? role}</span>
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
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'oldest', label: 'Plus anciens' },
  { value: 'best', label: 'Mieux notés' },
  { value: 'critical', label: 'Plus critiques' },
];

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
const ROLE_FILTERS = [
  { value: 'all', label: 'Tous' },
  { value: 'locataire', label: 'Locataires' },
  { value: 'proprietaire', label: 'Propriétaires' },
];

export default function ClientReviews({ id, className = 'py-8', children }) {
  const [reviews, setReviews] = useState([]);
  const [sort, setSort] = useState('recent');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    api
      .get('/reviews/public')
      .then(({ data }) => setReviews(data))
      .catch(() => {});
  }, []);

  const filtered = roleFilter === 'all' ? reviews : reviews.filter((r) => r.role === roleFilter);
  const sorted = sortReviews(filtered, sort);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visible = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

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
          Avis clients
        </p>
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
          Ce que nos navigateurs disent de nous
        </h2>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Filtre rôle */}
        <div className="flex gap-2">
          {ROLE_FILTERS.map((opt) => (
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

        {/* Filtre tri */}
        <div className="flex flex-wrap gap-2 justify-center">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSort(opt.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition-all duration-200 ${
                sort === opt.value
                  ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-sky-400 hover:text-sky-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grille 2×2 */}
      <div className="w-3/4 grid grid-cols-3 gap-6">
        {visible.map((review, i) => (
          <ReviewCard key={`${review.id ?? review.name}_${i}`} {...review} />
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
