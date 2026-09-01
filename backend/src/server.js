import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import rateLimit from 'express-rate-limit';
import path from 'path';
import boatRoutes from './routes/boatRoutes.js';
import portRoutes from './routes/portRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { postContactRequest } from './controllers/contactRequestController.js';
import { stripeWebhook } from './controllers/webhookController.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { initConfig } from './config/appConfig.js';
import prisma from './config/db.js';
import { safeErrorResponses, secureErrorHandler } from './middlewares/errorSecurityMiddleware.js';
import { logSanitizedError } from './utils/privacy.js';
import { allowedCorsOrigins, normalizeRequestOrigin } from './utils/corsSecurity.js';
import { securityHeaders } from './middlewares/securityHeaders.js';
import {
  CSRF_SAFE_METHODS,
  createCsrfErrorHandler,
  createCsrfTokenExposure,
  csrfCookieOptions,
  csrfRequestToken,
  deriveCsrfCookieSigningSecret,
  ignoreRequestWithoutRefreshCookie,
} from './middlewares/csrfMiddleware.js';

const { PORT, APP_URL, CORS_ORIGINS, NODE_ENV, JWT_SECRET } = initConfig();
const corsOrigins = allowedCorsOrigins({
  appUrl: APP_URL,
  configuredOrigins: CORS_ORIGINS,
  environment: NODE_ENV,
});
const csrfCookieSigningSecret = deriveCsrfCookieSigningSecret(JWT_SECRET);
// `csurf` resolves to the actively maintained @dr.pogodin/csurf fork through
// an npm alias. The recognized import also lets CodeQL prove the API is guarded.
const csrfProtection = csrf({
  cookie: csrfCookieOptions(NODE_ENV),
  ignoreMethods: CSRF_SAFE_METHODS,
  ignoreRequest: ignoreRequestWithoutRefreshCookie,
  value: csrfRequestToken,
});
const exposeCsrfToken = createCsrfTokenExposure({ allowedOrigins: corsOrigins });
const handleCsrfError = createCsrfErrorHandler({ allowedOrigins: corsOrigins });

const app = express();
app.disable('x-powered-by');

// Filet global pour toutes les routes API, y compris les endpoints publics et
// le webhook Stripe. Les limiteurs spécialisés montés plus bas restent plus
// stricts pour les actions sensibles ; ce limiteur n'est installé qu'une fois
// afin de ne pas compter deux fois le même budget général.
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { message: 'Trop de requêtes. Réessayez dans quelques minutes.' },
});

// Error responses are normalized before any route can accidentally serialize
// an SDK/ORM message.  Detailed diagnostics stay in the internal log sink.
app.use(safeErrorResponses);

// Derrière un proxy en production/staging (Railway, etc.) : permet à Express de reconnaître
// HTTPS (X-Forwarded-Proto) et la vraie IP cliente (cookies Secure, rate-limit).
if (['production', 'staging'].includes(NODE_ENV)) {
  app.set('trust proxy', 1);
}

// All API responses carry the same defensive browser/container headers. The
// frontend has a separate, resource-specific CSP in its nginx container.
app.use('/api', securityHeaders({ environment: NODE_ENV }));
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      // Same-origin/non-browser requests have no Origin header and should be
      // able to use health checks and server-to-server integrations without
      // receiving credentialed CORS headers.
      if (!requestOrigin) return callback(null, true);
      const normalized = normalizeRequestOrigin(requestOrigin);
      if (normalized && corsOrigins.has(normalized)) return callback(null, true);
      return callback(Object.assign(new Error('Origine non autorisée.'), { status: 403 }));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: [
      'Retry-After',
      'RateLimit',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'X-CSRF-Token',
    ],
    maxAge: 600,
    optionsSuccessStatus: 204,
  })
);
// Le limiteur doit précéder le webhook brut : il couvre aussi les requêtes
// qui n'atteignent jamais un routeur métier, sans parser leur payload.
app.use('/api', apiRateLimiter);
// Avant express.json : la vérification de signature Stripe exige le corps brut.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser(csrfCookieSigningSecret));
// Le cookie CSRF doit être lu après cookieParser et avant tous les routeurs ;
// le webhook déjà déclaré ci-dessus ne porte pas de cookie de session et reste
// donc compatible avec la vérification de signature Stripe.
app.use('/api', csrfProtection);
app.use('/api', exposeCsrfToken);
app.use('/api', handleCsrfError);
// Seuls les avatars et photos de bateaux sont publics.  Les preuves de litige
// et documents résident sous storage/ et ne sont jamais exposés par le serveur
// statique ; ils passent par des routes protégées qui déchiffrent à la volée.
const publicUploads = path.resolve(process.env.UPLOADS_DIR || 'uploads');
const publicStaticOptions = { dotfiles: 'deny', index: false, fallthrough: true };
app.use('/uploads/boats', express.static(path.join(publicUploads, 'boats'), publicStaticOptions));
app.use(
  '/uploads/avatars',
  express.static(path.join(publicUploads, 'avatars'), publicStaticOptions)
);

const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});
app.use('/api/users/register', registerLimiter);

const resendLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de renvois. Réessayez dans quelques minutes.' },
});
app.use('/api/users/resend-verification', resendLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
});
app.use('/api/users/login', loginLimiter);

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});
app.use('/api/admin/login', adminLoginLimiter);

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de demandes. Réessayez dans quelques minutes.' },
});
app.use('/api/users/forgot-password', forgotPasswordLimiter);

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});
app.use('/api/users/reset-password', resetPasswordLimiter);

// Formulaire public de contact : limité pour éviter le spam.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de messages envoyés. Réessayez dans une heure.' },
});
app.post('/api/contact', contactLimiter, postContactRequest);

app.use('/api/boats', boatRoutes);
app.use('/api/ports', portRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Keep unknown API routes JSON-shaped and avoid Express' default HTML error
// page, which may include a stack trace outside development.
app.use((req, _res, next) => {
  next(Object.assign(new Error('Route introuvable.'), { status: 404 }));
});
app.use(secureErrorHandler);

process.on('unhandledRejection', (reason) => {
  logSanitizedError('server: unhandledRejection', reason);
});
process.on('uncaughtException', (err) => {
  logSanitizedError('server: uncaughtException', err);
});

// Tâches planifiées (dont l'expiration des réservations non payées, qui tournait
// auparavant via un setInterval local) : le registre et l'historique vivent en
// base, cf. src/scheduler.js.
startScheduler().catch((err) => logSanitizedError('cron: démarrage', err));

const server = app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

// Railway envoie SIGTERM à chaque redéploiement : sans arrêt propre, le process
// sort en code non nul et le déploiement est marqué en échec.
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} reçu, arrêt en cours...`);
  stopScheduler();
  // Filet de sécurité si une connexion refuse de se fermer.
  const forceExit = setTimeout(() => process.exit(0), 10000);
  forceExit.unref();
  // Les connexions keep-alive inactives empêcheraient close() de se terminer.
  server.closeIdleConnections?.();
  server.close(async () => {
    clearTimeout(forceExit);
    await prisma.$disconnect().catch((err) => logSanitizedError('server: prisma disconnect', err));
    console.log('[server] arrêt terminé.');
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
