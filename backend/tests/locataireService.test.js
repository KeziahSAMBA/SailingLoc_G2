import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  booking: { count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
  userBoatFavorite: {
    count: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  message: { count: jest.fn() },
  document: { findMany: jest.fn() },
  payment: { findMany: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const {
  getDashboardStats,
  listPayments,
  listBookings,
  listFavorites,
  addFavorite,
  removeFavorite,
} = await import('../src/services/locataireService.js');

const GUEST = 1;

beforeEach(() => {
  jest.clearAllMocks();
  db.booking.count.mockResolvedValue(0);
  db.booking.findFirst.mockResolvedValue(null);
  db.booking.findMany.mockResolvedValue([]);
  db.userBoatFavorite.count.mockResolvedValue(0);
  db.userBoatFavorite.findMany.mockResolvedValue([]);
  db.userBoatFavorite.upsert.mockResolvedValue({});
  db.userBoatFavorite.deleteMany.mockResolvedValue({ count: 0 });
  db.message.count.mockResolvedValue(0);
  db.document.findMany.mockResolvedValue([]);
  db.payment.findMany.mockResolvedValue([]);
});

describe('getDashboardStats — compteurs', () => {
  it('remonte les compteurs agrégés', async () => {
    db.booking.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    db.userBoatFavorite.count.mockResolvedValue(5);
    db.message.count.mockResolvedValue(4);

    const stats = await getDashboardStats(GUEST);

    expect(stats).toMatchObject({
      activeBookings: 3,
      favorites: 5,
      unreadMessages: 4,
      reviewsToLeave: 2,
    });
  });

  it('compte les documents en attente ou refusés', async () => {
    db.document.findMany.mockResolvedValue([
      { type: 'permis_conduire', status: 'pending' },
      { type: 'piece_identite', status: 'refused' },
      { type: 'cv_nautique', status: 'validated' },
    ]);

    const { pendingDocuments } = await getDashboardStats(GUEST);

    expect(pendingDocuments).toBe(2);
  });

  it('compte les types obligatoires jamais déposés', async () => {
    db.document.findMany.mockResolvedValue([{ type: 'permis_conduire', status: 'validated' }]);

    const { missingDocuments } = await getDashboardStats(GUEST);

    expect(missingDocuments).toBe(2);
  });

  it('signale zéro document manquant quand tous les types sont déposés', async () => {
    db.document.findMany.mockResolvedValue([
      { type: 'permis_conduire', status: 'validated' },
      { type: 'piece_identite', status: 'validated' },
      { type: 'cv_nautique', status: 'pending' },
    ]);

    const { missingDocuments } = await getDashboardStats(GUEST);

    expect(missingDocuments).toBe(0);
  });
});

describe('getDashboardStats — aperçus', () => {
  it('convertit le montant de la prochaine réservation', async () => {
    db.booking.findFirst.mockResolvedValue({
      id_booking: 5,
      start_date: new Date('2026-07-01'),
      end_date: new Date('2026-07-08'),
      total_amount: '700.00',
      boat: { name: 'Pen Duick', type: 'voilier', port: null },
    });

    const { nextBooking } = await getDashboardStats(GUEST);

    expect(nextBooking).toMatchObject({ id_booking: 5, total_amount: 700 });
  });

  it('renvoie une prochaine réservation nulle quand il n’y en a pas', async () => {
    const { nextBooking } = await getDashboardStats(GUEST);

    expect(nextBooking).toBeNull();
  });

  it('convertit les montants des dernières réservations', async () => {
    db.booking.findMany.mockResolvedValue([
      { id_booking: 5, total_amount: '300.00', status: 'confirmed', boat: { name: 'Pen Duick' } },
    ]);

    const { recentBookings } = await getDashboardStats(GUEST);

    expect(recentBookings[0].total_amount).toBe(300);
  });

  it('remplace la liste d’images du favori par une image unique', async () => {
    db.userBoatFavorite.findMany.mockResolvedValue([
      {
        id_favorite: 2,
        boat: {
          id_boat: 4,
          name: 'Pen Duick',
          type: 'voilier',
          daily_price: '250',
          port: null,
          images: [{ url: 'http://x/1.png' }],
        },
      },
    ]);

    const { favoriteBoatsPreview } = await getDashboardStats(GUEST);

    expect(favoriteBoatsPreview[0].boat).toMatchObject({
      daily_price: 250,
      image: 'http://x/1.png',
      images: undefined,
    });
  });

  it('met l’aperçu d’image à null quand le bateau favori n’a pas de photo', async () => {
    db.userBoatFavorite.findMany.mockResolvedValue([
      {
        id_favorite: 2,
        boat: {
          id_boat: 4,
          name: 'X',
          type: 'voilier',
          daily_price: '250',
          port: null,
          images: [],
        },
      },
    ]);

    const { favoriteBoatsPreview } = await getDashboardStats(GUEST);

    expect(favoriteBoatsPreview[0].boat.image).toBeNull();
  });
});

describe('listPayments', () => {
  const payment = (overrides = {}) => ({
    id_payment: 1,
    amount: '700.00',
    status: 'success',
    payment_date: new Date('2026-06-01'),
    transaction_ref: 'pi_1',
    refunded_amount: null,
    refunded_at: null,
    refund_reason: null,
    booking: {
      id_booking: 5,
      start_date: new Date('2026-07-01'),
      end_date: new Date('2026-07-08'),
      boat: { name: 'Pen Duick' },
    },
    ...overrides,
  });

  it('ne remonte que les paiements des réservations du locataire', async () => {
    await listPayments(GUEST);

    expect(db.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { booking: { id_user: GUEST, deleted_at: null } } })
    );
  });

  it('met à plat le paiement et sa réservation', async () => {
    db.payment.findMany.mockResolvedValue([payment()]);

    const { payments } = await listPayments(GUEST);

    expect(payments[0]).toMatchObject({
      amount: 700,
      booking: { id_booking: 5, boat_name: 'Pen Duick' },
    });
  });

  it('compte un paiement abouti dans le total payé', async () => {
    db.payment.findMany.mockResolvedValue([payment()]);

    const { totals } = await listPayments(GUEST);

    expect(totals).toEqual({ paid: 700, refunded: 0, net: 700 });
  });

  it('compte un remboursement effectif comme payé puis remboursé', async () => {
    db.payment.findMany.mockResolvedValue([
      payment({ status: 'refunded', refunded_amount: '700.00' }),
    ]);

    const { totals } = await listPayments(GUEST);

    expect(totals).toEqual({ paid: 700, refunded: 700, net: 0 });
  });

  it('exclut des totaux une empreinte libérée sans montant remboursé', async () => {
    db.payment.findMany.mockResolvedValue([payment({ status: 'refunded', refunded_amount: null })]);

    const { totals } = await listPayments(GUEST);

    expect(totals).toEqual({ paid: 0, refunded: 0, net: 0 });
  });

  it.each(['pending', 'failed'])('exclut des totaux un paiement « %s »', async (status) => {
    db.payment.findMany.mockResolvedValue([payment({ status })]);

    const { totals } = await listPayments(GUEST);

    expect(totals.paid).toBe(0);
  });

  it('arrondit les totaux au centime', async () => {
    db.payment.findMany.mockResolvedValue([
      payment({ amount: '0.1' }),
      payment({ id_payment: 2, amount: '0.2' }),
    ]);

    const { totals } = await listPayments(GUEST);

    expect(totals.paid).toBe(0.3);
  });

  it('tolère un paiement sans réservation rattachée', async () => {
    db.payment.findMany.mockResolvedValue([payment({ booking: null })]);

    const { payments } = await listPayments(GUEST);

    expect(payments[0].booking).toBeNull();
  });

  it('tolère une réservation sans bateau', async () => {
    db.payment.findMany.mockResolvedValue([payment({ booking: { id_booking: 5, boat: null } })]);

    const { payments } = await listPayments(GUEST);

    expect(payments[0].booking.boat_name).toBeNull();
  });
});

describe('listBookings', () => {
  const booking = (overrides = {}) => ({
    id_booking: 5,
    start_date: new Date('2026-07-01'),
    end_date: new Date('2026-07-08'),
    status: 'confirmed',
    total_amount: '700.00',
    booking_date: new Date('2026-06-01'),
    cancellation_reason: null,
    cancellation_date: null,
    boat: {
      id_boat: 4,
      name: 'Pen Duick',
      type: 'voilier',
      port: { name: 'Marseille', city: 'Marseille' },
      images: [{ url: 'http://x/1.png' }],
    },
    reviews: [],
    payments: [{ status: 'success', refunded_amount: null }],
    disputes: [],
    ...overrides,
  });

  it('met à plat la réservation pour le front', async () => {
    db.booking.findMany.mockResolvedValue([booking()]);

    const [row] = await listBookings(GUEST);

    expect(row).toMatchObject({
      total_amount: 700,
      reviewed: false,
      refund_requested: false,
      payment: { status: 'success', refunded_amount: null },
      boat: { name: 'Pen Duick', image: 'http://x/1.png' },
    });
  });

  it('signale un avis déjà déposé', async () => {
    db.booking.findMany.mockResolvedValue([booking({ reviews: [{ id_review: 2 }] })]);

    const [row] = await listBookings(GUEST);

    expect(row.reviewed).toBe(true);
  });

  it('signale une demande de remboursement en cours', async () => {
    db.booking.findMany.mockResolvedValue([booking({ disputes: [{ id_dispute: 9 }] })]);

    const [row] = await listBookings(GUEST);

    expect(row.refund_requested).toBe(true);
  });

  it('convertit le montant remboursé du dernier paiement', async () => {
    db.booking.findMany.mockResolvedValue([
      booking({ payments: [{ status: 'refunded', refunded_amount: '350.00' }] }),
    ]);

    const [row] = await listBookings(GUEST);

    expect(row.payment.refunded_amount).toBe(350);
  });

  it('renvoie un paiement nul quand la réservation n’a jamais été payée', async () => {
    db.booking.findMany.mockResolvedValue([booking({ payments: [] })]);

    const [row] = await listBookings(GUEST);

    expect(row.payment).toBeNull();
  });

  it('tolère une réservation sans bateau', async () => {
    db.booking.findMany.mockResolvedValue([booking({ boat: null })]);

    const [row] = await listBookings(GUEST);

    expect(row.boat).toEqual({
      id_boat: undefined,
      name: undefined,
      type: undefined,
      port: undefined,
      image: null,
    });
  });
});

describe('favoris', () => {
  it('met à plat les favoris', async () => {
    db.userBoatFavorite.findMany.mockResolvedValue([
      {
        id_favorite: 2,
        boat: {
          id_boat: 4,
          name: 'Pen Duick',
          type: 'voilier',
          daily_price: '250.00',
          capacity: 6,
          port: { name: 'Marseille', city: 'Marseille' },
          images: [{ url: 'http://x/1.png' }],
        },
      },
    ]);

    const [favorite] = await listFavorites(GUEST);

    expect(favorite.boat).toMatchObject({ daily_price: 250, image: 'http://x/1.png' });
  });

  it('met l’image à null quand le bateau n’a pas de photo', async () => {
    db.userBoatFavorite.findMany.mockResolvedValue([
      {
        id_favorite: 2,
        boat: {
          id_boat: 4,
          name: 'X',
          type: 'voilier',
          daily_price: '250',
          capacity: 6,
          port: null,
          images: [],
        },
      },
    ]);

    const [favorite] = await listFavorites(GUEST);

    expect(favorite.boat.image).toBeNull();
  });

  it('ajoute un favori de façon idempotente', async () => {
    await addFavorite(GUEST, 4);

    expect(db.userBoatFavorite.upsert).toHaveBeenCalledWith({
      where: { id_user_id_boat: { id_user: GUEST, id_boat: 4 } },
      create: { id_user: GUEST, id_boat: 4 },
      update: {},
    });
  });

  it('retire un favori de façon idempotente', async () => {
    await removeFavorite(GUEST, 4);

    expect(db.userBoatFavorite.deleteMany).toHaveBeenCalledWith({
      where: { id_user: GUEST, id_boat: 4 },
    });
  });
});
