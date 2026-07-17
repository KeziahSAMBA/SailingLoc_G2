import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockBookingFindUnique = jest.fn();
const mockBookingFindFirst = jest.fn();
// Client transactionnel passé au callback de $transaction.
const tx = {
  booking: { update: jest.fn(), updateMany: jest.fn() },
  payment: { update: jest.fn(), updateMany: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    booking: {
      findUnique: mockBookingFindUnique,
      findFirst: mockBookingFindFirst,
    },
    $transaction: jest.fn((arg) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
  },
}));

const mockSendEmail = jest.fn().mockResolvedValue();
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendBookingDecisionEmail: mockSendEmail,
}));

const { setBookingStatus } = await import('../src/services/proprietaireService.js');

const OWNER = 10;

// Demande « pending » payée (empreinte en attente) sur un bateau du proprio 10.
function paidPendingBooking(overrides = {}) {
  const future = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };
  return {
    id_booking: 5,
    id_boat: 2,
    status: 'pending',
    deleted_at: null,
    start_date: future(3),
    end_date: future(6),
    total_amount: '300',
    user: { first_name: 'Lea', email: 'lea@example.com' },
    boat: { id_user: OWNER, name: 'Pen Duick' },
    payments: [{ id_payment: 11, status: 'pending', amount: '300' }],
    ...overrides,
  };
}

describe('setBookingStatus (décision du propriétaire)', () => {
  beforeEach(() => {
    mockBookingFindUnique.mockReset();
    mockBookingFindFirst.mockReset().mockResolvedValue(null);
    mockSendEmail.mockClear();
    tx.booking.update
      .mockReset()
      .mockImplementation(({ data }) => Promise.resolve({ id_booking: 5, ...data }));
    tx.booking.updateMany.mockReset().mockResolvedValue({ count: 0 });
    tx.payment.update.mockReset().mockResolvedValue({});
    tx.payment.updateMany.mockReset().mockResolvedValue({ count: 0 });
  });

  it("renvoie 404 si la réservation est sur le bateau d'un autre propriétaire", async () => {
    mockBookingFindUnique.mockResolvedValue(paidPendingBooking({ boat: { id_user: 99 } }));
    await expect(setBookingStatus(OWNER, 5, 'confirm')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('renvoie 400 pour confirmer ou refuser une demande non payée', async () => {
    mockBookingFindUnique.mockResolvedValue(paidPendingBooking({ payments: [] }));
    await expect(setBookingStatus(OWNER, 5, 'confirm')).rejects.toMatchObject({
      status: 400,
    });
    mockBookingFindUnique.mockResolvedValue(paidPendingBooking({ payments: [] }));
    await expect(setBookingStatus(OWNER, 5, 'refuse')).rejects.toMatchObject({
      status: 400,
    });
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it('renvoie 409 si une réservation confirmée chevauche déjà les dates', async () => {
    mockBookingFindUnique.mockResolvedValue(paidPendingBooking());
    mockBookingFindFirst.mockResolvedValue({ id_booking: 99 });
    await expect(setBookingStatus(OWNER, 5, 'confirm')).rejects.toMatchObject({
      status: 409,
    });
    expect(tx.booking.update).not.toHaveBeenCalled();
  });

  it("confirme : capture l'empreinte, confirme la réservation et refuse les demandes concurrentes", async () => {
    mockBookingFindUnique.mockResolvedValue(paidPendingBooking());

    const result = await setBookingStatus(OWNER, 5, 'confirm');

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: 5 },
        data: expect.objectContaining({ status: 'confirmed' }),
      })
    );
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id_payment: 11 },
      data: { status: 'success' },
    });
    // Les demandes pending qui chevauchent sont refusées, empreintes libérées.
    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'refunded' }),
      })
    );
    expect(tx.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'pending',
          id_booking: { not: 5 },
        }),
        data: expect.objectContaining({ status: 'refused' }),
      })
    );
    expect(result.status).toBe('confirmed');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("refuse : libère l'empreinte de paiement et refuse la demande", async () => {
    mockBookingFindUnique.mockResolvedValue(paidPendingBooking());

    const result = await setBookingStatus(OWNER, 5, 'refuse');

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: 5 },
        data: expect.objectContaining({ status: 'refused' }),
      })
    );
    expect(tx.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: 5, status: 'pending' },
        data: expect.objectContaining({ status: 'refunded' }),
      })
    );
    expect(result.status).toBe('refused');
  });

  it('annule une réservation confirmée avec le motif fourni', async () => {
    mockBookingFindUnique.mockResolvedValue(
      paidPendingBooking({ status: 'confirmed', payments: [] })
    );

    const result = await setBookingStatus(OWNER, 5, 'cancel', 'Avarie moteur');

    expect(tx.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: 5 },
        data: expect.objectContaining({
          status: 'cancelled',
          cancellation_reason: 'Avarie moteur',
        }),
      })
    );
    expect(result.status).toBe('cancelled');
  });

  it('annule une confirmée encaissée : remboursement automatique intégral', async () => {
    mockBookingFindUnique.mockResolvedValue(
      paidPendingBooking({
        status: 'confirmed',
        payments: [{ id_payment: 12, status: 'success', amount: '300' }],
      })
    );

    await setBookingStatus(OWNER, 5, 'cancel', 'Avarie moteur');

    expect(tx.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_payment: 12 },
        data: expect.objectContaining({ status: 'refunded', refunded_amount: '300' }),
      })
    );
  });
});
