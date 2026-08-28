import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'secret-de-test-unitaire';

jest.unstable_mockModule('../src/config/appConfig.js', () => ({
  initConfig: () => ({ JWT_SECRET }),
}));

const mockLogActivity = jest.fn();
jest.unstable_mockModule('../src/services/logService.js', () => ({
  logActivity: mockLogActivity,
}));

// Sondes : chaque contrôleur répond son propre nom, ce qui permet de vérifier
// le câblage des routes sans dépendre de la logique testée ailleurs.
const probes = (names) =>
  Object.fromEntries(names.map((n) => [n, jest.fn((req, res) => res.json({ handler: n }))]));

jest.unstable_mockModule('../src/controllers/userController.js', () =>
  probes(['adminLogin', 'adminCreateUser'])
);
jest.unstable_mockModule('../src/controllers/statsController.js', () => probes(['adminStats']));
jest.unstable_mockModule('../src/controllers/adminUserController.js', () =>
  probes(['adminListUsers', 'adminUpdateUser', 'adminDeleteUser'])
);
jest.unstable_mockModule('../src/controllers/documentController.js', () =>
  probes(['adminListDocuments', 'adminSetDocumentStatus'])
);
jest.unstable_mockModule('../src/controllers/boatAdminController.js', () =>
  probes(['adminListBoats', 'adminSetBoatPublished', 'adminListReports', 'adminSetReportStatus'])
);
jest.unstable_mockModule('../src/controllers/bookingAdminController.js', () =>
  probes(['adminListBookings', 'adminCancelBooking', 'adminListDisputes', 'adminSetDisputeStatus'])
);
jest.unstable_mockModule('../src/controllers/reviewAdminController.js', () =>
  probes(['adminListReviews', 'adminUpdateReview', 'adminDeleteReview'])
);
jest.unstable_mockModule('../src/controllers/portAdminController.js', () =>
  probes(['adminListPorts', 'adminCreatePort', 'adminDeletePort'])
);
jest.unstable_mockModule('../src/controllers/paymentAdminController.js', () =>
  probes(['adminListPayments', 'adminPaymentStats'])
);
jest.unstable_mockModule('../src/controllers/adminLogController.js', () =>
  probes(['adminListLogs', 'adminLogFilters'])
);
jest.unstable_mockModule('../src/controllers/cronAdminController.js', () =>
  probes(['adminListCronJobs', 'adminUpdateCronJob', 'adminRunCronJob', 'adminListCronRuns'])
);
jest.unstable_mockModule('../src/controllers/contactRequestController.js', () =>
  probes(['adminListContactRequests', 'adminPatchContactRequest'])
);

