import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getBookings,
  updateBookingStatus,
  reportDispute,
} from '../../services/proprietaireService.js';
import { useToast } from '../../hooks/useToast.jsx';
import CardSkeleton from '../common/CardSkeleton.jsx';
import { formatDate } from '../../utils/formatDate.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
const DATE_OPTS = { day: 'numeric', month: 'short', year: 'numeric' };

const BOOKING_STATUS_CLS = {
  pending: 'bg-amber-500/15 text-amber-300',
  confirmed: 'bg-emerald-500/15 text-emerald-300',
  refused: 'bg-red-500/15 text-red-300',
  cancelled: 'bg-slate-500/15 text-white/80',
};

const FILTER_KEYS = ['all', 'pending', 'confirmed', 'cancelled', 'refused'];
const PERIOD_KEYS = ['all', 'upcoming', 'current', 'past'];

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

function fmtDate(value) {
  return formatDate(value, DATE_OPTS);
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

function BookingCard({ booking, busy, onAction, mirrored }) {
  const { t } = useTranslation();
  const statusCls = BOOKING_STATUS_CLS[booking.status] || 'bg-slate-500/15 text-white/80';
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
    <article className="group h-56 overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl transition-all duration-300 hover:border-[#5AB4EC]/60 hover:bg-white/15 hover:shadow-xl hover:shadow-sky-500/10 motion-safe:hover:-translate-y-1">
      {/* Colonne gauche de la grille : photo à droite ; colonne droite : photo à
          gauche — les photos se font face vers le centre. */}
      <div className={`flex h-full ${mirrored ? 'xl:flex-row-reverse' : ''}`}>
        {booking.boat?.image ? (
          <img
            src={booking.boat.image}
            alt={`Bateau ${booking.boat?.name}`}
            loading="lazy"
            className="hidden w-28 self-stretch object-cover transition-transform duration-500 sm:block md:w-36 motion-safe:group-hover:scale-105"
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <header className="min-w-0">
            <h3 className="truncate text-base font-bold text-white">{booking.boat?.name}</h3>
            {(booking.boat?.type || port) && (
              <p className="mt-0.5 truncate text-xs text-white/60">
                {[booking.boat?.type, port && `${port.name} · ${port.city}`]
                  .filter(Boolean)
                  .join(' — ')}
              </p>
            )}
            {/* Badges toujours sous le nom, jamais à côté. */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {booking.has_open_dispute && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  {t('proprietaireReservations.openDispute')}
                </span>
              )}
              {booking.status === 'pending' && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isPaid ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-500/15 text-white/70'
                  }`}
                >
                  {isPaid
                    ? t('proprietaireReservations.paidToValidate')
                    : t('proprietaireReservations.awaitingPayment')}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusCls}`}>
                {t(`bookingStatus.${booking.status}`, { defaultValue: booking.status })}
              </span>
            </div>
          </header>

          {locataire && (
            <p className="mt-2 truncate text-xs text-white/70">
              {locataire.first_name} {locataire.last_name}
              {locataire.email && (
                <a
                  href={`mailto:${locataire.email}`}
                  className={`ml-1.5 text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
                >
                  {locataire.email}
                </a>
              )}
            </p>
          )}

          {/* Ligne méta mono-ligne tronquée : la hauteur de carte reste fixe. */}
          <p className="mt-1.5 truncate text-sm text-white/90">
            <span className="font-bold text-white">{EURO.format(booking.total_amount ?? 0)}</span>
            <span aria-hidden className="text-white/30">
              {' • '}
            </span>
            <time dateTime={booking.start_date}>{fmtDate(booking.start_date)}</time>
            {' → '}
            <time dateTime={booking.end_date}>{fmtDate(booking.end_date)}</time>
            <span aria-hidden className="text-white/30">
              {' • '}
            </span>
            <span className="text-xs text-white/60">
              {t('proprietaireReservations.bookedOn')}{' '}
              <time dateTime={booking.booking_date}>{fmtDate(booking.booking_date)}</time>
            </span>
          </p>

          {booking.status === 'cancelled' && booking.cancellation_reason && (
            <p
              className="mt-2 truncate rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/70"
              title={booking.cancellation_reason}
            >
              <span className="font-semibold">
                {t('proprietaireReservations.cancellationLabel')}
              </span>{' '}
              {booking.cancellation_reason}
              {booking.cancellation_date &&
                t('proprietaireReservations.cancellationDate', {
                  date: fmtDate(booking.cancellation_date),
                })}
            </p>
          )}

          {(canDecide || canCancel || canDispute) && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
              {canDecide && (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction(booking, 'confirm')}
                    className={`rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {t('proprietaireReservations.confirm')}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onAction(booking, 'refuse')}
                    className={`rounded-full bg-red-600/80 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {t('proprietaireReservations.refuse')}
                  </button>
                </>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'cancel')}
                  className={`rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('proprietaireReservations.cancelBooking')}
                </button>
              )}
              {canDispute && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction(booking, 'dispute')}
                  className={`rounded-full border border-amber-500/50 px-3 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('proprietaireReservations.reportProblem')}
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
  const { t } = useTranslation();
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
    document.title = t('proprietaireReservations.pageTitle');
  }, [t]);

  useEffect(() => {
    getBookings()
      .then((res) => setBookings(res.data.bookings || []))
      .catch((err) =>
        setError(err.response?.data?.message || t('proprietaireReservations.loadError'))
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
        showToast(t('proprietaireReservations.reportSent'), 'success');
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
        confirm: t('proprietaireReservations.confirmed'),
        refuse: t('proprietaireReservations.refused'),
        cancel: t('proprietaireReservations.cancelled'),
      };
      showToast(messages[action], 'success');
      setDecision(null);
    } catch (err) {
      showToast(err.response?.data?.message || t('proprietaireReservations.genericError'), 'error');
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
          {t('proprietaireReservations.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">{t('proprietaireReservations.subtitle')}</p>
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
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="group"
        aria-label={t('proprietaireReservations.statusFilterAria')}
      >
        {FILTER_KEYS.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={active}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${FOCUS_RING} ${
                active
                  ? 'bg-sky-500 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
              }`}
            >
              {t(`proprietaireReservations.filters.${key}`)}
            </button>
          );
        })}
      </div>

      {/* Filtres par période (passées / en cours / à venir), cumulables avec le statut */}
      <div
        className="mb-5 flex flex-wrap gap-2"
        role="group"
        aria-label={t('proprietaireReservations.periodFilterAria')}
      >
        {PERIOD_KEYS.map((key) => {
          const active = periodFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPeriodFilter(key)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${FOCUS_RING} ${
                active
                  ? 'border-[#5AB4EC] bg-[#5AB4EC]/15 text-[#ABD4FF]'
                  : 'border-white/30 bg-transparent text-white/70 hover:border-white/50 hover:text-white'
              }`}
            >
              {t(`proprietaireReservations.periods.${key}`)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <CardSkeleton count={4} height="h-56" />
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl px-4 py-8 text-center text-sm text-white/70">
          {bookings.length === 0
            ? t('proprietaireReservations.emptyAll')
            : t('proprietaireReservations.emptyFilter')}
        </p>
      ) : (
        <ul key={`${filter}-${periodFilter}`} className="grid gap-3 xl:grid-cols-2">
          {filtered.map((b, i) => (
            <li
              key={b.id_booking}
              className={`min-w-0 ${i % 2 === 0 ? 'card-enter-from-left' : 'card-enter-from-right'}`}
              style={{ animationDelay: `${Math.min(i, 12) * 70}ms` }}
            >
              <BookingCard
                booking={b}
                busy={busyId === b.id_booking}
                onAction={handleAction}
                mirrored={i % 2 === 0}
              />
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
            className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="decision-title" className="text-lg font-semibold text-white">
              {decision.action === 'refuse'
                ? t('proprietaireReservations.modal.refuseTitle')
                : decision.action === 'dispute'
                  ? t('proprietaireReservations.modal.disputeTitle')
                  : t('proprietaireReservations.modal.cancelTitle')}
            </h2>
            <p className="mt-1 text-sm text-white/70">
              {decision.booking.boat?.name}
              {decision.booking.locataire &&
                ` — ${decision.booking.locataire.first_name} ${decision.booking.locataire.last_name}`}
              {t('proprietaireReservations.modal.range', {
                start: fmtDate(decision.booking.start_date),
                end: fmtDate(decision.booking.end_date),
              })}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (decision.action === 'dispute' && !reason.trim()) {
                  showToast(t('proprietaireReservations.describeProblemError'), 'error');
                  return;
                }
                executeAction(decision.booking, decision.action, reason.trim() || undefined);
              }}
            >
              {(decision.action === 'cancel' || decision.action === 'dispute') && (
                <>
                  <label
                    htmlFor="cancel-reason"
                    className="mb-1 mt-4 block text-xs font-medium text-white/70"
                  >
                    {decision.action === 'dispute'
                      ? t('proprietaireReservations.modal.describeProblem')
                      : t('proprietaireReservations.modal.cancelReasonLabel')}
                  </label>
                  <textarea
                    id="cancel-reason"
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    autoFocus
                    placeholder={
                      decision.action === 'dispute'
                        ? t('proprietaireReservations.modal.disputePlaceholder')
                        : t('proprietaireReservations.modal.cancelPlaceholder')
                    }
                    aria-describedby="cancel-reason-hint"
                    className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#5AB4EC]"
                  />
                </>
              )}
              {decision.action === 'dispute' && (
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-white/70">
                    {t('proprietaireReservations.modal.photosLabel')}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {photos.map((p, i) => (
                      <div key={p.url} className="relative">
                        <img
                          src={p.url}
                          alt=""
                          className="h-14 w-14 rounded-lg border border-white/30 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          aria-label={t('proprietaireReservations.modal.removePhoto')}
                          className={`absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs text-white hover:bg-red-500 ${FOCUS_RING}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <label
                        className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/40 text-xl text-white/70 transition hover:border-[#5AB4EC] hover:text-[#5AB4EC] ${FOCUS_RING}`}
                        title={t('proprietaireReservations.modal.addPhotos')}
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

              <p id="cancel-reason-hint" className="mt-2 text-xs text-white/60">
                {decision.action === 'refuse'
                  ? t('proprietaireReservations.modal.refuseNotice')
                  : decision.action === 'dispute'
                    ? t('proprietaireReservations.modal.disputeNotice')
                    : t('proprietaireReservations.modal.cancelNotice')}
              </p>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={deciding}
                  onClick={closeModal}
                  className={`rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                >
                  {t('proprietaireReservations.modal.back')}
                </button>
                <button
                  type="submit"
                  disabled={deciding}
                  className={`rounded-full bg-red-600/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                >
                  {deciding
                    ? t('proprietaireReservations.modal.sending')
                    : decision.action === 'refuse'
                      ? t('proprietaireReservations.modal.refuseTitle')
                      : decision.action === 'dispute'
                        ? t('proprietaireReservations.modal.sendReport')
                        : t('proprietaireReservations.modal.confirmCancel')}
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
