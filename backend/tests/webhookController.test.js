import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let stripe = null;
jest.unstable_mockModule('../src/config/stripe.js', () => ({ getStripe: () => stripe }));

let config = {};
jest.unstable_mockModule('../src/config/appConfig.js', () => ({ initConfig: () => config }));

const mockHandleStripeEvent = jest.fn();
jest.unstable_mockModule('../src/services/stripeWebhookService.js', () => ({
  handleStripeEvent: mockHandleStripeEvent,
}));

const { stripeWebhook } = await import('../src/controllers/webhookController.js');

const EVENT = { id: 'evt_1', type: 'payment_intent.succeeded' };

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const makeReq = (overrides = {}) => ({
  body: Buffer.from('{"corps":"brut"}'),
  headers: { 'stripe-signature': 'sig_abc' },
  ...overrides,
});

const stripeMock = () => ({ webhooks: { constructEvent: jest.fn(() => EVENT) } });

let res;

beforeEach(() => {
  jest.clearAllMocks();
  res = makeRes();
  stripe = stripeMock();
  config = { STRIPE_WEBHOOK_SECRET: 'whsec_test' };
  mockHandleStripeEvent.mockResolvedValue(undefined);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('webhook Stripe — configuration', () => {
  it('répond 503 quand Stripe n’est pas configuré', async () => {
    stripe = null;

    await stripeWebhook(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(mockHandleStripeEvent).not.toHaveBeenCalled();
  });

  it('répond 503 quand le secret de webhook est absent', async () => {
    config = { STRIPE_WEBHOOK_SECRET: '' };

    await stripeWebhook(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(503);
  });
});

describe('webhook Stripe — vérification de signature', () => {
  it('vérifie la signature sur le corps brut, jamais sur un objet parsé', async () => {
    const req = makeReq();

    await stripeWebhook(req, res);

    expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(req.body, 'sig_abc', 'whsec_test');
    expect(Buffer.isBuffer(stripe.webhooks.constructEvent.mock.calls[0][0])).toBe(true);
  });

  it('répond 400 sur une signature invalide, sans traiter l’événement', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found');
    });

    await stripeWebhook(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Signature invalide : No signatures found',
    });
    expect(mockHandleStripeEvent).not.toHaveBeenCalled();
  });

  it('répond 400 quand l’en-tête de signature est absent', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Missing stripe-signature header');
    });

    await stripeWebhook(makeReq({ headers: {} }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('webhook Stripe — traitement', () => {
  it('accuse réception après traitement réussi', async () => {
    await stripeWebhook(makeReq(), res);

    expect(mockHandleStripeEvent).toHaveBeenCalledWith(EVENT);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('répond 500 en cas d’échec de traitement, pour que Stripe rejoue', async () => {
    mockHandleStripeEvent.mockRejectedValue(new Error('Base injoignable'));

    await stripeWebhook(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Erreur de traitement.' });
  });

  it('n’expose pas le détail de l’erreur interne dans la réponse', async () => {
    mockHandleStripeEvent.mockRejectedValue(new Error('Connexion Postgres refusée sur 10.0.0.5'));

    await stripeWebhook(makeReq(), res);

    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('10.0.0.5');
  });
});