const { default: adminRoutes } = await import('../src/routes/adminRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

const tokenFor = (role) => jwt.sign({ id_user: 9, email: 'admin@x.fr', role }, JWT_SECRET);
const ADMIN = tokenFor('admin');
const LOCATAIRE = tokenFor('locataire');
const PROPRIETAIRE = tokenFor('proprietaire');

// Toutes les routes de l'espace d'administration, hors /login.
const ADMIN_ROUTES = [
  ['get', '/api/admin/stats', 'adminStats'],
  ['get', '/api/admin/users', 'adminListUsers'],
  ['post', '/api/admin/users', 'adminCreateUser'],
  ['patch', '/api/admin/users/3', 'adminUpdateUser'],
  ['delete', '/api/admin/users/3', 'adminDeleteUser'],
  ['get', '/api/admin/documents', 'adminListDocuments'],
  ['patch', '/api/admin/documents/3', 'adminSetDocumentStatus'],
  ['get', '/api/admin/boats', 'adminListBoats'],
  ['patch', '/api/admin/boats/1', 'adminSetBoatPublished'],
  ['get', '/api/admin/reports', 'adminListReports'],
  ['patch', '/api/admin/reports/5', 'adminSetReportStatus'],
  ['get', '/api/admin/bookings', 'adminListBookings'],
  ['patch', '/api/admin/bookings/7/cancel', 'adminCancelBooking'],
  ['get', '/api/admin/disputes', 'adminListDisputes'],
  ['patch', '/api/admin/disputes/4', 'adminSetDisputeStatus'],
  ['get', '/api/admin/reviews', 'adminListReviews'],
  ['patch', '/api/admin/reviews/2', 'adminUpdateReview'],
  ['delete', '/api/admin/reviews/2', 'adminDeleteReview'],
  ['get', '/api/admin/ports', 'adminListPorts'],
  ['post', '/api/admin/ports', 'adminCreatePort'],
  ['delete', '/api/admin/ports/3', 'adminDeletePort'],
  ['get', '/api/admin/payments', 'adminListPayments'],
  ['get', '/api/admin/payments/stats', 'adminPaymentStats'],
  ['get', '/api/admin/contact-requests', 'adminListContactRequests'],
  ['patch', '/api/admin/contact-requests/8', 'adminPatchContactRequest'],
  ['get', '/api/admin/logs', 'adminListLogs'],
  ['get', '/api/admin/logs/filters', 'adminLogFilters'],
  ['get', '/api/admin/cron/jobs', 'adminListCronJobs'],
  ['get', '/api/admin/cron/runs', 'adminListCronRuns'],
  ['patch', '/api/admin/cron/jobs/users.purge', 'adminUpdateCronJob'],
  ['post', '/api/admin/cron/jobs/users.purge/run', 'adminRunCronJob'],
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('connexion administrateur', () => {
  it('est accessible sans jeton', async () => {
    const res = await request(app).post('/api/admin/login');

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('adminLogin');
  });
});

describe('verrouillage de l’espace d’administration', () => {
  it.each(ADMIN_ROUTES)('%s %s renvoie 401 sans jeton', async (method, url) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(401);
  });

  it.each(ADMIN_ROUTES)('%s %s renvoie 401 avec un jeton forgé', async (method, url) => {
    const res = await request(app)[method](url).set('Authorization', 'Bearer jeton.bidon.forgé');

    expect(res.status).toBe(401);
  });

  it.each(ADMIN_ROUTES)('%s %s renvoie 403 pour un locataire', async (method, url) => {
    const res = await request(app)[method](url).set('Authorization', `Bearer ${LOCATAIRE}`);

    expect(res.status).toBe(403);
  });

  it.each(ADMIN_ROUTES)('%s %s renvoie 403 pour un propriétaire', async (method, url) => {
    const res = await request(app)[method](url).set('Authorization', `Bearer ${PROPRIETAIRE}`);

    expect(res.status).toBe(403);
  });

  it.each(ADMIN_ROUTES)(
    '%s %s atteint son contrôleur pour un admin',
    async (method, url, handler) => {
      const res = await request(app)[method](url).set('Authorization', `Bearer ${ADMIN}`);

      expect(res.status).toBe(200);
      expect(res.body.handler).toBe(handler);
    }
  );
});

describe('traçabilité des actions d’administration', () => {
  it.each([
    ['post', '/api/admin/users', 'user.create'],
    ['patch', '/api/admin/users/3', 'user.update'],
    ['delete', '/api/admin/users/3', 'user.delete'],
    ['patch', '/api/admin/documents/3', 'document.status'],
    ['patch', '/api/admin/boats/1', 'boat.publish'],
    ['patch', '/api/admin/bookings/7/cancel', 'booking.cancel'],
    ['patch', '/api/admin/disputes/4', 'dispute.status'],
    ['patch', '/api/admin/reviews/2', 'review.update'],
    ['delete', '/api/admin/reviews/2', 'review.delete'],
    ['post', '/api/admin/ports', 'port.create'],
    ['delete', '/api/admin/ports/3', 'port.delete'],
  ])('%s %s trace l’action « %s »', async (method, url, action) => {
    await request(app)[method](url).set('Authorization', `Bearer ${ADMIN}`);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action, actorId: 9, actorRole: 'admin' })
    );
  });

  it('trace un signalement avec le bon type de cible', async () => {
    await request(app).patch('/api/admin/reports/5').set('Authorization', `Bearer ${ADMIN}`);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'report.status', targetType: 'boat_report', targetId: '5' })
    );
  });

  it('trace une demande de contact avec son identifiant propre', async () => {
    await request(app)
      .patch('/api/admin/contact-requests/8')
      .set('Authorization', `Bearer ${ADMIN}`);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'contact.status', targetId: '8' })
    );
  });

  it.each([
    ['patch', '/api/admin/cron/jobs/users.purge', 'cron.update'],
    ['post', '/api/admin/cron/jobs/users.purge/run', 'cron.trigger'],
  ])('%s %s trace la tâche par sa clé', async (method, url, action) => {
    await request(app)[method](url).set('Authorization', `Bearer ${ADMIN}`);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action, targetType: 'cron_job', targetId: 'users.purge' })
    );
  });

  it('ne trace rien sur une simple consultation', async () => {
    await request(app).get('/api/admin/users').set('Authorization', `Bearer ${ADMIN}`);

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('ne trace rien quand l’accès est refusé', async () => {
    await request(app).delete('/api/admin/users/3').set('Authorization', `Bearer ${LOCATAIRE}`);

    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});
