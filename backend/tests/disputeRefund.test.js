import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockDisputeFindUnique = jest.fn();
const mockDisputeUpdate = jest.fn();
const mockPaymentUpdate = jest.fn();
jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    dispute: { findUnique: mockDisputeFindUnique, update: mockDisputeUpdate },
    payment: { update: mockPaymentUpdate },
  },
}));

const mockRefundIntent = jest.fn().mockResolvedValue({ id: 're_1' });
jest.unstable_mockModule('../src/config/stripe.js', () => ({
  refundIntent: mockRefundIntent,
}));

jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendDisputeDecisionEmail: jest.fn().mockResolvedValue(),
}));

const { setDisputeStatus } = await import('../src/services/bookingAdminService.js');

function dispute(overrides = {}) {
  return {
    id_dispute: 3,
    status: 'open',
    booking: {
      user: { first_name: 'Lea', email: 'lea@example.com' },
      boat: { name: 'Pen Duick', owner: { first_name: 'Luc', email: 'luc@example.com' } },
      payments: [
        {
          id_payment: 12,
          status: 'success',
          amount: '300',
          commission: '30',
          transaction_ref: 'pi_test_123',
        },
      ],
    },
    ...overrides,
  };
}

describe('setDisputeStatus (remboursement litige via Stripe)', () => {
  beforeEach(() => {
    mockDisputeFindUnique.mockReset();
    mockDisputeUpdate.mockReset().mockResolvedValue({ id_dispute: 3, status: 'resolved' });
    mockPaymentUpdate
      .mockReset()
      .mockImplementation(({ data }) => Promise.resolve({ id_payment: 12, ...data }));
    mockRefundIntent.mockClear();
  });

  it('rembourse le pourcentage accordé sur Stripe et en base', async () => {
    mockDisputeFindUnique.mockResolvedValue(dispute());

    await setDisputeStatus(3, 'resolved', 'Geste commercial', { refund_percent: 50 });

    expect(mockRefundIntent).toHaveBeenCalledWith('pi_test_123', 150);
    expect(mockPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_payment: 12 },
        data: expect.objectContaining({ status: 'refunded', refunded_amount: 150 }),
      })
    );
  });

  it('plafonne le remboursement Stripe au montant débité (commission incluse)', async () => {
    mockDisputeFindUnique.mockResolvedValue(dispute());

    await setDisputeStatus(3, 'resolved', null, {
      refund_percent: 100,
      refund_commission: true,
    });

    expect(mockRefundIntent).toHaveBeenCalledWith('pi_test_123', 300);
  });

  it('ne rembourse rien quand le litige est rejeté', async () => {
    mockDisputeFindUnique.mockResolvedValue(dispute());
    mockDisputeUpdate.mockResolvedValue({ id_dispute: 3, status: 'rejected' });

    await setDisputeStatus(3, 'rejected', 'Demande injustifiée');

    expect(mockRefundIntent).not.toHaveBeenCalled();
    expect(mockPaymentUpdate).not.toHaveBeenCalled();
  });
});
