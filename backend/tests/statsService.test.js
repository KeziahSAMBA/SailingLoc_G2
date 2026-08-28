import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  user: { count: jest.fn() },
  booking: { count: jest.fn(), groupBy: jest.fn() },
  payment: { aggregate: jest.fn() },
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { getAdminStats } = await import('../src/services/statsService.js');

beforeEach(() => {
  jest.clearAllMocks();
  db.user.count.mockResolvedValue(0);
  db.booking.count.mockResolvedValue(0);
  db.booking.groupBy.mockResolvedValue([]);
  db.payment.aggregate.mockResolvedValue({ _sum: { amount: null, commission: null } });
  db.$queryRaw.mockResolvedValue([]);
});

describe('getAdminStats', () => {
  it('renvoie les compteurs globaux', async () => {
    db.user.count.mockResolvedValue(120);
    db.booking.count.mockResolvedValue(48);

    const stats = await getAdminStats();

    expect(stats).toMatchObject({ users: 120, bookings: 48 });
  });

  it('exclut les enregistrements supprimés des compteurs', async () => {
    await getAdminStats();

    expect(db.user.count).toHaveBeenCalledWith({ where: { deleted_at: null } });
    expect(db.booking.count).toHaveBeenCalledWith({ where: { deleted_at: null } });
  });

  it('ne compte que les paiements aboutis dans le chiffre d’affaires', async () => {
    await getAdminStats();

    expect(db.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'success' } })
    );
  });

  it('convertit les montants agrégés', async () => {
    db.payment.aggregate.mockResolvedValue({
      _sum: { amount: '12500.75', commission: '1250.07' },
    });

    const stats = await getAdminStats();

    expect(stats).toMatchObject({ revenue: 12500.75, commission: 1250.07 });
  });

  it('renvoie zéro quand aucun paiement n’a abouti', async () => {
    const stats = await getAdminStats();

    expect(stats).toMatchObject({ revenue: 0, commission: 0 });
  });

  it('met à plat la répartition des réservations par statut', async () => {
    db.booking.groupBy.mockResolvedValue([
      { status: 'confirmed', _count: { _all: 30 } },
      { status: 'pending', _count: { _all: 8 } },
    ]);

    const { bookingsByStatus } = await getAdminStats();

    expect(bookingsByStatus).toEqual([
      { status: 'confirmed', count: 30 },
      { status: 'pending', count: 8 },
    ]);
  });

  it('renvoie les trois séries mensuelles issues des requêtes SQL', async () => {
    db.$queryRaw
      .mockResolvedValueOnce([{ month: '2026-06', count: 12 }])
      .mockResolvedValueOnce([{ month: '2026-06', revenue: 8400 }])
      .mockResolvedValueOnce([{ month: '2026-06', commission: 840 }]);

    const stats = await getAdminStats();

    expect(stats.bookingsByMonth).toEqual([{ month: '2026-06', count: 12 }]);
    expect(stats.revenueByMonth).toEqual([{ month: '2026-06', revenue: 8400 }]);
    expect(stats.commissionByMonth).toEqual([{ month: '2026-06', commission: 840 }]);
  });

  it('tolère une base vide', async () => {
    const stats = await getAdminStats();

    expect(stats).toMatchObject({
      users: 0,
      bookings: 0,
      bookingsByStatus: [],
      bookingsByMonth: [],
    });
  });
});
