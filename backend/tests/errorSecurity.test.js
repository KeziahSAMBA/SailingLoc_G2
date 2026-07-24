import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import {
  safeErrorResponses,
  secureErrorHandler,
} from '../src/middlewares/errorSecurityMiddleware.js';

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(safeErrorResponses);
  app.use(express.json({ limit: '100b' }));
  app.get('/controller-error', (req, res) =>
    res.status(500).json({
      message: 'Invalid `prisma.user.findMany()`: database.internal:5432 secret_table',
    })
  );
  app.get('/thrown-error', () => {
    throw Object.assign(new Error('DATABASE_URL=postgresql://secret'), { code: 'DB_FAILURE' });
  });
  app.post('/json', (req, res) => res.json({ ok: true }));
  app.use(secureErrorHandler);
  return app;
}

describe('réponses d’erreur sécurisées', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('masque les détails internes renvoyés par un contrôleur', async () => {
    const response = await request(createApp()).get('/controller-error').expect(500);

    expect(response.body).toEqual({ message: 'Une erreur interne est survenue.' });
    expect(response.text).not.toContain('prisma');
    expect(response.text).not.toContain('secret_table');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('masque le message et la pile d’une exception non gérée', async () => {
    const response = await request(createApp()).get('/thrown-error').expect(500);

    expect(response.body).toEqual({ message: 'Une erreur interne est survenue.' });
    expect(response.text).not.toContain('DATABASE_URL');
  });

  test('retourne une erreur neutre pour un JSON invalide', async () => {
    const response = await request(createApp())
      .post('/json')
      .set('Content-Type', 'application/json')
      .send('{"incomplet":')
      .expect(400);

    expect(response.body).toEqual({ message: 'Corps JSON invalide.' });
    expect(response.text).not.toContain('SyntaxError');
  });

  test('retourne HTTP 413 sans détail interne pour un corps trop grand', async () => {
    const response = await request(createApp())
      .post('/json')
      .send({ content: 'a'.repeat(200) })
      .expect(413);

    expect(response.body).toEqual({ message: 'Corps de requête trop volumineux.' });
  });
});
