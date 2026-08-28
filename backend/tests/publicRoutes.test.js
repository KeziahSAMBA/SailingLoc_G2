import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import os from 'os';
import path from 'path';

const JWT_SECRET = 'secret-de-test-unitaire';

// documentRoutes crée son dossier de stockage à l'import : on le dépayse.
const TMP_DOCS = fs.mkdtempSync(path.join(os.tmpdir(), 'sl-docs-'));
process.env.DOCUMENTS_DIR = TMP_DOCS;

jest.unstable_mockModule('../src/config/appConfig.js', () => ({
  initConfig: () => ({ JWT_SECRET }),
}));

const mockLogActivity = jest.fn();
jest.unstable_mockModule('../src/services/logService.js', () => ({
  logActivity: mockLogActivity,
}));

const probes = (names) =>
  Object.fromEntries(names.map((n) => [n, jest.fn((req, res) => res.json({ handler: n }))]));

const documentController = probes([
  'listMyDocuments',
  'uploadMyDocument',
  'deleteMyDocumentController',
  'downloadDocument',
]);
jest.unstable_mockModule('../src/controllers/documentController.js', () => documentController);

jest.unstable_mockModule('../src/controllers/messageController.js', () =>
  probes([
    'getConversations',
    'getThreadWith',
    'postMessage',
    'getUnreadCount',
    'patchMessage',
    'removeMessage',
    'postSupport',
    'postBoatContact',
    'postResolveSupport',
  ])
);

jest.unstable_mockModule('../src/controllers/reviewController.js', () =>
  probes(['getPublicReviews'])
);
jest.unstable_mockModule('../src/controllers/portController.js', () => probes(['getPorts']));

const { default: documentRoutes } = await import('../src/routes/documentRoutes.js');
const { default: messageRoutes } = await import('../src/routes/messageRoutes.js');
const { default: reviewRoutes } = await import('../src/routes/reviewRoutes.js');
const { default: portRoutes } = await import('../src/routes/portRoutes.js');

const app = express();
app.use(express.json());
app.use('/api/documents', documentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ports', portRoutes);

const tokenFor = (role) => jwt.sign({ id_user: 1, role }, JWT_SECRET);
const LOCATAIRE = tokenFor('locataire');
const PROPRIETAIRE = tokenFor('proprietaire');
const ADMIN = tokenFor('admin');

const PDF = Buffer.from('%PDF-1.4');
const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

beforeEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  fs.rmSync(TMP_DOCS, { recursive: true, force: true });
});

describe('routes publiques sans authentification', () => {
  it.each([
    ['get', '/api/reviews/public', 'getPublicReviews'],
    ['get', '/api/ports', 'getPorts'],
  ])('%s %s est accessible sans jeton', async (method, url, handler) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe(handler);
  });
});

describe('documents — authentification et rôles', () => {
  const routes = [
    ['get', '/api/documents'],
    ['post', '/api/documents'],
    ['delete', '/api/documents/5'],
    ['get', '/api/documents/5/file'],
  ];

  it.each(routes)('%s %s renvoie 401 sans jeton', async (method, url) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(401);
  });

  it.each(routes)('%s %s renvoie 401 avec un jeton forgé', async (method, url) => {
    const res = await request(app)[method](url).set('Authorization', 'Bearer jeton.bidon.forgé');

    expect(res.status).toBe(401);
  });

  it.each([
    ['get', '/api/documents'],
    ['post', '/api/documents'],
    ['delete', '/api/documents/5'],
  ])('%s %s est fermé à l’admin (documents personnels)', async (method, url) => {
    const res = await request(app)[method](url).set('Authorization', `Bearer ${ADMIN}`);

    expect(res.status).toBe(403);
  });

  it('laisse un admin télécharger un document, le contrôle se faisant dans le service', async () => {
    const res = await request(app)
      .get('/api/documents/5/file')
      .set('Authorization', `Bearer ${ADMIN}`);

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('downloadDocument');
  });

  it.each([
    ['locataire', LOCATAIRE],
    ['propriétaire', PROPRIETAIRE],
  ])('laisse un %s lister ses documents', async (_role, token) => {
    const res = await request(app).get('/api/documents').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('trace la suppression d’un document', async () => {
    await request(app).delete('/api/documents/5').set('Authorization', `Bearer ${LOCATAIRE}`);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'document.delete', targetId: '5' })
    );
  });
});

