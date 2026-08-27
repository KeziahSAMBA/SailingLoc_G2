import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockBoatFindFirst = jest.fn();
const mockBookingCreate = jest.fn();
const mockBookingFindFirst = jest.fn();
const mockBookingUpdate = jest.fn();
const mockBookingUpdateMany = jest.fn();
const mockDocumentFindMany = jest.fn();
const mockPaymentCreate = jest.fn();
const mockPaymentUpdate = jest.fn();
const mockDisputeCreate = jest.fn();
const mockImageCreateMany = jest.fn().mockResolvedValue({ count: 0 });
// $transaction interactif : le callback reçoit le même client mocké.
const db = {
  boat: { findFirst: mockBoatFindFirst },
  booking: {
    create: mockBookingCreate,
    findFirst: mockBookingFindFirst,
    update: mockBookingUpdate,
    updateMany: mockBookingUpdateMany,
  },
  document: { findMany: mockDocumentFindMany },
  payment: { create: mockPaymentCreate, update: mockPaymentUpdate },
  dispute: { create: mockDisputeCreate },
  image: { createMany: mockImageCreateMany },
};
db.$transaction = jest.fn((arg) => (typeof arg === 'function' ? arg(db) : Promise.all(arg)));
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const mockSendCancelledEmail = jest.fn().mockResolvedValue();
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendBookingCancelledByLocataireEmail: mockSendCancelledEmail,
}));

// Stripe désactivé dans les tests, même si une clé est présente dans l'env.
jest.unstable_mockModule('../src/config/stripe.js', () => ({
  getStripe: () => null,
  isStripeRef: (ref) => typeof ref === 'string' && ref.startsWith('pi_'),
  cancelIntentQuietly: jest.fn().mockResolvedValue(undefined),
  refundIntent: jest.fn().mockResolvedValue(null),
}));

