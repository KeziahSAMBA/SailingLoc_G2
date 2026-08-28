import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Les contrôleurs d'administration sont de fines enveloppes HTTP autour de leur
// service : ils sont regroupés ici pour tester d'un bloc le passage des
// paramètres, les codes de retour et la traduction des erreurs.
const users = {
  listUsers: jest.fn(),
  updateUserByAdmin: jest.fn(),
  deleteUserByAdmin: jest.fn(),
};
jest.unstable_mockModule('../src/services/adminUserService.js', () => users);

const boats = {
  listBoats: jest.fn(),
  setBoatPublished: jest.fn(),
  listReports: jest.fn(),
  setReportStatus: jest.fn(),
};
jest.unstable_mockModule('../src/services/boatAdminService.js', () => boats);

const reviews = { listReviews: jest.fn(), updateReview: jest.fn(), deleteReview: jest.fn() };
jest.unstable_mockModule('../src/services/reviewAdminService.js', () => reviews);

const ports = { listPorts: jest.fn(), createPort: jest.fn(), deletePort: jest.fn() };
jest.unstable_mockModule('../src/services/portAdminService.js', () => ports);

const payments = { listPayments: jest.fn(), paymentStats: jest.fn() };
jest.unstable_mockModule('../src/services/paymentAdminService.js', () => payments);

const logs = { listLogs: jest.fn(), listLogFilters: jest.fn(), logActivity: jest.fn() };
jest.unstable_mockModule('../src/services/logService.js', () => logs);

const cron = {
  listJobs: jest.fn(),
  updateJob: jest.fn(),
  triggerJob: jest.fn(),
  listRuns: jest.fn(),
};
jest.unstable_mockModule('../src/services/cronAdminService.js', () => cron);

const contact = {
  createContactRequest: jest.fn(),
  listContactRequests: jest.fn(),
  setContactRequestStatus: jest.fn(),
};
jest.unstable_mockModule('../src/services/contactRequestService.js', () => contact);

const stats = { getAdminStats: jest.fn() };
jest.unstable_mockModule('../src/services/statsService.js', () => stats);

const userCtrl = await import('../src/controllers/adminUserController.js');
const boatCtrl = await import('../src/controllers/boatAdminController.js');
const reviewCtrl = await import('../src/controllers/reviewAdminController.js');
const portCtrl = await import('../src/controllers/portAdminController.js');
const paymentCtrl = await import('../src/controllers/paymentAdminController.js');
const logCtrl = await import('../src/controllers/adminLogController.js');
const cronCtrl = await import('../src/controllers/cronAdminController.js');
const contactCtrl = await import('../src/controllers/contactRequestController.js');
const statsCtrl = await import('../src/controllers/statsController.js');

