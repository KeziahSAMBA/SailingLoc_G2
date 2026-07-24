import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');
const envModePath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);

dotenv.config({ path: envPath });
dotenv.config({ path: envModePath, override: true });

export function initConfig() {
  const jwtSecret = process.env.JWT_SECRET || 'change-me';
  const fileEncryptionKey = process.env.FILE_ENCRYPTION_KEY || '';
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  if (
    process.env.NODE_ENV === 'production' &&
    (jwtSecret === 'change-me' || jwtSecret.length < 32)
  ) {
    throw new Error('JWT_SECRET doit contenir au moins 32 caractères aléatoires en production.');
  }
  if (process.env.NODE_ENV === 'production' && !/^[0-9a-fA-F]{64}$/.test(fileEncryptionKey)) {
    throw new Error('FILE_ENCRYPTION_KEY doit contenir exactement 64 caractères hexadécimaux.');
  }
  if (
    process.env.NODE_ENV === 'production' &&
    stripeSecretKey &&
    !stripeWebhookSecret.startsWith('whsec_')
  ) {
    throw new Error('STRIPE_WEBHOOK_SECRET est obligatoire lorsque Stripe est activé.');
  }

  return {
    PORT: process.env.PORT || 4000,
    JWT_SECRET: jwtSecret,
    STRIPE_SECRET_KEY: stripeSecretKey,
    STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
    FILE_ENCRYPTION_KEY: fileEncryptionKey,
    EMAIL_HOST: process.env.EMAIL_HOST || '',
    EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
    EMAIL_USER: process.env.EMAIL_USER || '',
    EMAIL_PASS: process.env.EMAIL_PASS || '',
    // TLS implicite (port 465). Laisser vide en dev/587 (STARTTLS automatique).
    EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
    // Désactive TLS — à réserver à MailDev en local (EMAIL_IGNORE_TLS=true).
    EMAIL_IGNORE_TLS: process.env.EMAIL_IGNORE_TLS === 'true',
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
  };
}