const {
  createBooking,
  MAX_BOOKING_DAYS,
  payBooking,
  cancelExpiredBookings,
  cancelOwnBooking,
  requestRefund,
  reportDispute,
} = await import('../src/services/bookingService.js');

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

  it('cancelExpiredBookings annule les demandes pending NON payées de plus de 72 h', async () => {
    await cancelExpiredBookings();
    expect(mockBookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'pending',
          booking_date: { lt: expect.any(Date) },
          // Les demandes payées (empreinte en attente) n'expirent pas.
          payments: { none: { status: { in: ['pending', 'success'] } } },
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

  it('borne la durée d’une réservation (400)', async () => {
    await expect(
      createBooking({
        id_user: 1,
        id_boat: 1,
        start_date: day(1),
        end_date: day(MAX_BOOKING_DAYS + 1),
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(mockBoatFindFirst).not.toHaveBeenCalled();
  });

  it('rejette les identifiants non décimaux avant toute requête (400)', async () => {
    await expect(
      createBooking({
        id_user: 1,
        id_boat: '1e2',
        start_date: day(1),
        end_date: day(3),
      })
    ).rejects.toMatchObject({ status: 400 });
    expect(mockBoatFindFirst).not.toHaveBeenCalled();
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
      payments: [],
    });
    await expect(payBooking(1, 5)).rejects.toMatchObject({ status: 409 });
  });

  it('renvoie 409 si la réservation est déjà payée (empreinte en attente)', async () => {
    mockBookingFindFirst.mockResolvedValue({
      id_booking: 5,
      status: 'pending',
      total_amount: '300',
      booking_date: new Date(),
      payments: [{ id_payment: 11 }],
    });
    await expect(payBooking(1, 5)).rejects.toMatchObject({ status: 409 });
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it('annule et renvoie 409 si la réservation pending a plus de 72 h', async () => {
    mockBookingFindFirst.mockResolvedValue({
      id_booking: 5,
      status: 'pending',
      total_amount: '300',
      booking_date: new Date(Date.now() - 73 * 3600 * 1000),
      payments: [],
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
      payments: [],
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

  it('crée une empreinte de paiement en attente sans confirmer la réservation', async () => {
    mockPendingBooking();
    mockDocumentFindMany.mockResolvedValue(VALIDATED_DOCS);
    mockPaymentCreate.mockImplementation(({ data }) =>
      Promise.resolve({ id_payment: 11, ...data })
    );

    // Sans clé Stripe configurée (cas des tests) : paiement simulé, pas de
    // client_secret à confirmer côté front.
    const { payment, client_secret } = await payBooking(1, 5);

    expect(client_secret).toBeNull();
    expect(mockPaymentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_booking: 5,
        amount: 300,
        commission: 30,
        payment_method: 'card',
        // Empreinte : capturée seulement à la confirmation du propriétaire.
        status: 'pending',
        transaction_ref: expect.stringMatching(/^SIM-/),
      }),
    });
    // La réservation reste « pending » : c'est le propriétaire qui confirme.
    expect(mockBookingUpdate).not.toHaveBeenCalled();
    expect(payment.amount).toBe(300);
    expect(payment.commission).toBe(30);
  });
});

describe('cancelOwnBooking (annulation par le locataire)', () => {
  beforeEach(() => {
    mockBookingFindFirst.mockReset();
    mockBookingUpdate
      .mockReset()
      .mockImplementation(({ data }) => Promise.resolve({ id_booking: 5, ...data }));
    mockPaymentUpdate.mockReset().mockResolvedValue({});
    mockSendCancelledEmail.mockClear();
  });

  // Réservation du locataire 1 démarrant dans 3 jours.
  function ownBooking(overrides = {}) {
    return {
      id_booking: 5,
      status: 'pending',
      start_date: new Date(day(3)),
      end_date: new Date(day(6)),
      total_amount: '300',
      user: { first_name: 'Lea', email: 'lea@example.com' },
      boat: { name: 'Pen Duick', owner: { first_name: 'Luc', email: 'luc@example.com' } },
      payments: [],
      ...overrides,
    };
  }

  it('renvoie 404 si la réservation ne lui appartient pas', async () => {
    mockBookingFindFirst.mockResolvedValue(null);
    await expect(cancelOwnBooking(1, 99)).rejects.toMatchObject({ status: 404 });
  });

  it('renvoie 409 si la réservation est déjà refusée ou annulée', async () => {
    mockBookingFindFirst.mockResolvedValue(ownBooking({ status: 'refused' }));
    await expect(cancelOwnBooking(1, 5)).rejects.toMatchObject({ status: 409 });
    expect(mockBookingUpdate).not.toHaveBeenCalled();
  });

  it('renvoie 409 si le séjour commence aujourd’hui ou a commencé', async () => {
    mockBookingFindFirst.mockResolvedValue(ownBooking({ start_date: new Date(day(0)) }));
    await expect(cancelOwnBooking(1, 5)).rejects.toMatchObject({ status: 409 });
  });

  it('annule une demande payée et libère l’empreinte sans montant remboursé', async () => {
    mockBookingFindFirst.mockResolvedValue(
      ownBooking({ payments: [{ id_payment: 11, status: 'pending', amount: '300' }] })
    );

    const result = await cancelOwnBooking(1, 5, 'Changement de programme');

    expect(mockBookingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: 5 },
        data: expect.objectContaining({
          status: 'cancelled',
          cancellation_reason: 'Changement de programme',
        }),
      })
    );
    const { data } = mockPaymentUpdate.mock.calls[0][0];
    expect(data.status).toBe('refunded');
    expect(data.refunded_amount).toBeUndefined();
    expect(result.status).toBe('cancelled');
  });

  it('annule une réservation confirmée encaissée avec remboursement intégral', async () => {
    mockBookingFindFirst.mockResolvedValue(
      ownBooking({
        status: 'confirmed',
        payments: [{ id_payment: 12, status: 'success', amount: '300' }],
      })
    );

    await cancelOwnBooking(1, 5);

    expect(mockPaymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_payment: 12 },
        data: expect.objectContaining({ status: 'refunded', refunded_amount: '300' }),
      })
    );
    // Emails : le proprio apprend l'annulation, le locataire la confirmation
    // de son remboursement intégral.
    expect(mockSendCancelledEmail).toHaveBeenCalledWith(
      'luc@example.com',
      expect.objectContaining({ audience: 'proprietaire', refundAmount: 300 })
    );
    expect(mockSendCancelledEmail).toHaveBeenCalledWith(
      'lea@example.com',
      expect.objectContaining({ audience: 'locataire', refundAmount: 300 })
    );
  });
});

