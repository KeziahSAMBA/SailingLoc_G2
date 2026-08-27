import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockBookingFindMany = jest.fn();
const mockBookingFindUnique = jest.fn();
const mockBookingUpdateMany = jest.fn();
const mockPaymentUpdateMany = jest.fn();
const mockExecuteRaw = jest.fn();
const mockGetStripe = jest.fn();
const mockRefundIntent = jest.fn();

const db = {
  booking: {
    findMany: mockBookingFindMany,
    findUnique: mockBookingFindUnique,
    updateMany: mockBookingUpdateMany,
  },
  payment: { updateMany: mockPaymentUpdateMany },
  $executeRaw: mockExecuteRaw,
};

db.$transaction = jest.fn((arg) => (typeof arg === 'function' ? arg(db) : Promise.all(arg)));

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('../src/config/stripe.js', () => ({
  getStripe: mockGetStripe,
  isStripeRef: (ref) => typeof ref === 'string' && ref.startsWith('pi_'),
  refundIdempotencyKey: (ref, amount, operation) =>
    `test:${operation}:${ref}:${amount == null ? 'full' : amount}`,
  cancelIntentQuietly: jest.fn().mockResolvedValue(undefined),
  refundIntent: mockRefundIntent,
}));
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendBookingCancelledByLocataireEmail: jest.fn().mockResolvedValue(undefined),
}));

const { refuseExpiredPendingBookings } = await import('../src/services/bookingService.js');

describe('refuseExpiredPendingBookings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBookingFindMany.mockResolvedValue([{ id_booking: 7 }]);
    mockBookingFindUnique
      .mockResolvedValueOnce({
        id_booking: 7,
        status: 'pending',
        deleted_at: null,
        start_date: new Date('2026-08-26T00:00:00.000Z'),
        payments: [
          {
            id_payment: 12,
            status: 'pending',
            amount: 300,
            refunded_amount: 0,
            transaction_ref: 'pi_captured',
            payment_state: 'requires_capture',
          },
        ],
      })
      .mockResolvedValueOnce({ status: 'pending', deleted_at: null });
    mockBookingUpdateMany.mockResolvedValue({ count: 1 });
    mockPaymentUpdateMany.mockResolvedValue({ count: 1 });
    mockExecuteRaw.mockResolvedValue(1);
    mockGetStripe.mockReturnValue({
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({ status: 'succeeded' }),
      },
    });
    mockRefundIntent.mockResolvedValue({ status: 'succeeded', amount: 10000 });
  });

  it('keeps a partial refund in reconciliation and leaves the booking pending', async () => {
    const result = await refuseExpiredPendingBookings(new Date('2026-08-27T12:00:00.000Z'));

    const paymentWrites = mockPaymentUpdateMany.mock.calls.map(([args]) => args);
    const finalWrite = paymentWrites.find(({ data }) => data.status === 'success');

    expect(finalWrite).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({ id_payment: 12, status: 'pending' }),
        data: expect.objectContaining({
          status: 'success',
          payment_state: 'partially_refunded',
          refunded_amount: 100,
        }),
      })
    );
    expect(mockBookingUpdateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'refused' }) })
    );
    expect(result).toBe(0);
  });

  it('uses a new exact remaining amount and idempotency key on the next sweep', async () => {
    let bookingStatus = 'pending';
    let payment = {
      id_payment: 12,
      status: 'success',
      amount: 300,
      refunded_amount: 0,
      transaction_ref: 'pi_captured',
      payment_state: 'succeeded',
    };

    mockBookingFindUnique.mockReset().mockImplementation(async ({ select }) => {
      if (select?.payments) {
        return {
          id_booking: 7,
          status: bookingStatus,
          deleted_at: null,
          start_date: new Date('2026-08-26T00:00:00.000Z'),
          payments: [{ ...payment }],
        };
      }
      return { status: bookingStatus, deleted_at: null };
    });
    mockPaymentUpdateMany.mockReset().mockImplementation(async ({ data }) => {
      payment = { ...payment, ...data };
      return { count: 1 };
    });
    mockBookingUpdateMany.mockReset().mockImplementation(async ({ data }) => {
      bookingStatus = data.status || bookingStatus;
      return { count: 1 };
    });
    mockGetStripe.mockReturnValue({
      paymentIntents: {
        retrieve: jest.fn().mockResolvedValue({ status: 'succeeded' }),
      },
    });
    mockRefundIntent
      .mockReset()
      .mockResolvedValueOnce({ status: 'succeeded', amount: 10000 })
      .mockResolvedValueOnce({ status: 'succeeded', amount: 20000 });

    expect(await refuseExpiredPendingBookings(new Date('2026-08-27T12:00:00.000Z'))).toBe(0);
    expect(await refuseExpiredPendingBookings(new Date('2026-08-27T12:00:00.000Z'))).toBe(1);

    expect(mockRefundIntent).toHaveBeenNthCalledWith(
      1,
      'pi_captured',
      300,
      expect.objectContaining({
        idempotencyKey: 'test:expire-after-capture:pi_captured:300',
      })
    );
    expect(mockRefundIntent).toHaveBeenNthCalledWith(
      2,
      'pi_captured',
      200,
      expect.objectContaining({
        idempotencyKey: 'test:expire-after-capture:pi_captured:200',
      })
    );
    expect(payment).toEqual(expect.objectContaining({ status: 'refunded', refunded_amount: 300 }));
  });
});
