import express from 'express';
import request from 'supertest';
import { createRequestLimiter } from '../src/middlewares/abuseProtectionMiddleware.js';

function createTestApp(limiter, { authenticate = false } = {}) {
  const app = express();
  if (authenticate) {
    app.use((req, res, next) => {
      req.user = { id_user: req.get('x-test-user') || 'anonymous' };
      next();
    });
  }
  app.use(limiter);
  app.all('/resource', (req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('limitation des abus API', () => {
  test('bloque les requêtes dépassant le plafond avec HTTP 429', async () => {
    const limiter = createRequestLimiter({
      windowMs: 60_000,
      limit: 2,
      message: 'Plafond atteint.',
    });
    const app = createTestApp(limiter);

    await request(app).get('/resource').expect(200);
    await request(app).get('/resource').expect(200);
    const blocked = await request(app).get('/resource').expect(429);

    expect(blocked.body).toEqual({ message: 'Plafond atteint.' });
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.headers.ratelimit).toContain('limit=2');
  });

  test('un plafond de mutations ignore les méthodes de lecture sûres', async () => {
    const limiter = createRequestLimiter({
      windowMs: 60_000,
      limit: 1,
      skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
    });
    const app = createTestApp(limiter);

    await request(app).get('/resource').expect(200);
    await request(app).get('/resource').expect(200);
    await request(app).post('/resource').expect(200);
    await request(app).post('/resource').expect(429);
  });

  test('un quota authentifié isole les comptes partageant la même IP', async () => {
    const limiter = createRequestLimiter({
      windowMs: 60_000,
      limit: 1,
      keyGenerator: (req) => `user:${req.user.id_user}`,
    });
    const app = createTestApp(limiter, { authenticate: true });

    await request(app).post('/resource').set('x-test-user', '101').expect(200);
    await request(app).post('/resource').set('x-test-user', '101').expect(429);
    await request(app).post('/resource').set('x-test-user', '202').expect(200);
  });

  test('un quota de connexion suit le compte indépendamment de la casse', async () => {
    const limiter = createRequestLimiter({
      windowMs: 60_000,
      limit: 1,
      keyGenerator: (req) => `account:${String(req.body?.email || '').trim().toLowerCase()}`,
    });
    const app = express();
    app.use(express.json());
    app.use(limiter);
    app.post('/login', (req, res) => res.status(401).json({ message: 'Identifiants invalides.' }));

    await request(app).post('/login').send({ email: 'Alice@Example.com' }).expect(401);
    await request(app).post('/login').send({ email: ' alice@example.com ' }).expect(429);
    await request(app).post('/login').send({ email: 'bob@example.com' }).expect(401);
  });
});
