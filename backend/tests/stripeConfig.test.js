import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let config = {};
jest.unstable_mockModule('../src/config/appConfig.js', () => ({ initConfig: () => config }));

const stripeInstance = {
  paymentIntents: { cancel: jest.fn(), retrieve: jest.fn() },
  refunds: { create: jest.fn() },
};
const StripeConstructor = jest.fn(() => stripeInstance);
jest.unstable_mockModule('stripe', () => ({ default: StripeConstructor }));

const { getStripe, isStripeRef, cancelIntentQuietly, refundIntent } =
  await import('../src/config/stripe.js');

beforeEach(() => {
  jest.clearAllMocks();
  config = { STRIPE_SECRET_KEY: 'sk_test_123' };
  stripeInstance.paymentIntents.retrieve.mockResolvedValue({ transfer_data: null });
  stripeInstance.refunds.create.mockResolvedValue({ id: 're_1' });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('isStripeRef', () => {
  it('reconnaît une référence de PaymentIntent', () => {
    expect(isStripeRef('pi_3abc')).toBe(true);
  });

  it.each([
    ['référence simulée', 'SIM-123'],
    ['chaîne vide', ''],
    ['valeur nulle', null],
    ['valeur absente', undefined],
    ['nombre', 42],
    ['objet', {}],
  ])('rejette une %s', (_label, ref) => {
    expect(isStripeRef(ref)).toBe(false);
  });
});

describe('getStripe', () => {
  it('renvoie null sans clé secrète', () => {
    config = { STRIPE_SECRET_KEY: '' };

    expect(getStripe()).toBeNull();
    expect(StripeConstructor).not.toHaveBeenCalled();
  });

  it('instancie le client avec la clé configurée', () => {
    expect(getStripe()).toBe(stripeInstance);
    expect(StripeConstructor).toHaveBeenCalledWith('sk_test_123');
  });

  it('mémorise le client : une fois construit, il n’est jamais reconstruit', () => {
    const first = getStripe();
    const second = getStripe();

    expect(second).toBe(first);
    expect(StripeConstructor).not.toHaveBeenCalled();
  });

  it('garde le client mémorisé même si la clé disparaît de la configuration', () => {
    config = { STRIPE_SECRET_KEY: '' };

    expect(getStripe()).toBe(stripeInstance);
  });
});

describe('cancelIntentQuietly', () => {
  it('annule l’empreinte correspondante', async () => {
    await cancelIntentQuietly('pi_3abc');

    expect(stripeInstance.paymentIntents.cancel).toHaveBeenCalledWith('pi_3abc');
  });

  it.each([
    ['référence simulée', 'SIM-123'],
    ['référence absente', undefined],
  ])('ne fait rien pour une %s', async (_label, ref) => {
    await cancelIntentQuietly(ref);

    expect(stripeInstance.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  it('reste silencieux si Stripe refuse l’annulation', async () => {
    stripeInstance.paymentIntents.cancel.mockRejectedValue(new Error('already canceled'));

    await expect(cancelIntentQuietly('pi_3abc')).resolves.toBeUndefined();
  });
});

describe('refundIntent', () => {
  it('rembourse intégralement quand aucun montant n’est précisé', async () => {
    await refundIntent('pi_3abc', null);

    expect(stripeInstance.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_3abc' });
  });

  it('convertit un montant en euros vers des centimes', async () => {
    await refundIntent('pi_3abc', 123.45);

    expect(stripeInstance.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_3abc',
      amount: 12345,
    });
  });

  it('arrondit les centimes au plus proche', async () => {
    await refundIntent('pi_3abc', 10.005);

    expect(stripeInstance.refunds.create.mock.calls[0][0].amount).toBe(1001);
  });

  it('reprend la part du propriétaire sur un paiement partagé', async () => {
    stripeInstance.paymentIntents.retrieve.mockResolvedValue({
      transfer_data: { destination: 'acct_1' },
    });

    await refundIntent('pi_3abc', null);

    expect(stripeInstance.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ reverse_transfer: true, refund_application_fee: false })
    );
  });

  it('rembourse aussi la commission quand c’est demandé', async () => {
    stripeInstance.paymentIntents.retrieve.mockResolvedValue({
      transfer_data: { destination: 'acct_1' },
    });

    await refundIntent('pi_3abc', null, { refundApplicationFee: true });

    expect(stripeInstance.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ refund_application_fee: true })
    );
  });

  it('n’ajoute pas de reprise de transfert sur un paiement non partagé', async () => {
    await refundIntent('pi_3abc', null);

    expect(stripeInstance.refunds.create.mock.calls[0][0]).not.toHaveProperty('reverse_transfer');
  });

  it.each([
    ['référence simulée', 'SIM-123'],
    ['référence absente', undefined],
  ])('renvoie null pour une %s', async (_label, ref) => {
    await expect(refundIntent(ref, null)).resolves.toBeNull();
    expect(stripeInstance.refunds.create).not.toHaveBeenCalled();
  });

  it('laisse remonter un échec de remboursement : de l’argent a été débité', async () => {
    stripeInstance.refunds.create.mockRejectedValue(new Error('charge already refunded'));

    await expect(refundIntent('pi_3abc', null)).rejects.toThrow('charge already refunded');
  });
});
