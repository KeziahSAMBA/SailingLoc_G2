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
import { cancelExpiredBookings } from './services/bookingService.js';
import { initConfig } from './config/appConfig.js';

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
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

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
