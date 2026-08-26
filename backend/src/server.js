import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
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

const { PORT, APP_URL } = initConfig();

const app = express();

// Derrière un proxy en production (Railway, etc.) : permet à Express de reconnaître
// HTTPS (X-Forwarded-Proto) et la vraie IP cliente (cookies Secure, rate-limit).
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    exposedHeaders: ['Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  })
);
// Avant express.json : la vérification de signature Stripe exige le corps brut.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
// UPLOADS_DIR : chemin disque configurable (volume Railway) ; l'URL /uploads ne change pas.
app.use('/uploads', express.static(process.env.UPLOADS_DIR || 'uploads'));

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

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err);
});

// Tâches planifiées (dont l'expiration des réservations non payées, qui tournait
// auparavant via un setInterval local) : le registre et l'historique vivent en
// base, cf. src/scheduler.js.
startScheduler().catch((err) => console.error('[cron] démarrage:', err));

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
    await prisma.$disconnect().catch((err) => console.error('[server] prisma disconnect:', err));
    console.log('[server] arrêt terminé.');
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
