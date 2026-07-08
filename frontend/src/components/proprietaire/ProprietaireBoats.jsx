import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getBoats, deleteBoat } from '../../services/proprietaireService.js';
import { useToast } from '../../hooks/useToast.jsx';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const BOAT_STATUS = {
  draft: { label: 'Brouillon', cls: 'bg-slate-500/15 text-slate-300' },
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-300' },
  published: { label: 'Publié', cls: 'bg-emerald-500/15 text-emerald-300' },
  refused: { label: 'Refusé', cls: 'bg-red-500/15 text-red-300' },
};

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'pending', label: 'En attente' },
  { key: 'published', label: 'Publiés' },
  { key: 'refused', label: 'Refusés' },
];

// Styles de focus clavier communs aux éléments cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function BoatCard({ boat, busy, onDelete }) {
  const meta = BOAT_STATUS[boat.status] || {
    label: boat.status,
    cls: 'bg-slate-500/15 text-slate-300',
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      {boat.image ? (
        <img
          src={boat.image}
          alt={`Bateau ${boat.name}`}
          loading="lazy"
          className="h-36 w-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-36 w-full items-center justify-center bg-slate-800/60 text-sm text-slate-500"
        >
          Pas encore de photo
        </div>
      )}

      <div className="p-4">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">{boat.name}</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {[boat.type, boat.port && `${boat.port.name} · ${boat.port.city}`]
                .filter(Boolean)
                .join(' — ')}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
            {meta.label}
          </span>
        </header>

        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {/* Champs possiblement vides sur un brouillon. */}
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-slate-400">Prix / jour</dt>
            <dd className="font-medium text-slate-100">
              {boat.daily_price != null ? EURO.format(boat.daily_price) : '—'}
            </dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-slate-400">Capacité</dt>
            <dd className="font-medium text-slate-100">
              {boat.capacity != null ? `${boat.capacity} pers.` : '—'}
            </dd>
          </div>
        </dl>

        {boat.pending_bookings > 0 && (
          <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
            {boat.pending_bookings} demande{boat.pending_bookings > 1 ? 's' : ''} de réservation en
            attente
          </p>
        )}

        {boat.status === 'refused' && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
            Annonce retirée par la modération : modifiez-la pour la soumettre à nouveau.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={`/proprietaire/bateaux/${boat.id_boat}/modifier`}
            className={`rounded-full bg-[#0A3172] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0d3d8c] ${FOCUS_RING}`}
          >
            {boat.status === 'draft' ? 'Modifier le brouillon' : 'Modifier'}
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(boat)}
            className={`rounded-full border border-red-500/40 px-4 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
          >
            Supprimer
          </button>
        </div>
      </div>
    </article>
  );
}

function ProprietaireBoats() {
  const [boats, setBoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  // Modal de confirmation de suppression : bateau ciblé + envoi en cours.
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mes bateaux — SailingLoc';
  }, []);

  useEffect(() => {
    getBoats()
      .then((res) => setBoats(res.data.boats || []))
      .catch((err) => setError(err.response?.data?.message || 'Erreur de chargement des bateaux.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? boats : boats.filter((b) => b.status === filter)),
    [boats, filter]
  );

  // Compteur par statut affiché sur les filtres (ex. « Publiés (12) »).
  const counts = useMemo(() => {
    const c = { all: boats.length };
    for (const b of boats) c[b.status] = (c[b.status] || 0) + 1;
    return c;
  }, [boats]);

  // Fermeture de la modal au clavier (Échap), sauf pendant l'envoi.
  useEffect(() => {
    if (!toDelete) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !deleting) setToDelete(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toDelete, deleting]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteBoat(toDelete.id_boat);
      setBoats((prev) => prev.filter((b) => b.id_boat !== toDelete.id_boat));
      showToast(
        toDelete.status === 'draft' ? 'Brouillon supprimé.' : 'Annonce supprimée.',
        'success'
      );
      setToDelete(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Une erreur est survenue.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section aria-labelledby="boats-title">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="boats-title" className="text-2xl font-bold text-white">
            Mes bateaux
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Vos annonces et leur statut : brouillon, en attente de validation, publiée ou refusée.
          </p>
        </div>
        <Link
          to="/proprietaire/bateaux/nouveau"
          className={`shrink-0 rounded-full bg-[#0A3172] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#0d3d8c] ${FOCUS_RING}`}
        >
          + Ajouter un bateau
        </Link>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Filtres par statut */}
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key] || 0;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                active
                  ? 'bg-[#0A3172] text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {f.label}
              {f.key !== 'all' && count > 0 && ` (${count})`}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-slate-300">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-400">
          {boats.length === 0
            ? 'Aucun bateau pour l’instant. Cliquez sur « Ajouter un bateau » pour créer votre première annonce.'
            : 'Aucun bateau pour ce filtre.'}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => (
            <li key={b.id_boat}>
              <BoatCard
                boat={b}
                busy={deleting && toDelete?.id_boat === b.id_boat}
                onDelete={setToDelete}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Modal de confirmation de suppression */}
      {toDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deleting && setToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-boat-title"
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-boat-title" className="text-lg font-semibold text-white">
              {toDelete.status === 'draft' ? 'Supprimer le brouillon' : 'Supprimer l’annonce'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {toDelete.name}
              {toDelete.port && ` — ${toDelete.port.name} · ${toDelete.port.city}`}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              {toDelete.status === 'published'
                ? 'L’annonce ne sera plus visible des locataires. Cette action est définitive.'
                : 'Cette action est définitive.'}
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setToDelete(null)}
                className={`rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
              >
                Retour
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className={`rounded-full bg-red-600/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProprietaireBoats;
