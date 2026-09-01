import { describe, expect, it } from '@jest/globals';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import request from 'supertest';
import {
  createCsrfProtection,
  csrfCookieOptions,
  csrfTokensMatch,
  CSRF_TOKEN_INVALID_CODE,
  CSRF_TOKEN_REQUIRED_CODE,
} from '../src/middlewares/csrfMiddleware.js';

const VALID_TOKEN = 'a'.repeat(64);
const FRONTEND_ORIGIN = 'http://localhost:5173';

function buildCsrfApp() {
  const app = express();
  app.use(cookieParser());
  app.use(
    '/api',
    createCsrfProtection({
      environment: 'development',
      allowedOrigins: new Set([FRONTEND_ORIGIN]),
    })
  );
  app.get('/api/public', (_req, res) => res.sendStatus(204));
  app.post('/api/public', (_req, res) => res.sendStatus(204));
  return app;
}

describe('limiteur API et protection CSRF', () => {
  it('initialise le cookie HttpOnly et le bootstrap mémoire pour une origine autorisée', async () => {
    const response = await request(buildCsrfApp())
      .get('/api/public')
      .set('Origin', FRONTEND_ORIGIN);

    expect(response.status).toBe(204);
    expect(response.headers['set-cookie']).toHaveLength(1);
    expect(response.headers['set-cookie'][0]).toMatch(
      /^sl_csrf=[a-f0-9]{64}; Max-Age=604800; Path=\/api; Expires=/i
    );
    expect(response.headers['set-cookie'][0]).toMatch(/SameSite=Lax/i);
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    const cookieToken = /^sl_csrf=([a-f0-9]{64});/i.exec(response.headers['set-cookie'][0])?.[1];
    expect(response.headers['x-csrf-token']).toBe(cookieToken);
    expect(csrfCookieOptions('production')).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api',
    });
  });

  it('demande le bootstrap mémoire si l’en-tête CSRF est absent', async () => {
    const response = await request(buildCsrfApp())
      .post('/api/public')
      .set('Cookie', [`sl_refresh=refresh-token`, `sl_csrf=${VALID_TOKEN}`]);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: 'Jeton CSRF requis.',
      code: CSRF_TOKEN_REQUIRED_CODE,
    });
  });

  it('initialise une ancienne session puis autorise son unique rejeu avec le nouveau jeton', async () => {
    const app = buildCsrfApp();
    const firstAttempt = await request(app)
      .post('/api/public')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Cookie', 'sl_refresh=legacy-refresh-token');

    expect(firstAttempt.status).toBe(403);
    expect(firstAttempt.body).toEqual({
      message: 'Jeton CSRF requis.',
      code: CSRF_TOKEN_REQUIRED_CODE,
    });
    const csrfCookie = firstAttempt.headers['set-cookie'][0];
    const issuedToken = /^sl_csrf=([a-f0-9]{64});/i.exec(csrfCookie)?.[1];
    expect(issuedToken).toHaveLength(64);
    expect(firstAttempt.headers['x-csrf-token']).toBe(issuedToken);

    const retry = await request(app)
      .post('/api/public')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Cookie', ['sl_refresh=legacy-refresh-token', `sl_csrf=${issuedToken}`])
      .set('X-CSRF-Token', issuedToken);
    expect(retry.status).toBe(204);
  });

  it('réamorce la mémoire après rechargement sans renouveler le cookie existant', async () => {
    const app = buildCsrfApp();
    const bootstrap = await request(app)
      .post('/api/public')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Cookie', [`sl_refresh=refresh-token`, `sl_csrf=${VALID_TOKEN}`]);

    expect(bootstrap.status).toBe(403);
    expect(bootstrap.body.code).toBe(CSRF_TOKEN_REQUIRED_CODE);
    expect(bootstrap.headers['x-csrf-token']).toBe(VALID_TOKEN);
    expect(bootstrap.headers).not.toHaveProperty('set-cookie');

    const retry = await request(app)
      .post('/api/public')
      .set('Origin', FRONTEND_ORIGIN)
      .set('Cookie', [`sl_refresh=refresh-token`, `sl_csrf=${VALID_TOKEN}`])
      .set('X-CSRF-Token', bootstrap.headers['x-csrf-token']);
    expect(retry.status).toBe(204);
  });

  it('accepte uniquement le même jeton CSRF en temps constant', async () => {
    const app = buildCsrfApp();
    const valid = await request(app)
      .post('/api/public')
      .set('Cookie', [`sl_refresh=refresh-token`, `sl_csrf=${VALID_TOKEN}`])
      .set('X-CSRF-Token', VALID_TOKEN);
    const invalid = await request(app)
      .post('/api/public')
      .set('Cookie', [`sl_refresh=refresh-token`, `sl_csrf=${VALID_TOKEN}`])
      .set('X-CSRF-Token', `${'b'.repeat(64)}`);

    expect(valid.status).toBe(204);
    expect(invalid.status).toBe(403);
    expect(invalid.body.code).toBe(CSRF_TOKEN_INVALID_CODE);
    expect(csrfTokensMatch(VALID_TOKEN, VALID_TOKEN)).toBe(true);
    expect(csrfTokensMatch(VALID_TOKEN, 'short')).toBe(false);
  });

  it('conserve les mutations publiques et Bearer sans cookie de session', async () => {
    const app = buildCsrfApp();
    const publicResponse = await request(app).post('/api/public');
    const bearerResponse = await request(app)
      .post('/api/public')
      .set('Authorization', 'Bearer explicit-token');

    expect(publicResponse.status).toBe(204);
    expect(bearerResponse.status).toBe(204);
  });

  it('laisse passer les méthodes sûres sans jeton', async () => {
    const response = await request(buildCsrfApp()).get('/api/public').set('Cookie', 'sl_refresh=x');
    expect(response.status).toBe(204);
  });

  it('applique un seul limiteur avant le contrôleur public et renvoie 429 après le quota', async () => {
    const app = express();
    let handlerCalls = 0;
    const limiter = rateLimit({
      windowMs: 60_000,
      limit: 2,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
    });
    app.use('/api', limiter);
    app.post('/api/public', (_req, res) => {
      handlerCalls += 1;
      res.sendStatus(204);
    });

    expect((await request(app).post('/api/public')).status).toBe(204);
    expect((await request(app).post('/api/public')).status).toBe(204);
    const blocked = await request(app).post('/api/public');

    expect(blocked.status).toBe(429);
    expect(blocked.headers).toHaveProperty('ratelimit');
    expect(handlerCalls).toBe(2);
  });

  it('conserve le pré-vol CORS avec le nouvel en-tête CSRF', async () => {
    const app = express();
    app.use(
      cors({
        origin: 'http://localhost:5173',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Accept', 'Content-Type', 'Authorization', 'X-CSRF-Token'],
        exposedHeaders: ['X-CSRF-Token'],
      })
    );
    app.post('/api/public', (_req, res) => res.sendStatus(204));

    const response = await request(app)
      .options('/api/public')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'X-CSRF-Token');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-headers']).toMatch(/X-CSRF-Token/i);
    expect(response.headers['access-control-expose-headers']).toMatch(/X-CSRF-Token/i);
  });

  it('bloque une origine tierce avant qu’elle puisse recevoir le cookie CSRF', async () => {
    const app = express();
    app.use(
      cors({
        origin: (origin, callback) => {
          if (origin === 'http://localhost:5173') return callback(null, true);
          return callback(Object.assign(new Error('Origine non autorisée.'), { status: 403 }));
        },
        credentials: true,
        allowedHeaders: ['Accept', 'Content-Type', 'Authorization', 'X-CSRF-Token'],
      })
    );
    app.use(cookieParser());
    app.use('/api', createCsrfProtection({ environment: 'development' }));
    app.post('/api/public', (_req, res) => res.sendStatus(204));
    app.use((error, _req, res, _next) => {
      void _next;
      return res.status(error.status || 500).json({ message: error.message });
    });

    const response = await request(app)
      .post('/api/public')
      .set('Origin', 'https://evil.example')
      .set('Cookie', 'sl_refresh=ambient-refresh-token');

    expect(response.status).toBe(403);
    expect(response.headers).not.toHaveProperty('access-control-allow-origin');
    expect(response.headers).not.toHaveProperty('set-cookie');
    expect(response.headers).not.toHaveProperty('x-csrf-token');
  });
});

