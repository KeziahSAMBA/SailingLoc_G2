import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdVisibility, MdRefresh } from 'react-icons/md';
import { useToast } from '../../hooks/useToast.jsx';
import { listCronRuns, listCronJobs } from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';
import Pagination from '../common/Pagination.jsx';

const PAGE_SIZE = 10;
// Tant qu'une exécution tourne, la page se rafraîchit seule : c'est tout
// l'intérêt d'un écran « tâches en cours ».
const POLL_MS = 5000;

const STATUS_CLS = {
  running: 'bg-sky-500/15 text-sky-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  failed: 'bg-red-500/15 text-red-300',
  skipped: 'bg-amber-500/15 text-amber-300',
};

const DATE_OPTS = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const FIELD_CLS = `w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 backdrop-blur-xl ${FOCUS_RING}`;

const ICON_BTN_CLS = `rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white ${FOCUS_RING}`;

function formatDuration(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

// Les identifiants concernés ont leur propre bloc : le reste du détail (les
// compteurs par entité) reste affiché en JSON.
function resultSummary(result) {
  if (!result) return null;
  const rest = Object.fromEntries(
    Object.entries(result).filter(([key]) => key !== 'targets' && key !== 'truncated')
  );
  return Object.keys(rest).length ? rest : null;
}

// Exécutions des tâches planifiées : ce qui tourne maintenant, puis l'historique.
function AdminCronRunsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [jobKeys, setJobKeys] = useState([]);
  const [filters, setFilters] = useState({ key: '', status: '' });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    document.title = t('adminCronRuns.pageTitle');
  }, [t]);

  useEffect(() => {
    listCronJobs()
      .then((res) => setJobKeys((res.data.jobs || []).map((job) => job.key)))
      .catch(() => setJobKeys([]));
  }, []);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const params = { page, pageSize: PAGE_SIZE };
        if (filters.key) params.key = filters.key;
        if (filters.status) params.status = filters.status;
        const res = await listCronRuns(params);
        setRuns(res.data.runs);
        setTotal(res.data.total);
      } catch (err) {
        showToast(err.response?.data?.message || t('adminCronRuns.loadError'), 'error');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, filters, showToast, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const hasRunning = runs.some((run) => run.status === 'running');

  useEffect(() => {
    if (!hasRunning) return undefined;
    const id = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [hasRunning, load]);

  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  function updateFilter(key, value) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const jobLabel = (key) => t(`adminCron.jobs.${key}.name`, { defaultValue: key });
  const statusLabel = (status) => t(`adminCronRuns.statuses.${status}`, { defaultValue: status });
  const triggerLabel = (trigger) =>
    t(`adminCronRuns.triggers.${trigger}`, { defaultValue: trigger });

  const running = runs.filter((run) => run.status === 'running');

  function detailFields(run) {
    return [
      [t('adminCronRuns.colJob'), `${jobLabel(run.key)} (${run.key})`],
      [t('adminCronRuns.colStatus'), statusLabel(run.status)],
      [t('adminCronRuns.colTrigger'), triggerLabel(run.trigger)],
      [t('adminCronRuns.modeLabel'), run.dry_run ? t('adminCron.dryRun') : t('adminCron.live')],
      [t('adminCronRuns.colStarted'), formatDate(run.started_at, DATE_OPTS)],
      [
        t('adminCronRuns.finishedLabel'),
        run.finished_at ? formatDate(run.finished_at, DATE_OPTS) : '—',
      ],
      [t('adminCronRuns.colDuration'), formatDuration(run.duration_ms)],
      [t('adminCronRuns.colAffected'), String(run.affected)],
      [t('adminCronRuns.actorLabel'), run.actor_email || '—'],
    ];
  }

  return (
    <section aria-labelledby="admin-cron-runs-title">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="admin-cron-runs-title" className="text-2xl font-bold text-white">
            {t('adminCronRuns.title')}
          </h1>
          <p className="mt-1 text-sm text-white/70">{t('adminCronRuns.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className={`flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/20 hover:text-white ${FOCUS_RING}`}
        >
          <MdRefresh aria-hidden="true" className="h-4 w-4" />
          {t('adminCronRuns.refresh')}
        </button>
      </header>

      {/* Bandeau des exécutions en cours : mis en avant, il se vide dès que
          plus rien ne tourne. */}
      <div
        aria-live="polite"
        className="mb-6 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/60">
          {t('adminCronRuns.nowRunning')}
        </h2>
        {running.length === 0 ? (
          <p className="mt-2 text-sm text-white/70">{t('adminCronRuns.nothingRunning')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {running.map((run) => (
              <li
                key={run.id_run}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
              >
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-sky-400"
                />
                <span className="font-medium text-white">{jobLabel(run.key)}</span>
                <span className="text-xs text-white/60">
                  {t('adminCronRuns.startedAt', {
                    date: formatDate(run.started_at, DATE_OPTS),
                  })}
                </span>
                <span className="text-xs text-white/60">{triggerLabel(run.trigger)}</span>
                {run.dry_run && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                    {t('adminCron.dryRun')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="run-job" className="mb-1 block text-xs font-medium text-white/70">
            {t('adminCronRuns.colJob')}
          </label>
          <select
            id="run-job"
            value={filters.key}
            onChange={(e) => updateFilter('key', e.target.value)}
            className={FIELD_CLS}
          >
            <option value="" className="text-slate-900">
              {t('adminCronRuns.allJobs')}
            </option>
            {jobKeys.map((key) => (
              <option key={key} value={key} className="text-slate-900">
                {jobLabel(key)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="run-status" className="mb-1 block text-xs font-medium text-white/70">
            {t('adminCronRuns.colStatus')}
          </label>
          <select
            id="run-status"
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className={FIELD_CLS}
          >
            <option value="" className="text-slate-900">
              {t('adminCronRuns.allStatuses')}
            </option>
            {['running', 'success', 'failed', 'skipped'].map((status) => (
              <option key={status} value={status} className="text-slate-900">
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tableau (desktop) */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t('adminCronRuns.tableCaption')}</caption>
          <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
            <tr>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-white/80">
                {t('adminCronRuns.colStarted')}
              </th>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-white/80">
                {t('adminCronRuns.colJob')}
              </th>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-white/80">
                {t('adminCronRuns.colStatus')}
              </th>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-white/80">
                {t('adminCronRuns.colTrigger')}
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold text-white/80">
                {t('adminCronRuns.colAffected')}
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold text-white/80">
                {t('adminCronRuns.colDuration')}
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold text-white/80">
                <span className="sr-only">{t('adminCronRuns.colActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {loading || runs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-white/70">
                  {loading ? t('adminCronRuns.loading') : t('adminCronRuns.empty')}
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id_run} className="text-white/90 transition hover:bg-white/5">
                  <td className="whitespace-nowrap px-3 py-3 text-white/70">
                    <time dateTime={run.started_at}>{formatDate(run.started_at, DATE_OPTS)}</time>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{jobLabel(run.key)}</div>
                    {run.dry_run && (
                      <div className="text-xs text-amber-300">{t('adminCron.dryRun')}</div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_CLS[run.status] || 'bg-slate-500/15 text-white/80'
                      }`}
                    >
                      {statusLabel(run.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-white/70">{triggerLabel(run.trigger)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{run.affected}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-white/70">
                    {formatDuration(run.duration_ms)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(run)}
                      title={t('adminCronRuns.open')}
                      aria-label={t('adminCronRuns.openDetail', { id: run.id_run })}
                      className={ICON_BTN_CLS}
                    >
                      <MdVisibility aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cartes (mobile) */}
      <ul className="mt-4 space-y-3 md:hidden">
        {loading || runs.length === 0 ? (
          <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
            {loading ? t('adminCronRuns.loading') : t('adminCronRuns.empty')}
          </li>
        ) : (
          runs.map((run) => (
            <li
              key={run.id_run}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_CLS[run.status] || 'bg-slate-500/15 text-white/80'
                  }`}
                >
                  {statusLabel(run.status)}
                </span>
                <time dateTime={run.started_at} className="text-xs text-white/60">
                  {formatDate(run.started_at, DATE_OPTS)}
                </time>
              </div>
              <p className="mt-2 text-sm font-medium text-white/90">{jobLabel(run.key)}</p>
              <p className="text-xs text-white/60">
                {triggerLabel(run.trigger)} · {t('adminCronRuns.colAffected')} : {run.affected} ·{' '}
                {formatDuration(run.duration_ms)}
              </p>
              <button
                type="button"
                onClick={() => setSelected(run)}
                aria-label={t('adminCronRuns.openDetail', { id: run.id_run })}
                className={`mt-3 ${ICON_BTN_CLS}`}
              >
                <MdVisibility aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))
        )}
      </ul>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onChange={setPage}
        label={t('adminCronRuns.paginationLabel')}
        className="mt-4"
      />

      {selected && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cron-run-detail-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="cron-run-detail-title" className="text-lg font-semibold text-white">
                {t('adminCronRuns.detailTitle', { id: selected.id_run })}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t('adminCronRuns.close')}
                className={`rounded-full px-2 text-xl leading-none text-white/70 transition hover:text-white ${FOCUS_RING}`}
              >
                ✕
              </button>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              {detailFields(selected).map(([label, value]) => (
                <div key={label} className="flex flex-wrap gap-x-2">
                  <dt className="w-40 shrink-0 text-white/60">{label}</dt>
                  <dd className="min-w-0 flex-1 break-words text-white/90">{value}</dd>
                </div>
              ))}
            </dl>

            {selected.error && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/60">
                  {t('adminCronRuns.errorLabel')}
                </h3>
                <p className="mt-1 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">
                  {selected.error}
                </p>
              </>
            )}

            {Array.isArray(selected.result?.targets) && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/60">
                  {t('adminCronRuns.targetsLabel')}
                </h3>
                <p className="mt-1 text-xs text-white/50">{t('adminCronRuns.targetsPrivacy')}</p>
                {selected.result.targets.length === 0 ? (
                  <p className="mt-2 text-sm text-white/70">{t('adminCronRuns.targetsNone')}</p>
                ) : (
                  <>
                    <ul className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                      {selected.result.targets.map((id) => (
                        <li
                          key={id}
                          className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-white/80"
                        >
                          #{id}
                        </li>
                      ))}
                    </ul>
                    {selected.result.truncated && (
                      <p className="mt-2 text-xs text-amber-300">
                        {t('adminCronRuns.targetsTruncated', {
                          shown: selected.result.targets.length,
                          total: selected.affected,
                        })}
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/60">
              {t('adminCronRuns.resultLabel')}
            </h3>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-white/80">
              {resultSummary(selected.result)
                ? JSON.stringify(resultSummary(selected.result), null, 2)
                : '—'}
            </pre>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
              >
                {t('adminCronRuns.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminCronRunsPage;
