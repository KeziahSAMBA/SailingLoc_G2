import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const documents = {
  getMyDocuments: jest.fn(),
  uploadDocument: jest.fn(),
  deleteMyDocument: jest.fn(),
  getDocumentFile: jest.fn(),
  listAllDocuments: jest.fn(),
  setDocumentStatus: jest.fn(),
};
jest.unstable_mockModule('../src/services/documentService.js', () => documents);

const bookingAdmin = {
  listBookings: jest.fn(),
  cancelBooking: jest.fn(),
  listDisputes: jest.fn(),
  setDisputeStatus: jest.fn(),
};
jest.unstable_mockModule('../src/services/bookingAdminService.js', () => bookingAdmin);

const invoices = { getInvoiceFor: jest.fn() };
jest.unstable_mockModule('../src/services/invoiceService.js', () => invoices);

const pdf = { renderInvoice: jest.fn(), invoiceFileName: jest.fn(() => 'LOC-2026-0001.pdf') };
jest.unstable_mockModule('../src/services/invoicePdf.js', () => pdf);

const db = { review: { findMany: jest.fn() }, port: { findMany: jest.fn() } };
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const mockListBoatReviews = jest.fn();
jest.unstable_mockModule('../src/services/reviewService.js', () => ({
  listBoatReviews: mockListBoatReviews,
}));

const docCtrl = await import('../src/controllers/documentController.js');
const bookingCtrl = await import('../src/controllers/bookingAdminController.js');
const invoiceCtrl = await import('../src/controllers/invoiceController.js');
const reviewCtrl = await import('../src/controllers/reviewController.js');
const portCtrl = await import('../src/controllers/portController.js');

function makeRes() {
  const res = { locals: {} };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.sendFile = jest.fn(() => res);
  res.destroy = jest.fn(() => res);
  return res;
}

function makeReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: { id_user: 1, role: 'locataire' }, ...overrides };
}

const httpError = (status, message) => Object.assign(new Error(message), { status });

let res;

