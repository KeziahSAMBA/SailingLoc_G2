import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  port: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { listPorts, createPort, deletePort } = await import('../src/services/portAdminService.js');

const storedPort = (overrides = {}) => ({
  id_port: 3,
  name: 'Marseille',
  city: 'Marseille',
  country: 'France',
  department: '13',
  region: "Provence-Alpes-Côte d'Azur",
  latitude: '43.3',
  longitude: '5.4',
  created_at: new Date('2026-01-01'),
  deleted_at: null,
  _count: { boats: 0 },
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.port.findMany.mockResolvedValue([]);
  db.port.findUnique.mockResolvedValue(null);
  db.port.create.mockImplementation(async ({ data }) => storedPort(data));
  db.port.update.mockImplementation(async ({ data }) => storedPort(data));
});

describe('listPorts', () => {
  it('exclut les ports supprimés et trie par nom', async () => {
    await listPorts();

    expect(db.port.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted_at: null }, orderBy: { name: 'asc' } })
    );
  });

  it('cherche sur le nom et la ville', async () => {
    await listPorts({ search: '  marseille  ' });

    expect(db.port.findMany.mock.calls[0][0].where.OR).toEqual([
      { name: { contains: 'marseille', mode: 'insensitive' } },
      { city: { contains: 'marseille', mode: 'insensitive' } },
    ]);
  });

  it('filtre sur la région', async () => {
    await listPorts({ region: '  Bretagne  ' });

    expect(db.port.findMany.mock.calls[0][0].where.region).toBe('Bretagne');
  });

  it.each([
    ['recherche vide', { search: '   ' }],
    ['région vide', { region: '' }],
  ])('ignore une %s', async (_label, filters) => {
    await listPorts(filters);

    expect(db.port.findMany.mock.calls[0][0].where).toEqual({ deleted_at: null });
  });

  it('convertit les coordonnées et expose le nombre de bateaux', async () => {
    db.port.findMany.mockResolvedValue([storedPort({ _count: { boats: 4 } })]);

    const [port] = await listPorts();

    expect(port).toMatchObject({ latitude: 43.3, longitude: 5.4, boats_count: 4 });
  });

  it('accepte un port sans coordonnées', async () => {
    db.port.findMany.mockResolvedValue([storedPort({ latitude: null, longitude: null })]);

    const [port] = await listPorts();

    expect(port).toMatchObject({ latitude: null, longitude: null });
  });
});

describe('createPort', () => {
  it('déduit département et région du code INSEE', async () => {
    await createPort({ name: 'Sète', city: 'Sète', insee: '34301' });

    expect(db.port.create.mock.calls[0][0].data).toMatchObject({
      name: 'Sète',
      city: 'Sète',
      country: 'France',
      department: '34',
    });
  });

  it('accepte une région explicite en repli quand l’INSEE ne donne rien', async () => {
    await createPort({ name: 'Sète', city: 'Sète', region: '  Occitanie  ' });

    expect(db.port.create.mock.calls[0][0].data.region).toBe('Occitanie');
  });

  it('met la région à null sans INSEE ni valeur explicite', async () => {
    await createPort({ name: 'Sète', city: 'Sète' });

    expect(db.port.create.mock.calls[0][0].data.region).toBeNull();
  });

  it('conserve un pays explicite', async () => {
    await createPort({ name: 'Palma', city: 'Palma', country: '  Espagne  ' });

    expect(db.port.create.mock.calls[0][0].data.country).toBe('Espagne');
  });

  it.each([
    ['coordonnées absentes', {}, null],
    ['coordonnées vides', { latitude: '', longitude: '' }, null],
  ])('met les coordonnées à null pour des %s', async (_label, coords, expected) => {
    await createPort({ name: 'Sète', city: 'Sète', ...coords });

    expect(db.port.create.mock.calls[0][0].data.latitude).toBe(expected);
  });

  it('convertit les coordonnées transmises en chaînes', async () => {
    await createPort({ name: 'Sète', city: 'Sète', latitude: '43.4', longitude: '3.7' });

    expect(db.port.create.mock.calls[0][0].data).toMatchObject({
      latitude: 43.4,
      longitude: 3.7,
    });
  });

  it.each([
    ['nom manquant', { name: '', city: 'Sète' }],
    ['nom fait d’espaces', { name: '   ', city: 'Sète' }],
    ['ville manquante', { name: 'Sète', city: '' }],
  ])('refuse un %s', async (_label, payload) => {
    await expect(createPort(payload)).rejects.toMatchObject({ status: 400 });
    expect(db.port.create).not.toHaveBeenCalled();
  });

  it('renvoie 409 quand le port existe déjà et est actif', async () => {
    db.port.findUnique.mockResolvedValue(storedPort({ deleted_at: null }));

    await expect(createPort({ name: 'Marseille', city: 'Marseille' })).rejects.toMatchObject({
      status: 409,
    });
    expect(db.port.create).not.toHaveBeenCalled();
  });

  it('réactive un port supprimé au lieu d’échouer', async () => {
    db.port.findUnique.mockResolvedValue(storedPort({ deleted_at: new Date() }));

    await createPort({ name: 'Marseille', city: 'Marseille' });

    expect(db.port.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_port: 3 },
        data: expect.objectContaining({ deleted_at: null }),
      })
    );
    expect(db.port.create).not.toHaveBeenCalled();
  });
});

describe('deletePort', () => {
  it('supprime en douceur un port sans bateau', async () => {
    db.port.findUnique.mockResolvedValue(storedPort({ _count: { boats: 0 } }));

    await deletePort('3');

    expect(db.port.update).toHaveBeenCalledWith({
      where: { id_port: 3 },
      data: { deleted_at: expect.any(Date), updated_at: expect.any(Date) },
    });
  });

  it('refuse la suppression tant que des bateaux y sont rattachés', async () => {
    db.port.findUnique.mockResolvedValue(storedPort({ _count: { boats: 2 } }));

    await expect(deletePort('3')).rejects.toMatchObject({ status: 409 });
    expect(db.port.update).not.toHaveBeenCalled();
  });

  it.each([
    ['port inexistant', null],
    ['port déjà supprimé', storedPort({ deleted_at: new Date() })],
  ])('renvoie 404 pour un %s', async (_label, port) => {
    db.port.findUnique.mockResolvedValue(port);

    await expect(deletePort('3')).rejects.toMatchObject({ status: 404 });
  });
});
