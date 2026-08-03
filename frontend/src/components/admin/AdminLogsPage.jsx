import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MdVisibility, MdDownload } from 'react-icons/md';
import { useToast } from '../../hooks/useToast.jsx';
import { listLogs, listLogFilters } from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';
import Pagination from '../common/Pagination.jsx';

const PAGE_SIZE = 10;

const LEVEL_CLS = {
  info: 'bg-sky-500/15 text-sky-300',
  warning: 'bg-amber-500/15 text-amber-300',
  error: 'bg-red-500/15 text-red-300',
};

const DATE_OPTS = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const FIELD_CLS = `w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 backdrop-blur-xl ${FOCUS_RING}`;

const ICON_BTN_CLS = `rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white ${FOCUS_RING}`;

const EMPTY_FILTERS = { search: '', category: '', role: '', level: '', from: '', to: '' };

function fileStamp(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// Journal des actions effectuées depuis le back-office : qui a fait quoi, quand
// et sur quelle ressource. Lecture seule, alimenté par le middleware `audit`.
function AdminLogsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    document.title = t('adminLogs.pageTitle');
  }, [t]);

  useEffect(() => {
    listLogFilters()
      .then((res) => {
        setCategories(res.data.categories || []);
        setLevels(res.data.levels || []);
        setRoles(res.data.roles || []);
      })
      .catch(() => {
        setCategories([]);
        setLevels([]);
        setRoles([]);
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize: PAGE_SIZE };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const res = await listLogs(params);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      showToast(err.response?.data?.message || t('adminLogs.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filters, showToast, t]);

  // La saisie du champ recherche est amortie pour ne pas requêter à chaque frappe.
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

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

  const hasFilters = Object.values(filters).some(Boolean);

  function actionLabel(action) {
    return t(`adminLogs.actions.${action}`, { defaultValue: action });
  }

  function actorLabel(log) {
    if (log.actor) return `${log.actor.first_name} ${log.actor.last_name}`.trim();
    return log.actor_email || t('adminLogs.unknownActor');
  }

  function targetLabel(log) {
    if (!log.target_type) return '—';
    const type = t(`adminLogs.targets.${log.target_type}`, { defaultValue: log.target_type });
    return log.target_id ? `${type} #${log.target_id}` : type;
  }

  // Champs de la fenêtre de détail, réutilisés tels quels pour le fichier .txt.
  function detailFields(log) {
    return [
      [t('adminLogs.colDate'), formatDate(log.created_at, DATE_OPTS)],
      [t('adminLogs.levelLabel'), t(`adminLogs.levels.${log.level}`, { defaultValue: log.level })],
      [
        t('adminLogs.categoryLabel'),
        t(`adminLogs.categories.${log.category}`, { defaultValue: log.category }),
      ],
      [t('adminLogs.colAction'), `${actionLabel(log.action)} (${log.action})`],
      [t('adminLogs.colActor'), actorLabel(log)],
      [t('adminLogs.fieldEmail'), log.actor_email || '—'],
      [
        t('adminLogs.roleLabel'),
        log.actor_role
          ? t(`adminLogs.roles.${log.actor_role}`, { defaultValue: log.actor_role })
          : '—',
      ],
      [t('adminLogs.fieldActorId'), log.actor_id != null ? String(log.actor_id) : '—'],
      [t('adminLogs.colTarget'), targetLabel(log)],
      [t('adminLogs.fieldIp'), log.ip || '—'],
      [t('adminLogs.fieldMessage'), log.message || '—'],
    ];
  }

  function downloadLog(log) {
    const lines = [
      `${t('adminLogs.detailTitle', { id: log.id_log })}`,
      '',
      ...detailFields(log).map(([label, value]) => `${label} : ${value}`),
      '',
      `${t('adminLogs.fieldMeta')} :`,
      log.meta ? JSON.stringify(log.meta, null, 2) : '—',
    ];
    const url = window.URL.createObjectURL(
      new window.Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `log-${log.id_log}-${fileStamp(log.created_at)}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby="admin-logs-title">
      <header className="mb-6">
        <h1 id="admin-logs-title" className="text-2xl font-bold text-white">
          {t('adminLogs.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">{t('adminLogs.subtitle')}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor="log-search" className="mb-1 block text-xs font-medium text-white/70">
            {t('adminLogs.searchLabel')}
          </label>
          <input
            id="log-search"
            type="search"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder={t('adminLogs.searchPlaceholder')}
            className={FIELD_CLS}
          />
        </div>

        <div>
          <label htmlFor="log-category" className="mb-1 block text-xs font-medium text-white/70">
            {t('adminLogs.categoryLabel')}
          </label>
          <select
            id="log-category"
            value={filters.category}
            onChange={(e) => updateFilter('category', e.target.value)}
            className={FIELD_CLS}
          >
            <option value="" className="text-slate-900">
              {t('adminLogs.allCategories')}
            </option>
            {categories.map((c) => (
              <option key={c} value={c} className="text-slate-900">
                {t(`adminLogs.categories.${c}`, { defaultValue: c })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="log-role" className="mb-1 block text-xs font-medium text-white/70">
            {t('adminLogs.roleLabel')}
          </label>
          <select
            id="log-role"
            value={filters.role}
            onChange={(e) => updateFilter('role', e.target.value)}
            className={FIELD_CLS}
          >
            <option value="" className="text-slate-900">
              {t('adminLogs.allRoles')}
            </option>
            {roles.map((r) => (
              <option key={r} value={r} className="text-slate-900">
                {t(`adminLogs.roles.${r}`, { defaultValue: r })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="log-level" className="mb-1 block text-xs font-medium text-white/70">
            {t('adminLogs.levelLabel')}
          </label>
          <select
            id="log-level"
            value={filters.level}
            onChange={(e) => updateFilter('level', e.target.value)}
            className={FIELD_CLS}
          >
            <option value="" className="text-slate-900">
              {t('adminLogs.allLevels')}
            </option>
            {levels.map((l) => (
              <option key={l} value={l} className="text-slate-900">
                {t(`adminLogs.levels.${l}`, { defaultValue: l })}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="log-from" className="mb-1 block text-xs font-medium text-white/70">
              {t('adminLogs.fromLabel')}
            </label>
            <input
              id="log-from"
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter('from', e.target.value)}
              className={FIELD_CLS}
            />
          </div>
          <div>
            <label htmlFor="log-to" className="mb-1 block text-xs font-medium text-white/70">
              {t('adminLogs.toLabel')}
            </label>
            <input
              id="log-to"
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter('to', e.target.value)}
              className={FIELD_CLS}
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setFilters(EMPTY_FILTERS);
          }}
          className={`mt-3 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/20 hover:text-white ${FOCUS_RING}`}
        >
          {t('adminLogs.resetFilters')}
        </button>
      )}

      {/* Tableau (desktop) */}
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{t('adminLogs.tableCaption')}</caption>
          <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
            <tr>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-white/80">
                {t('adminLogs.colDate')}
              </th>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-white/80">
                {t('adminLogs.colActor')}
              </th>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-white/80">
                {t('adminLogs.colAction')}
              </th>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-white/80">
                {t('adminLogs.colTarget')}
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold text-white/80">
                <span className="sr-only">{t('adminLogs.colActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {loading || logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-white/70">
                  {loading ? t('adminLogs.loading') : t('adminLogs.empty')}
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id_log} className="text-white/90 transition hover:bg-white/5">
                  <td className="whitespace-nowrap px-3 py-3 text-white/70">
                    <time dateTime={log.created_at}>{formatDate(log.created_at, DATE_OPTS)}</time>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{actorLabel(log)}</div>
                    <div className="text-xs text-white/60">
                      {log.actor_role
                        ? t(`adminLogs.roles.${log.actor_role}`, { defaultValue: log.actor_role })
                        : log.actor_email}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        LEVEL_CLS[log.level] || 'bg-slate-500/15 text-white/80'
                      }`}
                    >
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-white/70">{targetLabel(log)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setSelected(log)}
                        title={t('adminLogs.open')}
                        aria-label={t('adminLogs.openDetail', { id: log.id_log })}
                        className={ICON_BTN_CLS}
                      >
                        <MdVisibility aria-hidden="true" className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadLog(log)}
                        title={t('adminLogs.download')}
                        aria-label={t('adminLogs.downloadOne', { id: log.id_log })}
                        className={ICON_BTN_CLS}
                      >
                        <MdDownload aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cartes (mobile) */}
      <ul className="mt-4 space-y-3 md:hidden">
        {loading || logs.length === 0 ? (
          <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
            {loading ? t('adminLogs.loading') : t('adminLogs.empty')}
          </li>
        ) : (
          logs.map((log) => (
            <li
              key={log.id_log}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    LEVEL_CLS[log.level] || 'bg-slate-500/15 text-white/80'
                  }`}
                >
                  {actionLabel(log.action)}
                </span>
                <time dateTime={log.created_at} className="text-xs text-white/60">
                  {formatDate(log.created_at, DATE_OPTS)}
                </time>
              </div>
              <p className="mt-2 text-sm text-white/90">{actorLabel(log)}</p>
              <p className="text-xs text-white/60">{targetLabel(log)}</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(log)}
                  title={t('adminLogs.open')}
                  aria-label={t('adminLogs.openDetail', { id: log.id_log })}
                  className={ICON_BTN_CLS}
                >
                  <MdVisibility aria-hidden="true" className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => downloadLog(log)}
                  title={t('adminLogs.download')}
                  aria-label={t('adminLogs.downloadOne', { id: log.id_log })}
                  className={ICON_BTN_CLS}
                >
                  <MdDownload aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        onChange={setPage}
        label={t('adminLogs.paginationLabel')}
        className="mt-4"
      />

      {/* Détail complet d'une entrée : le tableau tronque, ici tout est affiché. */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-detail-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="log-detail-title" className="text-lg font-semibold text-white">
                {t('adminLogs.detailTitle', { id: selected.id_log })}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t('adminLogs.close')}
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

            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/60">
              {t('adminLogs.fieldMeta')}
            </h3>
            <pre className="mt-1 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-white/80">
              {selected.meta ? JSON.stringify(selected.meta, null, 2) : '—'}
            </pre>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
              >
                {t('adminLogs.close')}
              </button>
              <button
                type="button"
                onClick={() => downloadLog(selected)}
                className={`flex items-center gap-2 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-400 ${FOCUS_RING}`}
              >
                <MdDownload aria-hidden="true" className="h-4 w-4" />
                {t('adminLogs.download')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminLogsPage;
