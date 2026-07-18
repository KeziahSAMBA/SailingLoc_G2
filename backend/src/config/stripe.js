import Stripe from 'stripe';
import { initConfig } from './appConfig.js';

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
export async function cancelIntentQuietly(ref) {
  const stripe = getStripe();
  if (!stripe || !isStripeRef(ref)) return;
  try {
    await stripe.paymentIntents.cancel(ref);
  } catch (err) {
    console.warn('[stripe] annulation empreinte :', err.message);
  }
}

// Remboursement intégral d'un paiement capturé — contrairement à la libération
// d'empreinte, un échec ici doit remonter : de l'argent a réellement été débité.
export async function refundIntent(ref) {
  const stripe = getStripe();
  if (!stripe || !isStripeRef(ref)) return null;
  return stripe.refunds.create({ payment_intent: ref });
}
