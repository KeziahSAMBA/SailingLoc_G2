import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  booking: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn() },
  dispute: { findMany: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

jest.unstable_mockModule('../src/config/stripe.js', () => ({
  refundIntent: jest.fn().mockResolvedValue(null),
}));

jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendDisputeDecisionEmail: jest.fn().mockResolvedValue(),
}));

const { listBookings, cancelBooking, listDisputes } =
  await import('../src/services/bookingAdminService.js');

const storedBooking = (overrides = {}) => ({
  id_booking: 5,
  start_date: new Date('2026-07-01'),
  end_date: new Date('2026-07-08'),
  status: 'confirmed',
  total_amount: '700.00',
  booking_date: new Date('2026-06-01'),
  cancellation_reason: null,
  deleted_at: null,
  user: { id_user: 1, first_name: 'Lea', last_name: 'Marin', email: 'lea@example.com' },
  boat: { id_boat: 4, name: 'Pen Duick' },
  _count: { disputes: 0 },
  ...overrides,
});

const storedDispute = (overrides = {}) => ({
  id_dispute: 9,
  reason: 'Bateau non conforme',
  status: 'open',
  resolution: null,
  created_at: new Date('2026-07-10'),
  resolved_at: null,
  images: [{ url: 'http://x/degat.png' }],
  booking: {
    id_booking: 5,
    start_date: new Date('2026-07-01'),
    end_date: new Date('2026-07-08'),
    status: 'confirmed',
    boat: { name: 'Pen Duick' },
    payments: [{ id_payment: 11, amount: '700.00', commission: '70.00', status: 'success' }],
  },
  opener: { id_user: 1, first_name: 'Lea', last_name: 'Marin', email: 'lea@example.com' },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.booking.findMany.mockResolvedValue([]);
  db.booking.count.mockResolvedValue(0);
  db.booking.findUnique.mockResolvedValue(storedBooking());
  db.booking.update.mockImplementation(async ({ data }) => storedBooking(data));
  db.dispute.findMany.mockResolvedValue([]);
});

describe('listBookings', () => {
  it('exclut les réservations supprimées', async () => {
    await listBookings();

    expect(db.booking.findMany.mock.calls[0][0].where).toEqual({ deleted_at: null });
  });

  it.each(['pending', 'confirmed', 'refused', 'cancelled'])(
    'filtre sur le statut %s',
    async (status) => {
      await listBookings({ status });

      expect(db.booking.findMany.mock.calls[0][0].where.status).toBe(status);
    }
  );

  it('ignore un statut inconnu', async () => {
    await listBookings({ status: 'archivée' });

    expect(db.booking.findMany.mock.calls[0][0].where).toEqual({ deleted_at: null });
  });

  it('cherche sur le locataire et le bateau', async () => {
    await listBookings({ search: '  marin  ' });

    expect(db.booking.findMany.mock.calls[0][0].where.OR).toEqual([
      { user: { first_name: { contains: 'marin', mode: 'insensitive' } } },
      { user: { last_name: { contains: 'marin', mode: 'insensitive' } } },
      { user: { email: { contains: 'marin', mode: 'insensitive' } } },
      { boat: { name: { contains: 'marin', mode: 'insensitive' } } },
    ]);
  });

  it('ignore une recherche vide', async () => {
    await listBookings({ search: '   ' });

    expect(db.booking.findMany.mock.calls[0][0].where).not.toHaveProperty('OR');
  });

  it('met à plat la réservation avec son nombre de litiges ouverts', async () => {
    db.booking.findMany.mockResolvedValue([storedBooking({ _count: { disputes: 2 } })]);

    const { bookings } = await listBookings();
    const [booking] = bookings;

    expect(booking).toMatchObject({
      id_booking: 5,
      total_amount: 700,
      open_disputes: 2,
      user: { email: 'lea@example.com' },
      boat: { name: 'Pen Duick' },
    });
  });

  it('accepte un montant total absent', async () => {
    db.booking.findMany.mockResolvedValue([storedBooking({ total_amount: null })]);

    const { bookings } = await listBookings();
    const [booking] = bookings;

    expect(booking.total_amount).toBeNull();
  });

  it('tolère une réservation sans locataire ni bateau', async () => {
    db.booking.findMany.mockResolvedValue([storedBooking({ user: null, boat: null })]);

    const { bookings } = await listBookings();
    const [booking] = bookings;

    expect(booking).toMatchObject({ user: null, boat: null });
  });

  // Sans borne, cette liste renvoyait toutes les réservations en une réponse —
  // 7,6 Mo mesurés en recette sur le jeu de charge.
  it('borne la première page à 100 réservations', async () => {
    await listBookings();

    expect(db.booking.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 100 });
  });

  it('décale selon la page demandée', async () => {
    await listBookings({ page: '3', pageSize: '20' });

    expect(db.booking.findMany.mock.calls[0][0]).toMatchObject({ skip: 40, take: 20 });
  });

  // booking_date seule ne départage pas deux réservations du même jour : deux
  // pages voisines pourraient alors répéter ou omettre une ligne.
  it('trie sur un ordre total pour que les pages ne se recouvrent pas', async () => {
    await listBookings();

    expect(db.booking.findMany.mock.calls[0][0].orderBy).toEqual([
      { booking_date: 'desc' },
      { id_booking: 'desc' },
    ]);
  });

  it('compte les réservations du même filtre que la page', async () => {
    db.booking.count.mockResolvedValue(1742);

    const { total } = await listBookings({ status: 'confirmed' });

    expect(total).toBe(1742);
    expect(db.booking.count.mock.calls[0][0].where).toEqual(
      db.booking.findMany.mock.calls[0][0].where
    );
  });

  it('refuse une pagination invalide', async () => {
    await expect(listBookings({ page: 'abc' })).rejects.toThrow('Pagination invalide.');
    expect(db.booking.findMany).not.toHaveBeenCalled();
  });
});