describe('requestRefund (demande de remboursement)', () => {
  beforeEach(() => {
    mockBookingFindFirst.mockReset();
    mockDisputeCreate
      .mockReset()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id_dispute: 7, status: 'open', ...data })
      );
  });

  // Réservation annulée dont le paiement encaissé n'a pas été remboursé.
  function cancelledBooking(overrides = {}) {
    return {
      id_booking: 5,
      status: 'cancelled',
      payments: [{ id_payment: 12 }],
      disputes: [],
      ...overrides,
    };
  }

  it('renvoie 400 sans motif', async () => {
    await expect(requestRefund(1, 5, '  ')).rejects.toMatchObject({ status: 400 });
    expect(mockDisputeCreate).not.toHaveBeenCalled();
  });

  it('renvoie 409 si la réservation n’est pas annulée', async () => {
    mockBookingFindFirst.mockResolvedValue(cancelledBooking({ status: 'confirmed' }));
    await expect(requestRefund(1, 5, 'Motif')).rejects.toMatchObject({ status: 409 });
  });

  it('renvoie 409 si aucun paiement encaissé', async () => {
    mockBookingFindFirst.mockResolvedValue(cancelledBooking({ payments: [] }));
    await expect(requestRefund(1, 5, 'Motif')).rejects.toMatchObject({ status: 409 });
  });

  it('renvoie 409 si une demande est déjà en cours', async () => {
    mockBookingFindFirst.mockResolvedValue(cancelledBooking({ disputes: [{ id_dispute: 3 }] }));
    await expect(requestRefund(1, 5, 'Motif')).rejects.toMatchObject({ status: 409 });
  });

  it('crée le litige « open » examiné ensuite par l’admin', async () => {
    mockBookingFindFirst.mockResolvedValue(cancelledBooking());

    const dispute = await requestRefund(1, 5, 'Annulée mais jamais remboursée');

    expect(mockDisputeCreate).toHaveBeenCalledWith({
      data: { id_booking: 5, id_user: 1, reason: 'Annulée mais jamais remboursée' },
    });
    expect(dispute.status).toBe('open');
  });
});

describe('reportDispute (signalement locataire ou proprio)', () => {
  beforeEach(() => {
    mockBookingFindFirst.mockReset();
    mockDisputeCreate
      .mockReset()
      .mockImplementation(({ data }) =>
        Promise.resolve({ id_dispute: 9, status: 'open', ...data })
      );
  });

  function eligibleBooking(overrides = {}) {
    return {
      id_booking: 5,
      status: 'cancelled',
      end_date: new Date(day(-2)),
      disputes: [],
      ...overrides,
    };
  }

  it('renvoie 400 sans motif', async () => {
    await expect(reportDispute({ id_user: 1, id_booking: 5, reason: ' ' })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('cible les bateaux du proprio quand asOwner est vrai', async () => {
    mockBookingFindFirst.mockResolvedValue(eligibleBooking());
    await reportDispute({ id_user: 2, id_booking: 5, reason: 'Bateau endommagé', asOwner: true });
    expect(mockBookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ boat: { id_user: 2, deleted_at: null } }),
      })
    );
  });

  it('renvoie 409 sur une réservation ni annulée ni terminée', async () => {
    mockBookingFindFirst.mockResolvedValue(
      eligibleBooking({ status: 'confirmed', end_date: new Date(day(5)) })
    );
    await expect(
      reportDispute({ id_user: 1, id_booking: 5, reason: 'Problème' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('renvoie 409 si un litige est déjà ouvert', async () => {
    mockBookingFindFirst.mockResolvedValue(eligibleBooking({ disputes: [{ id_dispute: 3 }] }));
    await expect(
      reportDispute({ id_user: 1, id_booking: 5, reason: 'Problème' })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('crée le litige sur une réservation terminée', async () => {
    mockBookingFindFirst.mockResolvedValue(
      eligibleBooking({ status: 'confirmed', end_date: new Date(day(-1)) })
    );
    const dispute = await reportDispute({ id_user: 1, id_booking: 5, reason: 'Moteur en panne' });
    expect(mockDisputeCreate).toHaveBeenCalledWith({
      data: { id_booking: 5, id_user: 1, reason: 'Moteur en panne' },
    });
    expect(dispute.status).toBe('open');
  });
});
