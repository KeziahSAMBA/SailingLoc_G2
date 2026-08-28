import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  boat: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  boatReport: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const mockUnpublishedEmail = jest.fn().mockResolvedValue();
const mockRepublishedEmail = jest.fn().mockResolvedValue();
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendBoatUnpublishedEmail: mockUnpublishedEmail,
  sendBoatRepublishedEmail: mockRepublishedEmail,
}));

const { listBoats, setBoatPublished, listReports, setReportStatus } =
  await import('../src/services/boatAdminService.js');

const owner = { id_user: 7, first_name: 'Marie', last_name: 'Dupont', email: 'marie@example.com' };

const storedBoat = (overrides = {}) => ({
  id_boat: 1,
  name: 'Pen Duick',
  type: 'voilier',
  daily_price: '250.00',
  is_published: true,
  registration: 'FR-MRS-042',
  created_at: new Date('2026-01-01'),
  deleted_at: null,
  owner,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.boat.findMany.mockResolvedValue([]);
  db.boat.findUnique.mockResolvedValue(storedBoat());
  db.boat.update.mockImplementation(async ({ data }) => storedBoat(data));
  db.boatReport.findMany.mockResolvedValue([]);
  db.boatReport.findUnique.mockResolvedValue({ id_report: 5, status: 'pending' });
  db.boatReport.update.mockImplementation(async ({ data }) => ({ id_report: 5, ...data }));
  db.boatReport.updateMany.mockResolvedValue({ count: 0 });
  db.boatReport.count.mockResolvedValue(0);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('listBoats', () => {
  it('exclut les bateaux supprimés', async () => {
    await listBoats();

    expect(db.boat.findMany.mock.calls[0][0].where).toEqual({ deleted_at: null });
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('filtre sur published=%s', async (published, expected) => {
    await listBoats({ published });

    expect(db.boat.findMany.mock.calls[0][0].where.is_published).toBe(expected);
  });

  it('ignore une valeur de publication non reconnue', async () => {
    await listBoats({ published: 'peut-être' });

    expect(db.boat.findMany.mock.calls[0][0].where).not.toHaveProperty('is_published');
  });

  it('convertit le prix et expose le nombre de signalements en attente', async () => {
    db.boat.findMany.mockResolvedValue([storedBoat({ _count: { reports: 2 } })]);

    const [boat] = await listBoats();

    expect(boat).toMatchObject({ daily_price: 250, pending_reports: 2, owner });
  });

  it('accepte un brouillon sans prix', async () => {
    db.boat.findMany.mockResolvedValue([storedBoat({ daily_price: null, _count: { reports: 0 } })]);

    const [boat] = await listBoats();

    expect(boat.daily_price).toBeNull();
  });

  it('tolère un bateau sans propriétaire rattaché', async () => {
    db.boat.findMany.mockResolvedValue([storedBoat({ owner: null, _count: { reports: 0 } })]);

    const [boat] = await listBoats();

    expect(boat.owner).toBeNull();
  });
});

describe('setBoatPublished — publication', () => {
  it('publie le bateau et passe l’annonce en « published »', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat({ is_published: false }));

    await setBoatPublished(1, true);

    expect(db.boat.update).toHaveBeenCalledWith({
      where: { id_boat: 1 },
      data: { is_published: true, status: 'published', updated_at: expect.any(Date) },
    });
  });

  it('prévient le propriétaire d’une remise en ligne', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat({ is_published: false }));

    await setBoatPublished(1, true);

    expect(mockRepublishedEmail).toHaveBeenCalledWith('marie@example.com', {
      firstName: 'Marie',
      boatName: 'Pen Duick',
    });
  });

  it('n’envoie pas d’email quand le bateau était déjà publié', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat({ is_published: true }));

    await setBoatPublished(1, true);

    expect(mockRepublishedEmail).not.toHaveBeenCalled();
  });

  it('ne clôt pas les signalements lors d’une publication', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat({ is_published: false }));

    await setBoatPublished(1, true);

    expect(db.boatReport.updateMany).not.toHaveBeenCalled();
  });
});