describe('documents — dépôt de fichier', () => {
  const post = () =>
    request(app).post('/api/documents').set('Authorization', `Bearer ${LOCATAIRE}`);

  it.each([
    ['PDF', 'application/pdf', 'permis.pdf', PDF],
    ['JPEG', 'image/jpeg', 'permis.jpg', PNG],
    ['PNG', 'image/png', 'permis.png', PNG],
  ])('accepte un fichier %s', async (_label, contentType, filename, buffer) => {
    const res = await post().attach('file', buffer, { filename, contentType });

    expect(res.status).toBe(200);
    expect(res.body.handler).toBe('uploadMyDocument');
  });

  it('refuse un type MIME non autorisé', async () => {
    const res = await post().attach('file', Buffer.from('MZ'), {
      filename: 'virus.exe',
      contentType: 'application/x-msdownload',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Format non supporté/);
    expect(documentController.uploadMyDocument).not.toHaveBeenCalled();
  });

  it('refuse un fichier de plus de 5 Mo', async () => {
    const res = await post().attach('file', Buffer.alloc(6 * 1024 * 1024), {
      filename: 'gros.pdf',
      contentType: 'application/pdf',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Fichier trop volumineux (max 5 Mo).');
  });

  it('trace le dépôt avec le type de document demandé', async () => {
    await post().field('type', 'permis_conduire').attach('file', PDF, {
      filename: 'permis.pdf',
      contentType: 'application/pdf',
    });

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document.upload',
        meta: { type: 'permis_conduire' },
      })
    );
  });
});

describe('messagerie — authentification et rôles', () => {
  const routes = [
    ['get', '/api/messages/conversations'],
    ['get', '/api/messages/unread'],
    ['get', '/api/messages/with/2'],
    ['post', '/api/messages'],
    ['post', '/api/messages/support'],
    ['post', '/api/messages/boat/4/contact'],
    ['post', '/api/messages/support/3/resolve'],
    ['patch', '/api/messages/10'],
    ['delete', '/api/messages/10'],
  ];

  it.each(routes)('%s %s renvoie 401 sans jeton', async (method, url) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(401);
  });

  it.each([
    ['get', '/api/messages/conversations', 'getConversations'],
    ['get', '/api/messages/unread', 'getUnreadCount'],
    ['get', '/api/messages/with/2', 'getThreadWith'],
    ['post', '/api/messages', 'postMessage'],
    ['patch', '/api/messages/10', 'patchMessage'],
    ['delete', '/api/messages/10', 'removeMessage'],
  ])('%s %s est ouvert aux trois rôles', async (method, url, handler) => {
    for (const token of [LOCATAIRE, PROPRIETAIRE, ADMIN]) {
      const res = await request(app)[method](url).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.handler).toBe(handler);
    }
  });

  it('réserve l’ouverture du support aux clients, pas à l’admin', async () => {
    const ok = await request(app)
      .post('/api/messages/support')
      .set('Authorization', `Bearer ${LOCATAIRE}`);
    expect(ok.status).toBe(200);

    const ko = await request(app)
      .post('/api/messages/support')
      .set('Authorization', `Bearer ${ADMIN}`);
    expect(ko.status).toBe(403);
  });

  it('réserve le contact propriétaire au locataire', async () => {
    const ok = await request(app)
      .post('/api/messages/boat/4/contact')
      .set('Authorization', `Bearer ${LOCATAIRE}`);
    expect(ok.status).toBe(200);

    for (const token of [PROPRIETAIRE, ADMIN]) {
      const ko = await request(app)
        .post('/api/messages/boat/4/contact')
        .set('Authorization', `Bearer ${token}`);
      expect(ko.status).toBe(403);
    }
  });

  it('réserve la clôture d’une demande support à l’admin', async () => {
    const ok = await request(app)
      .post('/api/messages/support/3/resolve')
      .set('Authorization', `Bearer ${ADMIN}`);
    expect(ok.status).toBe(200);

    for (const token of [LOCATAIRE, PROPRIETAIRE]) {
      const ko = await request(app)
        .post('/api/messages/support/3/resolve')
        .set('Authorization', `Bearer ${token}`);
      expect(ko.status).toBe(403);
    }
  });
});

describe('messagerie — journalisation sélective', () => {
  it('trace la clôture d’une demande support par l’admin', async () => {
    await request(app)
      .post('/api/messages/support/3/resolve')
      .set('Authorization', `Bearer ${ADMIN}`);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'support.resolve', targetType: 'user', targetId: '3' })
    );
  });

  it.each([
    ['patch', '/api/messages/10', 'message.update'],
    ['delete', '/api/messages/10', 'message.delete'],
  ])('trace « %s %s » quand c’est un admin qui intervient', async (method, url, action) => {
    await request(app)[method](url).set('Authorization', `Bearer ${ADMIN}`);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action, targetType: 'message', targetId: '10' })
    );
  });

  it.each([
    ['patch', '/api/messages/10'],
    ['delete', '/api/messages/10'],
  ])('ne trace pas « %s %s » sur ses propres messages', async (method, url) => {
    for (const token of [LOCATAIRE, PROPRIETAIRE]) {
      await request(app)[method](url).set('Authorization', `Bearer ${token}`);
    }

    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});
