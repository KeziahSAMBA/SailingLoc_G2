import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const service = {
  listConversations: jest.fn(),
  getThread: jest.fn(),
  sendMessage: jest.fn(),
  countUnread: jest.fn(),
  updateMessage: jest.fn(),
  deleteMessage: jest.fn(),
  contactSupport: jest.fn(),
  contactBoatOwner: jest.fn(),
  resolveSupport: jest.fn(),
};
jest.unstable_mockModule('../src/services/messageService.js', () => service);

const controller = await import('../src/controllers/messageController.js');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
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
  service.listConversations.mockResolvedValue([{ unread: 2 }]);
  service.getThread.mockResolvedValue({ user: { id_user: 2 }, messages: [] });
  service.countUnread.mockResolvedValue(4);
  service.sendMessage.mockResolvedValue({ id_message: 100 });
  service.updateMessage.mockResolvedValue({ id_message: 100, edited: true });
  service.deleteMessage.mockResolvedValue(undefined);
  service.contactSupport.mockResolvedValue({ admin: { id_user: 9 }, first_contact: true });
  service.contactBoatOwner.mockResolvedValue({ owner: { id_user: 2 }, boat_name: 'Pen Duick' });
  service.resolveSupport.mockResolvedValue({ id_message: 200 });
});

describe('lectures', () => {
  it('renvoie les conversations de l’utilisateur connecté', async () => {
    await controller.getConversations(makeReq(), res);

    expect(service.listConversations).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ conversations: [{ unread: 2 }] });
  });

  it('transmet l’utilisateur complet au fil, pas seulement son identifiant', async () => {
    const req = makeReq({ params: { id_user: '2' } });

    await controller.getThreadWith(req, res);

    expect(service.getThread).toHaveBeenCalledWith(req.user, '2');
    expect(res.json).toHaveBeenCalledWith({ user: { id_user: 2 }, messages: [] });
  });

  it('renvoie le compteur de non-lus', async () => {
    await controller.getUnreadCount(makeReq(), res);

    expect(service.countUnread).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ unread: 4 });
  });
});

describe('envoi et modification', () => {
  it('répond 201 après l’envoi d’un message', async () => {
    const req = makeReq({ body: { id_receiver: 2, content: 'Bonjour' } });

    await controller.postMessage(req, res);

    expect(service.sendMessage).toHaveBeenCalledWith(req.user, 2, 'Bonjour');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('tolère un corps absent à l’envoi', async () => {
    const req = makeReq({ body: undefined });

    await controller.postMessage(req, res);

    expect(service.sendMessage).toHaveBeenCalledWith(req.user, undefined, undefined);
  });

  it('relaie un destinataire interdit', async () => {
    service.sendMessage.mockRejectedValue(httpError(403, 'Écriture non autorisée.'));

    await controller.postMessage(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('transmet le nouveau contenu à la modification', async () => {
    const req = makeReq({ params: { id_message: '10' }, body: { content: 'Corrigé' } });

    await controller.patchMessage(req, res);

    expect(service.updateMessage).toHaveBeenCalledWith(req.user, '10', 'Corrigé');
    expect(res.json).toHaveBeenCalledWith({ message: { id_message: 100, edited: true } });
  });

  it('tolère un corps absent à la modification', async () => {
    const req = makeReq({ params: { id_message: '10' }, body: undefined });

    await controller.patchMessage(req, res);

    expect(service.updateMessage).toHaveBeenCalledWith(req.user, '10', undefined);
  });
});

describe('suppression', () => {
  it('transmet la portée « all » quand elle est demandée', async () => {
    const req = makeReq({ params: { id_message: '10' }, query: { scope: 'all' } });

    await controller.removeMessage(req, res);

    expect(service.deleteMessage).toHaveBeenCalledWith(req.user, '10', 'all');
    expect(res.json).toHaveBeenCalledWith({ deleted: true });
  });

  it.each([
    ['portée absente', {}],
    ['portée « me »', { scope: 'me' }],
    ['portée inconnue', { scope: 'tout_le_monde' }],
  ])('retombe sur la portée « me » avec une %s', async (_label, query) => {
    const req = makeReq({ params: { id_message: '10' }, query });

    await controller.removeMessage(req, res);

    expect(service.deleteMessage).toHaveBeenCalledWith(req.user, '10', 'me');
  });

  it('relaie une suppression interdite', async () => {
    service.deleteMessage.mockRejectedValue(httpError(403, 'Seul l’expéditeur peut…'));

    await controller.removeMessage(makeReq({ params: { id_message: '10' } }), res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('support et contact propriétaire', () => {
  it('ouvre la conversation support de l’utilisateur connecté', async () => {
    const req = makeReq();

    await controller.postSupport(req, res);

    expect(service.contactSupport).toHaveBeenCalledWith(req.user);
    expect(res.json).toHaveBeenCalledWith({ admin: { id_user: 9 }, first_contact: true });
  });

  it('relaie un support indisponible', async () => {
    service.contactSupport.mockRejectedValue(httpError(503, 'Support indisponible.'));

    await controller.postSupport(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('ouvre la conversation avec le propriétaire d’un bateau', async () => {
    const req = makeReq({ params: { id_boat: '4' } });

    await controller.postBoatContact(req, res);

    expect(service.contactBoatOwner).toHaveBeenCalledWith(req.user, '4');
    expect(res.json).toHaveBeenCalledWith({ owner: { id_user: 2 }, boat_name: 'Pen Duick' });
  });

  it('relaie un bateau introuvable', async () => {
    service.contactBoatOwner.mockRejectedValue(httpError(404, 'Bateau introuvable.'));

    await controller.postBoatContact(makeReq({ params: { id_boat: '4' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('répond 201 quand l’admin marque une demande comme traitée', async () => {
    const req = makeReq({ params: { id_user: '3' }, user: { id_user: 9, role: 'admin' } });

    await controller.postResolveSupport(req, res);

    expect(service.resolveSupport).toHaveBeenCalledWith(req.user, '3');
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('repli sur 500', () => {
  it.each([
    ['getConversations', 'listConversations'],
    ['getThreadWith', 'getThread'],
    ['getUnreadCount', 'countUnread'],
    ['postMessage', 'sendMessage'],
    ['patchMessage', 'updateMessage'],
    ['removeMessage', 'deleteMessage'],
    ['postSupport', 'contactSupport'],
    ['postBoatContact', 'contactBoatOwner'],
    ['postResolveSupport', 'resolveSupport'],
  ])('%s répond 500 sur une erreur sans statut', async (handler, fn) => {
    service[fn].mockRejectedValue(new Error('Panne inattendue'));

    await controller[handler](makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Panne inattendue' });
  });
});
