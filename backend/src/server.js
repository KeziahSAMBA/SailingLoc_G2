import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import boatRoutes from './routes/boatRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import { initConfig } from './config/appConfig.js';

const { PORT, APP_URL } = initConfig();

const app = express();

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

app.use('/api/boats', boatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err);
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
