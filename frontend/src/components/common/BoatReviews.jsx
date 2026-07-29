import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import {
  getBoatReviews,
  getReviewEligibility,
  createBookingReview,
  updateReview,
} from '../../services/reviewService.js';
import { useToast } from '../../hooks/useToast.jsx';
import { nameToAvatarUrl } from '../../utils/avatar.js';
import { formatDate } from '../../utils/formatDate.js';
import { filterAndSortReviews } from '../../utils/reviewSort.js';
import ReviewFilterBar from './ReviewFilterBar.jsx';
import ReviewPagination from './ReviewPagination.jsx';

const DATE_OPTS = { day: 'numeric', month: 'long', year: 'numeric' };
const PAGE_SIZE = 5;

const GLASS_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderColor: 'rgba(255,255,255,0.2)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }, (_, i) =>
        i < Math.round(rating) ? (
          <FaStar key={i} className="text-sky-400" style={{ fontSize: '13px' }} aria-hidden />
        ) : (
          <FaRegStar key={i} className="text-sky-400" style={{ fontSize: '13px' }} aria-hidden />
        )
      )}
    </div>
  );
}

// Sélecteur d'étoiles accessible (radiogroup).
function StarInput({ value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={String(n)}
          onClick={() => onChange(n)}
          className={`rounded text-2xl text-[#5AB4EC] transition hover:scale-110 ${FOCUS_RING}`}
        >
          {n <= value ? <FaStar aria-hidden /> : <FaRegStar aria-hidden />}
        </button>
      ))}
    </div>
  );
}

