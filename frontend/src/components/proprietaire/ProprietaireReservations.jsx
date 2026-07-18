import { useState, useEffect, useMemo } from 'react';
import {
  getBookings,
  updateBookingStatus,
  reportDispute,
} from '../../services/proprietaireService.js';
import { useToast } from '../../hooks/useToast.jsx';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const BOOKING_STATUS = {
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-300' },
  confirmed: { label: 'Confirmée', cls: 'bg-emerald-500/15 text-emerald-300' },
  refused: { label: 'Refusée', cls: 'bg-red-500/15 text-red-300' },
  cancelled: { label: 'Annulée', cls: 'bg-slate-500/15 text-slate-300' },
};

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'confirmed', label: 'Confirmées' },
  { key: 'cancelled', label: 'Annulées' },
  { key: 'refused', label: 'Refusées' },
];

const PERIOD_FILTERS = [
  { key: 'all', label: 'Toutes périodes' },
  { key: 'upcoming', label: 'À venir' },
  { key: 'current', label: 'En cours' },
  { key: 'past', label: 'Passées' },
];

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function fmtDate(value) {
  return value ? DATE.format(new Date(value)) : '';
}

function isPast(value) {
  const end = new Date(value);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

function startsAfterToday(value) {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return start > today;
}

// Position du séjour par rapport à aujourd'hui : passé (terminé), à venir
// (pas commencé) ou en cours (aujourd'hui dans le séjour, bornes incluses).
function matchesPeriod(booking, period) {
  if (period === 'past') return isPast(booking.end_date);
  if (period === 'upcoming') return startsAfterToday(booking.start_date);
  if (period === 'current')
    return !isPast(booking.end_date) && !startsAfterToday(booking.start_date);
  return true;
}

function BookingCard({ booking, busy, onAction }) {
  const meta = BOOKING_STATUS[booking.status] || {
    label: booking.status,
    cls: 'bg-slate-500/15 text-slate-300',
  };
  const port = booking.boat?.port;
  const locataire = booking.locataire;
  // Une demande n'est actionnable qu'une fois payée par le locataire
  // (empreinte en attente) : la confirmation encaisse, le refus annule.
  const isPaid = booking.payment_status === 'pending';
  const canDecide = booking.status === 'pending' && isPaid;
  const canCancel = booking.status === 'confirmed' && !isPast(booking.end_date);
  const finished = booking.status === 'confirmed' && isPast(booking.end_date);
  const canDispute = (booking.status === 'cancelled' || finished) && !booking.has_open_dispute;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex flex-col sm:flex-row">
        {booking.boat?.image && (
          <img
            src={booking.boat.image}
            alt={`Bateau ${booking.boat?.name}`}
            loading="lazy"
            className="h-40 w-full object-cover sm:h-auto sm:w-48"
          />
        )}
        <div className="flex-1 p-5">
          <header className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white">{booking.boat?.name}</h3>
              {(booking.boat?.type || port) && (
                <p className="mt-0.5 text-sm text-slate-400">
                  {[booking.boat?.type, port && `${port.name} · ${port.city}`]
                    .filter(Boolean)
                    .join(' — ')}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              {booking.has_open_dispute && (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                  Litige en cours
                </span>
              )}
              {booking.status === 'pending' && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isPaid ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-500/15 text-slate-400'
                  }`}
                >
                  {isPaid ? 'Payée — à valider' : 'En attente de paiement'}
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
                {meta.label}
              </span>
            </div>
          </header>

          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {locataire && (
              <div>
                <dt className="text-slate-400">Locataire</dt>
                <dd className="font-medium text-slate-100">
                  {locataire.first_name} {locataire.last_name}
                  {locataire.email && (
                    <a
                      href={`mailto:${locataire.email}`}
                      className={`ml-2 text-xs font-normal text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
                    >
                      {locataire.email}
                    </a>
                  )}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-slate-400">Dates</dt>
              <dd className="font-medium text-slate-100">
                <time dateTime={booking.start_date}>{fmtDate(booking.start_date)}</time> →{' '}
                <time dateTime={booking.end_date}>{fmtDate(booking.end_date)}</time>
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Montant</dt>
              <dd className="font-medium text-slate-100">
                {EURO.format(booking.total_amount ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Réservée le</dt>
              <dd className="font-medium text-slate-100">
                <time dateTime={booking.booking_date}>{fmtDate(booking.booking_date)}</time>
              </dd>
            </div>
          </dl>

          {booking.status === 'cancelled' && booking.cancellation_reason && (
            <p className="mt-3 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-300">
              <span className="font-semibold">Annulation :</span> {booking.cancellation_reason}
              {booking.cancellation_date && ` (le ${fmtDate(booking.cancellation_date)})`}
            </p>
          )}

          {(canDecide || canCancel || canDispute) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {canDecide && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction(booking, 'confirm')}
                    className={`rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction(booking, 'refuse')}
                    className={`rounded-full bg-red-600/80 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    Refuser
                  </button>
                </>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'cancel')}
                  className={`rounded-full border border-slate-600 px-4 py-1.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Annuler la réservation
                </button>
              )}
              {canDispute && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'dispute')}
                  className={`rounded-full border border-amber-500/50 px-4 py-1.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Signaler un problème
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ProprietaireReservations() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  // Modal de décision (refus ou annulation) : { booking, action } | null.
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');
  // Photos jointes au signalement : { file, url (aperçu à révoquer) }.
  const [photos, setPhotos] = useState([]);
  const { showToast } = useToast();

  function addPhotos(fileList) {
    // Copie immédiate : la FileList est vidée dès le reset de l'input.
    const entries = Array.from(fileList).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotos((prev) => {
      const next = [...prev, ...entries];
      next.slice(5).forEach((p) => URL.revokeObjectURL(p.url));
      return next.slice(0, 5);
    });
  }

  function removePhoto(index) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  function closeModal() {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setDecision(null);
  }

  const deciding = decision ? busyId === decision.booking.id_booking : false;

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mes réservations — SailingLoc';
  }, []);

  useEffect(() => {
    getBookings()
      .then((res) => setBookings(res.data.bookings || []))
      .catch((err) =>
        setError(err.response?.data?.message || 'Erreur de chargement des réservations.')
      )
      .finally(() => setLoading(false));
  }, []);

  // Fermeture de la modal au clavier (Échap), sauf pendant l'envoi.
  useEffect(() => {
    if (!decision) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !deciding) closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [decision, deciding]);

  async function executeAction(booking, action, actionReason) {
    setBusyId(booking.id_booking);
    try {
      if (action === 'dispute') {
        await reportDispute(
          booking.id_booking,
          actionReason,
          photos.map((p) => p.file)
        );
        setBookings((prev) =>
          prev.map((b) =>
            b.id_booking === booking.id_booking ? { ...b, has_open_dispute: true } : b
          )
        );
        showToast('Signalement envoyé.', 'success');
        closeModal();
        return;
      }
      const res = await updateBookingStatus(booking.id_booking, action, actionReason);
      const updated = res.data.booking;
      // Le paiement suit la décision : encaissé à la confirmation, annulé
      // (donc plus rien en attente) au refus ou à l'annulation.
      const payment_status = action === 'confirm' ? 'success' : null;
      setBookings((prev) =>
        prev.map((b) =>
          b.id_booking === updated.id_booking ? { ...b, ...updated, payment_status } : b
        )
      );
      const messages = {
        confirm: 'Réservation confirmée, paiement encaissé.',
        refuse: 'Demande refusée, paiement annulé.',
        cancel: 'Réservation annulée.',
      };
      showToast(messages[action], 'success');
      setDecision(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Une erreur est survenue.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  function handleAction(booking, action) {
    if (action === 'confirm') {
      executeAction(booking, 'confirm');
      return;
    }
    // Refus et annulation passent par la modal de confirmation.
    setDecision({ booking, action });
    setReason('');
  }

  const filtered = useMemo(
    () =>
      bookings
        .filter((b) => filter === 'all' || b.status === filter)
        .filter((b) => matchesPeriod(b, periodFilter)),
    [bookings, filter, periodFilter]
  );

  return (
    <section aria-labelledby="reservations-title">
      <header className="mb-6">
        <h1 id="reservations-title" className="text-2xl font-bold text-white">
          Mes réservations
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Historique des demandes sur vos bateaux : confirmez, refusez ou annulez.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {/* Filtres par statut */}
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {FILTERS.map((f) => {
          const active = filter === f.key;
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
            </button>
          );
        })}
      </div>

      {/* Filtres par période (passées / en cours / à venir), cumulables avec le statut */}
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par période">
        {PERIOD_FILTERS.map((f) => {
          const active = periodFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setPeriodFilter(f.key)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${FOCUS_RING} ${
                active
                  ? 'border-[#5AB4EC] bg-[#5AB4EC]/15 text-[#ABD4FF]'
                  : 'border-slate-700 bg-transparent text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-slate-300">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-400">
          {bookings.length === 0
            ? 'Aucune réservation reçue sur vos bateaux pour le moment.'
            : 'Aucune réservation pour ce filtre.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {filtered.map((b) => (
            <li key={b.id_booking}>
              <BookingCard booking={b} busy={busyId === b.id_booking} onAction={handleAction} />
            </li>
          ))}
        </ul>
      )}

      {/* Modal de refus / annulation */}
      {decision && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => !deciding && closeModal()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="decision-title" className="text-lg font-semibold text-white">
              {decision.action === 'refuse'
                ? 'Refuser la demande'
                : decision.action === 'dispute'
                  ? 'Signaler un problème'
                  : 'Annuler la réservation'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {decision.booking.boat?.name}
              {decision.booking.locataire &&
                ` — ${decision.booking.locataire.first_name} ${decision.booking.locataire.last_name}`}
              , du {fmtDate(decision.booking.start_date)} au {fmtDate(decision.booking.end_date)}.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (decision.action === 'dispute' && !reason.trim()) {
                  showToast('Décrivez le problème rencontré.', 'error');
                  return;
                }
                executeAction(decision.booking, decision.action, reason.trim() || undefined);
              }}
            >
              {(decision.action === 'cancel' || decision.action === 'dispute') && (
                <>
                  <label
                    htmlFor="cancel-reason"
                    className="mb-1 mt-4 block text-xs font-medium text-slate-400"
                  >
                    {decision.action === 'dispute'
                      ? 'Décrivez le problème'
                      : "Motif de l'annulation (optionnel)"}
                  </label>
                  <textarea
                    id="cancel-reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                    placeholder={
                      decision.action === 'dispute'
                        ? 'Ex. : bateau rendu endommagé, caution à retenir…'
                        : 'Ex. : bateau indisponible suite à une avarie…'
                    }
                    aria-describedby="cancel-reason-hint"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-[#5AB4EC]"
                  />
                </>
              )}
              {decision.action === 'dispute' && (
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-slate-400">
                    Photos (optionnel, 5 max)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {photos.map((p, i) => (
                      <div key={p.url} className="relative">
                        <img
                          src={p.url}
                          alt=""
                          className="h-14 w-14 rounded-lg border border-slate-700 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label="Retirer la photo"
                          className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white hover:bg-red-500 ${FOCUS_RING}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <label
                        className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-600 text-xl text-slate-400 transition hover:border-[#5AB4EC] hover:text-[#5AB4EC] ${FOCUS_RING}`}
                        title="Ajouter des photos"
                      >
                        +
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="sr-only"
                          onChange={(e) => {
                            addPhotos(e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <p id="cancel-reason-hint" className="mt-2 text-xs text-slate-500">
                {decision.action === 'refuse'
                  ? 'Le locataire sera informé du refus par email. Son paiement en attente sera annulé : aucun montant ne lui sera prélevé.'
                  : decision.action === 'dispute'
                    ? 'Votre signalement ouvrira un litige, examiné par l’équipe SailingLoc.'
                    : 'Le locataire sera informé de l’annulation par email, avec ce motif.'}
              </p>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deciding}
                  onClick={closeModal}
                  className={`rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={deciding}
                  className={`rounded-full bg-red-600/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                >
                  {deciding
                    ? 'Envoi…'
                    : decision.action === 'refuse'
                      ? 'Refuser la demande'
                      : decision.action === 'dispute'
                        ? 'Envoyer le signalement'
                        : 'Confirmer l’annulation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProprietaireReservations;
