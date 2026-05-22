import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../hooks/useToast.jsx';
import {
  listBookings,
  cancelBooking,
  listDisputes,
  setDisputeStatus,
} from '../../services/adminService.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const BOOKING_STATUS = {
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-300' },
  confirmed: { label: 'Confirmée', cls: 'bg-emerald-500/15 text-emerald-300' },
  refused: { label: 'Refusée', cls: 'bg-red-500/15 text-red-300' },
  cancelled: { label: 'Annulée', cls: 'bg-slate-600/30 text-slate-400' },
};
const BOOKING_FILTERS = [
  ['', 'Toutes'],
  ['pending', 'En attente'],
  ['confirmed', 'Confirmées'],
  ['refused', 'Refusées'],
  ['cancelled', 'Annulées'],
];

const DISPUTE_STATUS = {
  open: { label: 'Ouvert', cls: 'bg-amber-500/15 text-amber-300' },
  resolved: { label: 'Résolu', cls: 'bg-emerald-500/15 text-emerald-300' },
  rejected: { label: 'Rejeté', cls: 'bg-slate-600/30 text-slate-400' },
};
const DISPUTE_FILTERS = [
  ['open', 'Ouverts'],
  ['', 'Tous'],
  ['resolved', 'Résolus'],
  ['rejected', 'Rejetés'],
];

