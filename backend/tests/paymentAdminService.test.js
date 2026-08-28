import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  payment: { findMany: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { listPayments, paymentStats } = await import('../src/services/paymentAdminService.js');

const storedPayment = (overrides = {}) => ({
  id_payment: 1,
  transaction_ref: 'pi_123',
  payment_date: new Date('2026-06-01'),
  payment_method: 'card',
  status: 'success',
  amount: '700.00',
  commission: '70.00',
  refunded_amount: null,
  refunded_at: null,
  refund_reason: null,
  id_dispute: null,
  booking: {
    id_booking: 5,
    start_date: new Date('2026-07-01'),
    end_date: new Date('2026-07-08'),
    boat: { name: 'Pen Duick' },
    user: { first_name: 'Lea', last_name: 'Marin', email: 'lea@example.com' },
  },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.payment.findMany.mockResolvedValue([]);
  db.payment.aggregate.mockResolvedValue({
    _sum: { amount: null, commission: null },
    _count: { _all: 0 },
  });
  db.payment.groupBy.mockResolvedValue([]);
});

describe('listPayments', () => {
  it('ne filtre pas par défaut et trie du plus récent', async () => {
    await listPayments();

    expect(db.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { payment_date: 'desc' } })
    );
  });

  it('filtre sur le statut et la méthode, espaces rognés', async () => {
    await listPayments({ status: '  success  ', method: '  card  ' });

    expect(db.payment.findMany.mock.calls[0][0].where).toMatchObject({
      status: 'success',
      payment_method: 'card',
    });
  });

  it.each([
    ['statut vide', { status: '   ' }],
    ['méthode vide', { method: '' }],
    ['recherche vide', { search: '  ' }],
  ])('ignore un filtre avec %s', async (_label, filters) => {
    await listPayments(filters);

    expect(db.payment.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('cherche sur la référence, le bateau et le locataire', async () => {
    await listPayments({ search: '  pi_123  ' });

    expect(db.payment.findMany.mock.calls[0][0].where.OR).toEqual([
      { transaction_ref: { contains: 'pi_123', mode: 'insensitive' } },
      { booking: { boat: { name: { contains: 'pi_123', mode: 'insensitive' } } } },
      { booking: { user: { email: { contains: 'pi_123', mode: 'insensitive' } } } },
      { booking: { user: { last_name: { contains: 'pi_123', mode: 'insensitive' } } } },
    ]);
  });

  it('convertit les montants et aplatit la réservation', async () => {
    db.payment.findMany.mockResolvedValue([storedPayment()]);

    const [payment] = await listPayments();

    expect(payment).toMatchObject({
      amount: 700,
      commission: 70,
      booking: {
        id_booking: 5,
        boat_name: 'Pen Duick',
        guest_first_name: 'Lea',
        guest_email: 'lea@example.com',
      },
    });
  });

  it('remplace des montants absents par zéro', async () => {
    db.payment.findMany.mockResolvedValue([storedPayment({ amount: null, commission: null })]);

    const [payment] = await listPayments();

    expect(payment).toMatchObject({ amount: 0, commission: 0 });
  });

  it('expose les informations de remboursement', async () => {
    db.payment.findMany.mockResolvedValue([
      storedPayment({ refunded_amount: '350', refund_reason: 'Litige', id_dispute: 9 }),
    ]);

    const [payment] = await listPayments();

    expect(payment).toMatchObject({
      refunded_amount: 350,
      refund_reason: 'Litige',
      id_dispute: 9,
    });
  });

  it('tolère un paiement sans réservation rattachée', async () => {
    db.payment.findMany.mockResolvedValue([storedPayment({ booking: null })]);

    const [payment] = await listPayments();

    expect(payment.booking).toBeNull();
  });

  it('tolère une réservation sans bateau ni locataire', async () => {
    db.payment.findMany.mockResolvedValue([
      storedPayment({ booking: { id_booking: 5, boat: null, user: null } }),
    ]);

    const [payment] = await listPayments();

    expect(payment.booking).toMatchObject({ boat_name: null, guest_email: null });
  });
});

describe('paymentStats', () => {
  it('n’agrège que les paiements aboutis', async () => {
    await paymentStats();

    expect(db.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'success' } })
    );
  });

  it('renvoie les totaux convertis', async () => {
    db.payment.aggregate.mockResolvedValue({
      _sum: { amount: '4200.50', commission: '420.05' },
      _count: { _all: 6 },
    });

    const stats = await paymentStats();

    expect(stats).toMatchObject({
      total_volume: 4200.5,
      total_commission: 420.05,
      success_count: 6,
    });
  });

  it('renvoie des totaux à zéro sans aucun paiement abouti', async () => {
    const stats = await paymentStats();

    expect(stats).toMatchObject({ total_volume: 0, total_commission: 0, success_count: 0 });
  });

  it('ventile les comptages par statut, les manquants restant à zéro', async () => {
    db.payment.groupBy.mockResolvedValue([
      { status: 'success', _count: { _all: 6 } },
      { status: 'refunded', _count: { _all: 2 } },
    ]);

    const { counts } = await paymentStats();

    expect(counts).toEqual({ pending: 0, success: 6, failed: 0, refunded: 2 });
  });
});