describe('cancelBooking', () => {
  it('annule et enregistre le motif fourni', async () => {
    await cancelBooking('5', '  Fraude avérée  ');

    expect(db.booking.update).toHaveBeenCalledWith({
      where: { id_booking: 5 },
      data: expect.objectContaining({
        status: 'cancelled',
        cancellation_reason: 'Fraude avérée',
        cancellation_date: expect.any(Date),
      }),
    });
  });

  it.each([
    ['motif absent', undefined],
    ['motif vide', ''],
    ['motif fait d’espaces', '   '],
  ])('pose un motif par défaut pour un %s', async (_label, reason) => {
    await cancelBooking('5', reason);

    expect(db.booking.update.mock.calls[0][0].data.cancellation_reason).toBe(
      'Annulée par un administrateur.'
    );
  });

  it.each(['pending', 'confirmed'])('accepte une réservation « %s »', async (status) => {
    db.booking.findUnique.mockResolvedValue(storedBooking({ status }));

    await expect(cancelBooking('5')).resolves.toMatchObject({ status: 'cancelled' });
  });

  it.each(['refused', 'cancelled'])('refuse une réservation déjà « %s »', async (status) => {
    db.booking.findUnique.mockResolvedValue(storedBooking({ status }));

    await expect(cancelBooking('5')).rejects.toMatchObject({ status: 400 });
    expect(db.booking.update).not.toHaveBeenCalled();
  });

  it.each([
    ['réservation inexistante', null],
    ['réservation supprimée', storedBooking({ deleted_at: new Date() })],
  ])('renvoie 404 pour une %s', async (_label, booking) => {
    db.booking.findUnique.mockResolvedValue(booking);

    await expect(cancelBooking('5')).rejects.toMatchObject({ status: 404 });
  });
});

describe('listDisputes', () => {
  it('ne filtre pas par défaut', async () => {
    await listDisputes();

    expect(db.dispute.findMany.mock.calls[0][0].where).toEqual({});
  });

  it.each(['open', 'resolved', 'rejected'])('filtre sur le statut %s', async (status) => {
    await listDisputes({ status });

    expect(db.dispute.findMany.mock.calls[0][0].where.status).toBe(status);
  });

  it('ignore un statut inconnu', async () => {
    await listDisputes({ status: 'archivé' });

    expect(db.dispute.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('met à plat le litige, ses photos et le paiement remboursable', async () => {
    db.dispute.findMany.mockResolvedValue([storedDispute()]);

    const [dispute] = await listDisputes();

    expect(dispute).toMatchObject({
      id_dispute: 9,
      photos: ['http://x/degat.png'],
      booking: {
        id_booking: 5,
        boat_name: 'Pen Duick',
        payment: { id_payment: 11, amount: 700, commission: 70, status: 'success' },
      },
      opener: { email: 'lea@example.com' },
    });
  });

  it('renvoie une liste de photos vide quand le litige n’en porte aucune', async () => {
    db.dispute.findMany.mockResolvedValue([storedDispute({ images: [] })]);

    const [dispute] = await listDisputes();

    expect(dispute.photos).toEqual([]);
  });

  it('met le paiement à null quand la réservation n’en a aucun', async () => {
    db.dispute.findMany.mockResolvedValue([
      storedDispute({ booking: { id_booking: 5, boat: { name: 'X' }, payments: [] } }),
    ]);

    const [dispute] = await listDisputes();

    expect(dispute.booking.payment).toBeNull();
  });

  it('tolère une réservation sans bateau', async () => {
    db.dispute.findMany.mockResolvedValue([
      storedDispute({ booking: { id_booking: 5, boat: null, payments: [] } }),
    ]);

    const [dispute] = await listDisputes();

    expect(dispute.booking.boat_name).toBeNull();
  });

  it.each([
    ['litige sans réservation', { booking: null }, 'booking'],
    ['litige sans auteur', { opener: null }, 'opener'],
  ])('tolère un %s', async (_label, patch, field) => {
    db.dispute.findMany.mockResolvedValue([storedDispute(patch)]);

    const [dispute] = await listDisputes();

    expect(dispute[field]).toBeNull();
  });
});
