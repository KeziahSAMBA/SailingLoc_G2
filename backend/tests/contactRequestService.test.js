import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  contactRequest: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { createContactRequest, listContactRequests, setContactRequestStatus } =
  await import('../src/services/contactRequestService.js');

const storedRequest = (overrides = {}) => ({
  id_request: 8,
  name: 'Jean Dupont',
  email: 'jean@example.com',
  subject: 'Question',
  message: 'Bonjour, une question.',
  status: 'new',
  created_at: new Date('2026-06-01'),
  processed_at: null,
  ...overrides,
});

const validInput = (overrides = {}) => ({
  name: 'Jean Dupont',
  email: 'Jean@Example.COM',
  subject: 'Question',
  message: 'Bonjour, une question.',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  db.contactRequest.create.mockImplementation(async ({ data }) => storedRequest(data));
  db.contactRequest.findMany.mockResolvedValue([]);
  db.contactRequest.findUnique.mockResolvedValue(storedRequest());
  db.contactRequest.update.mockImplementation(async ({ data }) => storedRequest(data));
});

describe('createContactRequest', () => {
  it('normalise l’email et rogne les espaces', async () => {
    await createContactRequest(validInput({ name: '  Jean Dupont  ', subject: '  Question  ' }));

    expect(db.contactRequest.create).toHaveBeenCalledWith({
      data: {
        name: 'Jean Dupont',
        email: 'jean@example.com',
        subject: 'Question',
        message: 'Bonjour, une question.',
      },
    });
  });

  it.each([
    ['nom manquant', { name: '' }],
    ['nom fait d’espaces', { name: '   ' }],
    ['nom trop long', { name: 'a'.repeat(151) }],
    ['objet manquant', { subject: '' }],
    ['objet trop long', { subject: 'a'.repeat(201) }],
    ['message manquant', { message: '' }],
    ['message trop long', { message: 'a'.repeat(5001) }],
  ])('refuse un %s', async (_label, patch) => {
    await expect(createContactRequest(validInput(patch))).rejects.toMatchObject({ status: 400 });
    expect(db.contactRequest.create).not.toHaveBeenCalled();
  });

  it.each([
    ['email manquant', ''],
    ['email sans arobase', 'jeanexample.com'],
    ['email sans domaine', 'jean@'],
    ['email trop long', `${'a'.repeat(250)}@example.com`],
  ])('refuse un %s', async (_label, email) => {
    await expect(createContactRequest(validInput({ email }))).rejects.toMatchObject({
      status: 400,
    });
  });

  it('accepte les valeurs aux bornes hautes', async () => {
    await expect(
      createContactRequest(
        validInput({ name: 'a'.repeat(150), subject: 'a'.repeat(200), message: 'a'.repeat(5000) })
      )
    ).resolves.toBeDefined();
  });

  it('renvoie la demande créée sans champ interne', async () => {
    const created = await createContactRequest(validInput());

    expect(created).toMatchObject({ id_request: 8, status: 'new' });
  });
});

describe('listContactRequests', () => {
  it('ne filtre pas par défaut', async () => {
    await listContactRequests();

    expect(db.contactRequest.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { created_at: 'desc' },
    });
  });

  it.each(['new', 'processed'])('filtre sur le statut %s', async (status) => {
    await listContactRequests({ status });

    expect(db.contactRequest.findMany.mock.calls[0][0].where.status).toBe(status);
  });

  it('ignore un statut inconnu', async () => {
    await listContactRequests({ status: 'archivé' });

    expect(db.contactRequest.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('met à plat les demandes', async () => {
    db.contactRequest.findMany.mockResolvedValue([storedRequest()]);

    const [req] = await listContactRequests();

    expect(req).toEqual(storedRequest());
  });
});

describe('setContactRequestStatus', () => {
  it('horodate le traitement', async () => {
    await setContactRequestStatus(8, 'processed');

    expect(db.contactRequest.update).toHaveBeenCalledWith({
      where: { id_request: 8 },
      data: { status: 'processed', processed_at: expect.any(Date) },
    });
  });

  it('efface la date de traitement en repassant en « new »', async () => {
    await setContactRequestStatus(8, 'new');

    expect(db.contactRequest.update).toHaveBeenCalledWith({
      where: { id_request: 8 },
      data: { status: 'new', processed_at: null },
    });
  });

  it('refuse un statut invalide avant toute lecture', async () => {
    await expect(setContactRequestStatus(8, 'archivé')).rejects.toMatchObject({ status: 400 });
    expect(db.contactRequest.findUnique).not.toHaveBeenCalled();
  });

  it('renvoie 404 pour une demande inexistante', async () => {
    db.contactRequest.findUnique.mockResolvedValue(null);

    await expect(setContactRequestStatus(8, 'processed')).rejects.toMatchObject({ status: 404 });
    expect(db.contactRequest.update).not.toHaveBeenCalled();
  });
});
