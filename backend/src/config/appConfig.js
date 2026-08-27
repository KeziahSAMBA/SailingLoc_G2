import path from 'path';
import dotenv from 'dotenv';
import { allowedCorsOrigins } from '../utils/corsSecurity.js';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

/**
 * Return the deployment environment without logging environment values.
 * Railway does not consistently set NODE_ENV, so its environment marker is a
 * safe fallback for deployments there.
 */
export function getRuntimeEnvironment() {
  return String(
    process.env.NODE_ENV ||
      process.env.RAILWAY_ENVIRONMENT_NAME ||
      process.env.RAILWAY_ENVIRONMENT ||
      'development'
  )
    .trim()
    .toLowerCase();
}

// Load the mode-specific file after the base file. This also honours a
// NODE_ENV declared in .env instead of always loading .env.development.
const envModePath = path.resolve(process.cwd(), `.env.${getRuntimeEnvironment()}`);
dotenv.config({ path: envModePath, override: true });

const value = (name) => String(process.env[name] || '').trim();

const PRODUCTION_LIKE_ENVS = new Set(['production', 'staging']);
const WEAK_JWT_SECRETS = new Set([
  'change-me',
  'changeme',
  'secret',
  'jwt_secret',
  'votre_secret_jwt',
]);

function isValidJwtSecret(secret) {
  if (!secret || secret.length < 32) return false;
  if (WEAK_JWT_SECRETS.has(secret.toLowerCase())) return false;
  // Reject an obvious placeholder such as "aaaaaaaa...".
  return !/^(.)(?:\1)+$/.test(secret);
}

