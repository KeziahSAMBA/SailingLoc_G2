import Stripe from 'stripe';
import { initConfig } from './appConfig.js';
import { logSanitizedError } from '../utils/privacy.js';

// Client Stripe partagé (mode test : clé sk_test_…). Sans STRIPE_SECRET_KEY,
// getStripe() renvoie null et le paiement reste simulé comme avant — les
// coéquipiers sans clés et les tests ne dépendent jamais de Stripe.
let client = null;

export function getStripe() {
  if (client) return client;
  const { STRIPE_SECRET_KEY } = initConfig();
  if (!STRIPE_SECRET_KEY) return null;
  client = new Stripe(STRIPE_SECRET_KEY);
  return client;
}

// Les paiements historiques simulés portent une référence « SIM-… » : seules
// les références « pi_… » correspondent à un PaymentIntent Stripe.
export const isStripeRef = (ref) => typeof ref === 'string' && ref.startsWith('pi_');

// Libération best-effort d'une empreinte non capturée : une empreinte déjà
// annulée ou expirée côté Stripe ne doit pas bloquer la libération en base
// (au pire, la banque relâche l'autorisation à son expiration).
function requestOptions(idempotencyKey) {
  return idempotencyKey ? { idempotencyKey: String(idempotencyKey).slice(0, 255) } : undefined;
}

// Stripe accepte plusieurs livraisons d'une même demande ; les opérations
// métier utilisent des clés déterministes afin qu'un retry réseau ne crée pas
// une seconde capture ou un second remboursement.
export function paymentIntentIdempotencyKey(ref, operation) {
  return `sailingloc:payment-intent:${String(ref)}:${String(operation)}`.slice(0, 255);
}

export function refundIdempotencyKey(ref, amount, operation = 'refund') {
  const cents = amount == null ? 'full' : Math.max(0, Math.round(Number(amount) * 100));
  return `sailingloc:${operation}:${String(ref)}:${cents}`.slice(0, 255);
}

export async function cancelIntentQuietly(ref, { idempotencyKey } = {}) {
  const stripe = getStripe();
  if (!stripe || !isStripeRef(ref)) return;
  try {
    await stripe.paymentIntents.cancel(
      ref,
      {},
      requestOptions(idempotencyKey || paymentIntentIdempotencyKey(ref, 'cancel'))
    );
  } catch (err) {
    logSanitizedError('stripe: annulation empreinte', err, 'warn');
  }
}

// Remboursement d'un paiement capturé : intégral sans `amount`, partiel sinon
// (`amount` en euros). Un échec doit remonter — de l'argent a été débité.
// Sur un paiement partagé (Connect), la part du proprio est reprise
// automatiquement ; `refundApplicationFee` rembourse aussi la commission.
export async function refundIntent(
  ref,
  amount,
  { refundApplicationFee = false, idempotencyKey, operation = 'refund' } = {}
) {
  const stripe = getStripe();
  if (!stripe || !isStripeRef(ref)) return null;
  const intent = await stripe.paymentIntents.retrieve(ref);
  const shared = Boolean(intent.transfer_data);
  const params = {
    payment_intent: ref,
    ...(amount != null && { amount: Math.round(amount * 100) }),
    ...(shared && { reverse_transfer: true, refund_application_fee: refundApplicationFee }),
  };
  return stripe.refunds.create(
    params,
    requestOptions(idempotencyKey || refundIdempotencyKey(ref, amount, operation))
  );
}
