import express from 'express';
import cors from 'cors';
import boatRoutes from './routes/boatRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { initConfig } from './config/appConfig.js';

const { PORT } = initConfig();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
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
