import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockBoatFindFirst = jest.fn();
const mockBookingCreate = jest.fn();
const mockBookingFindFirst = jest.fn();
const mockBookingUpdate = jest.fn();
const mockBookingUpdateMany = jest.fn();
const mockDocumentFindMany = jest.fn();
const mockPaymentCreate = jest.fn();
jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    boat: { findFirst: mockBoatFindFirst },
    booking: {
      create: mockBookingCreate,
      findFirst: mockBookingFindFirst,
      update: mockBookingUpdate,
      updateMany: mockBookingUpdateMany,
    },
    document: { findMany: mockDocumentFindMany },
    payment: { create: mockPaymentCreate },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  },
}));

const { createBooking, payBooking, cancelExpiredBookings } =
  await import('../src/services/bookingService.js');

// Date « YYYY-MM-DD » à N jours d'aujourd'hui, pour des tests stables dans le temps.
function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// Bateau publié à 100 €/jour, ouvert sur les 30 prochains jours, sans réservation.
function publishedBoat(overrides = {}) {
  return {
    daily_price: '100',
    availabilities: [{ start_date: new Date(day(0)), end_date: new Date(day(30)) }],
    bookings: [],
    ...overrides,
  };
}

const VALIDATED_DOCS = [
  { type: 'permis_conduire' },
  { type: 'piece_identite' },
  { type: 'cv_nautique' },
];

describe('createBooking', () => {
  beforeEach(() => {
    mockBoatFindFirst.mockReset();
    mockBookingCreate.mockReset();
    mockBookingUpdateMany.mockReset().mockResolvedValue({ count: 0 });
  });

  it('cancelExpiredBookings annule les demandes pending de plus de 72 h', async () => {
    await cancelExpiredBookings();
    expect(mockBookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'pending',
          booking_date: { lt: expect.any(Date) },
        }),
        data: expect.objectContaining({ status: 'cancelled' }),
      })
    );
  });

  it('rejette des dates manquantes ou mal formées (400)', async () => {
    await expect(
      createBooking({ id_user: 1, id_boat: 1, start_date: '', end_date: day(3) })
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      createBooking({ id_user: 1, id_boat: 1, start_date: 'demain', end_date: day(3) })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejette une date de début après la date de fin (400)', async () => {
    await expect(
      createBooking({ id_user: 1, id_boat: 1, start_date: day(5), end_date: day(2) })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejette une date de début passée (400)', async () => {
    await expect(
      createBooking({ id_user: 1, id_boat: 1, start_date: day(-2), end_date: day(3) })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('renvoie 404 si le bateau est introuvable ou non publié', async () => {
    mockBoatFindFirst.mockResolvedValue(null);
    await expect(
      createBooking({ id_user: 1, id_boat: 99, start_date: day(1), end_date: day(3) })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('renvoie 409 si une réservation confirmée chevauche la période', async () => {
    mockBoatFindFirst.mockResolvedValue(publishedBoat({ bookings: [{ id_booking: 7 }] }));
    await expect(
      createBooking({ id_user: 1, id_boat: 1, start_date: day(1), end_date: day(3) })
    ).rejects.toMatchObject({ status: 409 });
    expect(mockBookingCreate).not.toHaveBeenCalled();
  });

  it("renvoie 409 si un jour demandé sort des périodes d'ouverture", async () => {
    mockBoatFindFirst.mockResolvedValue(
      publishedBoat({
        availabilities: [{ start_date: new Date(day(0)), end_date: new Date(day(2)) }],
      })
    );
    await expect(
      createBooking({ id_user: 1, id_boat: 1, start_date: day(1), end_date: day(5) })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('crée une réservation pending avec le montant calculé côté serveur', async () => {
    mockBoatFindFirst.mockResolvedValue(publishedBoat());
    mockBookingCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id_booking: 42, ...data })
    );

    // 3 jours inclusifs (J+1 → J+3) × 100 € = 300 €.
    const booking = await createBooking({
      id_user: 1,
      id_boat: 1,
      start_date: day(1),
      end_date: day(3),
    });

    expect(mockBookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_user: 1,
        id_boat: 1,
        status: 'pending',
        total_amount: 300,
      }),
    });
    expect(booking.id_booking).toBe(42);
    expect(booking.total_amount).toBe(300);
  });
});

describe('payBooking', () => {
  beforeEach(() => {
    mockBookingFindFirst.mockReset();
    mockBookingUpdate.mockReset().mockResolvedValue({});
    mockDocumentFindMany.mockReset();
    mockPaymentCreate.mockReset();
  });

  it('renvoie 404 si la réservation ne lui appartient pas ou est introuvable', async () => {
    mockBookingFindFirst.mockResolvedValue(null);
    await expect(payBooking(1, 99)).rejects.toMatchObject({ status: 404 });
  });

  it('renvoie 409 si la réservation n’est plus « pending »', async () => {
    mockBookingFindFirst.mockResolvedValue({
      id_booking: 5,
      status: 'confirmed',
      total_amount: '300',
    });
    await expect(payBooking(1, 5)).rejects.toMatchObject({ status: 409 });
  });

  it('annule et renvoie 409 si la réservation pending a plus de 72 h', async () => {
    mockBookingFindFirst.mockResolvedValue({
      id_booking: 5,
      status: 'pending',
      total_amount: '300',
      booking_date: new Date(Date.now() - 73 * 3600 * 1000),
    });

    await expect(payBooking(1, 5)).rejects.toMatchObject({ status: 409 });
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: 5 },
        data: expect.objectContaining({ status: 'cancelled' }),
      })
    );
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  // Demande « pending » fraîche : 1er findFirst = la réservation elle-même,
  // 2e findFirst = recherche d'une réservation confirmée qui chevauche.
  function mockPendingBooking(conflict = null) {
    const booking = {
      id_booking: 5,
      id_boat: 1,
      start_date: new Date(day(1)),
      end_date: new Date(day(3)),
      status: 'pending',
      total_amount: '300',
      booking_date: new Date(),
    };
    mockBookingFindFirst.mockResolvedValueOnce(booking).mockResolvedValueOnce(conflict);
  }

  it('annule et renvoie 409 si un autre locataire a confirmé les dates entre-temps', async () => {
    mockPendingBooking({ id_booking: 99 });

    await expect(payBooking(1, 5)).rejects.toMatchObject({ status: 409 });
    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: 5 },
        data: expect.objectContaining({ status: 'cancelled' }),
      })
    );
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it('renvoie 409 si les documents locataire ne sont pas tous validés', async () => {
    mockPendingBooking();
    mockDocumentFindMany.mockResolvedValue([{ type: 'permis_conduire' }]);
    await expect(payBooking(1, 5)).rejects.toMatchObject({ status: 409 });
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it('crée un paiement simulé réussi et confirme la réservation', async () => {
    mockPendingBooking();
    mockDocumentFindMany.mockResolvedValue(VALIDATED_DOCS);
    mockPaymentCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id_payment: 11, ...data })
    );

    const payment = await payBooking(1, 5);

    expect(mockPaymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_booking: 5,
        amount: 300,
        commission: 30,
        payment_method: 'card',
        status: 'success',
        transaction_ref: expect.stringMatching(/^SIM-/),
      }),
    });
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id_booking: 5 },
      data: expect.objectContaining({ status: 'confirmed' }),
    });
    expect(payment.amount).toBe(300);
    expect(payment.commission).toBe(30);
  });
});
