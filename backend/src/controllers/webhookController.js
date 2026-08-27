import { getStripe } from '../config/stripe.js';
import { initConfig } from '../config/appConfig.js';
import { handleStripeEvent } from '../services/stripeWebhookService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

// Reçoit les événements Stripe (corps brut exigé pour vérifier la signature).
// Un 500 fait rejouer l'événement par Stripe jusqu'à traitement réussi.
export async function stripeWebhook(req, res) {
  const stripe = getStripe();
  const { STRIPE_WEBHOOK_SECRET } = initConfig();
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ message: 'Webhook Stripe non configuré.' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return sendError(res, err, { message: 'Signature Stripe invalide.' });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    if (res.locals) res.locals.apiErrorContext = { eventType: event.type };
    return sendError(res, err);
  }
  res.json({ received: true });
}
