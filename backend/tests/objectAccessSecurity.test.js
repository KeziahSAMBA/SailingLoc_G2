import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFindAccessible = jest.fn();

jest.unstable_mockModule('../src/repositories/documentRepository.js', () => ({
  createDocument: jest.fn(),
  findDocumentsByUser: jest.fn(),
  findDocumentsByUserAndType: jest.fn(),
  findDocumentById: jest.fn(),
  findDocumentAccessibleBy: mockFindAccessible,
  findAllDocuments: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
}));

const { getDocumentFile } = await import('../src/services/documentService.js');

describe('object-level access control', () => {
  beforeEach(() => {
    mockFindAccessible.mockReset();
  });

  it("inclut l'identité du demandeur dans la recherche du document", async () => {
    const requester = { id_user: 12, role: 'locataire' };
    mockFindAccessible.mockResolvedValue(null);

    await expect(getDocumentFile(requester, 42)).rejects.toMatchObject({
      status: 404,
      message: 'Document introuvable.',
    });

    expect(mockFindAccessible).toHaveBeenCalledWith(42, requester);
  });

  it("ne révèle pas si le document d'un autre utilisateur existe", async () => {
    mockFindAccessible.mockResolvedValue(null);

    await expect(
      getDocumentFile({ id_user: 99, role: 'locataire' }, 42)
    ).rejects.toMatchObject({
      status: 404,
      message: 'Document introuvable.',
    });
  });
});