function isValidHttpsAppUrl(appUrl) {
  try {
    const parsed = new URL(appUrl);
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      !['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function isValidDevelopmentAppUrl(appUrl) {
  try {
    const parsed = new URL(appUrl);
    return (
      ['http:', 'https:'].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

/**
 * Validate deployment-critical configuration. Development and tests retain
 * optional integrations, but production-like deployments fail closed instead
 * of silently falling back to insecure defaults.
 */
export function validateConfig(config, environment = getRuntimeEnvironment()) {
  const env = String(environment || '')
    .trim()
    .toLowerCase();
  const errors = [];
  const required = (name, currentValue) => {
    if (!currentValue) errors.push(`${name} est obligatoire`);
  };

  // There is deliberately no JWT fallback in any environment. A missing key
  // must be visible during deployment rather than creating forgeable tokens.
  if (config.JWT_SECRET && !isValidJwtSecret(config.JWT_SECRET)) {
    errors.push('JWT_SECRET doit contenir au moins 32 caractères aléatoires');
  }

  if (PRODUCTION_LIKE_ENVS.has(env)) {
    required('JWT_SECRET', config.JWT_SECRET);
    required('DATABASE_URL', config.DATABASE_URL);
    required('FILE_ENCRYPTION_KEY', config.FILE_ENCRYPTION_KEY);

    if (config.FILE_ENCRYPTION_KEY && !/^[0-9a-f]{64}$/i.test(config.FILE_ENCRYPTION_KEY)) {
      errors.push('FILE_ENCRYPTION_KEY doit contenir exactement 64 caractères hexadécimaux');
    }
  }

  if (env === 'production') {
    required('APP_URL', config.APP_URL);
    if (config.APP_URL && !isValidHttpsAppUrl(config.APP_URL)) {
      errors.push('APP_URL doit être une URL HTTPS publique sans identifiants');
    }

    required('STRIPE_SECRET_KEY', config.STRIPE_SECRET_KEY);
    if (config.STRIPE_SECRET_KEY && !/^sk_live_[A-Za-z0-9]+$/.test(config.STRIPE_SECRET_KEY)) {
      errors.push('STRIPE_SECRET_KEY doit être une clé Stripe live');
    }

    required('STRIPE_WEBHOOK_SECRET', config.STRIPE_WEBHOOK_SECRET);
    if (
      config.STRIPE_WEBHOOK_SECRET &&
      !/^whsec_[A-Za-z0-9]+$/.test(config.STRIPE_WEBHOOK_SECRET)
    ) {
      errors.push('STRIPE_WEBHOOK_SECRET est invalide');
    }

    if (config.EMAIL_IGNORE_TLS) {
      errors.push('EMAIL_IGNORE_TLS doit être désactivé en production');
    }

    const hasMailgunKey = Boolean(config.MAILGUN_API_KEY);
    const hasMailgunDomain = Boolean(config.MAILGUN_DOMAIN);
    if (hasMailgunKey !== hasMailgunDomain) {
      errors.push('MAILGUN_API_KEY et MAILGUN_DOMAIN doivent être fournis ensemble');
    }
    if (!hasMailgunKey && !config.EMAIL_HOST) {
      errors.push('Une configuration Mailgun complète ou EMAIL_HOST est obligatoire');
    }
  } else if (PRODUCTION_LIKE_ENVS.has(env)) {
    required('APP_URL', config.APP_URL);
    if (config.APP_URL && !isValidHttpsAppUrl(config.APP_URL)) {
      errors.push('APP_URL doit être une URL HTTPS publique sans identifiants');
    }
  } else if (config.APP_URL && !isValidDevelopmentAppUrl(config.APP_URL)) {
    errors.push('APP_URL doit être une URL HTTP(S) valide sans identifiants');
  }

  // CORS_ORIGINS is optional (APP_URL is always allowed), but every extra
  // origin is parsed and normalized here so a malformed or insecure value
  // cannot silently widen credentialed access at runtime.
  try {
    allowedCorsOrigins({
      appUrl: config.APP_URL,
      configuredOrigins: config.CORS_ORIGINS,
      environment: env,
    });
  } catch (error) {
    errors.push(error.message);
  }

  if (errors.length > 0) {
    throw new Error(`[config] Configuration ${env || 'inconnue'} invalide : ${errors.join('; ')}`);
  }

  return config;
}

export function initConfig() {
  const environment = getRuntimeEnvironment();
  const config = {
    NODE_ENV: environment,
    PORT: value('PORT') || 4000,
    DATABASE_URL: value('DATABASE_URL'),
    JWT_SECRET: value('JWT_SECRET'),
    STRIPE_SECRET_KEY: value('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: value('STRIPE_WEBHOOK_SECRET'),
    FILE_ENCRYPTION_KEY: value('FILE_ENCRYPTION_KEY'),
    // Temporary, explicitly configured rollback switch for legacy cleartext
    // files. fileCrypto defaults this to false in production-like environments.
    ALLOW_LEGACY_CLEAR_FILE_READ: value('ALLOW_LEGACY_CLEAR_FILE_READ'),
    EMAIL_HOST: value('EMAIL_HOST'),
    EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
    EMAIL_USER: value('EMAIL_USER'),
    EMAIL_PASS: value('EMAIL_PASS'),
    // TLS implicite (port 465). Laisser vide en dev/587 (STARTTLS automatique).
    EMAIL_SECURE: value('EMAIL_SECURE').toLowerCase() === 'true',
    // Désactive TLS — à réserver à MailDev en local (EMAIL_IGNORE_TLS=true).
    EMAIL_IGNORE_TLS: value('EMAIL_IGNORE_TLS').toLowerCase() === 'true',
    // API HTTP Mailgun (prod Railway, SMTP bloqué) ; si absente, SMTP classique.
    MAILGUN_API_KEY: value('MAILGUN_API_KEY'),
    MAILGUN_DOMAIN: value('MAILGUN_DOMAIN'),
    // Région EU : api.eu.mailgun.net
    MAILGUN_HOST: value('MAILGUN_HOST') || 'api.mailgun.net',
    // Origines frontend supplémentaires autorisées à appeler l'API avec les
    // cookies de session (séparées par des virgules, sans wildcard).
    CORS_ORIGINS: value('CORS_ORIGINS'),
    APP_URL: value('APP_URL') || (environment === 'production' ? '' : 'http://localhost:5173'),
  };

  return validateConfig(config, environment);
}
