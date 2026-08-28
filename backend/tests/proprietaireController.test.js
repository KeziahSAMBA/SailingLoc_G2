import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const service = {
  getBoat: jest.fn(),
  getBookingLocataire: jest.fn(),
  getDashboardStats: jest.fn(),
  listBoats: jest.fn(),
  listBookings: jest.fn(),
  listPayments: jest.fn(),
  setBookingStatus: jest.fn(),
  getStripeAccountStatus: jest.fn(),
  createStripeOnboardingLink: jest.fn(),
  createStripeLoginLink: jest.fn(),
};
jest.unstable_mockModule('../src/services/proprietaireService.js', () => service);

const mockReportDispute = jest.fn();
jest.unstable_mockModule('../src/services/bookingService.js', () => ({
  reportDispute: mockReportDispute,
}));

const reviews = { listOwnerReviews: jest.fn(), replyToReview: jest.fn() };
jest.unstable_mockModule('../src/services/reviewService.js', () => reviews);

const controller = await import('../src/controllers/proprietaireController.js');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function makeReq(overrides = {}) {
  return {
    body: {},
    params: {},
    user: { id_user: 7 },
    protocol: 'https',
    get: () => 'api.sailingloc.fr',
    ...overrides,
  };
}

const httpError = (status, message) => Object.assign(new Error(message), { status });

let res;

beforeEach(() => {
  jest.clearAllMocks();
  res = makeRes();
  service.getDashboardStats.mockResolvedValue({ revenue: 1200 });
  service.listBookings.mockResolvedValue([{ id_booking: 1 }]);
  service.getBookingLocataire.mockResolvedValue({ locataire: { id_user: 3 } });
  service.listBoats.mockResolvedValue([{ id_boat: 4 }]);
  service.getBoat.mockResolvedValue({ id_boat: 4 });
  service.listPayments.mockResolvedValue({ totals: { net: 900 }, payments: [] });
  service.setBookingStatus.mockResolvedValue({ id_booking: 1, status: 'confirmed' });
  service.getStripeAccountStatus.mockResolvedValue({ connected: true });
  service.createStripeOnboardingLink.mockResolvedValue({ url: 'https://connect.stripe.com/x' });
  service.createStripeLoginLink.mockResolvedValue({ url: 'https://dashboard.stripe.com/x' });
  reviews.listOwnerReviews.mockResolvedValue([{ id_review: 2 }]);
  reviews.replyToReview.mockResolvedValue({ id_review: 2, reply: 'Merci !' });
  mockReportDispute.mockResolvedValue({ id_dispute: 9 });
});

describe('lectures du tableau de bord propriétaire', () => {
  it('renvoie les statistiques du propriétaire connecté', async () => {
    await controller.getDashboard(makeReq(), res);

    expect(service.getDashboardStats).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ stats: { revenue: 1200 } });
  });

  it('renvoie les réservations du propriétaire connecté', async () => {
    await controller.getMyBookings(makeReq(), res);

    expect(service.listBookings).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ bookings: [{ id_booking: 1 }] });
  });

  it('renvoie les bateaux du propriétaire connecté', async () => {
    await controller.getMyBoats(makeReq(), res);

    expect(service.listBoats).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ boats: [{ id_boat: 4 }] });
  });

  it('renvoie les totaux et le détail des paiements', async () => {
    await controller.getMyPayments(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ totals: { net: 900 }, payments: [] });
  });

  it('renvoie les avis reçus', async () => {
    await controller.getMyReviews(makeReq(), res);

    expect(reviews.listOwnerReviews).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ reviews: [{ id_review: 2 }] });
  });
});

