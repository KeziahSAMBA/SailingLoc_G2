import { useState, useEffect, useCallback } from 'react';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast.jsx';
import { IconBtn, EyeIcon, EyeOffIcon, CheckIcon, XIcon } from './AdminActions.jsx';
import {
  listBoats,
  setBoatPublished,
  listReports,
  setReportStatus,
} from '../../services/adminService.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const REPORT_STATUS = {
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-300' },
  resolved: { label: 'Traité', cls: 'bg-emerald-500/15 text-emerald-300' },
  dismissed: { label: 'Rejeté', cls: 'bg-slate-500/15 text-white/70' },
};

const REPORT_FILTERS = [
  ['pending', 'En attente'],
  ['', 'Tous'],
  ['resolved', 'Traités'],
  ['dismissed', 'Rejetés'],
];

const PUBLISHED_FILTERS = [
  ['', 'Tous'],
  ['true', 'Publiés'],
  ['false', 'Non publiés'],
];

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

const PAGE_SIZE = 10;

function AdminPublicationPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState('boats');
  const [busyId, setBusyId] = useState(null);

  const [boats, setBoats] = useState([]);
  const [boatsLoading, setBoatsLoading] = useState(true);
  const [published, setPublished] = useState('');

  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportStatus, setReportStatus2] = useState('pending');

  const loadBoats = useCallback(async () => {
    setBoatsLoading(true);
    try {
      const res = await listBoats(published ? { published } : {});
      setBoats(res.data.boats);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de chargement.', 'error');
    } finally {
      setBoatsLoading(false);
    }
  }, [published, showToast]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await listReports(reportStatus);
      setReports(res.data.reports);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de chargement.', 'error');
    } finally {
      setReportsLoading(false);
    }
  }, [reportStatus, showToast]);

  useEffect(() => {
    if (tab === 'boats') loadBoats();
  }, [tab, loadBoats]);
  useEffect(() => {
    if (tab === 'reports') loadReports();
  }, [tab, loadReports]);

  const {
    page: boatsPage,
    setPage: setBoatsPage,
    pageItems: pageBoats,
  } = usePagination(boats, PAGE_SIZE, published);
  const {
    page: reportsPage,
    setPage: setReportsPage,
    pageItems: pageReports,
  } = usePagination(reports, PAGE_SIZE, reportStatus);

  async function togglePublish(b) {
    setBusyId(`b${b.id_boat}`);
    try {
      const res = await setBoatPublished(b.id_boat, !b.is_published);
      setBoats((prev) =>
        prev.map((x) => (x.id_boat === b.id_boat ? { ...x, ...res.data.boat } : x))
      );
      showToast(
        b.is_published
          ? 'Bateau dépublié — propriétaire notifié par email.'
          : 'Bateau publié — propriétaire notifié par email.',
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function decideReport(r, status) {
    setBusyId(`r${r.id_report}`);
    try {
      await setReportStatus(r.id_report, status);
      if (reportStatus && reportStatus !== status) {
        setReports((prev) => prev.filter((x) => x.id_report !== r.id_report));
      } else {
        setReports((prev) => prev.map((x) => (x.id_report === r.id_report ? { ...x, status } : x)));
      }
      showToast(status === 'resolved' ? 'Signalement traité.' : 'Signalement rejeté.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function unpublishFromReport(r) {
    setBusyId(`r${r.id_report}`);
    try {
      await setBoatPublished(r.boat.id_boat, false);
      // La dépublication clôt les signalements en attente du bateau côté serveur → on rafraîchit.
      showToast('Bateau dépublié — propriétaire notifié, signalement clôturé.', 'success');
      await loadReports();
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const tabBtn = (key) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      tab === key
        ? 'bg-sky-500 text-white'
        : 'border border-white/30 text-white/80 hover:bg-white/10'
    }`;
  const pill = (active) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active ? 'bg-sky-500 text-white' : 'border border-white/30 text-white/80 hover:bg-white/10'
    }`;

  return (
    <section>
      <h1 className="text-2xl font-bold text-white">Publication</h1>
      <p className="mt-1 text-sm text-white/70">
        Gérez la publication des bateaux et traitez les signalements.
      </p>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setTab('boats')} className={tabBtn('boats')}>
          Bateaux
        </button>
        <button type="button" onClick={() => setTab('reports')} className={tabBtn('reports')}>
          Signalements
        </button>
      </div>

      {tab === 'boats' ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {PUBLISHED_FILTERS.map(([v, l]) => (
              <button
                key={l}
                type="button"
                onClick={() => setPublished(v)}
                className={pill(published === v)}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
            <table className="w-full text-sm">
              <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Bateau</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Propriétaire</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Prix/jour</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Signalements</th>
                  <th className="px-4 py-3 text-right font-semibold text-white/80">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {boatsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                      Chargement…
                    </td>
                  </tr>
                ) : boats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                      Aucun bateau.
                    </td>
                  </tr>
                ) : (
                  pageBoats.map((b) => (
                    <tr key={b.id_boat} className="text-white/90">
                      <td className="px-4 py-3">
                        <Link
                          to={`/product/${b.id_boat}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-[#5AB4EC] hover:underline"
                        >
                          {b.name}
                        </Link>
                        <div className="text-xs text-white/60">{b.type}</div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {b.owner ? `${b.owner.first_name} ${b.owner.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {b.daily_price != null ? EURO.format(b.daily_price) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                            b.is_published
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-slate-500/15 text-white/70'
                          }`}
                        >
                          {b.is_published ? 'Publié' : 'Non publié'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.pending_reports > 0 ? (
                          <span className="inline-block whitespace-nowrap rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                            {b.pending_reports} en attente
                          </span>
                        ) : (
                          <span className="text-xs text-white/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <IconBtn
                            title={b.is_published ? 'Dépublier' : 'Publier'}
                            variant={b.is_published ? 'default' : 'success'}
                            disabled={busyId === `b${b.id_boat}`}
                            onClick={() => togglePublish(b)}
                          >
                            {b.is_published ? <EyeOffIcon /> : <EyeIcon />}
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
            page={boatsPage}
            pageSize={PAGE_SIZE}
            total={boats.length}
            onChange={setBoatsPage}
            label="Annonces"
            className="mt-4"
          />
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {REPORT_FILTERS.map(([v, l]) => (
              <button
                key={l}
                type="button"
                onClick={() => setReportStatus2(v)}
                className={pill(reportStatus === v)}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
            <table className="w-full text-sm">
              <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Bateau</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Motif</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Signalé par</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold text-white/80">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {reportsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                      Chargement…
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                      Aucun signalement.
                    </td>
                  </tr>
                ) : (
                  pageReports.map((r) => (
                    <tr key={r.id_report} className="text-white/90 align-top">
                      <td className="px-4 py-3">
                        {r.boat ? (
                          <Link
                            to={`/product/${r.boat.id_boat}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[#5AB4EC] hover:underline"
                          >
                            {r.boat.name}
                          </Link>
                        ) : (
                          <span className="font-medium">—</span>
                        )}
                        <div className="text-xs text-white/60">
                          {r.boat?.is_published ? 'Publié' : 'Non publié'}
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-white/80">{r.reason}</td>
                      <td className="px-4 py-3 text-white/70">
                        {r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-white/70">{fmtDate(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                            REPORT_STATUS[r.status]?.cls || 'bg-slate-500/15 text-white/70'
                          }`}
                        >
                          {REPORT_STATUS[r.status]?.label || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {r.boat?.is_published && (
                            <IconBtn
                              title="Dépublier le bateau"
                              disabled={busyId === `r${r.id_report}`}
                              onClick={() => unpublishFromReport(r)}
                            >
                              <EyeOffIcon />
                            </IconBtn>
                          )}
                          <IconBtn
                            title="Traiter"
                            variant="success"
                            disabled={busyId === `r${r.id_report}` || r.status === 'resolved'}
                            onClick={() => decideReport(r, 'resolved')}
                          >
                            <CheckIcon />
                          </IconBtn>
                          <IconBtn
                            title="Rejeter"
                            variant="danger"
                            disabled={busyId === `r${r.id_report}` || r.status === 'dismissed'}
                            onClick={() => decideReport(r, 'dismissed')}
                          >
                            <XIcon />
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
            page={reportsPage}
            pageSize={PAGE_SIZE}
            total={reports.length}
            onChange={setReportsPage}
            label="Signalements"
            className="mt-4"
          />
        </>
      )}
    </section>
  );
}

export default AdminPublicationPage;
