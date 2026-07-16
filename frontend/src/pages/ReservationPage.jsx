import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdCheck, MdLockOutline, MdInfoOutline } from 'react-icons/md';
import DocumentsManager from '../components/documents/DocumentsManager.jsx';
import { fetchBoats } from '../services/boatService.js';
import { createBooking, payBooking } from '../services/bookingService.js';
import { getMyDocuments } from '../services/documentService.js';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.webp';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Jours facturés : bornes incluses, même calcul que la page produit.
function countDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  return Math.round((new Date(endStr) - new Date(startStr)) / 86400000) + 1;
}

// Doit correspondre à DOCUMENT_TYPES.locataire côté backend.
const REQUIRED_DOC_TYPES = ['permis_conduire', 'piece_identite', 'cv_nautique'];

const GLASS = 'rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl';
const FIELD =
  'w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30';
const PRIMARY_BTN =
  'rounded-full bg-sky-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50';
const GHOST_BTN =
  'rounded-full border border-white/40 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10';

// Saisie carte : groupes de 4 chiffres (affichage uniquement, rien n'est envoyé).
function formatCardNumber(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

// ─── Étapes ───────────────────────────────────────────────────────────────────

function Stepper({ step }) {
  const { t } = useTranslation();
  const steps = [
    t('reservation.steps.recap'),
    t('reservation.steps.documents'),
    t('reservation.steps.payment'),
  ];
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
      {steps.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo';
        return (
          <li
            key={label}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                state === 'done'
                  ? 'bg-emerald-500 text-white'
                  : state === 'current'
                    ? 'bg-sky-500 text-white'
                    : 'bg-white/20 text-white/60'
              }`}
            >
              {state === 'done' ? <MdCheck aria-hidden /> : i + 1}
            </span>
            <span
              className={`text-xs font-semibold sm:text-sm ${
                state === 'current' ? 'text-white' : 'text-white/60'
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-white/30 sm:w-8" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200">
      {children}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ReservationPage() {
  const { t, i18n } = useTranslation();
  const { idBoat } = useParams();
  const [searchParams] = useSearchParams();
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  const [boats, setBoats] = useState([]);
  const [boatsLoaded, setBoatsLoaded] = useState(false);
  useEffect(() => {
    fetchBoats()
      .then(({ data }) => setBoats(data))
      .catch(() => {})
      .finally(() => setBoatsLoaded(true));
  }, []);
  const boat = useMemo(
    () => boats.find((b) => b.id_boat === Number(idBoat)) ?? null,
    [boats, idBoat]
  );

  // 0 = récap, 1 = documents, 2 = paiement, 3 = confirmation.
  const [step, setStep] = useState(0);
  // Chaque étape repart du haut de page (les étapes n'ont pas la même hauteur).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dayCount = countDays(start, end);
  const price = boat ? Number(boat.daily_price) : 0;
  const total = dayCount * price;

  const dateFormatter = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const fmtDay = (str) => (str ? dateFormatter.format(new Date(str)) : '');

  // Retour à l'étape précédente (sans perdre la demande déjà créée).
  function goBack(target) {
    setError('');
    setCardError('');
    setStep(target);
  }

  // Étape 1 → crée la réservation « pending » côté serveur. Au retour depuis
  // l'étape documents, la demande existe déjà : on avance sans la recréer.
  async function handleConfirmRecap() {
    if (booking) {
      setError('');
      setStep(1);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data } = await createBooking(boat.id_boat, start, end);
      setBooking(data.booking);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || t('reservation.errors.createFailed'));
    } finally {
      setBusy(false);
    }
  }

  // Étape 2 → vérifie que les 3 documents locataire sont validés par l'admin.
  async function handleDocumentsContinue() {
    setBusy(true);
    setError('');
    try {
      const { data } = await getMyDocuments();
      const docs = data.documents || [];
      const allValidated = REQUIRED_DOC_TYPES.every((type) =>
        docs.some((d) => d.type === type && d.status === 'validated')
      );
      if (allValidated) setStep(2);
      else setError(t('reservation.documents.notValidated'));
    } catch {
      setError(t('reservation.errors.checkFailed'));
    } finally {
      setBusy(false);
    }
  }

  // Étape 3 → formulaire de carte purement visuel : seules l'identité de la
  // réservation part au serveur, jamais les champs de carte.
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [cardError, setCardError] = useState('');

  async function handlePay(e) {
    e.preventDefault();
    const digits = card.number.replace(/\s/g, '');
    const [mm, yy] = card.expiry.split('/');
    if (!card.name.trim()) return setCardError(t('reservation.payment.errors.name'));
    if (digits.length < 12) return setCardError(t('reservation.payment.errors.number'));
    if (!/^\d{2}\/\d{2}$/.test(card.expiry) || Number(mm) < 1 || Number(mm) > 12)
      return setCardError(t('reservation.payment.errors.expiry'));
    // La carte reste valable jusqu'au dernier jour de son mois d'expiration ;
    // elle doit couvrir toute la réservation, fin de séjour incluse.
    const cardValidUntil = new Date(2000 + Number(yy), Number(mm), 0, 23, 59, 59);
    if (cardValidUntil < new Date()) return setCardError(t('reservation.payment.errors.expired'));
    if (cardValidUntil < new Date(end))
      return setCardError(t('reservation.payment.errors.expiresBeforeEnd', { date: fmtDay(end) }));
    if (!/^\d{3,4}$/.test(card.cvc)) return setCardError(t('reservation.payment.errors.cvc'));
    setCardError('');
    setBusy(true);
    setError('');
    try {
      const { data } = await payBooking(booking.id_booking);
      setPayment(data.payment);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || t('reservation.errors.payFailed'));
    } finally {
      setBusy(false);
    }
  }

  // Accès direct avec des paramètres incomplets ou bateau inconnu.
  const invalid = boatsLoaded && (!boat || dayCount <= 0);

  return (
    <main
      className="min-h-screen w-full"
      style={{
        backgroundImage: `url(${bateauBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="min-h-screen w-full bg-black/50 px-4 pt-[120px] pb-16">
        <section className="mx-auto w-full max-w-2xl">
          <h1 className="mb-2 text-center text-3xl font-bold text-white">
            {t('reservation.title')}
          </h1>
          {boat && (
            <p className="mb-6 text-center text-slate-200">
              {boat.name}
              {boat.port ? ` · ${boat.port.name}, ${boat.port.city}` : ''}
            </p>
          )}

          {!boatsLoaded && <p className="text-center text-slate-200">{t('reservation.loading')}</p>}

          {invalid && (
            <div className={`${GLASS} p-6 text-center`}>
              <p className="text-white">{t('reservation.invalid')}</p>
              <Link
                to="/categorie"
                className="mt-4 inline-block text-sm font-semibold text-sky-400 hover:text-sky-300"
              >
                {t('reservation.backToCatalog')}
              </Link>
            </div>
          )}

          {boatsLoaded && !invalid && (
            <>
              {step < 3 && <Stepper step={step} />}

              {/* ── Étape 1 : récapitulatif ── */}
              {step === 0 && (
                <div className={`${GLASS} flex flex-col gap-4 p-6`}>
                  <h2 className="text-lg font-semibold text-white">
                    {t('reservation.recap.title')}
                  </h2>
                  {boat.images?.[0]?.url && (
                    <img
                      src={boat.images[0].url}
                      alt={boat.name}
                      className="h-44 w-full rounded-xl object-cover"
                    />
                  )}
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/70">{t('reservation.recap.dates')}</dt>
                      <dd className="text-right font-semibold text-white">
                        {fmtDay(start)} → {fmtDay(end)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-white/70">{t('reservation.recap.detail')}</dt>
                      <dd className="font-semibold text-white">
                        {t('reservation.recap.days', { count: dayCount, price })}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-white/20 pt-2 text-base">
                      <dt className="font-semibold text-white">{t('reservation.recap.total')}</dt>
                      <dd className="text-xl font-bold text-sky-400">{total} €</dd>
                    </div>
                  </dl>
                  <ErrorNote>{error}</ErrorNote>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link to={`/product/${idBoat}`} className={GHOST_BTN}>
                      {t('reservation.back')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleConfirmRecap}
                      disabled={busy}
                      className={PRIMARY_BTN}
                    >
                      {busy ? t('reservation.working') : t('reservation.recap.confirm')}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Étape 2 : documents ── */}
              {step === 1 && (
                <div className="flex flex-col gap-4">
                  <div className={`${GLASS} flex items-start gap-3 p-4`}>
                    <MdInfoOutline className="mt-0.5 shrink-0 text-lg text-sky-400" aria-hidden />
                    <p className="text-sm leading-relaxed text-slate-200">
                      {t('reservation.documents.intro')}
                    </p>
                  </div>
                  <div className={`${GLASS} p-6`}>
                    <DocumentsManager />
                  </div>
                  <ErrorNote>{error}</ErrorNote>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={() => goBack(0)} className={GHOST_BTN}>
                      {t('reservation.previous')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDocumentsContinue}
                      disabled={busy}
                      className={PRIMARY_BTN}
                    >
                      {busy ? t('reservation.working') : t('reservation.documents.continue')}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Étape 3 : paiement (formulaire de démonstration) ── */}
              {step === 2 && (
                <form
                  onSubmit={handlePay}
                  className={`${GLASS} flex flex-col gap-4 p-6`}
                  noValidate
                >
                  <h2 className="text-lg font-semibold text-white">
                    {t('reservation.payment.title')}
                  </h2>
                  <div className="flex justify-between rounded-lg bg-white/10 px-4 py-3 text-sm">
                    <span className="text-white/70">{t('reservation.payment.amount')}</span>
                    <span className="text-lg font-bold text-sky-400">{total} €</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-amber-300">
                    <MdLockOutline aria-hidden />
                    {t('reservation.payment.demo')}
                  </p>
                  <label className="flex flex-col gap-1 text-sm text-white/80">
                    {t('reservation.payment.name')}
                    <input
                      className={FIELD}
                      autoComplete="off"
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-white/80">
                    {t('reservation.payment.number')}
                    <input
                      className={FIELD}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="4242 4242 4242 4242"
                      value={card.number}
                      onChange={(e) =>
                        setCard({ ...card, number: formatCardNumber(e.target.value) })
                      }
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1 text-sm text-white/80">
                      {t('reservation.payment.expiry')}
                      <input
                        className={FIELD}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="MM/AA"
                        value={card.expiry}
                        onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-white/80">
                      {t('reservation.payment.cvc')}
                      <input
                        className={FIELD}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="123"
                        maxLength={4}
                        value={card.cvc}
                        onChange={(e) =>
                          setCard({ ...card, cvc: e.target.value.replace(/\D/g, '') })
                        }
                      />
                    </label>
                  </div>
                  <ErrorNote>{cardError || error}</ErrorNote>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={() => goBack(1)} className={GHOST_BTN}>
                      {t('reservation.previous')}
                    </button>
                    <button type="submit" disabled={busy} className={PRIMARY_BTN}>
                      {busy ? t('reservation.working') : t('reservation.payment.pay', { total })}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Confirmation ── */}
              {step === 3 && (
                <div className={`${GLASS} flex flex-col items-center gap-4 p-8 text-center`}>
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                    <MdCheck className="text-3xl text-white" aria-hidden />
                  </span>
                  <h2 className="text-xl font-bold text-white">{t('reservation.done.title')}</h2>
                  <p className="text-sm leading-relaxed text-slate-200">
                    {t('reservation.done.text', { boat: boat.name })}
                  </p>
                  {payment?.transaction_ref && (
                    <p className="text-xs text-white/60">
                      {t('reservation.done.ref', { ref: payment.transaction_ref })}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/locataire/reservations" className={PRIMARY_BTN}>
                      {t('reservation.done.myBookings')}
                    </Link>
                    <Link to="/categorie" className={GHOST_BTN}>
                      {t('reservation.backToCatalog')}
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default ReservationPage;
