import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  document: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  booking: { findFirst: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

// Le vrai documentRepository est conservé : mocker Prisma plutôt que le
// repository couvre aussi la forme réelle des requêtes.
const mockUnlink = jest.fn().mockResolvedValue();
const mockExistsSync = jest.fn(() => true);
jest.unstable_mockModule('fs', () => ({
  default: { promises: { unlink: mockUnlink }, existsSync: mockExistsSync },
  promises: { unlink: mockUnlink },
  existsSync: mockExistsSync,
}));

const {
  DOCUMENT_TYPES,
  getMyDocuments,
  uploadDocument,
  getDocumentFile,
  listAllDocuments,
  setDocumentStatus,
  deleteMyDocument,
} = await import('../src/services/documentService.js');

const LOCATAIRE = { id_user: 1, role: 'locataire' };
const PROPRIETAIRE = { id_user: 2, role: 'proprietaire' };
const ADMIN = { id_user: 9, role: 'admin' };

const storedDoc = (overrides = {}) => ({
  id_document: 5,
  id_user: 1,
  type: 'permis_conduire',
  file_name: 'permis.pdf',
  file_url: 'storage/documents/permis.pdf',
  status: 'pending',
  upload_date: new Date('2026-06-01'),
  id_boat: null,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockExistsSync.mockReturnValue(true);
  db.document.findMany.mockResolvedValue([]);
  db.document.findUnique.mockResolvedValue(storedDoc());
  db.document.create.mockImplementation(async ({ data }) => storedDoc(data));
  db.document.update.mockImplementation(async ({ data }) => storedDoc(data));
  db.document.delete.mockResolvedValue({});
  db.booking.findFirst.mockResolvedValue(null);
});

describe('getMyDocuments', () => {
  it('n’expose jamais le chemin disque', async () => {
    db.document.findMany.mockResolvedValue([storedDoc()]);

    const [doc] = await getMyDocuments(1);

    expect(doc).not.toHaveProperty('file_url');
    expect(doc).toEqual({
      id_document: 5,
      type: 'permis_conduire',
      file_name: 'permis.pdf',
      status: 'pending',
      upload_date: new Date('2026-06-01'),
      id_boat: null,
    });
  });

  it('trie du plus récent au plus ancien', async () => {
    await getMyDocuments(1);

    expect(db.document.findMany).toHaveBeenCalledWith({
      where: { id_user: 1 },
      orderBy: { upload_date: 'desc' },
    });
  });
});

describe('uploadDocument', () => {
  const file = { originalname: 'permis.pdf', path: 'storage\\documents\\permis.pdf' };

  it('enregistre le document en attente de validation', async () => {
    await uploadDocument(LOCATAIRE, 'permis_conduire', file);

    expect(db.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_user: 1,
        type: 'permis_conduire',
        file_name: 'permis.pdf',
        file_url: 'storage/documents/permis.pdf',
        status: 'pending',
      }),
    });
  });

  it('refuse un envoi sans fichier', async () => {
    await expect(uploadDocument(LOCATAIRE, 'permis_conduire', null)).rejects.toMatchObject({
      status: 400,
    });
    expect(db.document.create).not.toHaveBeenCalled();
  });

  it.each([
    ['un type inconnu', LOCATAIRE, 'passeport'],
    ['un type réservé au propriétaire', LOCATAIRE, 'acte_francisation'],
    ['un type réservé au locataire', PROPRIETAIRE, 'permis_conduire'],
  ])('refuse %s et supprime le fichier téléversé', async (_label, requester, type) => {
    await expect(uploadDocument(requester, type, file)).rejects.toMatchObject({ status: 400 });

    expect(mockUnlink).toHaveBeenCalledWith('storage\\documents\\permis.pdf');
    expect(db.document.create).not.toHaveBeenCalled();
  });

  it('remplace le document existant pour un type à exemplaire unique', async () => {
    db.document.findMany.mockResolvedValue([storedDoc({ id_document: 3 })]);

    await uploadDocument(LOCATAIRE, 'permis_conduire', file);

    expect(mockUnlink).toHaveBeenCalledWith('storage/documents/permis.pdf');
    expect(db.document.delete).toHaveBeenCalledWith({ where: { id_document: 3 } });
    expect(db.document.create).toHaveBeenCalled();
  });

  it('ajoute sans rien supprimer pour un acte de francisation', async () => {
    db.document.findMany.mockResolvedValue([storedDoc({ id_document: 3 })]);

    await uploadDocument(PROPRIETAIRE, 'acte_francisation', file);

    expect(db.document.delete).not.toHaveBeenCalled();
    expect(db.document.create).toHaveBeenCalled();
  });

  it('accepte tous les types déclarés pour chaque rôle', async () => {
    for (const type of DOCUMENT_TYPES.locataire) {
      await expect(uploadDocument(LOCATAIRE, type, file)).resolves.toBeDefined();
    }
    for (const type of DOCUMENT_TYPES.proprietaire) {
      await expect(uploadDocument(PROPRIETAIRE, type, file)).resolves.toBeDefined();
    }
  });

  it('refuse tout type pour un rôle sans documents attendus', async () => {
    await expect(uploadDocument(ADMIN, 'permis_conduire', file)).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('getDocumentFile — contrôle d’accès', () => {
  it('laisse le titulaire lire son document', async () => {
    const result = await getDocumentFile(LOCATAIRE, '5');

    expect(result).toMatchObject({ file_name: 'permis.pdf' });
    expect(result.absPath).toContain('permis.pdf');
  });

  it('laisse un admin lire n’importe quel document', async () => {
    await expect(getDocumentFile(ADMIN, '5')).resolves.toBeDefined();
    expect(db.booking.findFirst).not.toHaveBeenCalled();
  });

  it('laisse un propriétaire lire le document d’un locataire qui a réservé chez lui', async () => {
    db.booking.findFirst.mockResolvedValue({ id_booking: 7 });

    await expect(getDocumentFile(PROPRIETAIRE, '5')).resolves.toBeDefined();
    expect(db.booking.findFirst).toHaveBeenCalledWith({
      where: { deleted_at: null, id_user: 1, boat: { id_user: 2, deleted_at: null } },
      select: { id_booking: true },
    });
  });

  it('refuse un propriétaire sans réservation liant les deux comptes', async () => {
    db.booking.findFirst.mockResolvedValue(null);

    await expect(getDocumentFile(PROPRIETAIRE, '5')).rejects.toMatchObject({ status: 403 });
  });

  it('refuse à un propriétaire un document qui n’est pas de type locataire', async () => {
    db.document.findUnique.mockResolvedValue(storedDoc({ type: 'assurance', id_user: 3 }));
    db.booking.findFirst.mockResolvedValue({ id_booking: 7 });

    await expect(getDocumentFile(PROPRIETAIRE, '5')).rejects.toMatchObject({ status: 403 });
  });

  it('refuse un locataire sur le document d’un autre', async () => {
    db.document.findUnique.mockResolvedValue(storedDoc({ id_user: 99 }));

    await expect(getDocumentFile(LOCATAIRE, '5')).rejects.toMatchObject({ status: 403 });
  });

  it('renvoie 404 pour un document inexistant', async () => {
    db.document.findUnique.mockResolvedValue(null);

    await expect(getDocumentFile(ADMIN, '5')).rejects.toMatchObject({ status: 404 });
  });

  it('renvoie 404 quand la ligne existe mais le fichier a disparu du disque', async () => {
    mockExistsSync.mockReturnValue(false);

    await expect(getDocumentFile(LOCATAIRE, '5')).rejects.toMatchObject({
      status: 404,
      message: 'Fichier introuvable.',
    });
  });
});

describe('listAllDocuments', () => {
  it('ne filtre pas par défaut', async () => {
    await listAllDocuments();

    expect(db.document.findMany.mock.calls[0][0].where).toEqual({});
  });

  it.each(['pending', 'validated', 'refused'])('filtre sur le statut %s', async (status) => {
    await listAllDocuments({ status });

    expect(db.document.findMany.mock.calls[0][0].where.status).toBe(status);
  });

  it('ignore un statut inconnu', async () => {
    await listAllDocuments({ status: 'archivé' });

    expect(db.document.findMany.mock.calls[0][0].where).not.toHaveProperty('status');
  });

  it('filtre sur le type de document', async () => {
    await listAllDocuments({ type: 'assurance' });

    expect(db.document.findMany.mock.calls[0][0].where.type).toBe('assurance');
  });

  it('filtre sur le rôle du titulaire', async () => {
    await listAllDocuments({ role: 'proprietaire' });

    expect(db.document.findMany.mock.calls[0][0].where.user).toEqual({ role: 'proprietaire' });
  });

  it('cherche sur l’identité du titulaire', async () => {
    await listAllDocuments({ search: '  dupont  ' });

    expect(db.document.findMany.mock.calls[0][0].where.user.OR).toEqual([
      { first_name: { contains: 'dupont', mode: 'insensitive' } },
      { last_name: { contains: 'dupont', mode: 'insensitive' } },
      { email: { contains: 'dupont', mode: 'insensitive' } },
    ]);
  });

  it('ignore une recherche vide', async () => {
    await listAllDocuments({ search: '   ' });

    expect(db.document.findMany.mock.calls[0][0].where).not.toHaveProperty('user');
  });

  it('joint le titulaire au document', async () => {
    db.document.findMany.mockResolvedValue([
      {
        ...storedDoc(),
        user: {
          id_user: 1,
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean@x.fr',
          role: 'locataire',
        },
      },
    ]);

    const [doc] = await listAllDocuments();

    expect(doc.user).toMatchObject({ id_user: 1, role: 'locataire' });
    expect(doc).not.toHaveProperty('file_url');
  });

  it('tolère un document sans titulaire joint', async () => {
    db.document.findMany.mockResolvedValue([{ ...storedDoc(), user: null }]);

    const [doc] = await listAllDocuments();

    expect(doc.user).toBeNull();
  });
});

describe('setDocumentStatus', () => {
  it.each(['pending', 'validated', 'refused'])('accepte le statut %s', async (status) => {
    await setDocumentStatus(5, status);

    expect(db.document.update).toHaveBeenCalledWith({
      where: { id_document: 5 },
      data: { status, updated_at: expect.any(Date) },
    });
  });

  it('refuse un statut invalide avant toute lecture', async () => {
    await expect(setDocumentStatus(5, 'archivé')).rejects.toMatchObject({ status: 400 });
    expect(db.document.findUnique).not.toHaveBeenCalled();
  });

  it('renvoie 404 pour un document inexistant', async () => {
    db.document.findUnique.mockResolvedValue(null);

    await expect(setDocumentStatus(5, 'validated')).rejects.toMatchObject({ status: 404 });
    expect(db.document.update).not.toHaveBeenCalled();
  });
});

describe('deleteMyDocument', () => {
  it('supprime la ligne et le fichier', async () => {
    await deleteMyDocument(1, '5');

    expect(mockUnlink).toHaveBeenCalledWith('storage/documents/permis.pdf');
    expect(db.document.delete).toHaveBeenCalledWith({ where: { id_document: 5 } });
  });

  it.each([
    ['document inexistant', null],
    ['document d’un autre utilisateur', storedDoc({ id_user: 99 })],
  ])('renvoie 404 pour un %s', async (_label, doc) => {
    db.document.findUnique.mockResolvedValue(doc);

    await expect(deleteMyDocument(1, '5')).rejects.toMatchObject({ status: 404 });
    expect(db.document.delete).not.toHaveBeenCalled();
  });

  it('refuse de supprimer un document rattaché à une annonce', async () => {
    db.document.findUnique.mockResolvedValue(storedDoc({ id_boat: 4 }));

    await expect(deleteMyDocument(1, '5')).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/rattaché à une annonce/),
    });
    expect(db.document.delete).not.toHaveBeenCalled();
  });

  it('n’essaie pas de supprimer un fichier dont le chemin est vide', async () => {
    db.document.findUnique.mockResolvedValue(storedDoc({ file_url: null }));

    await deleteMyDocument(1, '5');

    expect(mockUnlink).not.toHaveBeenCalled();
    expect(db.document.delete).toHaveBeenCalled();
  });
});
