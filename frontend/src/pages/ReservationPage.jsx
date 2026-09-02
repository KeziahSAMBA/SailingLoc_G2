import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdCheck, MdLockOutline } from 'react-icons/md';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { fetchBoats } from '../services/boatService.js';
import { createBooking, payBooking } from '../services/bookingService.js';
import { getMyDocuments } from '../services/documentService.js';
import {
  saveReservationResume,
  loadReservationResume,
  clearReservationResume,
} from '../utils/reservationResume.js';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.webp';
import SafeImage from '../components/common/SafeImage.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Jours facturés : bornes incluses, même calcul que la page produit.
function countDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  return Math.round((new Date(endStr) - new Date(startStr)) / 86400000) + 1;
}

// Doit correspondre à DOCUMENT_TYPES.locataire côté backend.
const REQUIRED_DOC_TYPES = ['permis_conduire', 'piece_identite', 'cv_nautique'];

const GLASS = 'rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl';
const FIELD =
  'w-full rounded-lg border border-glass/30 bg-surface/10 px-4 py-2.5 text-on-dark placeholder-on-dark/40 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30';
const PRIMARY_BTN =
  'rounded-full bg-action px-8 py-2.5 text-sm font-semibold text-on-dark shadow-lg transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50';
const GHOST_BTN =
  'rounded-full border border-glass/40 px-6 py-2.5 text-sm font-semibold text-on-dark transition hover:bg-surface/10';

// Clé publique Stripe (mode test, pk_test_…). Absente : le formulaire de carte
// simulé historique reste utilisé, en cohérence avec le backend sans clé.
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

