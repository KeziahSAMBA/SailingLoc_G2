import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast.jsx';
import { listReviews, updateReview, deleteReview } from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';
import { IconBtn, CheckIcon, XIcon, EditIcon, TrashIcon } from './AdminActions.jsx';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';
import AdminScrollableFilterRow from './AdminScrollableFilterRow.jsx';

const PAGE_SIZE = 10;

const STATUS_CLS = {
  pending: 'status-indicator status-indicator--warning bg-warning-base/15 text-warning-soft',
  validated: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
  refused: 'status-indicator status-indicator--danger bg-danger-base/15 text-danger-soft',
};
const FILTERS = [
  { value: '', labelKey: 'all' },
  { value: 'pending', labelKey: 'pending' },
  { value: 'validated', labelKey: 'validated' },
  { value: 'refused', labelKey: 'refused' },
];
const DATE_OPTS = { day: '2-digit', month: '2-digit', year: 'numeric' };

const selectClass =
  'rounded-lg border border-glass/30 bg-surface/10 px-3 py-2 text-sm text-on-dark/90 outline-none focus:border-brand';
const inputClass =
  'w-full rounded-lg border border-glass/30 bg-surface/10 px-3 py-2 text-sm text-on-dark placeholder-on-dark/40 outline-none focus:border-brand';

function fmtDate(d) {
  return d ? formatDate(d, DATE_OPTS) : '—';
}

