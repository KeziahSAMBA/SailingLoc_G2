import { jest, describe, it, expect, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import os from 'os';
import path from 'path';

const JWT_SECRET = 'secret-de-test-unitaire';

// Le module de routes crée ses dossiers d'upload à l'import : on le dépayse
// dans un répertoire temporaire pour ne rien écrire dans le dépôt.
const TMP_UPLOADS = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-uploads-'));
process.env.UPLOADS_DIR = TMP_UPLOADS;

jest.unstable_mockModule('../src/config/appConfig.js', () => ({
  initConfig: () => ({ JWT_SECRET }),
}));

jest.unstable_mockModule('../src/services/logService.js', () => ({
  logActivity: jest.fn(),
}));

// Chaque contrôleur est remplacé par une sonde qui répond son propre nom :
// on vérifie le câblage des routes, pas la logique déjà testée ailleurs.
const probes = (names) =>
  Object.fromEntries(names.map((n) => [n, jest.fn((req, res) => res.json({ handler: n }))]));

const userController = probes([
  'register',
  'login',
  'refresh',
  'logout',
  'me',
  'updateMe',
  'changeMyPassword',
  'confirmEmail',
  'resend',
  'forgotPassword',
  'resetPassword',
  'verifyResetToken',
  'patchMyAvatar',
  'deleteMyAvatar',
  'getMyClosureStatus',
  'deactivateMe',
  'deleteMe',
]);
jest.unstable_mockModule('../src/controllers/userController.js', () => userController);

jest.unstable_mockModule('../src/controllers/locataireController.js', () =>
  probes([
    'getDashboard',
    'getMyBookings',
    'postMyBookingReview',
    'getMyPayments',
    'payMyBooking',
    'cancelMyBooking',
    'requestMyRefund',
    'reportMyDispute',
    'patchMyReview',
    'deleteMyReview',
    'getMyBoatReviewEligibility',
    'getMyFavorites',
    'postFavorite',
    'deleteFavorite',
  ])
);

jest.unstable_mockModule('../src/controllers/proprietaireController.js', () =>
  probes([
    'getDashboard',
    'getMyBoat',
    'getMyBoats',
    'getMyBookings',
    'getBookingLocataireProfile',
    'getMyReviews',
    'postReviewReply',
    'getMyPayments',
    'patchBooking',
    'reportBookingDispute',
    'getMyStripeAccount',
    'postStripeOnboarding',
    'postStripeLoginLink',
  ])
);

jest.unstable_mockModule('../src/controllers/invoiceController.js', () =>
  probes(['getBookingInvoice'])
);

const { default: userRoutes } = await import('../src/routes/userRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

const tokenFor = (role, id_user = 1) => jwt.sign({ id_user, role }, JWT_SECRET);
const LOCATAIRE = tokenFor('locataire');
const PROPRIETAIRE = tokenFor('proprietaire');
const ADMIN = tokenFor('admin');

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  fs.rmSync(TMP_UPLOADS, { recursive: true, force: true });
});

describe('routes publiques', () => {
  it.each([
    ['post', '/api/users/register', 'register'],
    ['post', '/api/users/login', 'login'],
    ['post', '/api/users/refresh', 'refresh'],
    ['post', '/api/users/logout', 'logout'],
    ['post', '/api/users/resend-verification', 'resend'],
    ['post', '/api/users/forgot-password', 'forgotPassword'],
    ['post', '/api/users/reset-password', 'resetPassword'],
    ['get', '/api/users/reset-password/abc', 'verifyResetToken'],
    ['get', '/api/users/verify-email/abc', 'confirmEmail'],
  ])('%s %s est accessible sans jeton', async (method, url, handler) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe(handler);
  });
});