describe('setBoatPublished — dépublication', () => {
  it('dépublie le bateau et passe l’annonce en « refused »', async () => {
    await setBoatPublished(1, false);

    expect(db.boat.update).toHaveBeenCalledWith({
      where: { id_boat: 1 },
      data: { is_published: false, status: 'refused', updated_at: expect.any(Date) },
    });
  });

  it('clôt les signalements en attente du bateau', async () => {
    await setBoatPublished(1, false);

    expect(db.boatReport.updateMany).toHaveBeenCalledWith({
      where: { id_boat: 1, status: 'pending' },
      data: { status: 'resolved', resolved_at: expect.any(Date) },
    });
  });

  it('prévient le propriétaire du retrait', async () => {
    await setBoatPublished(1, false);

    expect(mockUnpublishedEmail).toHaveBeenCalledWith('marie@example.com', {
      firstName: 'Marie',
      boatName: 'Pen Duick',
    });
  });

  it('applique la décision même si l’email échoue', async () => {
    mockUnpublishedEmail.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(setBoatPublished(1, false)).resolves.toMatchObject({ is_published: false });
    expect(db.boat.update).toHaveBeenCalled();
  });

  it('applique la republication même si l’email échoue', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat({ is_published: false }));
    mockRepublishedEmail.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(setBoatPublished(1, true)).resolves.toBeDefined();
  });

  it('n’envoie rien quand le propriétaire n’a pas d’email', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat({ owner: null }));

    await setBoatPublished(1, false);

    expect(mockUnpublishedEmail).not.toHaveBeenCalled();
  });
});

describe('setBoatPublished — résultat et garde-fous', () => {
  it('renvoie le bateau avec le compte de signalements restants', async () => {
    db.boatReport.count.mockResolvedValue(3);

    const boat = await setBoatPublished(1, true);

    expect(boat).toMatchObject({ id_boat: 1, daily_price: 250, pending_reports: 3, owner });
  });

  it('interprète une valeur non booléenne comme une décision de publication', async () => {
    db.boat.findUnique.mockResolvedValue(storedBoat({ is_published: false }));

    await setBoatPublished(1, 'oui');

    expect(db.boat.update.mock.calls[0][0].data.is_published).toBe(true);
  });

  it.each([
    ['bateau inexistant', null],
    ['bateau supprimé', storedBoat({ deleted_at: new Date() })],
  ])('renvoie 404 pour un %s', async (_label, boat) => {
    db.boat.findUnique.mockResolvedValue(boat);

    await expect(setBoatPublished(1, true)).rejects.toMatchObject({ status: 404 });
    expect(db.boat.update).not.toHaveBeenCalled();
  });
});

describe('listReports', () => {
  it('ne filtre pas par défaut', async () => {
    await listReports();

    expect(db.boatReport.findMany.mock.calls[0][0].where).toEqual({});
  });

  it.each(['pending', 'resolved', 'dismissed'])('filtre sur le statut %s', async (status) => {
    await listReports({ status });

    expect(db.boatReport.findMany.mock.calls[0][0].where.status).toBe(status);
  });

  it('ignore un statut inconnu', async () => {
    await listReports({ status: 'archivé' });

    expect(db.boatReport.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('met à plat le signalement avec son bateau et son auteur', async () => {
    db.boatReport.findMany.mockResolvedValue([
      {
        id_report: 5,
        reason: 'Annonce trompeuse',
        status: 'pending',
        created_at: new Date('2026-06-01'),
        resolved_at: null,
        boat: { id_boat: 1, name: 'Pen Duick', is_published: true },
        reporter: { id_user: 3, first_name: 'Lea' },
      },
    ]);

    const [report] = await listReports();

    expect(report).toMatchObject({ id_report: 5, reason: 'Annonce trompeuse', status: 'pending' });
  });
});

describe('setReportStatus', () => {
  it.each(['resolved', 'dismissed'])('horodate la clôture pour le statut %s', async (status) => {
    await setReportStatus(5, status);

    expect(db.boatReport.update).toHaveBeenCalledWith({
      where: { id_report: 5 },
      data: { status, resolved_at: expect.any(Date) },
    });
  });

  it('efface la date de clôture en repassant en « pending »', async () => {
    await setReportStatus(5, 'pending');

    expect(db.boatReport.update).toHaveBeenCalledWith({
      where: { id_report: 5 },
      data: { status: 'pending', resolved_at: null },
    });
  });

  it('refuse un statut invalide avant toute lecture', async () => {
    await expect(setReportStatus(5, 'archivé')).rejects.toMatchObject({ status: 400 });
    expect(db.boatReport.findUnique).not.toHaveBeenCalled();
  });

  it('renvoie 404 pour un signalement inexistant', async () => {
    db.boatReport.findUnique.mockResolvedValue(null);

    await expect(setReportStatus(5, 'resolved')).rejects.toMatchObject({ status: 404 });
    expect(db.boatReport.update).not.toHaveBeenCalled();
  });
});
