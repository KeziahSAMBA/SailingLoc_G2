import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../hooks/useToast.jsx';
import { listContactRequests, setContactRequestStatus } from '../../services/adminService.js';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';

const PAGE_SIZE = 10;

const STATUS = {
  new: { label: 'Nouvelle', cls: 'bg-amber-500/15 text-amber-300' },
  processed: { label: 'Traitée', cls: 'bg-emerald-500/15 text-emerald-300' },
};

const FILTERS = [
  ['new', 'Nouvelles'],
  ['', 'Toutes'],
  ['processed', 'Traitées'],
];

const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

// Demandes envoyées via le formulaire public de la page Contact : l'admin les
// consulte et les marque traitées (ou à retraiter).
function AdminContactPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');
  const [busyId, setBusyId] = useState(null);

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Demandes contact — Admin SailingLoc';
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listContactRequests(filter ? { status: filter } : {});
      setRequests(res.data.requests);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de chargement.', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const { page, setPage, pageItems: pageRequests } = usePagination(requests, PAGE_SIZE, filter);

  async function toggleStatus(request) {
    const next = request.status === 'processed' ? 'new' : 'processed';
    setBusyId(request.id_request);
    try {
      const res = await setContactRequestStatus(request.id_request, next);
      setRequests((prev) =>
        prev.map((r) => (r.id_request === request.id_request ? res.data.request : r))
      );
      showToast(next === 'processed' ? 'Demande marquée traitée.' : 'Demande rouverte.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec de l’opération.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="contact-requests-title">
      <header className="mb-6">
        <h1 id="contact-requests-title" className="text-2xl font-bold text-white">
          Demandes contact
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Messages envoyés depuis le formulaire de la page Contact.
        </p>
      </header>

      {/* Filtres par statut */}
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {FILTERS.map(([key, label]) => {
          const active = filter === key;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                active
                  ? 'bg-sky-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-white/80">Chargement…</p>
      ) : requests.length === 0 ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-white/70">
          Aucune demande pour ce filtre.
        </p>
      ) : (
        <ul className="space-y-4">
          {pageRequests.map((r) => {
            const meta = STATUS[r.status] || {
              label: r.status,
              cls: 'bg-slate-500/15 text-white/80',
            };
            return (
              <li
                key={r.id_request}
                className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-white">{r.subject}</h2>
                    <p className="mt-0.5 text-sm text-white/70">
                      {r.name} ·{' '}
                      <a
                        href={`mailto:${r.email}`}
                        className={`text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
                      >
                        {r.email}
                      </a>{' '}
                      · <time dateTime={r.created_at}>{DATE.format(new Date(r.created_at))}</time>
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white/10 px-4 py-3 text-sm text-white/90">
                  {r.message}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={busyId === r.id_request}
                    onClick={() => toggleStatus(r)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${
                      r.status === 'processed'
                        ? 'border border-white/30 text-white/80 hover:bg-white/10 hover:text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    {r.status === 'processed' ? 'Rouvrir la demande' : '✔ Marquer traitée'}
                  </button>
                  {r.processed_at && (
                    <span className="text-xs text-white/60">
                      Traitée le {DATE.format(new Date(r.processed_at))}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={requests.length}
        onChange={setPage}
        label="Demandes"
        className="mt-4"
      />
    </section>
  );
}

export default AdminContactPage;