describe('routes protégées — authentification requise', () => {
  const protectedRoutes = [
    ['get', '/api/users/me'],
    ['patch', '/api/users/me'],
    ['patch', '/api/users/me/password'],
    ['patch', '/api/users/me/avatar'],
    ['delete', '/api/users/me/avatar'],
    ['get', '/api/users/me/closure'],
    ['post', '/api/users/me/deactivate'],
    ['delete', '/api/users/me'],
    ['get', '/api/users/me/dashboard'],
    ['get', '/api/users/me/bookings'],
    ['get', '/api/users/me/payments'],
    ['get', '/api/users/me/favorites'],
    ['post', '/api/users/me/favorites/3'],
    ['delete', '/api/users/me/favorites/3'],
    ['get', '/api/users/me/proprietaire/dashboard'],
    ['get', '/api/users/me/proprietaire/bookings'],
    ['get', '/api/users/me/proprietaire/boats'],
    ['get', '/api/users/me/proprietaire/payments'],
    ['get', '/api/users/me/proprietaire/reviews'],
    ['get', '/api/users/me/proprietaire/stripe-account'],
  ];

  it.each(protectedRoutes)('%s %s renvoie 401 sans jeton', async (method, url) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(401);
  });

  it.each(protectedRoutes)('%s %s renvoie 401 avec un jeton invalide', async (method, url) => {
    const res = await request(app)[method](url).set('Authorization', 'Bearer jeton.bidon.forgé');

    expect(res.status).toBe(401);
  });
});

describe('cloisonnement des rôles', () => {
  it.each([
    ['get', '/api/users/me/dashboard', 'getDashboard'],
    ['get', '/api/users/me/bookings', 'getMyBookings'],
    ['get', '/api/users/me/payments', 'getMyPayments'],
    ['get', '/api/users/me/favorites', 'getMyFavorites'],
  ])('%s %s est réservé au locataire', async (method, url, handler) => {
    const ok = await request(app)[method](url).set('Authorization', `Bearer ${LOCATAIRE}`);
    expect(ok.status).toBe(200);
    expect(ok.body.handler).toBe(handler);

    const ko = await request(app)[method](url).set('Authorization', `Bearer ${PROPRIETAIRE}`);
    expect(ko.status).toBe(403);
  });

  it.each([
    ['get', '/api/users/me/proprietaire/dashboard', 'getDashboard'],
    ['get', '/api/users/me/proprietaire/bookings', 'getMyBookings'],
    ['get', '/api/users/me/proprietaire/boats', 'getMyBoats'],
    ['get', '/api/users/me/proprietaire/payments', 'getMyPayments'],
    ['get', '/api/users/me/proprietaire/reviews', 'getMyReviews'],
  ])('%s %s est réservé au propriétaire', async (method, url, handler) => {
    const ok = await request(app)[method](url).set('Authorization', `Bearer ${PROPRIETAIRE}`);
    expect(ok.status).toBe(200);
    expect(ok.body.handler).toBe(handler);

    const ko = await request(app)[method](url).set('Authorization', `Bearer ${LOCATAIRE}`);
    expect(ko.status).toBe(403);
  });

  it.each([
    ['get', '/api/users/me/closure'],
    ['post', '/api/users/me/deactivate'],
    ['delete', '/api/users/me'],
  ])(
    '%s %s est fermé à l’admin (fermeture de compte réservée aux clients)',
    async (method, url) => {
      const res = await request(app)[method](url).set('Authorization', `Bearer ${ADMIN}`);

      expect(res.status).toBe(403);
    }
  );

  it.each([
    ['locataire', LOCATAIRE],
    ['propriétaire', PROPRIETAIRE],
  ])('la mise en pause est ouverte au %s', async (_role, token) => {
    const res = await request(app)
      .post('/api/users/me/deactivate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('deactivateMe');
  });

  it.each([
    ['get', '/api/users/me', 'me'],
    ['patch', '/api/users/me', 'updateMe'],
    ['patch', '/api/users/me/password', 'changeMyPassword'],
    ['delete', '/api/users/me/avatar', 'deleteMyAvatar'],
  ])('%s %s est ouvert à tous les rôles authentifiés', async (method, url, handler) => {
    for (const token of [LOCATAIRE, PROPRIETAIRE, ADMIN]) {
      const res = await request(app)[method](url).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.handler).toBe(handler);
    }
  });
});

