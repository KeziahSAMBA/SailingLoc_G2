import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../hooks/useToast.jsx';
import { listReviews, updateReview, deleteReview } from '../../services/adminService.js';
import { IconBtn, CheckIcon, XIcon, EditIcon, TrashIcon } from './AdminActions.jsx';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';

const PAGE_SIZE = 10;

const STATUS = {
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-300' },
  validated: { label: 'Validé', cls: 'bg-emerald-500/15 text-emerald-300' },
  refused: { label: 'Refusé', cls: 'bg-red-500/15 text-red-300' },
};
const FILTERS = [
  ['', 'Tous'],
  ['pending', 'En attente'],
  ['validated', 'Validés'],
  ['refused', 'Refusés'],
];

const selectClass =
  'rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#5AB4EC]';
const inputClass =
  'w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#5AB4EC]';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function Stars({ rating }) {
  return (
    <span className="whitespace-nowrap text-amber-300" title={`${rating}/5`}>
      {'★'.repeat(rating)}
      <span className="text-white/50">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function EditReviewModal({ review, onClose, onSaved }) {
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
      showToast('Avis modifié.', 'success');
      onSaved(res.data.review);
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la modification.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Modifier l&apos;avis</h2>
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        <form onSubmit={submit} noValidate className="mt-4 space-y-3">
          <div>
            <label htmlFor="rating" className="mb-1 block text-xs font-medium text-white/70">
              Note
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
            <label htmlFor="comment" className="mb-1 block text-xs font-medium text-white/70">
              Commentaire
            </label>
            <textarea
              id="comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500/90 disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminCommentsPage() {
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
      showToast(err.response?.data?.message || 'Erreur de chargement.', 'error');
    } finally {
      setLoading(false);
    }
  }, [status, search, showToast]);

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
      showToast(newStatus === 'validated' ? 'Avis validé.' : 'Avis refusé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r) {
    if (!window.confirm('Supprimer cet avis ?')) return;
    setBusyId(r.id_review);
    try {
      await deleteReview(r.id_review);
      setReviews((prev) => prev.filter((x) => x.id_review !== r.id_review));
      showToast('Avis supprimé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const pill = (active) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active ? 'bg-sky-500 text-white' : 'border border-white/30 text-white/80 hover:bg-white/10'
    }`;

  return (
    <section>
      <h1 className="text-2xl font-bold text-white">Commentaires</h1>
      <p className="mt-1 text-sm text-white/70">
        Modération des avis : valider, modifier, supprimer.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (auteur, commentaire)…"
          className={`${selectClass} min-w-[220px] flex-1`}
        />
        {FILTERS.map(([v, l]) => (
          <button key={l} type="button" onClick={() => setStatus(v)} className={pill(status === v)}>
            {l}
          </button>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-white/80">Auteur</th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">Bateau</th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">Note</th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">Commentaire</th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">Statut</th>
              <th className="px-4 py-3 text-right font-semibold text-white/80">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                  Chargement…
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                  Aucun avis.
                </td>
              </tr>
            ) : (
              pageReviews.map((r) => (
                <tr key={r.id_review} className="align-top text-white/90">
                  <td className="px-4 py-3 font-medium">
                    {r.author ? `${r.author.first_name} ${r.author.last_name}` : '—'}
                    <div className="text-xs text-white/60">{fmtDate(r.created_at)}</div>
                  </td>
                  <td className="px-4 py-3 text-white/70">{r.boat_name || '—'}</td>
                  <td className="px-4 py-3">
                    <Stars rating={r.rating} />
                  </td>
                  <td className="max-w-xs px-4 py-3 text-white/80">{r.comment || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS[r.status]?.cls || 'bg-slate-500/15 text-white/70'
                      }`}
                    >
                      {STATUS[r.status]?.label || r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <IconBtn
                        title="Valider"
                        variant="success"
                        disabled={busyId === r.id_review || r.status === 'validated'}
                        onClick={() => setReviewStatus(r, 'validated')}
                      >
                        <CheckIcon />
                      </IconBtn>
                      <IconBtn
                        title="Refuser"
                        variant="warn"
                        disabled={busyId === r.id_review || r.status === 'refused'}
                        onClick={() => setReviewStatus(r, 'refused')}
                      >
                        <XIcon />
                      </IconBtn>
                      <IconBtn
                        title="Modifier"
                        disabled={busyId === r.id_review}
                        onClick={() => setEditing(r)}
                      >
                        <EditIcon />
                      </IconBtn>
                      <IconBtn
                        title="Supprimer"
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

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={reviews.length}
        onChange={setPage}
        label="Avis"
        className="mt-4"
      />

      <p className="mt-3 text-xs text-white/60">{reviews.length} avis.</p>

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