const selectClass =
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#5AB4EC]';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function AdminBookingsPage() {
  const { showToast } = useToast();
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

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (search.trim()) params.search = search.trim();
      const res = await listBookings(params);
      setBookings(res.data.bookings);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de chargement.', 'error');
    } finally {
      setBookingsLoading(false);
    }
  }, [status, search, showToast]);

  const loadDisputes = useCallback(async () => {
    setDisputesLoading(true);
    try {
      const res = await listDisputes(disputeStatus);
      setDisputes(res.data.disputes);
    } catch (err) {
      showToast(err.response?.data?.message || 'Erreur de chargement.', 'error');
    } finally {
      setDisputesLoading(false);
    }
  }, [disputeStatus, showToast]);

  useEffect(() => {
    if (tab === 'bookings') {
      const t = setTimeout(loadBookings, 250);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [tab, loadBookings]);
  useEffect(() => {
    if (tab === 'disputes') loadDisputes();
  }, [tab, loadDisputes]);

  async function cancel(b) {
    const reason = window.prompt("Motif de l'annulation :", 'Annulée par un administrateur.');
    if (reason === null) return;
    setBusyId(`b${b.id_booking}`);
    try {
      await cancelBooking(b.id_booking, reason);
      showToast('Réservation annulée.', 'success');
      await loadBookings();
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  function openDecision(dispute, status) {
    setDecision({ dispute, status });
    setResolution('');
  }

  async function confirmDecision() {
    if (!decision) return;
    setDeciding(true);
    try {
      await setDisputeStatus(decision.dispute.id_dispute, decision.status, resolution);
      showToast(decision.status === 'resolved' ? 'Litige résolu.' : 'Litige rejeté.', 'success');
      setDecision(null);
      await loadDisputes();
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec.', 'error');
    } finally {
      setDeciding(false);
    }
  }

  const tabBtn = (key) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      tab === key
        ? 'bg-[#0A3172] text-white'
        : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
    }`;
  const pill = (active) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${
      active
        ? 'bg-[#0A3172] text-white'
        : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
    }`;
  const badge = (meta) =>
    `inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
      meta?.cls || 'bg-slate-600/30 text-slate-400'
    }`;

  return (
    <section>
      <h1 className="text-2xl font-bold text-white">Réservations</h1>
      <p className="mt-1 text-sm text-slate-400">
        Vue globale des réservations, annulation et gestion des litiges.
      </p>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => setTab('bookings')} className={tabBtn('bookings')}>
          Réservations
        </button>
        <button type="button" onClick={() => setTab('disputes')} className={tabBtn('disputes')}>
          Litiges
        </button>
      </div>

      {tab === 'bookings' ? (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (locataire, bateau)…"
              className={`${selectClass} min-w-[220px] flex-1`}
            />
            {BOOKING_FILTERS.map(([v, l]) => (
              <button
                key={l}
                type="button"
                onClick={() => setStatus(v)}
                className={pill(status === v)}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Locataire</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Bateau</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Dates</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Montant</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Statut</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Litiges</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bookingsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Chargement…
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Aucune réservation.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id_booking} className="text-slate-200">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {b.user ? `${b.user.first_name} ${b.user.last_name}` : '—'}
                        </div>
                        <div className="text-xs text-slate-500">{b.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{b.boat?.name || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                        {fmtDate(b.start_date)} → {fmtDate(b.end_date)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {b.total_amount != null ? EURO.format(b.total_amount) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={badge(BOOKING_STATUS[b.status])}>
                          {BOOKING_STATUS[b.status]?.label || b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.open_disputes > 0 ? (
                          <span className="inline-block whitespace-nowrap rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                            {b.open_disputes} ouvert(s)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.status === 'pending' || b.status === 'confirmed' ? (
                          <button
                            type="button"
                            disabled={busyId === `b${b.id_booking}`}
                            onClick={() => cancel(b)}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                          >
                            Annuler
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {DISPUTE_FILTERS.map(([v, l]) => (
              <button
                key={l}
                type="button"
                onClick={() => setDisputeStatusFilter(v)}
                className={pill(disputeStatus === v)}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Réservation</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Motif</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Ouvert par</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {disputesLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Chargement…
                    </td>
                  </tr>
                ) : disputes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Aucun litige.
                    </td>
                  </tr>
                ) : (
                  disputes.map((d) => (
                    <tr key={d.id_dispute} className="align-top text-slate-200">
                      <td className="px-4 py-3">
                        <div className="font-medium">{d.booking?.boat_name || '—'}</div>
                        <div className="whitespace-nowrap text-xs text-slate-500">
                          {fmtDate(d.booking?.start_date)} → {fmtDate(d.booking?.end_date)}
                        </div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-300">
                        {d.reason}
                        {d.resolution && (
                          <div className="mt-1 text-xs text-slate-500">
                            Résolution : {d.resolution}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {d.opener ? `${d.opener.first_name} ${d.opener.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={badge(DISPUTE_STATUS[d.status])}>
                          {DISPUTE_STATUS[d.status]?.label || d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={d.status === 'resolved'}
                            onClick={() => openDecision(d, 'resolved')}
                            className="rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-40"
                          >
                            Résoudre
                          </button>
                          <button
                            type="button"
                            disabled={d.status === 'rejected'}
                            onClick={() => openDecision(d, 'rejected')}
                            className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
                          >
                            Rejeter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {decision && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deciding && setDecision(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">
              {decision.status === 'resolved' ? 'Résoudre le litige' : 'Rejeter le litige'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {decision.dispute.booking?.boat_name
                ? `${decision.dispute.booking.boat_name} — `
                : ''}
              {decision.dispute.reason}
            </p>

            <label
              htmlFor="resolution"
              className="mb-1 mt-4 block text-xs font-medium text-slate-400"
            >
              {decision.status === 'resolved'
                ? 'Note de résolution (optionnel)'
                : 'Motif du rejet (optionnel)'}
            </label>
            <textarea
              id="resolution"
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Détaillez la décision…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-[#5AB4EC]"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDecision(null)}
                disabled={deciding}
                className="rounded-full border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDecision}
                disabled={deciding}
                className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow transition disabled:opacity-60 ${
                  decision.status === 'resolved'
                    ? 'bg-emerald-600 hover:bg-emerald-600/90'
                    : 'bg-red-600 hover:bg-red-600/90'
                }`}
              >
                {deciding ? '…' : decision.status === 'resolved' ? 'Résoudre' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminBookingsPage;
