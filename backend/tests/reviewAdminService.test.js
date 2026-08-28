import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  review: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { listReviews, updateReview, deleteReview } =
  await import('../src/services/reviewAdminService.js');

const storedReview = (overrides = {}) => ({
  id_review: 2,
  rating: 4,
  comment: 'Très bon séjour',
  status: 'pending',
  created_at: new Date('2026-06-01'),
  deleted_at: null,
  user: { id_user: 3, first_name: 'Lea', last_name: 'Marin' },
  booking: { boat: { name: 'Pen Duick' } },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.review.findMany.mockResolvedValue([]);
  db.review.findUnique.mockResolvedValue(storedReview());
  db.review.update.mockImplementation(async ({ data }) => storedReview(data));
});

describe('listReviews', () => {
  it('exclut les avis supprimés', async () => {
    await listReviews();

    expect(db.review.findMany.mock.calls[0][0].where).toEqual({ deleted_at: null });
  });

  it.each(['pending', 'validated', 'refused'])('filtre sur le statut %s', async (status) => {
    await listReviews({ status });

    expect(db.review.findMany.mock.calls[0][0].where.status).toBe(status);
  });

  it('ignore un statut inconnu', async () => {
    await listReviews({ status: 'archivé' });

    expect(db.review.findMany.mock.calls[0][0].where).not.toHaveProperty('status');
  });

  it('cherche dans le commentaire et le nom de l’auteur', async () => {
    await listReviews({ search: '  marin  ' });

    expect(db.review.findMany.mock.calls[0][0].where.OR).toEqual([
      { comment: { contains: 'marin', mode: 'insensitive' } },
      { user: { first_name: { contains: 'marin', mode: 'insensitive' } } },
      { user: { last_name: { contains: 'marin', mode: 'insensitive' } } },
    ]);
  });

  it('ignore une recherche vide', async () => {
    await listReviews({ search: '  ' });

    expect(db.review.findMany.mock.calls[0][0].where).not.toHaveProperty('OR');
  });

  it('met à plat l’auteur et le bateau', async () => {
    db.review.findMany.mockResolvedValue([storedReview()]);

    const [review] = await listReviews();

    expect(review).toEqual({
      id_review: 2,
      rating: 4,
      comment: 'Très bon séjour',
      status: 'pending',
      created_at: new Date('2026-06-01'),
      author: { first_name: 'Lea', last_name: 'Marin' },
      boat_name: 'Pen Duick',
    });
  });

  it('tolère un auteur ou une réservation manquants', async () => {
    db.review.findMany.mockResolvedValue([storedReview({ user: null, booking: null })]);

    const [review] = await listReviews();

    expect(review).toMatchObject({ author: null, boat_name: null });
  });
});

describe('updateReview', () => {
  it.each([
    ['avis inexistant', null],
    ['avis supprimé', storedReview({ deleted_at: new Date() })],
  ])('renvoie 404 pour un %s', async (_label, review) => {
    db.review.findUnique.mockResolvedValue(review);

    await expect(updateReview(2, { status: 'validated' })).rejects.toMatchObject({ status: 404 });
  });

  it.each(['pending', 'validated', 'refused'])('accepte le statut %s', async (status) => {
    await updateReview(2, { status });

    expect(db.review.update.mock.calls[0][0].data.status).toBe(status);
  });

  it('refuse un statut invalide', async () => {
    await expect(updateReview(2, { status: 'archivé' })).rejects.toMatchObject({ status: 400 });
    expect(db.review.update).not.toHaveBeenCalled();
  });

  it('rogne le commentaire modifié', async () => {
    await updateReview(2, { comment: '  Corrigé  ' });

    expect(db.review.update.mock.calls[0][0].data.comment).toBe('Corrigé');
  });

  it.each([
    ['commentaire vide', ''],
    ['commentaire fait d’espaces', '   '],
  ])('remplace un %s par null', async (_label, comment) => {
    await updateReview(2, { comment });

    expect(db.review.update.mock.calls[0][0].data.comment).toBeNull();
  });

  it.each([1, 2, 3, 4, 5])('accepte la note %i', async (rating) => {
    await updateReview(2, { rating });

    expect(db.review.update.mock.calls[0][0].data.rating).toBe(rating);
  });

  it.each([
    ['note à zéro', 0],
    ['note à 6', 6],
    ['note négative', -1],
    ['note décimale', 3.5],
    ['note non numérique', 'quatre'],
  ])('refuse une %s', async (_label, rating) => {
    await expect(updateReview(2, { rating })).rejects.toMatchObject({ status: 400 });
  });

  it('accepte une note transmise sous forme de chaîne numérique', async () => {
    await updateReview(2, { rating: '5' });

    expect(db.review.update.mock.calls[0][0].data.rating).toBe(5);
  });

  it('refuse une mise à jour sans aucun champ', async () => {
    await expect(updateReview(2, {})).rejects.toMatchObject({
      status: 400,
      message: 'Aucune modification à appliquer.',
    });
  });

  it('renvoie l’avis mis à plat après modification', async () => {
    const review = await updateReview(2, { status: 'validated' });

    expect(review).toMatchObject({ id_review: 2, author: { first_name: 'Lea' } });
  });
});

describe('deleteReview', () => {
  it('supprime en douceur pour conserver l’historique', async () => {
    await deleteReview(2);

    expect(db.review.update).toHaveBeenCalledWith({
      where: { id_review: 2 },
      data: { deleted_at: expect.any(Date), updated_at: expect.any(Date) },
    });
  });

  it.each([
    ['avis inexistant', null],
    ['avis déjà supprimé', storedReview({ deleted_at: new Date() })],
  ])('renvoie 404 pour un %s', async (_label, review) => {
    db.review.findUnique.mockResolvedValue(review);

    await expect(deleteReview(2)).rejects.toMatchObject({ status: 404 });
    expect(db.review.update).not.toHaveBeenCalled();
  });
});
