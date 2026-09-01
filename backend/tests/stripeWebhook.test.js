import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockPaymentFindFirst = jest.fn();
const mockPaymentUpdate = jest.fn();
const mockPaymentUpdateMany = jest.fn();
const mockBookingUpdateMany = jest.fn();
const db = {
  payment: {
    findFirst: mockPaymentFindFirst,
    update: mockPaymentUpdate,
    updateMany: mockPaymentUpdateMany,
  },
  booking: { updateMany: mockBookingUpdateMany },
};
jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    ...db,
    $transaction: jest.fn((arg) => (typeof arg === 'function' ? arg(db) : Promise.all(arg))),
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
    mockPaymentFindFirst
      .mockResolvedValueOnce({
        id_payment: 40,
        id_booking: 100,
        status: 'pending',
        payment_state: 'requires_capture',
      })
      .mockResolvedValueOnce(null);

    await handleStripeEvent(event('payment_intent.canceled', { id: 'pi_x' }));

    expect(mockPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_payment: 40 },
        data: expect.objectContaining({ status: 'failed', payment_state: 'failed' }),
      })
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

  it('ignore une capture dont la référence est inconnue de la base', async () => {
    await handleStripeEvent(event('payment_intent.succeeded', { id: 'pi_x' }));
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
  });

  it('ignore un remboursement dont la référence est inconnue de la base', async () => {
    await handleStripeEvent(
      event('charge.refunded', { payment_intent: 'pi_x', amount_refunded: 87500 })
    );
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
  });

  it('réconcilie une capture connue sous verrou et CAS', async () => {
    mockPaymentFindFirst.mockResolvedValue({
      id_payment: 41,
      id_booking: 101,
      status: 'pending',
      amount: 300,
      transaction_ref: 'pi_known',
      payment_state: 'requires_capture',
    });

    await handleStripeEvent(event('payment_intent.succeeded', { id: 'pi_known' }));

    expect(mockPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_payment: 41 },
        data: expect.objectContaining({ status: 'success', payment_state: 'succeeded' }),
      })
    );
  });

  it('marque une capture reçue pendant une libération pour réconciliation', async () => {
    mockPaymentFindFirst.mockResolvedValue({
      id_payment: 42,
      id_booking: 102,
      status: 'pending',
      amount: 300,
      transaction_ref: 'pi_releasing',
      payment_state: 'releasing',
    });

    await handleStripeEvent(event('payment_intent.succeeded', { id: 'pi_releasing' }));

    expect(mockPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_payment: 42 },
        data: expect.objectContaining({
          payment_state: 'reconciliation_required',
          reconciliation_error: expect.any(String),
        }),
      })
    );
  });

  it('refuse un remboursement Stripe supérieur au paiement enregistré', async () => {
    mockPaymentFindFirst.mockResolvedValue({
      id_payment: 43,
      id_booking: 103,
      status: 'success',
      amount: 300,
      transaction_ref: 'pi_over',
      payment_state: 'succeeded',
      refunded_amount: 0,
    });

    await handleStripeEvent(
      event('charge.refunded', { payment_intent: 'pi_over', amount_refunded: 30100 })
    );

    expect(mockPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_payment: 43 },
        data: expect.objectContaining({
          payment_state: 'reconciliation_required',
          reconciliation_error: expect.any(String),
        }),
      })
    );
  });

  it('ignore les événements inconnus', async () => {
    await handleStripeEvent(event('customer.created', {}));
    expect(mockPaymentUpdateMany).not.toHaveBeenCalled();
  });
});