describe('accès par identifiant — le propriétaire connecté est toujours le premier argument', () => {
  it('transmet le couple propriétaire / réservation pour le profil locataire', async () => {
    await controller.getBookingLocataireProfile(makeReq({ params: { id_booking: '12' } }), res);

    expect(service.getBookingLocataire).toHaveBeenCalledWith(7, '12');
  });

  it('transmet le couple propriétaire / bateau', async () => {
    await controller.getMyBoat(makeReq({ params: { id_boat: '4' } }), res);

    expect(service.getBoat).toHaveBeenCalledWith(7, '4');
  });

  it('relaie un 403 quand la ressource appartient à un autre propriétaire', async () => {
    service.getBoat.mockRejectedValue(httpError(403, 'Accès refusé.'));

    await controller.getMyBoat(makeReq({ params: { id_boat: '4' } }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Accès refusé.' });
  });
});

describe('décision sur une réservation', () => {
  it('transmet l’action et le motif au service', async () => {
    const req = makeReq({
      params: { id_booking: '12' },
      body: { action: 'refuse', reason: 'Indisponible' },
    });

    await controller.patchBooking(req, res);

    expect(service.setBookingStatus).toHaveBeenCalledWith(7, '12', 'refuse', 'Indisponible');
    expect(res.json).toHaveBeenCalledWith({ booking: { id_booking: 1, status: 'confirmed' } });
  });

  it('tolère un corps absent', async () => {
    await controller.patchBooking(makeReq({ params: { id_booking: '12' }, body: undefined }), res);

    expect(service.setBookingStatus).toHaveBeenCalledWith(7, '12', undefined, undefined);
  });

  it('relaie une action invalide', async () => {
    service.setBookingStatus.mockRejectedValue(httpError(400, 'Action inconnue.'));

    await controller.patchBooking(makeReq({ params: { id_booking: '12' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('réponse à un avis', () => {
  it('transmet le texte de la réponse', async () => {
    const req = makeReq({ params: { id_review: '2' }, body: { reply: 'Merci !' } });

    await controller.postReviewReply(req, res);

    expect(reviews.replyToReview).toHaveBeenCalledWith(7, '2', 'Merci !');
    expect(res.json).toHaveBeenCalledWith({ review: { id_review: 2, reply: 'Merci !' } });
  });

  it('tolère un corps absent', async () => {
    await controller.postReviewReply(makeReq({ params: { id_review: '2' }, body: undefined }), res);

    expect(reviews.replyToReview).toHaveBeenCalledWith(7, '2', undefined);
  });
});

describe('compte Stripe', () => {
  it.each([
    ['getMyStripeAccount', 'getStripeAccountStatus', { connected: true }],
    ['postStripeOnboarding', 'createStripeOnboardingLink', { url: 'https://connect.stripe.com/x' }],
    ['postStripeLoginLink', 'createStripeLoginLink', { url: 'https://dashboard.stripe.com/x' }],
  ])('%s renvoie la réponse du service telle quelle', async (handler, fn, expected) => {
    await controller[handler](makeReq(), res);

    expect(service[fn]).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith(expected);
  });

  it('relaie un compte Stripe non configuré', async () => {
    service.createStripeLoginLink.mockRejectedValue(httpError(409, 'Compte Stripe incomplet.'));

    await controller.postStripeLoginLink(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('signalement de litige', () => {
  it('marque le signalement comme émanant du propriétaire', async () => {
    const req = makeReq({
      params: { id_booking: '12' },
      body: { reason: 'Bateau rendu endommagé' },
      files: [{ filename: 'degat.png' }],
    });

    await controller.reportBookingDispute(req, res);

    expect(mockReportDispute).toHaveBeenCalledWith({
      id_user: 7,
      id_booking: '12',
      reason: 'Bateau rendu endommagé',
      asOwner: true,
      files: [{ filename: 'degat.png' }],
      origin: 'https://api.sailingloc.fr',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('remplace des fichiers absents par une liste vide', async () => {
    await controller.reportBookingDispute(makeReq({ params: { id_booking: '12' } }), res);

    expect(mockReportDispute).toHaveBeenCalledWith(expect.objectContaining({ files: [] }));
  });

  it('tolère un corps absent', async () => {
    await controller.reportBookingDispute(
      makeReq({ params: { id_booking: '12' }, body: undefined }),
      res
    );

    expect(mockReportDispute).toHaveBeenCalledWith(expect.objectContaining({ reason: undefined }));
  });

  it('relaie un litige déjà ouvert', async () => {
    mockReportDispute.mockRejectedValue(httpError(409, 'Un litige est déjà ouvert.'));

    await controller.reportBookingDispute(makeReq({ params: { id_booking: '12' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('repli sur 500', () => {
  it.each([
    ['getDashboard', service, 'getDashboardStats'],
    ['getMyBookings', service, 'listBookings'],
    ['getBookingLocataireProfile', service, 'getBookingLocataire'],
    ['getMyBoats', service, 'listBoats'],
    ['getMyBoat', service, 'getBoat'],
    ['getMyPayments', service, 'listPayments'],
    ['patchBooking', service, 'setBookingStatus'],
    ['getMyStripeAccount', service, 'getStripeAccountStatus'],
    ['postStripeOnboarding', service, 'createStripeOnboardingLink'],
    ['getMyReviews', reviews, 'listOwnerReviews'],
    ['postReviewReply', reviews, 'replyToReview'],
  ])('%s répond 500 sur une erreur sans statut', async (handler, module, fn) => {
    module[fn].mockRejectedValue(new Error('Panne inattendue'));

    await controller[handler](makeReq({ params: {} }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Panne inattendue' });
  });

  it('reportBookingDispute répond 500 sur une erreur sans statut', async () => {
    mockReportDispute.mockRejectedValue(new Error('Disque plein'));

    await controller.reportBookingDispute(makeReq({ params: { id_booking: '12' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