function Stars({ rating }) {
  return (
    <span className="whitespace-nowrap text-warning-soft" title={`${rating}/5`}>
      {'★'.repeat(rating)}
      <span className="text-on-dark/50">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function EditReviewModal({ review, onClose, onSaved }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [comment, setComment] = useState(review.comment || '');
  const [rating, setRating] = useState(review.rating);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await updateReview(review.id_review, { comment, rating: Number(rating) });
      showToast(t('adminComments.editSuccess'), 'success');
      onSaved(res.data.review);
    } catch (err) {
      setError(err.response?.data?.message || t('adminComments.editError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-overlay/60 p-4 sm:items-center"
      onClick={() => !saving && onClose()}
    >
      {/* max-h + scroll interne : sinon le clavier virtuel rogne les boutons sur mobile. */}
      <div
        className="my-auto max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-glass/20 bg-surface/10 p-5 shadow-2xl backdrop-blur-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-on-dark">{t('adminComments.editTitle')}</h2>
        {error && (
          <div className="mt-3 rounded-lg border border-danger-base/40 bg-danger-base/10 px-3 py-2 text-sm text-danger-soft">
            {error}
          </div>
        )}
        <form onSubmit={submit} noValidate className="mt-4 space-y-3">
          <div>
            <label htmlFor="rating" className="mb-1 block text-xs font-medium text-on-dark/70">
              {t('adminComments.ratingLabel')}
            </label>
            <select
              id="rating"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className={`select-glass ${inputClass}`}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} / 5
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="comment" className="mb-1 block text-xs font-medium text-on-dark/70">
              {t('adminComments.commentLabel')}
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full rounded-full border border-glass/30 px-5 py-2 text-sm font-semibold text-on-dark/90 transition hover:bg-surface/10 disabled:opacity-50 sm:w-auto"
            >
              {t('adminComments.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-action px-5 py-2 text-sm font-semibold text-on-dark shadow transition hover:bg-action/90 disabled:opacity-60 sm:w-auto"
            >
              {saving ? t('adminComments.saving') : t('adminComments.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminCommentsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      const res = await listReviews(params);
      setReviews(res.data.reviews);
    } catch (err) {
      showToast(err.response?.data?.message || t('adminComments.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [status, search, showToast, t]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const {
    page,
    setPage,
    pageItems: pageReviews,
  } = usePagination(reviews, PAGE_SIZE, `${status}|${search}`);

  async function setReviewStatus(r, newStatus) {
    setBusyId(r.id_review);
    try {
      const res = await updateReview(r.id_review, { status: newStatus });
      // Si un filtre de statut est actif, l'avis peut quitter la liste.
      if (status && status !== newStatus) {
        setReviews((prev) => prev.filter((x) => x.id_review !== r.id_review));
      } else {
        setReviews((prev) =>
          prev.map((x) => (x.id_review === r.id_review ? { ...x, ...res.data.review } : x))
        );
      }
      showToast(
        newStatus === 'validated'
          ? t('adminComments.validatedToast')
          : t('adminComments.refusedToast'),
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message || t('adminComments.genericError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r) {
    if (!window.confirm(t('adminComments.confirmDelete'))) return;
    setBusyId(r.id_review);
    try {
      await deleteReview(r.id_review);
      setReviews((prev) => prev.filter((x) => x.id_review !== r.id_review));
      showToast(t('adminComments.deleteSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('adminComments.genericError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  const pill = (active) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active
        ? 'bg-action text-on-dark'
        : 'border border-glass/30 text-on-dark/80 hover:bg-surface/10'
    }`;

  return (
    <section>
      <h1 className="text-2xl font-bold text-on-dark">{t('adminComments.title')}</h1>
      <p className="mt-1 text-sm text-on-dark/70">{t('adminComments.subtitle')}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('adminComments.searchPlaceholder')}
          className={`${selectClass} w-full sm:min-w-[13.75rem] sm:flex-1`}
        />
        <AdminScrollableFilterRow
          ariaLabel={t('adminComments.subtitle')}
          contentKey={`${status}|${t('adminComments.subtitle')}`}
          className="w-full sm:w-auto"
        >
          {FILTERS.map(({ value, labelKey }) => (
            <button
              key={labelKey}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className={`${pill(status === value)} shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright`}
            >
              {t(`adminComments.filters.${labelKey}`)}
            </button>
          ))}
        </AdminScrollableFilterRow>
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl xl:block">
        <table className="w-full text-sm">
          <thead className="border-b border-glass/20 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                {t('adminComments.colAuthor')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                {t('adminComments.colBoat')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                {t('adminComments.colRating')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                {t('adminComments.colComment')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                {t('adminComments.colStatus')}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-on-dark/80">
                {t('adminComments.colActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass/15">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-dark/70">
                  {t('adminComments.loading')}
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-on-dark/70">
                  {t('adminComments.empty')}
                </td>
              </tr>
            ) : (
              pageReviews.map((r) => (
                <tr key={r.id_review} className="align-top text-on-dark/90">
                  <td className="px-4 py-3 font-medium">
                    {r.author ? `${r.author.first_name} ${r.author.last_name}` : '—'}
                    <div className="text-xs text-on-dark/60">{fmtDate(r.created_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-on-dark/70">{r.boat_name || '—'}</td>
                  <td className="px-4 py-3">
                    <Stars rating={r.rating} />
                  </td>
                  <td className="max-w-xs px-4 py-3 text-on-dark/80">{r.comment || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS_CLS[r.status] ||
                        'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/70'
                      }`}
                    >
                      {t(`adminComments.status.${r.status}`, { defaultValue: r.status })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <IconBtn
                        title={t('adminComments.actionValidate')}
                        variant="success"
                        disabled={busyId === r.id_review || r.status === 'validated'}
                        onClick={() => setReviewStatus(r, 'validated')}
                      >
                        <CheckIcon />
                      </IconBtn>
                      <IconBtn
                        title={t('adminComments.actionRefuse')}
                        variant="warn"
                        disabled={busyId === r.id_review || r.status === 'refused'}
                        onClick={() => setReviewStatus(r, 'refused')}
                      >
                        <XIcon />
                      </IconBtn>
                      <IconBtn
                        title={t('adminComments.actionEdit')}
                        disabled={busyId === r.id_review}
                        onClick={() => setEditing(r)}
                      >
                        <EditIcon />
                      </IconBtn>
                      <IconBtn
                        title={t('adminComments.actionDelete')}
                        variant="danger"
                        disabled={busyId === r.id_review}
                        onClick={() => remove(r)}
                      >
                        <TrashIcon />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cartes jusqu'au desktop large : le tableau ci-dessus est masqué. */}
      <ul className="mt-5 space-y-3 xl:hidden">
        {loading || reviews.length === 0 ? (
          <li className="rounded-2xl border border-glass/20 bg-surface/10 px-4 py-8 text-center text-sm text-on-dark/70 backdrop-blur-xl">
            {loading ? t('adminComments.loading') : t('adminComments.empty')}
          </li>
        ) : (
          pageReviews.map((r) => (
            <li
              key={r.id_review}
              className="rounded-2xl border border-glass/20 bg-surface/10 p-4 backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 break-words font-medium text-on-dark">
                  {r.author ? `${r.author.first_name} ${r.author.last_name}` : '—'}
                </p>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                    STATUS_CLS[r.status] ||
                    'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/70'
                  }`}
                >
                  {t(`adminComments.status.${r.status}`, { defaultValue: r.status })}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-on-dark/60">{fmtDate(r.created_at)}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Stars rating={r.rating} />
                <span className="text-sm text-on-dark/70">{r.boat_name || '—'}</span>
              </div>

              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-on-dark/80">
                {r.comment || '—'}
              </p>

              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-glass/15 pt-3">
                <IconBtn
                  title={t('adminComments.actionValidate')}
                  variant="success"
                  disabled={busyId === r.id_review || r.status === 'validated'}
                  onClick={() => setReviewStatus(r, 'validated')}
                >
                  <CheckIcon />
                </IconBtn>
                <IconBtn
                  title={t('adminComments.actionRefuse')}
                  variant="warn"
                  disabled={busyId === r.id_review || r.status === 'refused'}
                  onClick={() => setReviewStatus(r, 'refused')}
                >
                  <XIcon />
                </IconBtn>
                <IconBtn
                  title={t('adminComments.actionEdit')}
                  disabled={busyId === r.id_review}
                  onClick={() => setEditing(r)}
                >
                  <EditIcon />
                </IconBtn>
                <IconBtn
                  title={t('adminComments.actionDelete')}
                  variant="danger"
                  disabled={busyId === r.id_review}
                  onClick={() => remove(r)}
                >
                  <TrashIcon />
                </IconBtn>
              </div>
            </li>
          ))
        )}
      </ul>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={reviews.length}
        onChange={setPage}
        label={t('adminComments.paginationLabel')}
        className="mt-4"
      />

      <p className="mt-3 text-xs text-on-dark/60">
        {t('adminComments.count', { count: reviews.length })}
      </p>

      {editing && (
        <EditReviewModal
          review={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setReviews((prev) =>
              prev.map((x) => (x.id_review === updated.id_review ? updated : x))
            );
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

export default AdminCommentsPage;