beforeEach(() => {
  jest.clearAllMocks();
  res = makeRes();
  documents.getMyDocuments.mockResolvedValue([{ id_document: 5 }]);
  documents.uploadDocument.mockResolvedValue({ id_document: 5 });
  documents.deleteMyDocument.mockResolvedValue(undefined);
  documents.getDocumentFile.mockResolvedValue({
    absPath: '/app/storage/documents/permis.pdf',
    file_name: 'permis.pdf',
  });
  documents.listAllDocuments.mockResolvedValue([{ id_document: 5 }]);
  documents.setDocumentStatus.mockResolvedValue({ id_document: 5, status: 'validated' });
  bookingAdmin.listBookings.mockResolvedValue([{ id_booking: 5 }]);
  bookingAdmin.cancelBooking.mockResolvedValue({ id_booking: 5, status: 'cancelled' });
  bookingAdmin.listDisputes.mockResolvedValue([{ id_dispute: 9 }]);
  bookingAdmin.setDisputeStatus.mockResolvedValue({ id_dispute: 9, status: 'resolved' });
  invoices.getInvoiceFor.mockResolvedValue({ number: 'LOC-2026-0001' });
  pdf.renderInvoice.mockReturnValue({ on: jest.fn(), pipe: jest.fn() });
  mockListBoatReviews.mockResolvedValue([{ id_review: 2 }]);
  db.review.findMany.mockResolvedValue([]);
  db.port.findMany.mockResolvedValue([{ id_port: 3, name: 'Marseille' }]);
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('documents', () => {
  it('renvoie les documents du titulaire connecté', async () => {
    await docCtrl.listMyDocuments(makeReq(), res);

    expect(documents.getMyDocuments).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ documents: [{ id_document: 5 }] });
  });

  it('transmet l’utilisateur complet, le type et le fichier au dépôt', async () => {
    const req = makeReq({ body: { type: 'permis_conduire' }, file: { originalname: 'p.pdf' } });

    await docCtrl.uploadMyDocument(req, res);

    expect(documents.uploadDocument).toHaveBeenCalledWith(req.user, 'permis_conduire', req.file);
    expect(res.locals.auditTargetId).toBe('5');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('tolère un corps absent au dépôt', async () => {
    await docCtrl.uploadMyDocument(makeReq({ body: undefined }), res);

    expect(documents.uploadDocument).toHaveBeenCalledWith(expect.anything(), undefined, undefined);
  });

  it('relaie un type de document refusé', async () => {
    documents.uploadDocument.mockRejectedValue(httpError(400, 'Type invalide.'));

    await docCtrl.uploadMyDocument(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.locals.auditTargetId).toBeUndefined();
  });

  it('répond 204 après suppression d’un document', async () => {
    await docCtrl.deleteMyDocumentController(makeReq({ params: { id: '5' } }), res);

    expect(documents.deleteMyDocument).toHaveBeenCalledWith(1, '5');
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('sert le fichier en ligne avec un nom d’attachement échappé', async () => {
    documents.getDocumentFile.mockResolvedValue({
      absPath: '/app/storage/documents/permis été.pdf',
      file_name: 'permis été.pdf',
    });

    await docCtrl.downloadDocument(makeReq({ params: { id: '5' } }), res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent('permis été.pdf')}"`
    );
    expect(res.sendFile).toHaveBeenCalledWith('/app/storage/documents/permis été.pdf');
  });

  it('relaie un accès refusé au fichier, sans en-tête ni envoi', async () => {
    documents.getDocumentFile.mockRejectedValue(httpError(403, 'Accès refusé.'));

    await docCtrl.downloadDocument(makeReq({ params: { id: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('transmet les filtres à la liste admin', async () => {
    await docCtrl.adminListDocuments(makeReq({ query: { status: 'pending' } }), res);

    expect(documents.listAllDocuments).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('transmet le nouveau statut de validation', async () => {
    const req = makeReq({ params: { id: '5' }, body: { status: 'validated' } });

    await docCtrl.adminSetDocumentStatus(req, res);

    expect(documents.setDocumentStatus).toHaveBeenCalledWith('5', 'validated');
  });

  it('tolère un corps absent au changement de statut', async () => {
    await docCtrl.adminSetDocumentStatus(makeReq({ params: { id: '5' }, body: undefined }), res);

    expect(documents.setDocumentStatus).toHaveBeenCalledWith('5', undefined);
  });
});

describe('réservations et litiges côté admin', () => {
  it('transmet les filtres à la liste des réservations', async () => {
    await bookingCtrl.adminListBookings(makeReq({ query: { status: 'confirmed' } }), res);

    expect(bookingAdmin.listBookings).toHaveBeenCalledWith({ status: 'confirmed' });
  });

  it('transmet le motif d’annulation', async () => {
    const req = makeReq({ params: { id: '5' }, body: { reason: 'Fraude' } });

    await bookingCtrl.adminCancelBooking(req, res);

    expect(bookingAdmin.cancelBooking).toHaveBeenCalledWith('5', 'Fraude');
  });

  it('tolère un corps absent à l’annulation', async () => {
    await bookingCtrl.adminCancelBooking(makeReq({ params: { id: '5' }, body: undefined }), res);

    expect(bookingAdmin.cancelBooking).toHaveBeenCalledWith('5', undefined);
  });

  it('transmet les filtres à la liste des litiges', async () => {
    await bookingCtrl.adminListDisputes(makeReq({ query: { status: 'open' } }), res);

    expect(bookingAdmin.listDisputes).toHaveBeenCalledWith({ status: 'open' });
  });

  it('transmet la décision de litige avec les paramètres de remboursement', async () => {
    const req = makeReq({
      params: { id: '9' },
      body: {
        status: 'resolved',
        resolution: 'Dossier instruit.',
        refund_percent: 50,
        refund_commission: true,
      },
    });

    await bookingCtrl.adminSetDisputeStatus(req, res);

    expect(bookingAdmin.setDisputeStatus).toHaveBeenCalledWith(
      '9',
      'resolved',
      'Dossier instruit.',
      {
        refund_percent: 50,
        refund_commission: true,
      }
    );
  });

  it('tolère un corps absent sur la décision de litige', async () => {
    await bookingCtrl.adminSetDisputeStatus(makeReq({ params: { id: '9' }, body: undefined }), res);

    expect(bookingAdmin.setDisputeStatus).toHaveBeenCalledWith('9', undefined, undefined, {
      refund_percent: undefined,
      refund_commission: undefined,
    });
  });
});

describe('facture PDF', () => {
  it('sert la facture en ligne par défaut, sans mise en cache', async () => {
    await invoiceCtrl.getBookingInvoice(makeReq({ params: { id_booking: '5' } }), res);

    expect(invoices.getInvoiceFor).toHaveBeenCalledWith(expect.anything(), '5');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="LOC-2026-0001.pdf"'
    );
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('force le téléchargement quand download=1', async () => {
    const req = makeReq({ params: { id_booking: '5' }, query: { download: '1' } });

    await invoiceCtrl.getBookingInvoice(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="LOC-2026-0001.pdf"'
    );
  });

  it('canalise le flux PDF vers la réponse', async () => {
    const stream = { on: jest.fn(), pipe: jest.fn() };
    pdf.renderInvoice.mockReturnValue(stream);

    await invoiceCtrl.getBookingInvoice(makeReq({ params: { id_booking: '5' } }), res);

    expect(stream.pipe).toHaveBeenCalledWith(res);
    expect(stream.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('coupe la réponse si le rendu PDF échoue en cours de flux', async () => {
    const stream = { on: jest.fn(), pipe: jest.fn() };
    pdf.renderInvoice.mockReturnValue(stream);

    await invoiceCtrl.getBookingInvoice(makeReq({ params: { id_booking: '5' } }), res);
    const onError = stream.on.mock.calls.find(([event]) => event === 'error')[1];
    onError();

    expect(res.destroy).toHaveBeenCalled();
  });

  it('relaie une facture inaccessible sans écrire d’en-tête PDF', async () => {
    invoices.getInvoiceFor.mockRejectedValue(httpError(403, 'Accès refusé.'));

    await invoiceCtrl.getBookingInvoice(makeReq({ params: { id_booking: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});

describe('avis publics', () => {
  it('renvoie les avis d’un bateau', async () => {
    await reviewCtrl.getBoatReviews(makeReq({ params: { id_boat: '4' } }), res);

    expect(mockListBoatReviews).toHaveBeenCalledWith('4');
    expect(res.json).toHaveBeenCalledWith({ reviews: [{ id_review: 2 }] });
  });

  it('relaie une erreur du service d’avis', async () => {
    mockListBoatReviews.mockRejectedValue(httpError(404, 'Bateau introuvable.'));

    await reviewCtrl.getBoatReviews(makeReq({ params: { id_boat: '4' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('liste tous les avis validés quand aucun bateau n’est précisé', async () => {
    await reviewCtrl.getPublicReviews(makeReq(), res);

    expect(db.review.findMany.mock.calls[0][0].where).toEqual({
      status: 'validated',
      deleted_at: null,
    });
  });

  it('restreint à un bateau quand id_boat est fourni', async () => {
    await reviewCtrl.getPublicReviews(makeReq({ query: { id_boat: '4' } }), res);

    expect(db.review.findMany.mock.calls[0][0].where.booking).toEqual({ id_boat: 4 });
  });

  it.each([
    ['non numérique', 'abc'],
    ['décimal', '4.5'],
    ['nul', '0'],
    ['négatif', '-1'],
  ])('refuse un identifiant de bateau %s', async (_label, id_boat) => {
    await reviewCtrl.getPublicReviews(makeReq({ query: { id_boat } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.review.findMany).not.toHaveBeenCalled();
  });

  it('formate l’auteur, la date en français et l’avatar', async () => {
    db.review.findMany.mockResolvedValue([
      {
        id_review: 2,
        id_user: 1,
        rating: 5,
        comment: 'Superbe séjour',
        created_at: new Date('2026-06-15T10:00:00Z'),
        owner_reply: 'Merci !',
        booking: { id_boat: 4 },
        user: {
          first_name: 'Lea',
          last_name: 'Marin',
          role: 'locataire',
          images: [{ url: 'http://x/a.png' }],
        },
      },
    ]);

    await reviewCtrl.getPublicReviews(makeReq(), res);

    expect(res.json.mock.calls[0][0][0]).toMatchObject({
      id: 2,
      name: 'Lea M.',
      role: 'locataire',
      text: 'Superbe séjour',
      owner_reply: 'Merci !',
      avatar: 'http://x/a.png',
      boatId: 4,
      date: '15 juin 2026',
    });
  });

  it('met l’avatar à null quand l’auteur n’a pas de photo', async () => {
    db.review.findMany.mockResolvedValue([
      {
        id_review: 2,
        id_user: 1,
        rating: 5,
        comment: 'X',
        created_at: new Date('2026-06-15'),
        owner_reply: null,
        booking: { id_boat: 4 },
        user: { first_name: 'Lea', last_name: 'Marin', role: 'locataire', images: [] },
      },
    ]);

    await reviewCtrl.getPublicReviews(makeReq(), res);

    expect(res.json.mock.calls[0][0][0].avatar).toBeNull();
  });

  it('répond 500 avec un message neutre en cas de panne', async () => {
    db.review.findMany.mockRejectedValue(new Error('Base injoignable'));

    await reviewCtrl.getPublicReviews(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Erreur serveur' });
  });
});

describe('ports publics', () => {
  it('renvoie la liste des ports triée par identifiant', async () => {
    await portCtrl.getPorts(makeReq(), res);

    expect(db.port.findMany).toHaveBeenCalledWith({ orderBy: { id_port: 'asc' } });
    expect(res.json).toHaveBeenCalledWith([{ id_port: 3, name: 'Marseille' }]);
  });
});

describe('repli sur 500', () => {
  it.each([
    [docCtrl, 'listMyDocuments', documents, 'getMyDocuments'],
    [docCtrl, 'uploadMyDocument', documents, 'uploadDocument'],
    [docCtrl, 'deleteMyDocumentController', documents, 'deleteMyDocument'],
    [docCtrl, 'downloadDocument', documents, 'getDocumentFile'],
    [docCtrl, 'adminListDocuments', documents, 'listAllDocuments'],
    [docCtrl, 'adminSetDocumentStatus', documents, 'setDocumentStatus'],
    [bookingCtrl, 'adminListBookings', bookingAdmin, 'listBookings'],
    [bookingCtrl, 'adminCancelBooking', bookingAdmin, 'cancelBooking'],
    [bookingCtrl, 'adminListDisputes', bookingAdmin, 'listDisputes'],
    [bookingCtrl, 'adminSetDisputeStatus', bookingAdmin, 'setDisputeStatus'],
    [invoiceCtrl, 'getBookingInvoice', invoices, 'getInvoiceFor'],
  ])('%#. %s répond 500', async (controller, handler, service, fn) => {
    service[fn].mockRejectedValue(new Error('Panne inattendue'));

    await controller[handler](makeReq({ params: { id: '1', id_booking: '5' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Panne inattendue' });
  });
});