// Style du champ carte Stripe (iframe) accordé au thème sombre de la page.
const CARD_ELEMENT_OPTIONS = {
  hidePostalCode: true,
  style: {
    base: {
      color: '#ffffff',
      fontSize: '16px',
      '::placeholder': { color: 'rgba(255,255,255,0.4)' },
      iconColor: '#7dd3fc',
    },
    invalid: { color: '#fca5a5', iconColor: '#fca5a5' },
  },
};

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
  const steps = [t('reservation.steps.recap'), t('reservation.steps.payment')];
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
                  ? 'bg-emerald-500 text-on-dark'
                  : state === 'current'
                    ? 'bg-action text-on-dark'
                    : 'bg-surface/20 text-on-dark/60'
              }`}
            >
              {state === 'done' ? <MdCheck aria-hidden /> : i + 1}
            </span>
            <span
              className={`text-xs font-semibold sm:text-sm ${
                state === 'current' ? 'text-on-dark' : 'text-on-dark/60'
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-4 bg-surface/30 sm:w-8" aria-hidden />}
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

// Formulaire de paiement Stripe Elements : la carte est saisie dans un champ
// hébergé par Stripe (iframe) — aucune donnée bancaire ne transite par nos
// serveurs ni même par notre JavaScript (conformité PCI-DSS). L'empreinte est
// posée ici ; le débit n'a lieu qu'à la confirmation du propriétaire.
function StripeCardForm({ idBooking, total, onPaid, onBack }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!name.trim()) {
      setError(t('reservation.payment.errors.name'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Crée (ou reprend, après une carte refusée) l'intention de paiement…
      const { data } = await payBooking(idBooking);
      if (!data.client_secret) {
        // Backend sans clé Stripe : paiement simulé, rien à confirmer.
        onPaid(data.payment);
        return;
      }
      // …puis pose l'empreinte : la carte part directement chez Stripe.
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: name.trim() },
        },
      });
      if (result.error) {
        // Message Stripe déjà humain (carte refusée, fonds insuffisants…).
        setError(result.error.message || t('reservation.errors.payFailed'));
        return;
      }
      onPaid(data.payment);
    } catch (err) {
      setError(err.response?.data?.message || t('reservation.errors.payFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${GLASS} flex flex-col gap-4 p-6`} noValidate>
      <h2 className="text-lg font-semibold text-on-dark">{t('reservation.payment.title')}</h2>
      <div className="flex justify-between rounded-lg bg-surface/10 px-4 py-3 text-sm">
        <span className="text-on-dark/70">{t('reservation.payment.amount')}</span>
        <span className="text-lg font-bold text-sky-400">{total} €</span>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-amber-300">
        <MdLockOutline aria-hidden />
        {t('reservation.payment.stripeTest')}
      </p>
      <label className="flex flex-col gap-1 text-sm text-on-dark/80">
        {t('reservation.payment.name')}
        <input
          className={FIELD}
          autoComplete="cc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className="flex flex-col gap-1 text-sm text-on-dark/80">
        <span>{t('reservation.payment.card')}</span>
        <div className={`${FIELD} py-3`}>
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={GHOST_BTN}>
          {t('reservation.previous')}
        </button>
        <button type="submit" disabled={busy || !stripe} className={PRIMARY_BTN}>
          {busy ? t('reservation.working') : t('reservation.payment.pay', { total })}
        </button>
      </div>
    </form>
  );
}

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

  // Reprise d'un tunnel interrompu (session expirée) : même bateau, mêmes
  // dates, sauvegarde de moins de 15 minutes — sinon on démarre au récap.
  const resumePath = `/reservation/${idBoat}?start=${start}&end=${end}`;
  const [resume] = useState(() => {
    const saved = loadReservationResume();
    return saved && saved.path === resumePath ? saved : null;
  });

  // 0 = récap, 1 = paiement, 2 = confirmation.
  const [step, setStep] = useState(resume && resume.step < 2 ? resume.step : 0);
  // Chaque étape repart du haut de page (les étapes n'ont pas la même hauteur).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);
  const [booking, setBooking] = useState(
    resume?.id_booking ? { id_booking: resume.id_booking } : null
  );
  const [payment, setPayment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Documents non validés : affiche un lien vers leur gestion sous le récap.
  const [docsBlocked, setDocsBlocked] = useState(false);

  const dayCount = countDays(start, end);
  const price = boat ? Number(boat.daily_price) : 0;
  const total = dayCount * price;

  // Conservation 15 min : l'état du tunnel est sauvegardé à chaque progression
  // (fenêtre glissante), puis purgé une fois la confirmation atteinte.
  useEffect(() => {
    if (dayCount <= 0) return;
    if (step >= 2) {
      clearReservationResume();
      return;
    }
    saveReservationResume({
      path: resumePath,
      step,
      id_booking: booking?.id_booking ?? null,
    });
  }, [dayCount, resumePath, step, booking]);

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

  // Récap → vérifie d'abord que les 3 documents locataire sont validés par
  // l'admin, puis crée la réservation « pending ». Documents non validés : on
  // bloque sans créer de demande. Au retour du paiement, la demande existe déjà.
  async function handleConfirmRecap() {
    setBusy(true);
    setError('');
    setDocsBlocked(false);
    try {
      const { data } = await getMyDocuments();
      const docs = data.documents || [];
      const allValidated = REQUIRED_DOC_TYPES.every((type) =>
        docs.some((d) => d.type === type && d.status === 'validated')
      );
      if (!allValidated) {
        setDocsBlocked(true);
        setError(t('reservation.documents.notValidated'));
        setBusy(false);
        return;
      }
    } catch {
      setError(t('reservation.errors.checkFailed'));
      setBusy(false);
      return;
    }
    try {
      if (!booking) {
        const { data } = await createBooking(boat.id_boat, start, end);
        setBooking(data.booking);
      }
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || t('reservation.errors.createFailed'));
    } finally {
      setBusy(false);
    }
  }

  // Paiement → formulaire de carte purement visuel : seules l'identité de la
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
      setStep(2);
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
      <div className="min-h-screen w-full bg-overlay/50 px-4 pt-[120px] pb-16">
        <section className="mx-auto w-full max-w-2xl">
          <h1 className="mb-2 text-center text-3xl font-bold text-on-dark">
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
              <p className="text-on-dark">{t('reservation.invalid')}</p>
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
              {step < 2 && <Stepper step={step} />}

              {/* ── Étape 1 : récapitulatif ── */}
              {step === 0 && (
                <div className={`${GLASS} flex flex-col gap-4 p-6`}>
                  <h2 className="text-lg font-semibold text-on-dark">
                    {t('reservation.recap.title')}
                  </h2>
                  <SafeImage
                    src={boat.images?.[0]?.url}
                    alt={t('carrousel.boatImageAlt', { name: boat.name })}
                    className="h-44 w-full rounded-xl object-cover"
                    fallbackClassName="flex h-44 w-full items-center justify-center rounded-xl bg-slate-800 text-4xl"
                  />
                  <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-on-dark/70">{t('reservation.recap.dates')}</dt>
                      <dd className="text-right font-semibold text-on-dark">
                        {fmtDay(start)} → {fmtDay(end)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-on-dark/70">{t('reservation.recap.detail')}</dt>
                      <dd className="font-semibold text-on-dark">
                        {t('reservation.recap.days', { count: dayCount, price })}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-glass/20 pt-2 text-base">
                      <dt className="font-semibold text-on-dark">{t('reservation.recap.total')}</dt>
                      <dd className="text-xl font-bold text-sky-400">{total} €</dd>
                    </div>
                  </dl>
                  <ErrorNote>{error}</ErrorNote>
                  {docsBlocked && (
                    <Link
                      to="/locataire/documents"
                      className="self-start text-sm font-semibold text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline"
                    >
                      {t('reservation.documents.manageLink')}
                    </Link>
                  )}
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

              {/* ── Étape 2 : paiement — Stripe Elements si la clé publique est
                  configurée, sinon formulaire de démonstration historique ── */}
              {step === 1 && stripePromise && (
                <Elements stripe={stripePromise}>
                  <StripeCardForm
                    idBooking={booking?.id_booking}
                    total={total}
                    onBack={() => goBack(0)}
                    onPaid={(paid) => {
                      setPayment(paid);
                      setStep(2);
                    }}
                  />
                </Elements>
              )}
              {step === 1 && !stripePromise && (
                <form
                  onSubmit={handlePay}
                  className={`${GLASS} flex flex-col gap-4 p-6`}
                  noValidate
                >
                  <h2 className="text-lg font-semibold text-on-dark">
                    {t('reservation.payment.title')}
                  </h2>
                  <div className="flex justify-between rounded-lg bg-surface/10 px-4 py-3 text-sm">
                    <span className="text-on-dark/70">{t('reservation.payment.amount')}</span>
                    <span className="text-lg font-bold text-sky-400">{total} €</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-amber-300">
                    <MdLockOutline aria-hidden />
                    {t('reservation.payment.demo')}
                  </p>
                  <label className="flex flex-col gap-1 text-sm text-on-dark/80">
                    {t('reservation.payment.name')}
                    <input
                      className={FIELD}
                      autoComplete="off"
                      value={card.name}
                      onChange={(e) => setCard({ ...card, name: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-on-dark/80">
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
                    <label className="flex flex-col gap-1 text-sm text-on-dark/80">
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
                    <label className="flex flex-col gap-1 text-sm text-on-dark/80">
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
                    <button type="button" onClick={() => goBack(0)} className={GHOST_BTN}>
                      {t('reservation.previous')}
                    </button>
                    <button type="submit" disabled={busy} className={PRIMARY_BTN}>
                      {busy ? t('reservation.working') : t('reservation.payment.pay', { total })}
                    </button>
                  </div>
                </form>
              )}

              {/* ── Confirmation ── */}
              {step === 2 && (
                <div className={`${GLASS} flex flex-col items-center gap-4 p-8 text-center`}>
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500">
                    <MdCheck className="text-3xl text-on-dark" aria-hidden />
                  </span>
                  <h2 className="text-xl font-bold text-on-dark">{t('reservation.done.title')}</h2>
                  <p className="text-sm leading-relaxed text-slate-200">
                    {t('reservation.done.text', { boat: boat.name })}
                  </p>
                  {payment?.transaction_ref && (
                    <p className="text-xs text-on-dark/60">
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
