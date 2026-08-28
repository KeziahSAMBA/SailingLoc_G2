import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const locataire = {
  getDashboardStats: jest.fn(),
  listBookings: jest.fn(),
  listPayments: jest.fn(),
  listFavorites: jest.fn(),
  addFavorite: jest.fn(),
  removeFavorite: jest.fn(),
};
jest.unstable_mockModule('../src/services/locataireService.js', () => locataire);

const bookings = {
  payBooking: jest.fn(),
  cancelOwnBooking: jest.fn(),
  requestRefund: jest.fn(),
  reportDispute: jest.fn(),
};
jest.unstable_mockModule('../src/services/bookingService.js', () => bookings);

const reviews = {
  createBookingReview: jest.fn(),
  updateBookingReview: jest.fn(),
  deleteBookingReview: jest.fn(),
  getReviewEligibility: jest.fn(),
};
jest.unstable_mockModule('../src/services/reviewService.js', () => reviews);

const controller = await import('../src/controllers/locataireController.js');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

function makeReq(overrides = {}) {
  return {
    body: {},
    params: {},
    user: { id_user: 1 },
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
  locataire.getDashboardStats.mockResolvedValue({ upcoming: 2 });
  locataire.listBookings.mockResolvedValue([{ id_booking: 5 }]);
  locataire.listPayments.mockResolvedValue({ totals: {}, payments: [] });
  locataire.listFavorites.mockResolvedValue([{ id_boat: 4 }]);
  locataire.addFavorite.mockResolvedValue({});
  locataire.removeFavorite.mockResolvedValue({});
  bookings.payBooking.mockResolvedValue({ client_secret: 'pi_secret' });
  bookings.cancelOwnBooking.mockResolvedValue({ id_booking: 5, status: 'cancelled' });
  bookings.requestRefund.mockResolvedValue({ id_dispute: 9 });
  bookings.reportDispute.mockResolvedValue({ id_dispute: 9 });
  reviews.createBookingReview.mockResolvedValue({ id_review: 2 });
  reviews.updateBookingReview.mockResolvedValue({ id_review: 2 });
  reviews.deleteBookingReview.mockResolvedValue({ id_review: 2 });
  reviews.getReviewEligibility.mockResolvedValue({ can_review: true, id_booking: 5 });
});

describe('lectures du tableau de bord locataire', () => {
  it('renvoie les statistiques du locataire connecté', async () => {
    await controller.getDashboard(makeReq(), res);

    expect(locataire.getDashboardStats).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ stats: { upcoming: 2 } });
  });

  it('renvoie les réservations du locataire connecté', async () => {
    await controller.getMyBookings(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ bookings: [{ id_booking: 5 }] });
  });

  it('renvoie les paiements tels quels', async () => {
    await controller.getMyPayments(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ totals: {}, payments: [] });
  });
});

