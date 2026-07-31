import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast.jsx';
import {
  listBookings,
  cancelBooking,
  listDisputes,
  setDisputeStatus,
} from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';
import AdminScrollableFilterRow from './AdminScrollableFilterRow.jsx';
import { IconBtn, BanIcon, CheckIcon, XIcon } from './AdminActions.jsx';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const BOOKING_STATUS_CLS = {
  pending: 'bg-amber-500/15 text-amber-300',
  confirmed: 'bg-emerald-500/15 text-emerald-300',
  refused: 'bg-red-500/15 text-red-300',
  cancelled: 'bg-slate-500/15 text-white/70',
};
const BOOKING_FILTERS = [
  { value: '', labelKey: 'all' },
  { value: 'pending', labelKey: 'pending' },
  { value: 'confirmed', labelKey: 'confirmed' },
  { value: 'refused', labelKey: 'refused' },
  { value: 'cancelled', labelKey: 'cancelled' },
];

const DISPUTE_STATUS_CLS = {
  open: 'bg-amber-500/15 text-amber-300',
  resolved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-slate-500/15 text-white/70',
};
const DISPUTE_FILTERS = [
  { value: 'open', labelKey: 'open' },
  { value: '', labelKey: 'all' },
  { value: 'resolved', labelKey: 'resolved' },
  { value: 'rejected', labelKey: 'rejected' },
];

const DATE_OPTS = { day: '2-digit', month: '2-digit', year: 'numeric' };

const selectClass =
  'rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#5AB4EC]';

const PAGE_SIZE = 10;

function AdminBookingsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fmtDate = (d) => (d ? formatDate(d, DATE_OPTS) : '—');
  const [tab, setTab] = useState('bookings');
  const [busyId, setBusyId] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [disputes, setDisputes] = useState([]);
  const [disputesLoading, setDisputesLoading] = useState(true);
  const [disputeStatus, setDisputeStatusFilter] = useState('open');

  // Modal de décision sur un litige
  const [decision, setDecision] = useState(null); // { dispute, status }
  const [resolution, setResolution] = useState('');
  const [deciding, setDeciding] = useState(false);

  // État du remboursement (uniquement si décision = 'resolved').
  // `pct` = '' désactive le remboursement ; sinon valeur 1-100.
  const [refundEnabled, setRefundEnabled] = useState(false);
  const [refundPct, setRefundPct] = useState(50);
  const [refundCommission, setRefundCommission] = useState(false);

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      const res = await listBookings(params);
      setBookings(res.data.bookings);
    } catch (err) {
      showToast(err.response?.data?.message || t('adminBookings.loadError'), 'error');
    } finally {
      setBookingsLoading(false);
    }
  }, [status, search, showToast, t]);

  const loadDisputes = useCallback(async () => {
    setDisputesLoading(true);
    try {
      const res = await listDisputes(disputeStatus);
      setDisputes(res.data.disputes);
    } catch (err) {
      showToast(err.response?.data?.message || t('adminBookings.loadError'), 'error');
    } finally {
      setDisputesLoading(false);
    }
  }, [disputeStatus, showToast, t]);

  useEffect(() => {
    if (tab === 'bookings') {
      const timer = setTimeout(loadBookings, 250);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [tab, loadBookings]);
  useEffect(() => {
    if (tab === 'disputes') loadDisputes();
  }, [tab, loadDisputes]);

  const {
    page: bookingsPage,
    setPage: setBookingsPage,
    pageItems: pageBookings,
  } = usePagination(bookings, PAGE_SIZE, `${status}|${search}`);
  const {
    page: disputesPage,
    setPage: setDisputesPage,
    pageItems: pageDisputes,
  } = usePagination(disputes, PAGE_SIZE, disputeStatus);

  async function cancel(b) {
    const reason = window.prompt(t('adminBookings.cancelPrompt'), t('adminBookings.cancelDefault'));
    if (reason === null) return;
    setBusyId(`b${b.id_booking}`);
    try {
      await cancelBooking(b.id_booking, reason);
      showToast(t('adminBookings.cancelledToast'), 'success');
      await loadBookings();
    } catch (err) {
      showToast(err.response?.data?.message || t('adminBookings.genericError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  function openDecision(dispute, status) {
    setDecision({ dispute, status });
    setResolution('');
    setRefundEnabled(false);
    setRefundPct(50);
    setRefundCommission(false);
  }

  async function confirmDecision() {
    if (!decision) return;
    setDeciding(true);
    try {
      const refund =
        decision.status === 'resolved' && refundEnabled
          ? { percent: refundPct, commission: refundCommission }
          : undefined;
      const res = await setDisputeStatus(
        decision.dispute.id_dispute,
        decision.status,
        resolution,
        refund
      );
      const refunded = res.data?.dispute?.refund;
      if (refunded) {
        showToast(
          t('adminBookings.disputeResolvedRefundToast', {
            amount: EURO.format(refunded.refunded_amount),
          }),
          'success'
        );
      } else {
        showToast(
          decision.status === 'resolved'
            ? t('adminBookings.disputeResolvedToast')
            : t('adminBookings.disputeRejectedToast'),
          'success'
        );
      }
      setDecision(null);
      await loadDisputes();
    } catch (err) {
      showToast(err.response?.data?.message || t('adminBookings.genericError'), 'error');
    } finally {
      setDeciding(false);
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
  const badge = (cls) =>
    `inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
      cls || 'bg-slate-500/15 text-white/70'
    }`;

  return (
    <section>
      <h1 className="text-2xl font-bold text-white">{t('adminBookings.title')}</h1>
      <p className="mt-1 text-sm text-white/70">{t('adminBookings.subtitle')}</p>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setTab('bookings')} className={tabBtn('bookings')}>
          {t('adminBookings.tabBookings')}
        </button>
        <button type="button" onClick={() => setTab('disputes')} className={tabBtn('disputes')}>
          {t('adminBookings.tabDisputes')}
        </button>
      </div>

      {tab === 'bookings' ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('adminBookings.searchPlaceholder')}
              className={`${selectClass} min-w-[13.75rem] flex-1`}
            />
          </div>
          <AdminScrollableFilterRow
            ariaLabel={t('adminBookings.tabBookings')}
            contentKey={`${status}|${t('adminBookings.tabBookings')}`}
            className="mt-3"
          >
            {BOOKING_FILTERS.map(({ value, labelKey }) => (
              <button
                key={labelKey}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className={`${pill(status === value)} shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
              >
                {t(`adminBookings.bookingFilters.${labelKey}`)}
              </button>
            ))}
          </AdminScrollableFilterRow>

          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colRenter')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colBoat')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colDates')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colAmount')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colStatus')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colDisputes')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-white/80">
                    {t('adminBookings.colAction')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {bookingsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/70">
                      {t('adminBookings.loading')}
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-white/70">
                      {t('adminBookings.emptyBookings')}
                    </td>
                  </tr>
                ) : (
                  pageBookings.map((b) => (
                    <tr key={b.id_booking} className="text-white/90">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {b.user ? `${b.user.first_name} ${b.user.last_name}` : '—'}
                        </div>
                        <div className="text-xs text-white/60">{b.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-white/70">{b.boat?.name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-white/70">
                        {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {b.total_amount != null ? EURO.format(b.total_amount) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={badge(BOOKING_STATUS_CLS[b.status])}>
                          {t(`bookingStatus.${b.status}`, { defaultValue: b.status })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.open_disputes > 0 ? (
                          <span className="inline-block whitespace-nowrap rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                            {t('adminBookings.openDisputes', { count: b.open_disputes })}
                          </span>
                        ) : (
                          <span className="text-xs text-white/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {b.status === 'pending' || b.status === 'confirmed' ? (
                          <div className="flex justify-end">
                            <IconBtn
                              title={t('adminBookings.cancelBooking')}
                              variant="danger"
                              disabled={busyId === `b${b.id_booking}`}
                              onClick={() => cancel(b)}
                            >
                              <BanIcon />
                            </IconBtn>
                          </div>
                        ) : (
                          <span className="block text-right text-xs text-white/60">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile : une carte par réservation (le tableau ci-dessus est masqué). */}
          <ul className="mt-4 space-y-3 lg:hidden">
            {bookingsLoading || bookings.length === 0 ? (
              <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
                {bookingsLoading ? t('adminBookings.loading') : t('adminBookings.emptyBookings')}
              </li>
            ) : (
              pageBookings.map((b) => (
                <li
                  key={b.id_booking}
                  className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium text-white">
                      {b.user ? `${b.user.first_name} ${b.user.last_name}` : '—'}
                    </p>
                    <span className={`shrink-0 ${badge(BOOKING_STATUS_CLS[b.status])}`}>
                      {t(`bookingStatus.${b.status}`, { defaultValue: b.status })}
                    </span>
                  </div>

                  {b.user?.email && (
                    <p className="break-all text-xs text-white/60">{b.user.email}</p>
                  )}

                  <p className="mt-2 text-sm text-white/80">{b.boat?.name || '—'}</p>
                  <p className="text-xs text-white/70">
                    {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {b.total_amount != null ? EURO.format(b.total_amount) : '—'}
                  </p>

                  {b.open_disputes > 0 && (
                    <p className="mt-2">
                      <span className="inline-block whitespace-nowrap rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                        {t('adminBookings.openDisputes', { count: b.open_disputes })}
                      </span>
                    </p>
                  )}

                  {(b.status === 'pending' || b.status === 'confirmed') && (
                    <div className="mt-3 flex justify-end border-t border-white/15 pt-3">
                      <IconBtn
                        title={t('adminBookings.cancelBooking')}
                        variant="danger"
                        disabled={busyId === `b${b.id_booking}`}
                        onClick={() => cancel(b)}
                      >
                        <BanIcon />
                      </IconBtn>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>

          <Pagination
            page={bookingsPage}
            pageSize={PAGE_SIZE}
            total={bookings.length}
            onChange={setBookingsPage}
            label={t('adminBookings.paginationBookings')}
            className="mt-4"
          />
        </>
      ) : (
        <>
          <AdminScrollableFilterRow
            ariaLabel={t('adminBookings.tabDisputes')}
            contentKey={`${disputeStatus}|${t('adminBookings.tabDisputes')}`}
            className="mt-4"
          >
            {DISPUTE_FILTERS.map(({ value, labelKey }) => (
              <button
                key={labelKey}
                type="button"
                aria-pressed={disputeStatus === value}
                onClick={() => setDisputeStatusFilter(value)}
                className={`${pill(disputeStatus === value)} shrink-0 snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
              >
                {t(`adminBookings.disputeFilters.${labelKey}`)}
              </button>
            ))}
          </AdminScrollableFilterRow>

          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colBooking')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colReason')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colOpenedBy')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-white/80">
                    {t('adminBookings.colStatus')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-white/80">
                    {t('adminBookings.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/15">
                {disputesLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/70">
                      {t('adminBookings.loading')}
                    </td>
                  </tr>
                ) : disputes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-white/70">
                      {t('adminBookings.emptyDisputes')}
                    </td>
                  </tr>
                ) : (
                  pageDisputes.map((d) => (
                    <tr key={d.id_dispute} className="align-top text-white/90">
                      <td className="px-4 py-3">
                        <div className="font-medium">{d.booking?.boat_name || '—'}</div>
                        <div className="whitespace-nowrap text-xs text-white/60">
                          {fmtDate(d.booking?.start_date)} → {fmtDate(d.booking?.end_date)}
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-white/80">
                        {d.reason}
                        {d.photos?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {d.photos.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={t('adminBookings.photoAlt')}
                                  loading="lazy"
                                  className="h-10 w-10 rounded border border-white/30 object-cover transition hover:border-[#5AB4EC]"
                                />
                              </a>
                            ))}
                          </div>
                        )}
                        {d.resolution && (
                          <div className="mt-1 text-xs text-white/60">
                            {t('adminBookings.resolutionPrefix', { text: d.resolution })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {d.opener ? `${d.opener.first_name} ${d.opener.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={badge(DISPUTE_STATUS_CLS[d.status])}>
                          {t(`adminBookings.disputeStatus.${d.status}`, { defaultValue: d.status })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <IconBtn
                            title={t('adminBookings.disputeResolve')}
                            variant="success"
                            disabled={d.status === 'resolved'}
                            onClick={() => openDecision(d, 'resolved')}
                          >
                            <CheckIcon />
                          </IconBtn>
                          <IconBtn
                            title={t('adminBookings.disputeReject')}
                            variant="danger"
                            disabled={d.status === 'rejected'}
                            onClick={() => openDecision(d, 'rejected')}
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

          {/* Mobile : une carte par litige (le tableau ci-dessus est masqué). */}
          <ul className="mt-4 space-y-3 lg:hidden">
            {disputesLoading || disputes.length === 0 ? (
              <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
                {disputesLoading ? t('adminBookings.loading') : t('adminBookings.emptyDisputes')}
              </li>
            ) : (
              pageDisputes.map((d) => (
                <li
                  key={d.id_dispute}
                  className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-white">{d.booking?.boat_name || '—'}</p>
                      <p className="text-xs text-white/60">
                        {fmtDate(d.booking?.start_date)} → {fmtDate(d.booking?.end_date)}
                      </p>
                    </div>
                    <span className={`shrink-0 ${badge(DISPUTE_STATUS_CLS[d.status])}`}>
                      {t(`adminBookings.disputeStatus.${d.status}`, { defaultValue: d.status })}
                    </span>
                  </div>

                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-white/80">
                    {d.reason}
                  </p>

                  {d.photos?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {d.photos.map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer">
                          <img
                            src={url}
                            alt={t('adminBookings.photoAlt')}
                            loading="lazy"
                            className="h-12 w-12 rounded border border-white/30 object-cover transition hover:border-[#5AB4EC]"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {d.resolution && (
                    <p className="mt-2 text-xs text-white/60">
                      {t('adminBookings.resolutionPrefix', { text: d.resolution })}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-white/60">
                    {t('adminBookings.colOpenedBy')} :{' '}
                    {d.opener ? `${d.opener.first_name} ${d.opener.last_name}` : '—'}
                  </p>

                  <div className="mt-3 flex justify-end gap-2 border-t border-white/15 pt-3">
                    <IconBtn
                      title={t('adminBookings.disputeResolve')}
                      variant="success"
                      disabled={d.status === 'resolved'}
                      onClick={() => openDecision(d, 'resolved')}
                    >
                      <CheckIcon />
                    </IconBtn>
                    <IconBtn
                      title={t('adminBookings.disputeReject')}
                      variant="danger"
                      disabled={d.status === 'rejected'}
                      onClick={() => openDecision(d, 'rejected')}
                    >
                      <XIcon />
                    </IconBtn>
                  </div>
                </li>
              ))
            )}
          </ul>

          <Pagination
            page={disputesPage}
            pageSize={PAGE_SIZE}
            total={disputes.length}
            onChange={setDisputesPage}
            label={t('adminBookings.paginationDisputes')}
            className="mt-4"
          />
        </>
      )}

      {decision && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
          onClick={() => !deciding && setDecision(null)}
        >
          <div
            className="my-auto max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">
              {decision.status === 'resolved'
                ? t('adminBookings.modalResolveTitle')
                : t('adminBookings.modalRejectTitle')}
            </h2>
            <p className="mt-1 break-words text-sm text-white/70">
              {decision.dispute.booking?.boat_name
                ? `${decision.dispute.booking.boat_name} — `
                : ''}
              {decision.dispute.reason}
            </p>

            <label
              htmlFor="resolution"
              className="mb-1 mt-4 block text-xs font-medium text-white/70"
            >
              {decision.status === 'resolved'
                ? t('adminBookings.resolutionNote')
                : t('adminBookings.rejectReason')}
            </label>
            <textarea
              id="resolution"
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder={t('adminBookings.decisionPlaceholder')}
              className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#5AB4EC]"
            />

            {decision.status === 'resolved' &&
              (() => {
                const payment = decision.dispute.booking?.payment;
                if (!payment || payment.status !== 'success') {
                  return (
                    <p className="mt-4 rounded-lg border border-white/30 bg-white/10 backdrop-blur-xl px-3 py-2 text-xs text-white/70">
                      {t('adminBookings.noPayment')}
                    </p>
                  );
                }
                const base = refundCommission
                  ? payment.amount + payment.commission
                  : payment.amount;
                const computed = Math.round(base * Number(refundPct || 0)) / 100;
                return (
                  <div className="mt-4 rounded-lg border border-white/30 bg-white/10 backdrop-blur-xl p-3">
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-white/90">
                      <input
                        type="checkbox"
                        checked={refundEnabled}
                        onChange={(e) => setRefundEnabled(e.target.checked)}
                        className="h-4 w-4 accent-emerald-500"
                      />
                      {t('adminBookings.refundRenter')}
                    </label>

                    {refundEnabled && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="mb-1 text-xs font-medium text-white/70">
                            {t('adminBookings.refundPercent')}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[25, 50, 75, 100].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setRefundPct(p)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                  Number(refundPct) === p
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-white/30 text-white/80 hover:bg-white/10'
                                }`}
                              >
                                {p}%
                              </button>
                            ))}
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={refundPct}
                                onChange={(e) => setRefundPct(e.target.value)}
                                className="w-16 rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-xs text-white outline-none focus:border-[#5AB4EC]"
                              />
                              <span className="text-xs text-white/70">%</span>
                            </div>
                          </div>
                        </div>

                        <label className="flex cursor-pointer items-center gap-2 text-xs text-white/80">
                          <input
                            type="checkbox"
                            checked={refundCommission}
                            onChange={(e) => setRefundCommission(e.target.checked)}
                            className="h-3.5 w-3.5 accent-emerald-500"
                          />
                          {t('adminBookings.refundCommission', {
                            amount: EURO.format(payment.commission),
                          })}
                        </label>

                        <div className="rounded-md bg-slate-950/60 px-3 py-2 text-xs">
                          <div className="flex flex-wrap justify-between gap-2 text-white/70">
                            <span>{t('adminBookings.amountPaid')}</span>
                            <span>{EURO.format(payment.amount)}</span>
                          </div>
                          <div className="flex flex-wrap justify-between gap-2 text-white/70">
                            <span>{t('adminBookings.commission')}</span>
                            <span className="break-words text-right">
                              {refundCommission
                                ? t('adminBookings.commissionIncluded')
                                : t('adminBookings.commissionKept')}{' '}
                              ({EURO.format(payment.commission)})
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap justify-between gap-2 border-t border-white/30 pt-1 font-semibold text-emerald-300">
                            <span>{t('adminBookings.refund')}</span>
                            <span>{EURO.format(computed)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDecision(null)}
                disabled={deciding}
                className="w-full rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 disabled:opacity-50 sm:w-auto"
              >
                {t('adminBookings.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDecision}
                disabled={deciding}
                className={`w-full rounded-full px-5 py-2 text-sm font-semibold text-white shadow transition disabled:opacity-60 sm:w-auto ${
                  decision.status === 'resolved'
                    ? 'bg-emerald-600 hover:bg-emerald-600/90'
                    : 'bg-red-600 hover:bg-red-600/90'
                }`}
              >
                {deciding
                  ? '…'
                  : decision.status === 'resolved'
                    ? t('adminBookings.modalResolve')
                    : t('adminBookings.modalReject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminBookingsPage;
