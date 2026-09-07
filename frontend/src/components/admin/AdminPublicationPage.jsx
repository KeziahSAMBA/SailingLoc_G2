import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast.jsx';
import { formatDate } from '../../utils/formatDate.js';
import { IconBtn, EyeIcon, EyeOffIcon, CheckIcon, XIcon } from './AdminActions.jsx';
import AdminScrollableFilterRow from './AdminScrollableFilterRow.jsx';
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

const REPORT_STATUS_CLS = {
  pending: 'status-indicator status-indicator--warning bg-warning-base/15 text-warning-soft',
  resolved: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
  dismissed: 'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/70',
};

const REPORT_FILTERS = [
  { value: 'pending', labelKey: 'pending' },
  { value: '', labelKey: 'all' },
  { value: 'resolved', labelKey: 'resolved' },
  { value: 'dismissed', labelKey: 'dismissed' },
];

const PUBLISHED_FILTERS = [
  { value: '', labelKey: 'all' },
  { value: 'true', labelKey: 'published' },
  { value: 'false', labelKey: 'unpublished' },
];

const DATE_OPTS = { day: '2-digit', month: '2-digit', year: 'numeric' };

const PAGE_SIZE = 10;

function AdminPublicationPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fmtDate = (d) => (d ? formatDate(d, DATE_OPTS) : '—');
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
      showToast(err.response?.data?.message || t('adminPublication.loadError'), 'error');
    } finally {
      setBoatsLoading(false);
    }
  }, [published, showToast, t]);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await listReports(reportStatus);
      setReports(res.data.reports);
    } catch (err) {
      showToast(err.response?.data?.message || t('adminPublication.loadError'), 'error');
    } finally {
      setReportsLoading(false);
    }
  }, [reportStatus, showToast, t]);

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
          ? t('adminPublication.unpublishedToast')
          : t('adminPublication.publishedToast'),
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message || t('adminPublication.genericError'), 'error');
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
      showToast(
        status === 'resolved'
          ? t('adminPublication.reportResolvedToast')
          : t('adminPublication.reportDismissedToast'),
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message || t('adminPublication.genericError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function unpublishFromReport(r) {
    setBusyId(`r${r.id_report}`);
    try {
      await setBoatPublished(r.boat.id_boat, false);
      // La dépublication clôt les signalements en attente du bateau côté serveur → on rafraîchit.
      showToast(t('adminPublication.unpublishFromReportToast'), 'success');
      await loadReports();
    } catch (err) {
      showToast(err.response?.data?.message || t('adminPublication.genericError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  const tabBtn = (key) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      tab === key
        ? 'bg-action text-action-text non-color-active'
        : 'border border-glass/30 text-on-dark/80 hover:bg-surface/10'
    }`;
  const pill = (active) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active
        ? 'bg-action text-action-text non-color-active'
        : 'border border-glass/30 text-on-dark/80 hover:bg-surface/10'
    }`;

  return (
    <section>
      <h1 className="text-2xl font-bold text-on-dark">{t('adminPublication.title')}</h1>
      <p className="mt-1 text-sm text-on-dark/70">{t('adminPublication.subtitle')}</p>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          aria-pressed={tab === 'boats'}
          onClick={() => setTab('boats')}
          className={tabBtn('boats')}
        >
          {t('adminPublication.tabBoats')}
        </button>
        <button
          type="button"
          aria-pressed={tab === 'reports'}
          onClick={() => setTab('reports')}
          className={tabBtn('reports')}
        >
          {t('adminPublication.tabReports')}
        </button>
      </div>

      {tab === 'boats' ? (
        <>
          <AdminScrollableFilterRow
            ariaLabel={t('adminPublication.tabBoats')}
            contentKey={`${published}|${t('adminPublication.tabBoats')}`}
            className="mt-4"
          >
            {PUBLISHED_FILTERS.map(({ value, labelKey }) => (
              <button
                key={labelKey}
                type="button"
                aria-pressed={published === value}
                onClick={() => setPublished(value)}
                className={`${pill(published === value)} shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright`}
              >
                {t(`adminPublication.publishedFilters.${labelKey}`)}
              </button>
            ))}
          </AdminScrollableFilterRow>

          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl xl:block">
            <table className="w-full text-sm">
              <thead className="border-b border-glass/20 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colBoat')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colOwner')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colPrice')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colStatus')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colReports')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-on-dark/80">
                    {t('adminPublication.colAction')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass/15">
                {boatsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-on-dark/70">
                      {t('adminPublication.loading')}
                    </td>
                  </tr>
                ) : boats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-on-dark/70">
                      {t('adminPublication.emptyBoats')}
                    </td>
                  </tr>
                ) : (
                  pageBoats.map((b) => (
                    <tr key={b.id_boat} className="text-on-dark/90">
                      <td className="px-4 py-3">
                        <Link
                          to={`/product/${b.id_boat}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand-soft hover:underline"
                        >
                          {b.name}
                        </Link>
                        <div className="text-xs text-on-dark/60">{b.type}</div>
                      </td>
                      <td className="px-4 py-3 text-on-dark/70">
                        {b.owner ? `${b.owner.first_name} ${b.owner.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-on-dark/70">
                        {b.daily_price != null ? EURO.format(b.daily_price) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                            b.is_published
                              ? 'status-indicator status-indicator--success bg-success-base/15 text-success-soft'
                              : 'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/70'
                          }`}
                        >
                          {b.is_published
                            ? t('adminPublication.published')
                            : t('adminPublication.unpublished')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.pending_reports > 0 ? (
                          <span className="status-indicator status-indicator--danger inline-block whitespace-nowrap rounded-full bg-danger-base/15 px-2.5 py-1 text-xs font-semibold text-danger-soft">
                            {t('adminPublication.pendingReports', { count: b.pending_reports })}
                          </span>
                        ) : (
                          <span className="text-xs text-on-dark/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <IconBtn
                            title={
                              b.is_published
                                ? t('adminPublication.unpublish')
                                : t('adminPublication.publish')
                            }
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

          {/* Cartes jusqu'au desktop large : le tableau ci-dessus est masqué. */}
          <ul className="mt-4 space-y-3 xl:hidden">
            {boatsLoading || boats.length === 0 ? (
              <li className="rounded-2xl border border-glass/20 bg-surface/10 px-4 py-8 text-center text-sm text-on-dark/70 backdrop-blur-xl">
                {boatsLoading ? t('adminPublication.loading') : t('adminPublication.emptyBoats')}
              </li>
            ) : (
              pageBoats.map((b) => (
                <li
                  key={b.id_boat}
                  className="rounded-2xl border border-glass/20 bg-surface/10 p-4 backdrop-blur-xl"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/product/${b.id_boat}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-words font-medium text-brand-soft hover:underline"
                      >
                        {b.name}
                      </Link>
                      <p className="text-xs text-on-dark/60">{b.type}</p>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                        b.is_published
                          ? 'status-indicator status-indicator--success bg-success-base/15 text-success-soft'
                          : 'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/70'
                      }`}
                    >
                      {b.is_published
                        ? t('adminPublication.published')
                        : t('adminPublication.unpublished')}
                    </span>
                  </div>

                  <p className="mt-2 break-words text-sm text-on-dark/70">
                    {b.owner ? `${b.owner.first_name} ${b.owner.last_name}` : '—'}
                    {b.daily_price != null ? ` · ${EURO.format(b.daily_price)}` : ''}
                  </p>

                  {b.pending_reports > 0 && (
                    <p className="mt-2">
                      <span className="status-indicator status-indicator--danger inline-block whitespace-nowrap rounded-full bg-danger-base/15 px-2.5 py-1 text-xs font-semibold text-danger-soft">
                        {t('adminPublication.pendingReports', { count: b.pending_reports })}
                      </span>
                    </p>
                  )}

                  <div className="mt-3 flex justify-end border-t border-glass/15 pt-3">
                    <IconBtn
                      title={
                        b.is_published
                          ? t('adminPublication.unpublish')
                          : t('adminPublication.publish')
                      }
                      variant={b.is_published ? 'default' : 'success'}
                      disabled={busyId === `b${b.id_boat}`}
                      onClick={() => togglePublish(b)}
                    >
                      {b.is_published ? <EyeOffIcon /> : <EyeIcon />}
                    </IconBtn>
                  </div>
                </li>
              ))
            )}
          </ul>

          <Pagination
            page={boatsPage}
            pageSize={PAGE_SIZE}
            total={boats.length}
            onChange={setBoatsPage}
            label={t('adminPublication.paginationBoats')}
            className="mt-4"
          />
        </>
      ) : (
        <>
          <AdminScrollableFilterRow
            ariaLabel={t('adminPublication.tabReports')}
            contentKey={`${reportStatus}|${t('adminPublication.tabReports')}`}
            className="mt-4"
          >
            {REPORT_FILTERS.map(({ value, labelKey }) => (
              <button
                key={labelKey}
                type="button"
                aria-pressed={reportStatus === value}
                onClick={() => setReportStatus2(value)}
                className={`${pill(reportStatus === value)} shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-bright`}
              >
                {t(`adminPublication.reportFilters.${labelKey}`)}
              </button>
            ))}
          </AdminScrollableFilterRow>

          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl xl:block">
            <table className="w-full text-sm">
              <thead className="border-b border-glass/20 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colBoat')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colReason')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colReportedBy')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colDate')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-on-dark/80">
                    {t('adminPublication.colStatus')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-on-dark/80">
                    {t('adminPublication.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass/15">
                {reportsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-on-dark/70">
                      {t('adminPublication.loading')}
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-on-dark/70">
                      {t('adminPublication.emptyReports')}
                    </td>
                  </tr>
                ) : (
                  pageReports.map((r) => (
                    <tr key={r.id_report} className="text-on-dark/90 align-top">
                      <td className="px-4 py-3">
                        {r.boat ? (
                          <Link
                            to={`/product/${r.boat.id_boat}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-brand-soft hover:underline"
                          >
                            {r.boat.name}
                          </Link>
                        ) : (
                          <span className="font-medium">—</span>
                        )}
                        <div className="text-xs text-on-dark/60">
                          {r.boat?.is_published
                            ? t('adminPublication.published')
                            : t('adminPublication.unpublished')}
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-on-dark/80">{r.reason}</td>
                      <td className="px-4 py-3 text-on-dark/70">
                        {r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-on-dark/70">{fmtDate(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                            REPORT_STATUS_CLS[r.status] ||
                            'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/70'
                          }`}
                        >
                          {t(`adminPublication.reportStatus.${r.status}`, {
                            defaultValue: r.status,
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {r.boat?.is_published && (
                            <IconBtn
                              title={t('adminPublication.unpublishBoat')}
                              disabled={busyId === `r${r.id_report}`}
                              onClick={() => unpublishFromReport(r)}
                            >
                              <EyeOffIcon />
                            </IconBtn>
                          )}
                          <IconBtn
                            title={t('adminPublication.handle')}
                            variant="success"
                            disabled={busyId === `r${r.id_report}` || r.status === 'resolved'}
                            onClick={() => decideReport(r, 'resolved')}
                          >
                            <CheckIcon />
                          </IconBtn>
                          <IconBtn
                            title={t('adminPublication.dismiss')}
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

          {/* Cartes jusqu'au desktop large : le tableau ci-dessus est masqué. */}
          <ul className="mt-4 space-y-3 xl:hidden">
            {reportsLoading || reports.length === 0 ? (
              <li className="rounded-2xl border border-glass/20 bg-surface/10 px-4 py-8 text-center text-sm text-on-dark/70 backdrop-blur-xl">
                {reportsLoading
                  ? t('adminPublication.loading')
                  : t('adminPublication.emptyReports')}
              </li>
            ) : (
              pageReports.map((r) => (
                <li
                  key={r.id_report}
                  className="rounded-2xl border border-glass/20 bg-surface/10 p-4 backdrop-blur-xl"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {r.boat ? (
                        <Link
                          to={`/product/${r.boat.id_boat}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-words font-medium text-brand-soft hover:underline"
                        >
                          {r.boat.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-on-dark">—</span>
                      )}
                      <p className="text-xs text-on-dark/60">
                        {r.boat?.is_published
                          ? t('adminPublication.published')
                          : t('adminPublication.unpublished')}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                        REPORT_STATUS_CLS[r.status] ||
                        'status-indicator status-indicator--neutral bg-neutral/15 text-on-dark/70'
                      }`}
                    >
                      {t(`adminPublication.reportStatus.${r.status}`, { defaultValue: r.status })}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-on-dark/80">
                    {r.reason}
                  </p>

                  <p className="mt-2 break-words text-xs text-on-dark/60">
                    {r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}` : '—'} ·{' '}
                    {fmtDate(r.created_at)}
                  </p>

                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-glass/15 pt-3">
                    {r.boat?.is_published && (
                      <IconBtn
                        title={t('adminPublication.unpublishBoat')}
                        disabled={busyId === `r${r.id_report}`}
                        onClick={() => unpublishFromReport(r)}
                      >
                        <EyeOffIcon />
                      </IconBtn>
                    )}
                    <IconBtn
                      title={t('adminPublication.handle')}
                      variant="success"
                      disabled={busyId === `r${r.id_report}` || r.status === 'resolved'}
                      onClick={() => decideReport(r, 'resolved')}
                    >
                      <CheckIcon />
                    </IconBtn>
                    <IconBtn
                      title={t('adminPublication.dismiss')}
                      variant="danger"
                      disabled={busyId === `r${r.id_report}` || r.status === 'dismissed'}
                      onClick={() => decideReport(r, 'dismissed')}
                    >
                      <XIcon />
                    </IconBtn>
                  </div>
                </li>
              ))
            )}
          </ul>

          <Pagination
            page={reportsPage}
            pageSize={PAGE_SIZE}
            total={reports.length}
            onChange={setReportsPage}
            label={t('adminPublication.paginationReports')}
            className="mt-4"
          />
        </>
      )}
    </section>
  );
}

export default AdminPublicationPage;