describe('paiement et annulation', () => {
  it('répond 201 avec le secret de paiement', async () => {
    await controller.payMyBooking(makeReq({ params: { id_booking: '5' } }), res);

    expect(bookings.payBooking).toHaveBeenCalledWith(1, '5');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ client_secret: 'pi_secret' });
  });

  it('relaie une réservation déjà payée', async () => {
    bookings.payBooking.mockRejectedValue(httpError(409, 'Déjà payée.'));

    await controller.payMyBooking(makeReq({ params: { id_booking: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('transmet le motif d’annulation', async () => {
    const req = makeReq({ params: { id_booking: '5' }, body: { reason: 'Empêchement' } });

    await controller.cancelMyBooking(req, res);

    expect(bookings.cancelOwnBooking).toHaveBeenCalledWith(1, '5', 'Empêchement');
    expect(res.json).toHaveBeenCalledWith({ booking: { id_booking: 5, status: 'cancelled' } });
  });

  it('tolère une annulation sans corps', async () => {
    await controller.cancelMyBooking(
      makeReq({ params: { id_booking: '5' }, body: undefined }),
      res
    );

    expect(bookings.cancelOwnBooking).toHaveBeenCalledWith(1, '5', undefined);
  });

  it('transmet le motif de la demande de remboursement', async () => {
    const req = makeReq({ params: { id_booking: '5' }, body: { reason: 'Séjour annulé' } });

    await controller.requestMyRefund(req, res);

    expect(bookings.requestRefund).toHaveBeenCalledWith(1, '5', 'Séjour annulé');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('tolère une demande de remboursement sans corps', async () => {
    await controller.requestMyRefund(
      makeReq({ params: { id_booking: '5' }, body: undefined }),
      res
    );

    expect(bookings.requestRefund).toHaveBeenCalledWith(1, '5', undefined);
  });
});

describe('avis', () => {
  it('répond 201 après le dépôt d’un avis', async () => {
    const req = makeReq({ params: { id_booking: '5' }, body: { rating: 5, comment: 'Parfait' } });

    await controller.postMyBookingReview(req, res);

    expect(reviews.createBookingReview).toHaveBeenCalledWith(1, '5', {
      rating: 5,
      comment: 'Parfait',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('tolère un dépôt sans corps', async () => {
    await controller.postMyBookingReview(
      makeReq({ params: { id_booking: '5' }, body: undefined }),
      res
    );

    expect(reviews.createBookingReview).toHaveBeenCalledWith(1, '5', {});
  });

  it('relaie un avis déjà déposé', async () => {
    reviews.createBookingReview.mockRejectedValue(httpError(409, 'Déjà déposé.'));

    await controller.postMyBookingReview(makeReq({ params: { id_booking: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('transmet la modification d’un avis', async () => {
    const req = makeReq({ params: { id_review: '2' }, body: { rating: 4 } });

    await controller.patchMyReview(req, res);

    expect(reviews.updateBookingReview).toHaveBeenCalledWith(1, '2', { rating: 4 });
    expect(res.json).toHaveBeenCalledWith({ review: { id_review: 2 } });
  });

  it('répond 204 sans corps après suppression d’un avis', async () => {
    await controller.deleteMyReview(makeReq({ params: { id_review: '2' } }), res);

    expect(reviews.deleteBookingReview).toHaveBeenCalledWith(1, '2');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('relaie une suppression refusée', async () => {
    reviews.deleteBookingReview.mockRejectedValue(httpError(404, 'Avis introuvable.'));

    await controller.deleteMyReview(makeReq({ params: { id_review: '2' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('renvoie l’éligibilité telle quelle', async () => {
    await controller.getMyBoatReviewEligibility(makeReq({ params: { id_boat: '4' } }), res);

    expect(reviews.getReviewEligibility).toHaveBeenCalledWith(1, '4');
    expect(res.json).toHaveBeenCalledWith({ can_review: true, id_booking: 5 });
  });
});

describe('signalement de litige', () => {
  it('n’ajoute pas asOwner, contrairement au signalement propriétaire', async () => {
    const req = makeReq({
      params: { id_booking: '5' },
      body: { reason: 'Bateau non conforme' },
      files: [{ filename: 'photo.png' }],
    });

    await controller.reportMyDispute(req, res);

    expect(bookings.reportDispute).toHaveBeenCalledWith({
      id_user: 1,
      id_booking: '5',
      reason: 'Bateau non conforme',
      files: [{ filename: 'photo.png' }],
      origin: 'https://api.sailingloc.fr',
    });
    expect(bookings.reportDispute.mock.calls[0][0]).not.toHaveProperty('asOwner');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('remplace des fichiers absents par une liste vide', async () => {
    await controller.reportMyDispute(makeReq({ params: { id_booking: '5' } }), res);

    expect(bookings.reportDispute).toHaveBeenCalledWith(expect.objectContaining({ files: [] }));
  });

  it('tolère un corps absent', async () => {
    await controller.reportMyDispute(
      makeReq({ params: { id_booking: '5' }, body: undefined }),
      res
    );

    expect(bookings.reportDispute).toHaveBeenCalledWith(
      expect.objectContaining({ reason: undefined })
    );
  });
});

describe('favoris', () => {
  it('renvoie les favoris du locataire connecté', async () => {
    await controller.getMyFavorites(makeReq(), res);

    expect(locataire.listFavorites).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ favorites: [{ id_boat: 4 }] });
  });

  it('ajoute un favori et répond 201', async () => {
    await controller.postFavorite(makeReq({ params: { id_boat: '4' } }), res);

    expect(locataire.addFavorite).toHaveBeenCalledWith(1, 4);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('retire un favori', async () => {
    await controller.deleteFavorite(makeReq({ params: { id_boat: '4' } }), res);

    expect(locataire.removeFavorite).toHaveBeenCalledWith(1, 4);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it.each([
    ['postFavorite', 'addFavorite'],
    ['deleteFavorite', 'removeFavorite'],
  ])('%s refuse un identifiant de bateau non numérique', async (handler, serviceFn) => {
    await controller[handler](makeReq({ params: { id_boat: 'abc' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Identifiant de bateau invalide.' });
    expect(locataire[serviceFn]).not.toHaveBeenCalled();
  });

  it.each([
    ['postFavorite', 'addFavorite'],
    ['deleteFavorite', 'removeFavorite'],
  ])('%s refuse un identifiant décimal', async (handler, serviceFn) => {
    await controller[handler](makeReq({ params: { id_boat: '4.5' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(locataire[serviceFn]).not.toHaveBeenCalled();
  });

  it('relaie un favori déjà enregistré', async () => {
    locataire.addFavorite.mockRejectedValue(httpError(409, 'Déjà en favori.'));

    await controller.postFavorite(makeReq({ params: { id_boat: '4' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('repli sur 500', () => {
  it.each([
    ['getDashboard', locataire, 'getDashboardStats', {}],
    ['getMyBookings', locataire, 'listBookings', {}],
    ['getMyPayments', locataire, 'listPayments', {}],
    ['getMyFavorites', locataire, 'listFavorites', {}],
    ['postFavorite', locataire, 'addFavorite', { id_boat: '4' }],
    ['deleteFavorite', locataire, 'removeFavorite', { id_boat: '4' }],
    ['payMyBooking', bookings, 'payBooking', { id_booking: '5' }],
    ['cancelMyBooking', bookings, 'cancelOwnBooking', { id_booking: '5' }],
    ['requestMyRefund', bookings, 'requestRefund', { id_booking: '5' }],
    ['reportMyDispute', bookings, 'reportDispute', { id_booking: '5' }],
    ['postMyBookingReview', reviews, 'createBookingReview', { id_booking: '5' }],
    ['patchMyReview', reviews, 'updateBookingReview', { id_review: '2' }],
    ['deleteMyReview', reviews, 'deleteBookingReview', { id_review: '2' }],
    ['getMyBoatReviewEligibility', reviews, 'getReviewEligibility', { id_boat: '4' }],
  ])('%s répond 500 sur une erreur sans statut', async (handler, module, fn, params) => {
    module[fn].mockRejectedValue(new Error('Panne inattendue'));

    await controller[handler](makeReq({ params }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Panne inattendue' });
  });
});