// Formulaire d'avis affiché sur la publication : dépôt (locataire éligible) ou
// édition de son propre avis (mode `review`).
function ReviewForm({ idBooking, review, onDone, onCancel }) {
  const editing = Boolean(review);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [rating, setRating] = useState(review?.rating || 0);
  const [comment, setComment] = useState(review?.comment || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fieldId = `boat-review-comment-${review?.id_review ?? 'new'}`;

  async function submit(e) {
    e.preventDefault();
    if (rating < 1) {
      setError(t('locataireReservations.reviewModal.ratingRequired'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await updateReview(review.id_review, { rating, comment: comment.trim() || undefined });
        showToast(t('boatReviews.editSaved'), 'success');
      } else {
        await createBookingReview(idBooking, { rating, comment: comment.trim() || undefined });
        showToast(t('locataireReservations.reviewModal.sent'), 'success');
        // Plusieurs avis autorisés : on réinitialise pour un éventuel suivant.
        setRating(0);
        setComment('');
      }
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || t('locataireReservations.reviewModal.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">
        {editing ? t('boatReviews.editTitle') : t('boatReviews.formTitle')}
      </p>
      <span className="mb-1 mt-3 block text-xs font-medium text-white/70">
        {t('locataireReservations.reviewModal.ratingLabel')}
      </span>
      <StarInput
        value={rating}
        onChange={(n) => {
          setRating(n);
          setError('');
        }}
        label={t('locataireReservations.reviewModal.ratingLabel')}
      />
      <label htmlFor={fieldId} className="mb-1 mt-3 block text-xs font-medium text-white/70">
        {t('locataireReservations.reviewModal.commentLabel')}
      </label>
      <textarea
        id={fieldId}
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        placeholder={t('locataireReservations.reviewModal.commentPlaceholder')}
        className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#5AB4EC]"
      />
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-3">
        {editing && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`rounded-full border border-white/40 px-4 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50 ${FOCUS_RING}`}
          >
            {t('boatReviews.cancel')}
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className={`shrink-0 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
        >
          {busy
            ? t('proprietaireReviews.sending')
            : editing
              ? t('boatReviews.saveEdit')
              : t('locataireReservations.reviewModal.submit')}
        </button>
      </div>
    </form>
  );
}

// Avis validés d'un bateau, avec la réponse éventuelle du propriétaire, et le
// formulaire de dépôt pour le locataire éligible. La section n'apparaît que s'il
// y a des avis ou si l'utilisateur peut en laisser un.
export default function BoatReviews({ idBoat, user, id, className = 'py-10' }) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [eligibleBooking, setEligibleBooking] = useState(null);
  const [sort, setSort] = useState('recent');
  const [rating, setRating] = useState('all');
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState(null);

  // Un changement de tri/filtre ramène à la première page.
  useEffect(() => {
    setPage(0);
  }, [sort, rating]);

  const loadReviews = useCallback(() => {
    if (idBoat == null) return Promise.resolve();
    return getBoatReviews(idBoat)
      .then(({ data }) => setReviews(data.reviews || []))
      .catch(() => {});
  }, [idBoat]);

  useEffect(() => {
    let cancelled = false;
    loadReviews().finally(() => {
      if (!cancelled) setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadReviews]);

  // Éligibilité réservée au locataire connecté.
  useEffect(() => {
    if (idBoat == null || user?.role !== 'locataire') {
      setEligibleBooking(null);
      return undefined;
    }
    let cancelled = false;
    getReviewEligibility(idBoat)
      .then(({ data }) => {
        if (!cancelled) setEligibleBooking(data.can_review ? data.id_booking : null);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancelled = true;
    };
  }, [idBoat, user]);

  const canReview = eligibleBooking != null;
  const visible = filterAndSortReviews(reviews, { sort, rating });
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = visible.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  if (!loaded) return null;
  if (reviews.length === 0 && !canReview) return null;

  return (
    <section id={id} className={`flex w-full flex-col items-start pl-28 pr-24 ${className}`}>
      <div
        className="flex w-full max-w-[919.9px] flex-col gap-5 rounded-2xl border px-10 py-8"
        style={GLASS_STYLE}
      >
        <h2 className="text-2xl font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
          {t('boatReviews.title')}
        </h2>

        {canReview && (
          // L'avis (en attente) s'affiche aussitôt via loadReviews, sans badge.
          <ReviewForm idBooking={eligibleBooking} onDone={loadReviews} />
        )}

        {reviews.length > 1 && (
          <ReviewFilterBar
            sort={sort}
            onSortChange={setSort}
            rating={rating}
            onRatingChange={setRating}
          />
        )}

        {reviews.length > 0 && visible.length === 0 && (
          <p className="text-sm text-white/60">{t('reviewFilters.noMatch')}</p>
        )}

        {visible.length > 0 && (
          <ul className="flex flex-col gap-4">
            {pageItems.map((r) =>
              editingId === r.id_review ? (
                <li key={r.id_review}>
                  <ReviewForm
                    review={r}
                    onDone={() => {
                      setEditingId(null);
                      loadReviews();
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </li>
              ) : (
                <li key={r.id_review} className="rounded-xl border border-white/15 bg-white/5 p-4">
                  <div className="flex items-center gap-2">
                    <img
                      src={r.avatar || nameToAvatarUrl(r.author)}
                      alt={r.author}
                      width={36}
                      height={36}
                      loading="lazy"
                      decoding="async"
                      className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="flex items-center gap-1 text-sm font-semibold leading-tight text-white">
                        {r.author}
                        {r.status === 'validated' && (
                          <MdVerified
                            className="text-sky-400"
                            title={t('boatReviews.verified')}
                            aria-label={t('boatReviews.verified')}
                          />
                        )}
                      </span>
                      <span className="text-xs text-white/50">
                        {formatDate(r.created_at, DATE_OPTS)}
                      </span>
                    </div>
                    <div className="ml-auto">
                      <Stars rating={r.rating} />
                    </div>
                  </div>

                  {r.comment && (
                    <p className="mt-2 text-sm leading-relaxed text-white/80">{r.comment}</p>
                  )}

                  {r.owner_reply && (
                    <div className="mt-3 rounded-lg border-l-2 border-sky-400/60 bg-white/5 px-3 py-2">
                      <p className="text-xs font-semibold text-sky-300">
                        {t('boatReviews.ownerReply')}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-white/80">
                        {r.owner_reply}
                      </p>
                    </div>
                  )}

                  {user?.id_user === r.id_user && (
                    <button
                      type="button"
                      onClick={() => setEditingId(r.id_review)}
                      className={`mt-3 text-xs font-semibold text-sky-300 transition hover:text-sky-200 hover:underline ${FOCUS_RING}`}
                    >
                      {t('boatReviews.edit')}
                    </button>
                  )}
                </li>
              )
            )}
          </ul>
        )}

        {visible.length > 0 && (
          <ReviewPagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        )}
      </div>
    </section>
  );
}
