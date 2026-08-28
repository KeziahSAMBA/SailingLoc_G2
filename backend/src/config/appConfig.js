import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env');
const envModePath = path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);

dotenv.config({ path: envPath });
dotenv.config({ path: envModePath, override: true });

export function initConfig() {
  return {
    PORT: process.env.PORT || 4000,
    JWT_SECRET: process.env.JWT_SECRET || 'change-me',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    EMAIL_HOST: process.env.EMAIL_HOST || '',
    EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
    EMAIL_USER: process.env.EMAIL_USER || '',
    EMAIL_PASS: process.env.EMAIL_PASS || '',
    // TLS implicite (port 465). Laisser vide en dev/587 (STARTTLS automatique).
    EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
    // Désactive TLS — à réserver à MailDev en local (EMAIL_IGNORE_TLS=true).
    EMAIL_IGNORE_TLS: process.env.EMAIL_IGNORE_TLS === 'true',
    // API HTTP Mailgun (prod Railway, SMTP bloqué) ; si absente, SMTP classique.
    MAILGUN_API_KEY: process.env.MAILGUN_API_KEY || '',
    MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || '',
    // Région EU : api.eu.mailgun.net
    MAILGUN_HOST: process.env.MAILGUN_HOST || 'api.mailgun.net',
    APP_URL: process.env.APP_URL || 'http://localhost:5173',
    // Environnement de test de charge uniquement : neutralise le rate limiting,
    // l'envoi réel d'emails et les tâches planifiées. Jamais activé en production.
    LOAD_TEST_MODE: process.env.LOAD_TEST_MODE === 'true',
  };
}
