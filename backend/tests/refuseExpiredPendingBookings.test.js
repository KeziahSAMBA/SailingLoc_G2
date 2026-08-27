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
});
