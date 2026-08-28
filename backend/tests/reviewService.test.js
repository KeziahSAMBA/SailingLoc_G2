import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  booking: { findFirst: jest.fn() },
  review: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const {
  createBookingReview,
  getReviewEligibility,
  listBoatReviews,
  updateBookingReview,
  deleteBookingReview,
  listOwnerReviews,
  replyToReview,
} = await import('../src/services/reviewService.js');

const GUEST = 1;
const OWNER = 7;
const COMMENT = 'Séjour très agréable, bateau impeccable.';

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
};

// Réservation confirmée et terminée : le cas nominal pour déposer un avis.
const finishedBooking = (overrides = {}) => ({
  id_booking: 5,
  status: 'confirmed',
  end_date: day(-3),
  reviews: [],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.booking.findFirst.mockResolvedValue(finishedBooking());
  db.review.findFirst.mockResolvedValue({ id_review: 2 });
  db.review.findMany.mockResolvedValue([]);
  db.review.create.mockResolvedValue({ id_review: 2, rating: 5, status: 'pending' });
  db.review.update.mockResolvedValue({ id_review: 2, rating: 4, status: 'pending' });
});

describe('createBookingReview — validation', () => {
  it.each([
    ['note à zéro', 0],
    ['note à 6', 6],
    ['note décimale', 3.5],
    ['note non numérique', 'cinq'],
    ['note absente', undefined],
  ])('refuse une %s', async (_label, rating) => {
    await expect(createBookingReview(GUEST, 5, { rating, comment: COMMENT })).rejects.toMatchObject(
      { status: 400, message: 'Note invalide (1 à 5).' }
    );
    expect(db.booking.findFirst).not.toHaveBeenCalled();
  });

  it.each([1, 2, 3, 4, 5])('accepte la note %i', async (rating) => {
    await expect(
      createBookingReview(GUEST, 5, { rating, comment: COMMENT })
    ).resolves.toBeDefined();
  });

  it('accepte une note transmise en chaîne', async () => {
    await createBookingReview(GUEST, 5, { rating: '4', comment: COMMENT });

    expect(db.review.create.mock.calls[0][0].data.rating).toBe(4);
  });

  it.each([
    ['commentaire trop court', 'Trop court'.slice(0, 9)],
    ['commentaire vide', ''],
    ['commentaire absent', undefined],
    ['commentaire trop long', 'a'.repeat(1001)],
  ])('refuse un %s', async (_label, comment) => {
    await expect(createBookingReview(GUEST, 5, { rating: 5, comment })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('accepte les bornes du commentaire', async () => {
    await expect(
      createBookingReview(GUEST, 5, { rating: 5, comment: 'a'.repeat(10) })
    ).resolves.toBeDefined();
    await expect(
      createBookingReview(GUEST, 5, { rating: 5, comment: 'a'.repeat(1000) })
    ).resolves.toBeDefined();
  });

  it('rogne le commentaire avant de mesurer sa longueur', async () => {
    await expect(
      createBookingReview(GUEST, 5, { rating: 5, comment: `   ${'a'.repeat(5)}   ` })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('accepte un appel sans corps du tout', async () => {
    await expect(createBookingReview(GUEST, 5)).rejects.toMatchObject({ status: 400 });
  });
});

describe('createBookingReview — règles métier', () => {
  it('crée l’avis en attente de modération', async () => {
    await createBookingReview(GUEST, 5, { rating: 5, comment: `  ${COMMENT}  ` });

    expect(db.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_user: GUEST,
          id_booking: 5,
          rating: 5,
          comment: COMMENT,
          status: 'pending',
        }),
      })
    );
  });

  it('ne cherche que parmi les réservations du locataire', async () => {
    await createBookingReview(GUEST, 5, { rating: 5, comment: COMMENT });

    expect(db.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_booking: 5, id_user: GUEST, deleted_at: null },
      })
    );
  });

  it('renvoie 404 pour une réservation qui n’est pas la sienne', async () => {
    db.booking.findFirst.mockResolvedValue(null);

    await expect(
      createBookingReview(GUEST, 5, { rating: 5, comment: COMMENT })
    ).rejects.toMatchObject({ status: 404 });
  });

  it.each([
    ['réservation encore en attente', { status: 'pending' }],
    ['réservation annulée', { status: 'cancelled' }],
    ['réservation refusée', { status: 'refused' }],
  ])('refuse un avis sur une %s', async (_label, patch) => {
    db.booking.findFirst.mockResolvedValue(finishedBooking(patch));

    await expect(
      createBookingReview(GUEST, 5, { rating: 5, comment: COMMENT })
    ).rejects.toMatchObject({ status: 400 });
    expect(db.review.create).not.toHaveBeenCalled();
  });

  it.each([
    ['séjour en cours', day(2)],
    ['séjour se terminant aujourd’hui', day(0)],
  ])('refuse un avis avant la fin du séjour (%s)', async (_label, end_date) => {
    db.booking.findFirst.mockResolvedValue(finishedBooking({ end_date }));

    await expect(
      createBookingReview(GUEST, 5, { rating: 5, comment: COMMENT })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('autorise l’avis dès le lendemain de la fin', async () => {
    db.booking.findFirst.mockResolvedValue(finishedBooking({ end_date: day(-1) }));

    await expect(
      createBookingReview(GUEST, 5, { rating: 5, comment: COMMENT })
    ).resolves.toBeDefined();
  });

  it('renvoie 409 quand un avis existe déjà pour cette réservation', async () => {
    db.booking.findFirst.mockResolvedValue(finishedBooking({ reviews: [{ id_review: 2 }] }));

    await expect(
      createBookingReview(GUEST, 5, { rating: 5, comment: COMMENT })
    ).rejects.toMatchObject({ status: 409 });
    expect(db.review.create).not.toHaveBeenCalled();
  });
});

describe('getReviewEligibility', () => {
  it('déclare éligible quand une location confirmée est terminée', async () => {
    db.booking.findFirst.mockResolvedValue({ id_booking: 5 });

    await expect(getReviewEligibility(GUEST, '4')).resolves.toEqual({
      can_review: true,
      id_booking: 5,
    });
  });

  it('déclare non éligible sans location terminée', async () => {
    db.booking.findFirst.mockResolvedValue(null);

    await expect(getReviewEligibility(GUEST, '4')).resolves.toEqual({
      can_review: false,
      id_booking: null,
    });
  });

  it('ne retient que les locations confirmées et achevées, la plus récente d’abord', async () => {
    await getReviewEligibility(GUEST, '4');

    expect(db.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_user: GUEST,
          id_boat: 4,
          status: 'confirmed',
          deleted_at: null,
          end_date: { lt: expect.any(Date) },
        }),
        orderBy: { end_date: 'desc' },
      })
    );
  });
});

