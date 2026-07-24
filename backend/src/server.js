import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import boatRoutes from './routes/boatRoutes.js';
import portRoutes from './routes/portRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import { postContactRequest } from './controllers/contactRequestController.js';
import { stripeWebhook } from './controllers/webhookController.js';
import { cancelExpiredBookings } from './services/bookingService.js';
import { initConfig } from './config/appConfig.js';
import { createCsrfProtection } from './middlewares/csrfMiddleware.js';
import {
  apiLimiter,
  mutationLimiter,
  registerLimiter,
  resendLimiter,
  loginLimiter,
  adminLoginLimiter,
  loginAccountLimiter,
  refreshLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  contactLimiter,
} from './middlewares/abuseProtectionMiddleware.js';

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
    exposedHeaders: ['Retry-After', 'RateLimit'],
  })
);
// Avant express.json : la vérification de signature Stripe exige le corps brut.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(createCsrfProtection([APP_URL]));
app.use('/uploads', express.static('uploads'));
app.use('/api', apiLimiter, mutationLimiter);

app.use('/api/users/register', registerLimiter);
app.use('/api/users/resend-verification', resendLimiter);
app.use('/api/users/login', loginLimiter, loginAccountLimiter);
app.use('/api/admin/login', adminLoginLimiter, loginAccountLimiter);
app.use('/api/users/refresh', refreshLimiter);
app.use('/api/users/forgot-password', forgotPasswordLimiter);
app.use('/api/users/reset-password', resetPasswordLimiter);

// Formulaire public de contact : limité pour éviter le spam.
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

// Les réservations « pending » non payées expirent au bout de 72 h : balayage
// au démarrage puis toutes les heures (complété par un appel à chaque création
// de réservation, cf. bookingService).
cancelExpiredBookings().catch((err) => console.error('[bookings] sweep:', err));
setInterval(
  () => cancelExpiredBookings().catch((err) => console.error('[bookings] sweep:', err)),
  60 * 60 * 1000
);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