describe('ordre des protections du serveur', () => {
  it('place le limiteur API avant le webhook et le CSRF après cookieParser', () => {
    const source = fs.readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
    const limiterPosition = source.indexOf("app.use('/api', apiRateLimiter)");
    const webhookPosition = source.indexOf("app.post('/api/webhooks/stripe'");
    const parserPosition = source.indexOf('app.use(cookieParser())');
    const csrfPosition = source.indexOf('createCsrfProtection({ environment: NODE_ENV');

    expect(limiterPosition).toBeGreaterThan(-1);
    expect(webhookPosition).toBeGreaterThan(limiterPosition);
    expect(csrfPosition).toBeGreaterThan(parserPosition);
    expect(source).toContain("'X-CSRF-Token'");
    expect(source).toContain('allowedOrigins: corsOrigins');
  });

  it('limite le rejeu Axios au code de transition CSRF et à une seule tentative', () => {
    const source = fs.readFileSync(
      new URL('../../frontend/src/services/api.js', import.meta.url),
      'utf8'
    );

    expect(source).toContain("const CSRF_TOKEN_REQUIRED_CODE = 'CSRF_TOKEN_REQUIRED'");
    expect(source).not.toContain('CSRF_TOKEN_INVALID');
    expect(source).toContain('let csrfToken = null');
    expect(source).toContain('captureCsrfToken(error.response)');
    expect(source).toContain('captureCsrfToken(response)');
    expect(source).toContain('error.response?.data?.code === CSRF_TOKEN_REQUIRED_CODE');
    expect(source).toContain('!original._csrfRetry');
    expect(source).toContain('original._csrfRetry = true');
    expect(source).toContain('if (!csrfToken) return Promise.reject(error)');
    expect(source).toContain('status !== 401');
    expect(source).toContain('original.url?.endsWith(REFRESH_URL)');
    expect(source).not.toContain('document.cookie');
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
  });
});