describe('listBoatReviews', () => {
  const rawReview = (overrides = {}) => ({
    id_review: 2,
    id_user: GUEST,
    rating: 5,
    comment: COMMENT,
    status: 'validated',
    created_at: new Date('2026-06-01'),
    owner_reply: null,
    owner_reply_at: null,
    user: { first_name: 'Lea', last_name: 'Marin', images: [{ url: 'http://x/a.png' }] },
    ...overrides,
  });

  it('n’affiche que les avis validés et en attente, jamais les refusés', async () => {
    await listBoatReviews('4');

    expect(db.review.findMany.mock.calls[0][0].where).toMatchObject({
      status: { in: ['validated', 'pending'] },
      deleted_at: null,
    });
  });

  it('anonymise partiellement l’auteur', async () => {
    db.review.findMany.mockResolvedValue([rawReview()]);

    const [review] = await listBoatReviews('4');

    expect(review.author).toBe('Lea M.');
    expect(review.avatar).toBe('http://x/a.png');
  });

  it('expose l’identifiant de l’auteur pour qu’il puisse modifier son avis', async () => {
    db.review.findMany.mockResolvedValue([rawReview()]);

    const [review] = await listBoatReviews('4');

    expect(review.id_user).toBe(GUEST);
  });

  it('met l’avatar à null quand l’auteur n’a pas de photo', async () => {
    db.review.findMany.mockResolvedValue([
      rawReview({ user: { first_name: 'Lea', last_name: 'Marin', images: [] } }),
    ]);

    const [review] = await listBoatReviews('4');

    expect(review.avatar).toBeNull();
  });

  it('reprend la réponse du propriétaire', async () => {
    db.review.findMany.mockResolvedValue([
      rawReview({ owner_reply: 'Merci !', owner_reply_at: new Date('2026-06-02') }),
    ]);

    const [review] = await listBoatReviews('4');

    expect(review).toMatchObject({ owner_reply: 'Merci !' });
  });
});