describe('upload d’avatar', () => {
  const patchAvatar = () =>
    request(app).patch('/api/users/me/avatar').set('Authorization', `Bearer ${LOCATAIRE}`);

  it('accepte une image PNG', async () => {
    const res = await patchAvatar().attach('avatar', PNG, {
      filename: 'photo.png',
      contentType: 'image/png',
    });

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('patchMyAvatar');
  });

  it.each([
    ['jpeg', 'image/jpeg', 'photo.jpg'],
    ['webp', 'image/webp', 'photo.webp'],
  ])('accepte une image %s', async (_label, contentType, filename) => {
    const res = await patchAvatar().attach('avatar', PNG, { filename, contentType });

    expect(res.status).toBe(200);
  });

  it('refuse un type MIME non autorisé', async () => {
    const res = await patchAvatar().attach('avatar', Buffer.from('%PDF-1.4'), {
      filename: 'permis.pdf',
      contentType: 'application/pdf',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Format non supporté/);
    expect(userController.patchMyAvatar).not.toHaveBeenCalled();
  });

  it('refuse une image de plus de 3 Mo', async () => {
    const res = await patchAvatar().attach('avatar', Buffer.alloc(4 * 1024 * 1024), {
      filename: 'énorme.png',
      contentType: 'image/png',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Image trop volumineuse (max 3 Mo).');
  });

  it('laisse passer une requête sans fichier, le contrôleur tranchera', async () => {
    const res = await patchAvatar();

    expect(res.status).toBe(200);
  });
});

describe('upload de photos de litige', () => {
  const postDispute = () =>
    request(app)
      .post('/api/users/me/bookings/7/dispute')
      .set('Authorization', `Bearer ${LOCATAIRE}`);

  it('accepte jusqu’à 5 photos', async () => {
    let req = postDispute();
    for (let i = 0; i < 5; i += 1) {
      req = req.attach('photos', PNG, { filename: `p${i}.png`, contentType: 'image/png' });
    }

    const res = await req;

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('reportMyDispute');
  });

  it('refuse au-delà de 5 photos', async () => {
    let req = postDispute();
    for (let i = 0; i < 6; i += 1) {
      req = req.attach('photos', PNG, { filename: `p${i}.png`, contentType: 'image/png' });
    }

    const res = await req;

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('5 photos maximum.');
  });

  it('refuse une photo de plus de 5 Mo', async () => {
    const res = await postDispute().attach('photos', Buffer.alloc(6 * 1024 * 1024), {
      filename: 'énorme.png',
      contentType: 'image/png',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Photo trop volumineuse (max 5 Mo).');
  });

  it('refuse un type MIME non autorisé', async () => {
    const res = await postDispute().attach('photos', Buffer.from('%PDF-1.4'), {
      filename: 'facture.pdf',
      contentType: 'application/pdf',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Format non supporté/);
  });

  it('refuse un champ de fichier inattendu', async () => {
    const res = await postDispute().attach('autre_champ', PNG, {
      filename: 'p.png',
      contentType: 'image/png',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('5 photos maximum.');
  });
});

describe('routes paramétrées', () => {
  it('transmet l’identifiant de réservation au contrôleur de facture', async () => {
    const res = await request(app)
      .get('/api/users/me/bookings/42/invoice.pdf')
      .set('Authorization', `Bearer ${LOCATAIRE}`);

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('getBookingInvoice');
  });

  it.each([
    ['post', '/api/users/me/bookings/7/pay', 'payMyBooking'],
    ['post', '/api/users/me/bookings/7/cancel', 'cancelMyBooking'],
    ['post', '/api/users/me/bookings/7/refund-request', 'requestMyRefund'],
    ['post', '/api/users/me/bookings/7/review', 'postMyBookingReview'],
    ['patch', '/api/users/me/reviews/3', 'patchMyReview'],
    ['delete', '/api/users/me/reviews/3', 'deleteMyReview'],
    ['get', '/api/users/me/boats/5/review-eligibility', 'getMyBoatReviewEligibility'],
  ])('%s %s atteint le contrôleur locataire attendu', async (method, url, handler) => {
    const res = await request(app)[method](url).set('Authorization', `Bearer ${LOCATAIRE}`);

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe(handler);
  });

  it.each([
    ['patch', '/api/users/me/proprietaire/bookings/7', 'patchBooking'],
    ['get', '/api/users/me/proprietaire/bookings/7/locataire', 'getBookingLocataireProfile'],
    ['get', '/api/users/me/proprietaire/boats/5', 'getMyBoat'],
    ['post', '/api/users/me/proprietaire/reviews/3/reply', 'postReviewReply'],
    ['post', '/api/users/me/proprietaire/stripe-account/onboarding', 'postStripeOnboarding'],
    ['post', '/api/users/me/proprietaire/stripe-account/login-link', 'postStripeLoginLink'],
  ])('%s %s atteint le contrôleur propriétaire attendu', async (method, url, handler) => {
    const res = await request(app)[method](url).set('Authorization', `Bearer ${PROPRIETAIRE}`);

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe(handler);
  });
});
