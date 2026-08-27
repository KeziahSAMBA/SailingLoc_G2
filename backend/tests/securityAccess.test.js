import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockDocumentFindUnique = jest.fn();
const mockBookingDocumentFindFirst = jest.fn();
const mockResolveExistingPrivateFile = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {
    document: { findUnique: mockDocumentFindUnique },
    bookingDocument: { findFirst: mockBookingDocumentFindFirst },
  },
}));

jest.unstable_mockModule('../src/utils/fileSecurity.js', () => ({
  inspectUploadedFile: jest.fn(),
  mimeTypeForFileName: jest.fn(() => 'application/pdf'),
  resolveExistingPrivateFile: mockResolveExistingPrivateFile,
  resolveStoredFilePath: jest.fn(),
  safeDisplayName: jest.fn((name) => name),
  storagePath: jest.fn(),
}));

jest.unstable_mockModule('../src/utils/fileCrypto.js', () => ({
  encryptFileInPlace: jest.fn(),
}));

const { getDocumentFile } = await import('../src/services/documentService.js');

const tenantDocument = (overrides = {}) => ({
  id_document: 12,
  id_user: 7,
  type: 'piece_identite',
  status: 'validated',
  file_url: 'storage/documents/private.pdf',
  file_name: 'piece-identite.pdf',
  mime_type: 'application/pdf',
  ...overrides,
});

describe('document ownership controls', () => {
  beforeEach(() => {
    mockDocumentFindUnique.mockReset();
    mockBookingDocumentFindFirst.mockReset();
    mockResolveExistingPrivateFile.mockReset().mockResolvedValue('/private/private.pdf');
  });

  it('allows an owner only when the validated document is attached to the exact booking', async () => {
    mockDocumentFindUnique.mockResolvedValue(tenantDocument());
    mockBookingDocumentFindFirst.mockResolvedValue({ id_booking: 91 });

    await expect(getDocumentFile({ id_user: 42, role: 'proprietaire' }, 12)).resolves.toMatchObject(
      { absPath: '/private/private.pdf' }
    );

    expect(mockBookingDocumentFindFirst).toHaveBeenCalledWith({
      where: {
        id_document: 12,
        document: { id_user: 7 },
        booking: {
          deleted_at: null,
          id_user: 7,
          boat: { id_user: 42, deleted_at: null },
        },
      },
      select: { id_booking: true },
    });
  });

  it('rejects an owner when the document is not attached to one of their bookings', async () => {
    mockDocumentFindUnique.mockResolvedValue(tenantDocument());
    mockBookingDocumentFindFirst.mockResolvedValue(null);

    await expect(getDocumentFile({ id_user: 42, role: 'proprietaire' }, 12)).rejects.toMatchObject({
      status: 403,
    });
    expect(mockResolveExistingPrivateFile).not.toHaveBeenCalled();
  });

  it('does not expose pending tenant documents to an owner', async () => {
    mockDocumentFindUnique.mockResolvedValue(tenantDocument({ status: 'pending' }));

    await expect(getDocumentFile({ id_user: 42, role: 'proprietaire' }, 12)).rejects.toMatchObject({
      status: 403,
    });
    expect(mockBookingDocumentFindFirst).not.toHaveBeenCalled();
  });

  it('keeps the document owner able to retrieve their own pending document', async () => {
    mockDocumentFindUnique.mockResolvedValue(tenantDocument({ status: 'pending' }));

    await expect(getDocumentFile({ id_user: 7, role: 'locataire' }, 12)).resolves.toMatchObject({
      absPath: '/private/private.pdf',
    });
    expect(mockBookingDocumentFindFirst).not.toHaveBeenCalled();
  });
});