function makeRes() {
  const res = { locals: {} };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

function makeReq(overrides = {}) {
  return {
    body: {},
    params: {},
    query: {},
    user: { id_user: 9, email: 'admin@x.fr' },
    ...overrides,
  };
}

const httpError = (status, message) => Object.assign(new Error(message), { status });

let res;

beforeEach(() => {
  jest.clearAllMocks();
  res = makeRes();
  users.listUsers.mockResolvedValue([{ id_user: 3 }]);
  users.updateUserByAdmin.mockResolvedValue({ id_user: 3 });
  users.deleteUserByAdmin.mockResolvedValue(undefined);
  boats.listBoats.mockResolvedValue([{ id_boat: 1 }]);
  boats.setBoatPublished.mockResolvedValue({ id_boat: 1, is_published: true });
  boats.listReports.mockResolvedValue([{ id_report: 5 }]);
  boats.setReportStatus.mockResolvedValue({ id_report: 5, status: 'resolved' });
  reviews.listReviews.mockResolvedValue([{ id_review: 2 }]);
  reviews.updateReview.mockResolvedValue({ id_review: 2 });
  reviews.deleteReview.mockResolvedValue(undefined);
  ports.listPorts.mockResolvedValue([{ id_port: 3 }]);
  ports.createPort.mockResolvedValue({ id_port: 3, name: 'Marseille' });
  ports.deletePort.mockResolvedValue(undefined);
  payments.listPayments.mockResolvedValue([{ id_payment: 1 }]);
  payments.paymentStats.mockResolvedValue({ total_volume: 4200 });
  logs.listLogs.mockResolvedValue({ logs: [], total: 0 });
  logs.listLogFilters.mockResolvedValue({ levels: [] });
  cron.listJobs.mockResolvedValue({ jobs: [], timezone: 'Europe/Paris' });
  cron.updateJob.mockResolvedValue({ key: 'users.purge' });
  cron.triggerJob.mockResolvedValue({ key: 'users.purge', started: true });
  cron.listRuns.mockResolvedValue({ runs: [], total: 0 });
  contact.createContactRequest.mockResolvedValue({ id_request: 8 });
  contact.listContactRequests.mockResolvedValue([{ id_request: 8 }]);
  contact.setContactRequestStatus.mockResolvedValue({ id_request: 8, status: 'processed' });
  stats.getAdminStats.mockResolvedValue({ users: 120 });
});

describe('utilisateurs', () => {
  it('transmet les filtres de requête à la liste', async () => {
    const req = makeReq({ query: { role: 'locataire' } });

    await userCtrl.adminListUsers(req, res);

    expect(users.listUsers).toHaveBeenCalledWith({ role: 'locataire' });
    expect(res.json).toHaveBeenCalledWith({ users: [{ id_user: 3 }] });
  });

  it('passe l’identifiant de l’admin demandeur à la modification', async () => {
    const req = makeReq({ params: { id: '3' }, body: { first_name: 'Marie' } });

    await userCtrl.adminUpdateUser(req, res);

    expect(users.updateUserByAdmin).toHaveBeenCalledWith('3', 9, { first_name: 'Marie' });
  });

  it('tolère un corps absent à la modification', async () => {
    await userCtrl.adminUpdateUser(makeReq({ params: { id: '3' }, body: undefined }), res);

    expect(users.updateUserByAdmin).toHaveBeenCalledWith('3', 9, {});
  });

  it('répond 204 sans corps après suppression', async () => {
    await userCtrl.adminDeleteUser(makeReq({ params: { id: '3' } }), res);

    expect(users.deleteUserByAdmin).toHaveBeenCalledWith('3', 9);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('relaie le refus de se supprimer soi-même', async () => {
    users.deleteUserByAdmin.mockRejectedValue(httpError(400, 'Pas votre propre compte.'));

    await userCtrl.adminDeleteUser(makeReq({ params: { id: '9' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('bateaux et signalements', () => {
  it('transmet les filtres à la liste des bateaux', async () => {
    await boatCtrl.adminListBoats(makeReq({ query: { published: 'false' } }), res);

    expect(boats.listBoats).toHaveBeenCalledWith({ published: 'false' });
  });

  it('transmet la décision de publication', async () => {
    const req = makeReq({ params: { id: '1' }, body: { is_published: true } });

    await boatCtrl.adminSetBoatPublished(req, res);

    expect(boats.setBoatPublished).toHaveBeenCalledWith('1', true);
    expect(res.json).toHaveBeenCalledWith({ boat: { id_boat: 1, is_published: true } });
  });

  it('tolère un corps absent sur la publication', async () => {
    await boatCtrl.adminSetBoatPublished(makeReq({ params: { id: '1' }, body: undefined }), res);

    expect(boats.setBoatPublished).toHaveBeenCalledWith('1', undefined);
  });

  it('transmet les filtres à la liste des signalements', async () => {
    await boatCtrl.adminListReports(makeReq({ query: { status: 'pending' } }), res);

    expect(boats.listReports).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('transmet le nouveau statut d’un signalement', async () => {
    const req = makeReq({ params: { id: '5' }, body: { status: 'resolved' } });

    await boatCtrl.adminSetReportStatus(req, res);

    expect(boats.setReportStatus).toHaveBeenCalledWith('5', 'resolved');
  });
});

describe('avis', () => {
  it('transmet les filtres à la liste des avis', async () => {
    await reviewCtrl.adminListReviews(makeReq({ query: { status: 'pending' } }), res);

    expect(reviews.listReviews).toHaveBeenCalledWith({ status: 'pending' });
  });

  it('transmet la modification d’un avis', async () => {
    await reviewCtrl.adminUpdateReview(
      makeReq({ params: { id: '2' }, body: { status: 'validated' } }),
      res
    );

    expect(reviews.updateReview).toHaveBeenCalledWith('2', { status: 'validated' });
  });

  it('tolère un corps absent à la modification d’un avis', async () => {
    await reviewCtrl.adminUpdateReview(makeReq({ params: { id: '2' }, body: undefined }), res);

    expect(reviews.updateReview).toHaveBeenCalledWith('2', {});
  });

  it('répond 204 après suppression d’un avis', async () => {
    await reviewCtrl.adminDeleteReview(makeReq({ params: { id: '2' } }), res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });
});

describe('ports', () => {
  it('transmet les filtres à la liste des ports', async () => {
    await portCtrl.adminListPorts(makeReq({ query: { region: 'Bretagne' } }), res);

    expect(ports.listPorts).toHaveBeenCalledWith({ region: 'Bretagne' });
  });

  it('répond 201 et dépose l’identifiant créé pour l’audit', async () => {
    await portCtrl.adminCreatePort(makeReq({ body: { name: 'Sète', city: 'Sète' } }), res);

    expect(ports.createPort).toHaveBeenCalledWith({ name: 'Sète', city: 'Sète' });
    expect(res.locals.auditTargetId).toBe('3');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('tolère un corps absent à la création', async () => {
    await portCtrl.adminCreatePort(makeReq({ body: undefined }), res);

    expect(ports.createPort).toHaveBeenCalledWith({});
  });

  it('relaie un port déjà présent', async () => {
    ports.createPort.mockRejectedValue(httpError(409, 'Déjà présent.'));

    await portCtrl.adminCreatePort(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.locals.auditTargetId).toBeUndefined();
  });

  it('répond 204 après suppression d’un port', async () => {
    await portCtrl.adminDeletePort(makeReq({ params: { id: '3' } }), res);

    expect(ports.deletePort).toHaveBeenCalledWith('3');
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('relaie une suppression bloquée par des bateaux rattachés', async () => {
    ports.deletePort.mockRejectedValue(httpError(409, 'Bateaux rattachés.'));

    await portCtrl.adminDeletePort(makeReq({ params: { id: '3' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('paiements et statistiques', () => {
  it('transmet les filtres à la liste des paiements', async () => {
    await paymentCtrl.adminListPayments(makeReq({ query: { status: 'success' } }), res);

    expect(payments.listPayments).toHaveBeenCalledWith({ status: 'success' });
  });

  it('renvoie les agrégats de paiement', async () => {
    await paymentCtrl.adminPaymentStats(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ stats: { total_volume: 4200 } });
  });

  it('renvoie les statistiques globales du back-office', async () => {
    await statsCtrl.adminStats(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ stats: { users: 120 } });
  });
});

describe('journal d’activité', () => {
  it('transmet les filtres et renvoie le résultat paginé tel quel', async () => {
    await logCtrl.adminListLogs(makeReq({ query: { level: 'error', page: '2' } }), res);

    expect(logs.listLogs).toHaveBeenCalledWith({ level: 'error', page: '2' });
    expect(res.json).toHaveBeenCalledWith({ logs: [], total: 0 });
  });

  it('renvoie les listes de filtres', async () => {
    await logCtrl.adminLogFilters(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ levels: [] });
  });
});

describe('tâches planifiées', () => {
  it('renvoie le catalogue des tâches', async () => {
    await cronCtrl.adminListCronJobs(makeReq(), res);

    expect(res.json).toHaveBeenCalledWith({ jobs: [], timezone: 'Europe/Paris' });
  });

  it('transmet la clé et la charge utile à la modification', async () => {
    const req = makeReq({ params: { key: 'users.purge' }, body: { enabled: false } });

    await cronCtrl.adminUpdateCronJob(req, res);

    expect(cron.updateJob).toHaveBeenCalledWith('users.purge', { enabled: false });
  });

  it('répond 202 au déclenchement manuel, l’exécution n’étant pas terminée', async () => {
    const req = makeReq({ params: { key: 'users.purge' } });

    await cronCtrl.adminRunCronJob(req, res);

    expect(cron.triggerJob).toHaveBeenCalledWith('users.purge', {
      actorId: 9,
      actorEmail: 'admin@x.fr',
    });
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('tolère un déclenchement sans utilisateur en session', async () => {
    await cronCtrl.adminRunCronJob(
      makeReq({ params: { key: 'users.purge' }, user: undefined }),
      res
    );

    expect(cron.triggerJob).toHaveBeenCalledWith('users.purge', {
      actorId: undefined,
      actorEmail: undefined,
    });
  });

  it('relaie une tâche déjà en cours', async () => {
    cron.triggerJob.mockRejectedValue(httpError(409, 'Déjà en cours.'));

    await cronCtrl.adminRunCronJob(makeReq({ params: { key: 'users.purge' } }), res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('transmet les filtres à l’historique des exécutions', async () => {
    await cronCtrl.adminListCronRuns(makeReq({ query: { key: 'users.purge' } }), res);

    expect(cron.listRuns).toHaveBeenCalledWith({ key: 'users.purge' });
  });
});

describe('demandes de contact', () => {
  it('répond 201 au dépôt public d’une demande', async () => {
    const req = makeReq({ body: { name: 'Jean', email: 'jean@x.fr' } });

    await contactCtrl.postContactRequest(req, res);

    expect(contact.createContactRequest).toHaveBeenCalledWith({
      name: 'Jean',
      email: 'jean@x.fr',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('tolère un corps absent au dépôt', async () => {
    await contactCtrl.postContactRequest(makeReq({ body: undefined }), res);

    expect(contact.createContactRequest).toHaveBeenCalledWith({});
  });

  it('relaie une validation refusée', async () => {
    contact.createContactRequest.mockRejectedValue(httpError(400, 'Email invalide.'));

    await contactCtrl.postContactRequest(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('transmet les filtres à la liste des demandes', async () => {
    await contactCtrl.adminListContactRequests(makeReq({ query: { status: 'new' } }), res);

    expect(contact.listContactRequests).toHaveBeenCalledWith({ status: 'new' });
  });

  it('transmet le nouveau statut d’une demande', async () => {
    const req = makeReq({ params: { id_request: '8' }, body: { status: 'processed' } });

    await contactCtrl.adminPatchContactRequest(req, res);

    expect(contact.setContactRequestStatus).toHaveBeenCalledWith('8', 'processed');
  });

  it('tolère un corps absent au changement de statut', async () => {
    await contactCtrl.adminPatchContactRequest(
      makeReq({ params: { id_request: '8' }, body: undefined }),
      res
    );

    expect(contact.setContactRequestStatus).toHaveBeenCalledWith('8', undefined);
  });
});

describe('repli sur 500 — aucune erreur inattendue ne passe pour un succès', () => {
  it.each([
    [userCtrl, 'adminListUsers', users, 'listUsers'],
    [userCtrl, 'adminUpdateUser', users, 'updateUserByAdmin'],
    [userCtrl, 'adminDeleteUser', users, 'deleteUserByAdmin'],
    [boatCtrl, 'adminListBoats', boats, 'listBoats'],
    [boatCtrl, 'adminSetBoatPublished', boats, 'setBoatPublished'],
    [boatCtrl, 'adminListReports', boats, 'listReports'],
    [boatCtrl, 'adminSetReportStatus', boats, 'setReportStatus'],
    [reviewCtrl, 'adminListReviews', reviews, 'listReviews'],
    [reviewCtrl, 'adminUpdateReview', reviews, 'updateReview'],
    [reviewCtrl, 'adminDeleteReview', reviews, 'deleteReview'],
    [portCtrl, 'adminListPorts', ports, 'listPorts'],
    [portCtrl, 'adminCreatePort', ports, 'createPort'],
    [portCtrl, 'adminDeletePort', ports, 'deletePort'],
    [paymentCtrl, 'adminListPayments', payments, 'listPayments'],
    [paymentCtrl, 'adminPaymentStats', payments, 'paymentStats'],
    [logCtrl, 'adminListLogs', logs, 'listLogs'],
    [logCtrl, 'adminLogFilters', logs, 'listLogFilters'],
    [cronCtrl, 'adminListCronJobs', cron, 'listJobs'],
    [cronCtrl, 'adminUpdateCronJob', cron, 'updateJob'],
    [cronCtrl, 'adminRunCronJob', cron, 'triggerJob'],
    [cronCtrl, 'adminListCronRuns', cron, 'listRuns'],
    [contactCtrl, 'postContactRequest', contact, 'createContactRequest'],
    [contactCtrl, 'adminListContactRequests', contact, 'listContactRequests'],
    [contactCtrl, 'adminPatchContactRequest', contact, 'setContactRequestStatus'],
    [statsCtrl, 'adminStats', stats, 'getAdminStats'],
  ])('%#. %s répond 500', async (controller, handler, service, fn) => {
    service[fn].mockRejectedValue(new Error('Panne inattendue'));

    await controller[handler](makeReq({ params: { id: '1', key: 'x', id_request: '8' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Panne inattendue' });
  });
});
