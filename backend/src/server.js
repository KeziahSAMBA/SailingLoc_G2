import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import boatRoutes from './routes/boatRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { initConfig } from './config/appConfig.js';

const { PORT, APP_URL } = initConfig();

const app = express();

app.use(
  cors({
    origin: APP_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    exposedHeaders: ['Retry-After', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  })
);
app.use(express.json({ limit: '10kb' }));
app.use('/uploads', express.static('uploads'));

const registerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});
app.use('/api/users/register', registerLimiter);

app.use('/api/boats', boatRoutes);
app.use('/api/users', userRoutes);

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