describe('updateBookingReview', () => {
  it('remet l’avis modifié en modération', async () => {
    await updateBookingReview(GUEST, 2, { rating: 4, comment: '  Corrigé  ' });

    expect(db.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_review: 2 },
        data: expect.objectContaining({ rating: 4, comment: 'Corrigé', status: 'pending' }),
      })
    );
  });

  it.each([
    ['note hors bornes', { rating: 9 }],
    ['note non entière', { rating: 2.5 }],
    ['note absente', {}],
  ])('refuse une %s', async (_label, payload) => {
    await expect(updateBookingReview(GUEST, 2, payload)).rejects.toMatchObject({ status: 400 });
    expect(db.review.findFirst).not.toHaveBeenCalled();
  });

  it('accepte un appel sans corps', async () => {
    await expect(updateBookingReview(GUEST, 2)).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    ['commentaire vide', '', null],
    ['commentaire fait d’espaces', '   ', null],
    ['commentaire absent', undefined, null],
  ])('remplace un %s par null', async (_label, comment, expected) => {
    await updateBookingReview(GUEST, 2, { rating: 4, comment });

    expect(db.review.update.mock.calls[0][0].data.comment).toBe(expected);
  });

  it('ne cherche que parmi les avis du locataire', async () => {
    await updateBookingReview(GUEST, 2, { rating: 4 });

    expect(db.review.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_review: 2, id_user: GUEST, deleted_at: null } })
    );
  });

  it('renvoie 404 pour l’avis d’un autre', async () => {
    db.review.findFirst.mockResolvedValue(null);

    await expect(updateBookingReview(GUEST, 2, { rating: 4 })).rejects.toMatchObject({
      status: 404,
    });
    expect(db.review.update).not.toHaveBeenCalled();
  });
});

describe('deleteBookingReview', () => {
  it('supprime en douceur l’avis du locataire', async () => {
    const result = await deleteBookingReview(GUEST, 2);

    expect(db.review.update).toHaveBeenCalledWith({
      where: { id_review: 2 },
      data: { deleted_at: expect.any(Date), updated_at: expect.any(Date) },
    });
    expect(result).toEqual({ id_review: 2 });
  });

  it('renvoie 404 pour l’avis d’un autre', async () => {
    db.review.findFirst.mockResolvedValue(null);

    await expect(deleteBookingReview(GUEST, 2)).rejects.toMatchObject({ status: 404 });
    expect(db.review.update).not.toHaveBeenCalled();
  });
});

describe('listOwnerReviews', () => {
  it('ne remonte que les avis validés sur les bateaux du propriétaire', async () => {
    await listOwnerReviews(OWNER);

    expect(db.review.findMany.mock.calls[0][0].where).toEqual({
      status: 'validated',
      deleted_at: null,
      booking: { deleted_at: null, boat: { id_user: OWNER, deleted_at: null } },
    });
  });

  it('met à plat l’auteur et le bateau concerné', async () => {
    db.review.findMany.mockResolvedValue([
      {
        id_review: 2,
        rating: 5,
        comment: COMMENT,
        status: 'validated',
        created_at: new Date('2026-06-01'),
        owner_reply: null,
        owner_reply_at: null,
        user: { first_name: 'Lea', last_name: 'Marin' },
        booking: { boat: { id_boat: 4, name: 'Pen Duick' } },
      },
    ]);

    const [review] = await listOwnerReviews(OWNER);

    expect(review).toMatchObject({ author: 'Lea M.', boat: { id_boat: 4, name: 'Pen Duick' } });
  });
});

describe('replyToReview', () => {
  it('enregistre la réponse du propriétaire, espaces rognés', async () => {
    await replyToReview(OWNER, 2, '  Merci pour votre retour !  ');

    expect(db.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_review: 2 },
        data: expect.objectContaining({
          owner_reply: 'Merci pour votre retour !',
          owner_reply_at: expect.any(Date),
        }),
      })
    );
  });

  it.each([
    ['réponse vide', ''],
    ['réponse faite d’espaces', '   '],
    ['réponse absente', undefined],
    ['réponse nulle', null],
  ])('refuse une %s', async (_label, reply) => {
    await expect(replyToReview(OWNER, 2, reply)).rejects.toMatchObject({ status: 400 });
    expect(db.review.findFirst).not.toHaveBeenCalled();
  });

  it('ne cherche que parmi les avis portant sur ses propres bateaux', async () => {
    await replyToReview(OWNER, 2, 'Merci !');

    expect(db.review.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_review: 2,
          deleted_at: null,
          booking: { boat: { id_user: OWNER } },
        },
      })
    );
  });

  it('renvoie 404 pour un avis sur le bateau d’un autre propriétaire', async () => {
    db.review.findFirst.mockResolvedValue(null);

    await expect(replyToReview(OWNER, 2, 'Merci !')).rejects.toMatchObject({ status: 404 });
    expect(db.review.update).not.toHaveBeenCalled();
  });
});
