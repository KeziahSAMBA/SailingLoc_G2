import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { getProprietaireReviews, replyToReview } from '../../services/reviewService.js';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';
import ReviewFilterBar from '../common/ReviewFilterBar.jsx';
import ReviewPagination from '../common/ReviewPagination.jsx';
import { formatDate } from '../../utils/formatDate.js';
import { filterAndSortReviews } from '../../utils/reviewSort.js';

const DATE_OPTS = { day: 'numeric', month: 'short', year: 'numeric' };
const PAGE_SIZE = 5;

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

const STATUS_CLS = {
  validated: 'bg-emerald-500/15 text-emerald-300',
  pending: 'bg-amber-500/15 text-amber-300',
};

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

function ReviewCard({ review, onReplied }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.owner_reply || '');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    setBusy(true);
    try {
      const { data } = await replyToReview(review.id_review, clean);
      onReplied(review.id_review, data.review);
      setEditing(false);
      showToast(t('proprietaireReviews.replySent'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('proprietaireReviews.replyError'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="min-w-0 break-words text-sm font-bold text-white">{review.boat?.name}</h3>
        <span className="text-xs text-white/50">·</span>
        <span className="min-w-0 break-words text-xs text-white/70">{review.author}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            STATUS_CLS[review.status] || 'bg-slate-500/15 text-white/70'
          }`}
        >
          {t(`proprietaireReviews.status.${review.status}`, { defaultValue: review.status })}
        </span>
        <div className="mt-1 flex w-full items-center justify-between gap-2 sm:ml-auto sm:mt-0 sm:w-auto sm:justify-start">
          <Stars rating={review.rating} />
          <span className="text-xs text-white/50">{formatDate(review.created_at, DATE_OPTS)}</span>
        </div>
      </div>

      {review.comment && (
        <p className="mt-2 break-words text-sm leading-relaxed text-white/80">{review.comment}</p>
      )}

      {/* Réponse existante ou éditeur de réponse. */}
      {review.owner_reply && !editing ? (
        <div className="mt-3 rounded-lg border-l-2 border-sky-400/60 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-sky-300">
              {t('proprietaireReviews.yourReply')}
            </p>
            <button
              type="button"
              onClick={() => {
                setText(review.owner_reply);
                setEditing(true);
              }}
              className={`ml-auto text-xs font-semibold text-white/70 hover:text-white hover:underline ${FOCUS_RING}`}
            >
              {t('proprietaireReviews.edit')}
            </button>
          </div>
          <p className="mt-0.5 break-words text-sm leading-relaxed text-white/80">
            {review.owner_reply}
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3">
          <label
            htmlFor={`reply-${review.id_review}`}
            className="mb-1 block text-xs font-medium text-white/70"
          >
            {t('proprietaireReviews.replyLabel')}
          </label>
          <textarea
            id={`reply-${review.id_review}`}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder={t('proprietaireReviews.replyPlaceholder')}
            className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#5AB4EC]"
          />
          <div className="mt-2 flex justify-end gap-2">
            {editing && (
              <button
                type="button"
                disabled={busy}
                onClick={() => setEditing(false)}
                className={`rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50 ${FOCUS_RING}`}
              >
                {t('proprietaireReviews.cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className={`rounded-full bg-sky-500 px-4 py-1 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              {busy ? t('proprietaireReviews.sending') : t('proprietaireReviews.reply')}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}

function ProprietaireReviews() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('recent');
  const [rating, setRating] = useState('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    document.title = t('proprietaireReviews.pageTitle');
  }, [t]);

  // Un changement de tri/filtre ramène à la première page.
  useEffect(() => {
    setPage(0);
  }, [sort, rating]);

  useEffect(() => {
    getProprietaireReviews()
      .then((res) => setReviews(res.data.reviews || []))
      .catch((err) => setError(err.response?.data?.message || t('proprietaireReviews.loadError')))
      .finally(() => setLoading(false));
  }, []);

  function handleReplied(idReview, updated) {
    setReviews((prev) =>
      prev.map((r) =>
        r.id_review === idReview
          ? { ...r, owner_reply: updated.owner_reply, owner_reply_at: updated.owner_reply_at }
          : r
      )
    );
  }

  const filtered = filterAndSortReviews(reviews, { sort, rating });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  return (
    <section aria-labelledby="reviews-title">
      <header className="mb-6">
        <h1 id="reviews-title" className="text-2xl font-bold text-white">
          {t('proprietaireReviews.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">{t('proprietaireReviews.subtitle')}</p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div className="mb-5 flex justify-end">
          <ReviewFilterBar
            sort={sort}
            onSortChange={setSort}
            rating={rating}
            onRatingChange={setRating}
          />
        </div>
      )}

      {loading ? (
        <CardSkeleton count={3} height="h-40" />
      ) : reviews.length === 0 ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
          {t('proprietaireReviews.empty')}
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
          {t('proprietaireReviews.emptyFilter')}
        </p>
      ) : (
        <>
          {/* min-w-0 : sans ça un mot très long dans un avis élargit la piste de
              grille au lieu d'être coupé, et la page déborde sur mobile. */}
          <ul className="grid w-full gap-3">
            {pageItems.map((r) => (
              <li key={r.id_review} className="min-w-0">
                <ReviewCard review={r} onReplied={handleReplied} />
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-center">
            <ReviewPagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
    </section>
  );
}

export default ProprietaireReviews;
