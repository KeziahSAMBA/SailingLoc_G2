import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdPlayArrow, MdSchedule, MdRefresh } from 'react-icons/md';
import { useToast } from '../../hooks/useToast.jsx';
import { listCronJobs, updateCronJob, runCronJob } from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';
import { buildCron, describeCron, parseCron, WEEKDAYS } from '../../utils/cronExpression.js';

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
};

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

const FIELD_CLS = `w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 backdrop-blur-xl ${FOCUS_RING}`;

const PILL_CLS = `rounded-full px-3 py-1.5 text-xs font-semibold transition ${FOCUS_RING}`;

const pad = (n) => String(n).padStart(2, '0');

// Programmation des tâches : planning, activation, mode simulation et
// paramétrage de rétention. Chaque tâche déclarée côté serveur apparaît ici
// automatiquement.
function AdminCronJobsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    document.title = t('adminCron.pageTitle');
  }, [t]);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const res = await listCronJobs();
        setJobs(res.data.jobs);
        setTimezone(res.data.timezone);
      } catch (err) {
        showToast(err.response?.data?.message || t('adminCron.loadError'), 'error');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [showToast, t]
  );

  useEffect(() => {
    load();
  }, [load]);

  const hasRunning = jobs.some((job) => job.running);

  useEffect(() => {
    if (!hasRunning) return undefined;
    const id = setInterval(() => load({ silent: true }), POLL_MS);
    return () => clearInterval(id);
  }, [hasRunning, load]);

  const jobLabel = (key) => t(`adminCron.jobs.${key}.name`, { defaultValue: key });
  const jobDescription = (key) => t(`adminCron.jobs.${key}.description`, { defaultValue: '' });

  async function patch(key, payload, successMessage) {
    setBusyKey(key);
    try {
      const res = await updateCronJob(key, payload);
      setJobs((prev) => prev.map((job) => (job.key === key ? res.data : job)));
      showToast(successMessage, 'success');
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || t('adminCron.saveError'), 'error');
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function trigger(key) {
    setBusyKey(key);
    try {
      await runCronJob(key);
      showToast(t('adminCron.runStarted'), 'success');
      // Le lancement est asynchrone côté serveur : on laisse à l'exécution le
      // temps de s'inscrire avant de rafraîchir.
      setTimeout(() => load({ silent: true }), 800);
    } catch (err) {
      showToast(err.response?.data?.message || t('adminCron.runError'), 'error');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section aria-labelledby="admin-cron-title">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="admin-cron-title" className="text-2xl font-bold text-white">
            {t('adminCron.title')}
          </h1>
          <p className="mt-1 text-sm text-white/70">{t('adminCron.subtitle')}</p>
          {timezone && (
            <p className="mt-1 text-xs text-white/50">
              {t('adminCron.timezoneNotice', { timezone })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => load()}
          className={`flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/20 hover:text-white ${FOCUS_RING}`}
        >
          <MdRefresh aria-hidden="true" className="h-4 w-4" />
          {t('adminCron.refresh')}
        </button>
      </header>

      {loading ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
          {t('adminCron.loading')}
        </p>
      ) : jobs.length === 0 ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
          {t('adminCron.empty')}
        </p>
      ) : (
        <ul className="grid gap-4 sm:auto-rows-fr">
          {jobs.map((job) => (
            <li
              key={job.key}
              className="flex h-full flex-col rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-white">{jobLabel(job.key)}</h2>
                    {job.running && (
                      <span className="flex items-center gap-1.5 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-semibold text-sky-300">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 animate-pulse rounded-full bg-sky-400"
                        />
                        {t('adminCron.running')}
                      </span>
                    )}
                    {job.dry_run && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                        {t('adminCron.dryRun')}
                      </span>
                    )}
                    {job.orphan && (
                      <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">
                        {t('adminCron.orphan')}
                      </span>
                    )}
                  </div>
                  <p
                    className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-white/70"
                    title={jobDescription(job.key)}
                  >
                    {jobDescription(job.key)}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-white/40">{job.key}</p>
                </div>

                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={job.enabled}
                    disabled={job.orphan || busyKey === job.key}
                    onChange={(e) =>
                      patch(
                        job.key,
                        { enabled: e.target.checked },
                        e.target.checked ? t('adminCron.enabled') : t('adminCron.disabled')
                      )
                    }
                    className={`h-4 w-4 rounded border-white/30 bg-white/10 ${FOCUS_RING}`}
                  />
                  {t('adminCron.activeLabel')}
                </label>
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/50">
                    {t('adminCron.scheduleLabel')}
                  </dt>
                  <dd className="mt-0.5 text-white/90">{describeCron(job.schedule, t)}</dd>
                  <dd className="font-mono text-xs text-white/40">{job.schedule}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/50">
                    {t('adminCron.lastRunLabel')}
                  </dt>
                  <dd className="mt-0.5 text-white/90">
                    {job.last_run_at
                      ? formatDate(job.last_run_at, DATE_OPTS)
                      : t('adminCron.never')}
                  </dd>
                  {job.last_status && (
                    <dd className="mt-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          STATUS_CLS[job.last_status] || 'bg-slate-500/15 text-white/80'
                        }`}
                      >
                        {t(`adminCronRuns.statuses.${job.last_status}`, {
                          defaultValue: job.last_status,
                        })}
                      </span>
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-white/50">
                    {t('adminCron.nextRunLabel')}
                  </dt>
                  <dd className="mt-0.5 text-white/90">
                    {job.next_run_at
                      ? formatDate(job.next_run_at, DATE_OPTS)
                      : t('adminCron.notScheduled')}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(job)}
                  disabled={job.orphan}
                  className={`flex items-center gap-1.5 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white disabled:opacity-40 ${PILL_CLS}`}
                >
                  <MdSchedule aria-hidden="true" className="h-4 w-4" />
                  {t('adminCron.editSchedule')}
                </button>
                <button
                  type="button"
                  onClick={() => trigger(job.key)}
                  disabled={job.orphan || job.running || busyKey === job.key}
                  className={`flex items-center gap-1.5 bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40 ${PILL_CLS}`}
                >
                  <MdPlayArrow aria-hidden="true" className="h-4 w-4" />
                  {t('adminCron.runNow')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patch(
                      job.key,
                      { dry_run: !job.dry_run },
                      job.dry_run ? t('adminCron.liveOn') : t('adminCron.dryRunOn')
                    )
                  }
                  disabled={job.orphan || busyKey === job.key}
                  className={`bg-white/10 text-white/80 hover:bg-white/20 hover:text-white disabled:opacity-40 ${PILL_CLS}`}
                >
                  {job.dry_run ? t('adminCron.switchToLive') : t('adminCron.switchToDryRun')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ScheduleDialog
          job={editing}
          timezone={timezone}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            const ok = await patch(editing.key, payload, t('adminCron.scheduleSaved'));
            if (ok) setEditing(null);
          }}
        />
      )}
    </section>
  );
}

// Édition du planning : trois fréquences assistées plus une saisie cron brute
// pour tout le reste, et les paramètres de rétention déclarés par la tâche.
function ScheduleDialog({ job, timezone, onClose, onSave }) {
  const { t } = useTranslation();
  const parsed = parseCron(job.schedule);
  const [mode, setMode] = useState(parsed.mode);
  const [minute, setMinute] = useState(parsed.minute);
  const [hour, setHour] = useState(parsed.hour);
  const [weekday, setWeekday] = useState(parsed.weekday);
  const [custom, setCustom] = useState(job.schedule);
  const [params, setParams] = useState(job.params ?? {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const schedule = mode === 'custom' ? custom.trim() : buildCron({ mode, minute, hour, weekday });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({ schedule, params });
    setSaving(false);
  }

  const paramKeys = Object.keys(job.defaultParams ?? {});

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="cron-schedule-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="cron-schedule-title" className="text-lg font-semibold text-white">
            {t('adminCron.dialogTitle', {
              name: t(`adminCron.jobs.${job.key}.name`, { defaultValue: job.key }),
            })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('adminCron.close')}
            className={`rounded-full px-2 text-xl leading-none text-white/70 transition hover:text-white ${FOCUS_RING}`}
          >
            ✕
          </button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-medium uppercase tracking-wide text-white/60">
            {t('adminCron.frequencyLabel')}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {['hourly', 'daily', 'weekly', 'custom'].map((value) => (
              <label
                key={value}
                className={`cursor-pointer ${PILL_CLS} ${
                  mode === value
                    ? 'bg-sky-500 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="cron-mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="sr-only"
                />
                {t(`adminCron.freq.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>

        {mode === 'weekly' && (
          <div className="mt-4">
            <label htmlFor="cron-weekday" className="mb-1 block text-xs font-medium text-white/70">
              {t('adminCron.weekdayLabel')}
            </label>
            <select
              id="cron-weekday"
              value={weekday}
              onChange={(e) => setWeekday(Number(e.target.value))}
              className={FIELD_CLS}
            >
              {WEEKDAYS.map((day) => (
                <option key={day} value={day} className="text-slate-900">
                  {t(`adminCron.weekdays.${day}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        {(mode === 'daily' || mode === 'weekly') && (
          <div className="mt-4">
            <label htmlFor="cron-time" className="mb-1 block text-xs font-medium text-white/70">
              {t('adminCron.timeLabel')}
            </label>
            <input
              id="cron-time"
              type="time"
              value={`${pad(hour)}:${pad(minute)}`}
              onChange={(e) => {
                const [h, m] = e.target.value.split(':');
                setHour(Number(h));
                setMinute(Number(m));
              }}
              className={FIELD_CLS}
            />
          </div>
        )}

        {mode === 'hourly' && (
          <div className="mt-4">
            <label htmlFor="cron-minute" className="mb-1 block text-xs font-medium text-white/70">
              {t('adminCron.minuteLabel')}
            </label>
            <input
              id="cron-minute"
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
              className={FIELD_CLS}
            />
          </div>
        )}

        {mode === 'custom' && (
          <div className="mt-4">
            <label htmlFor="cron-custom" className="mb-1 block text-xs font-medium text-white/70">
              {t('adminCron.customLabel')}
            </label>
            <input
              id="cron-custom"
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="0 3 * * *"
              aria-describedby="cron-custom-help"
              className={`${FIELD_CLS} font-mono`}
            />
            <p id="cron-custom-help" className="mt-1 text-xs text-white/50">
              {t('adminCron.customHelp')}
            </p>
          </div>
        )}

        {paramKeys.length > 0 && (
          <fieldset className="mt-4">
            <legend className="text-xs font-medium uppercase tracking-wide text-white/60">
              {t('adminCron.paramsLabel')}
            </legend>
            {paramKeys.map((key) => (
              <div key={key} className="mt-2">
                <label
                  htmlFor={`cron-param-${key}`}
                  className="mb-1 block text-xs font-medium text-white/70"
                >
                  {t(`adminCron.params.${key}`, { defaultValue: key })}
                </label>
                <input
                  id={`cron-param-${key}`}
                  type="number"
                  min="1"
                  max="3650"
                  value={params[key] ?? job.defaultParams[key]}
                  onChange={(e) =>
                    setParams((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                  }
                  className={FIELD_CLS}
                />
              </div>
            ))}
          </fieldset>
        )}

        <p className="mt-4 rounded-lg bg-black/20 p-3 text-sm text-white/80">
          {t('adminCron.preview')} <strong>{describeCron(schedule, t)}</strong>
          <br />
          <span className="font-mono text-xs text-white/50">{schedule || '—'}</span>
          {timezone && <span className="text-xs text-white/50"> · {timezone}</span>}
        </p>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border border-white/30 px-4 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
          >
            {t('adminCron.close')}
          </button>
          <button
            type="submit"
            disabled={saving || !schedule}
            className={`rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-40 ${FOCUS_RING}`}
          >
            {t('adminCron.save')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminCronJobsPage;
