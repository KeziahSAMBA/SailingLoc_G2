import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockPaymentFindFirst = jest.fn();
const mockPaymentUpdate = jest.fn();
const mockPaymentUpdateMany = jest.fn();
const mockBookingUpdateMany = jest.fn();
jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    payment: {
      findFirst: mockPaymentFindFirst,
      update: mockPaymentUpdate,
      updateMany: mockPaymentUpdateMany,
    },
    booking: { updateMany: mockBookingUpdateMany },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  },
}));

const { handleStripeEvent } = await import('../src/services/stripeWebhookService.js');

const event = (type, object) => ({ type, data: { object } });

describe('handleStripeEvent', () => {
  beforeEach(() => {
    mockPaymentFindFirst.mockReset();
    mockPaymentUpdate.mockReset().mockResolvedValue({});
    mockPaymentUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockBookingUpdateMany.mockReset().mockResolvedValue({ count: 0 });
  });

  it('empreinte expirée : paiement failed et demande annulée', async () => {
    mockPaymentFindFirst.mockResolvedValue({ id_payment: 40, id_booking: 100 });

    await handleStripeEvent(event('payment_intent.canceled', { id: 'pi_x' }));

    expect(mockPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_payment: 40 }, data: { status: 'failed' } })
    );
    expect(mockBookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id_booking: 100, status: 'pending' }),
        data: expect.objectContaining({ status: 'cancelled' }),
      })
    );
  });

  it('annulation déjà traitée par nos flux : no-op', async () => {
    mockPaymentFindFirst.mockResolvedValue(null);
    await handleStripeEvent(event('payment_intent.canceled', { id: 'pi_x' }));
    expect(mockPaymentUpdate).not.toHaveBeenCalled();
    expect(mockBookingUpdateMany).not.toHaveBeenCalled();
  });

  it('réconcilie une capture inconnue de la base', async () => {
    await handleStripeEvent(event('payment_intent.succeeded', { id: 'pi_x' }));
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith({
      where: { transaction_ref: 'pi_x', status: 'pending' },
      data: { status: 'success' },
    });
  });

  it('reflète un remboursement fait depuis le dashboard Stripe', async () => {
    await handleStripeEvent(
      event('charge.refunded', { payment_intent: 'pi_x', amount_refunded: 87500 })
    );
    expect(mockPaymentUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transaction_ref: 'pi_x', status: 'success' },
        data: expect.objectContaining({ status: 'refunded', refunded_amount: 875 }),
      })
    );
  });

  it('ignore les événements inconnus', async () => {
    await handleStripeEvent(event('customer.created', {}));
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
  });
});
