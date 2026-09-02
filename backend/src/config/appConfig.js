import path from 'path';
import dotenv from 'dotenv';
import { allowedCorsOrigins } from '../utils/corsSecurity.js';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

function normalizeEnvironment(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * Return the Node runtime environment. NODE_ENV remains the source of truth
 * for runtime behaviour (security middleware, cookies and TLS safeguards).
 *
 * The Railway fallback is kept only for existing deployments that have not
 * yet declared NODE_ENV. It accepts the exact Railway environment names and
 * therefore cannot silently turn an arbitrary name into development mode.
 */
export function getRuntimeEnvironment() {
  const declared = normalizeEnvironment(process.env.NODE_ENV);
  if (declared) return declared;

  const railwayEnvironment = normalizeEnvironment(
    process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT
  );
  return railwayEnvironment || 'development';
}

export const DEPLOYMENT_ENVIRONMENTS = new Set(['staging', 'production']);

/**
 * Resolve the payment/deployment target independently from NODE_ENV.
 *
 * DEPLOYMENT_ENV is the supported setting. RAILWAY_ENVIRONMENT_NAME (and its
 * older alias RAILWAY_ENVIRONMENT) is accepted only as a migration fallback;
 * callers must still validate the resolved value. Exact values are required
 * so a service/environment label such as "sailingloc-staging" is rejected
 * instead of being guessed.
 */
export function getDeploymentEnvironment({
  deploymentEnvironment = process.env.DEPLOYMENT_ENV,
  railwayEnvironmentName = process.env.RAILWAY_ENVIRONMENT_NAME,
  railwayEnvironment = process.env.RAILWAY_ENVIRONMENT,
} = {}) {
  const explicit = normalizeEnvironment(deploymentEnvironment);
  if (explicit) return explicit;

  return normalizeEnvironment(railwayEnvironmentName || railwayEnvironment);
}

// Load the mode-specific file after the base file. This also honours a
// NODE_ENV declared in .env instead of always loading .env.development.
const envModePath = path.resolve(process.cwd(), `.env.${getRuntimeEnvironment()}`);
dotenv.config({ path: envModePath, override: true });

const value = (name) => String(process.env[name] || '').trim();

export const PRODUCTION_LIKE_ENVS = new Set(['production', 'staging']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::', '::1', '0:0:0:0:0:0:0:1']);
// Keep the deployment mode finite. An unknown NODE_ENV must never silently
// fall through to development defaults (which can enable local integrations
// or weaker operational safeguards).
export const SUPPORTED_RUNTIME_ENVIRONMENTS = new Set([
  'development',
  'test',
  'staging',
  'production',
]);
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
      !isLocalHost(parsed.hostname)
    );
  } catch {
    return false;
  }
}

function normalizeHostname(hostname) {
  return String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '');
}

function ipv4Bytes(hostname) {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const bytes = parts.map(Number);
  return bytes.every((byte) => byte >= 0 && byte <= 255) ? bytes : null;
}

function mappedIpv4Bytes(hostname) {
  const matched = hostname.match(/^(?:::ffff:|0:0:0:0:0:ffff:)(.+)$/i);
  if (!matched) return null;
  const dotted = ipv4Bytes(matched[1]);
  if (dotted) return dotted;
  const words = matched[1].split(':');
  if (words.length !== 2 || words.some((word) => !/^[0-9a-f]{1,4}$/i.test(word))) return null;
  const [high, low] = words.map((word) => Number.parseInt(word, 16));
  return [high >> 8, high & 0xff, low >> 8, low & 0xff];
}

export function isLocalHost(hostname) {
  const normalized = normalizeHostname(hostname);
  const bytes = ipv4Bytes(normalized) || mappedIpv4Bytes(normalized);
  return (
    LOCAL_HOSTS.has(normalized) ||
    Boolean(bytes && (bytes[0] === 127 || bytes.every((byte) => byte === 0)))
  );
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

function isConfigFlagEnabled(value) {
  return (
    value === true ||
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

function trimOriginPath(pathname) {
  const value = String(pathname || '').replace(/\/+$/g, '');
  return value === '/' ? '' : value;
}

/**
 * Parse the configured backend origin used to build public asset URLs.
 * Express serves `/uploads` from the host root, so API paths are deliberately
 * rejected. Keeping this parser next to configuration validation ensures the
 * boot-time and runtime rules cannot diverge.
 */
export function parsePublicApiUrl(apiUrl, environment = getRuntimeEnvironment()) {
  const valueToParse = String(apiUrl || '').trim();
  if (!valueToParse) throw new Error('PUBLIC_API_URL est obligatoire.');

  let parsed;
  try {
    parsed = new URL(valueToParse);
  } catch {
    throw new Error('PUBLIC_API_URL est invalide.');
  }

  const env = String(environment || '')
    .trim()
    .toLowerCase();
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('PUBLIC_API_URL doit utiliser HTTP ou HTTPS.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(
      'PUBLIC_API_URL ne doit contenir ni identifiants, ni query string, ni fragment.'
    );
  }
  if (trimOriginPath(parsed.pathname)) {
    throw new Error('PUBLIC_API_URL doit être une origine sans chemin.');
  }
  if (
    PRODUCTION_LIKE_ENVS.has(env) &&
    (parsed.protocol !== 'https:' || isLocalHost(parsed.hostname))
  ) {
    throw new Error('PUBLIC_API_URL doit être une URL HTTPS publique.');
  }

  parsed.pathname = '';
  return parsed;
}

/**
 * Validate deployment-critical configuration. Development and tests retain
 * optional integrations, but production-like deployments fail closed instead
 * of silently falling back to insecure defaults.
 */
export function validateConfig(config, environment = getRuntimeEnvironment()) {
  const env = normalizeEnvironment(environment);
  const errors = [];
  const required = (name, currentValue) => {
    if (!currentValue) errors.push(`${name} est obligatoire`);
  };

  // NODE_ENV controls runtime hardening. DEPLOYMENT_ENV controls which
  // external payment account is allowed, so staging can run with
  // NODE_ENV=production without accepting live credentials.
  const hasDeploymentEnvironment = Object.prototype.hasOwnProperty.call(config, 'DEPLOYMENT_ENV');
  const hasRailwayEnvironmentName = Object.prototype.hasOwnProperty.call(
    config,
    'RAILWAY_ENVIRONMENT_NAME'
  );
  const hasRailwayEnvironment = Object.prototype.hasOwnProperty.call(config, 'RAILWAY_ENVIRONMENT');
  const deploymentEnvironment = getDeploymentEnvironment({
    deploymentEnvironment: hasDeploymentEnvironment
      ? config.DEPLOYMENT_ENV
      : process.env.DEPLOYMENT_ENV,
    railwayEnvironmentName: hasRailwayEnvironmentName
      ? config.RAILWAY_ENVIRONMENT_NAME
      : process.env.RAILWAY_ENVIRONMENT_NAME,
    railwayEnvironment: hasRailwayEnvironment
      ? config.RAILWAY_ENVIRONMENT
      : process.env.RAILWAY_ENVIRONMENT,
  });
  const railwayEnvironmentName = normalizeEnvironment(
    hasRailwayEnvironmentName
      ? config.RAILWAY_ENVIRONMENT_NAME
      : process.env.RAILWAY_ENVIRONMENT_NAME
  );
  const legacyRailwayEnvironment = normalizeEnvironment(
    hasRailwayEnvironment ? config.RAILWAY_ENVIRONMENT : process.env.RAILWAY_ENVIRONMENT
  );
  const railwayEnvironment = railwayEnvironmentName || legacyRailwayEnvironment;

  if (deploymentEnvironment && !DEPLOYMENT_ENVIRONMENTS.has(deploymentEnvironment)) {
    errors.push('DEPLOYMENT_ENV doit être staging ou production');
  }
  if (
    railwayEnvironmentName &&
    legacyRailwayEnvironment &&
    railwayEnvironmentName !== legacyRailwayEnvironment
  ) {
    errors.push('RAILWAY_ENVIRONMENT_NAME et RAILWAY_ENVIRONMENT sont contradictoires');
  }
  if (
    deploymentEnvironment &&
    railwayEnvironment &&
    DEPLOYMENT_ENVIRONMENTS.has(deploymentEnvironment) &&
    DEPLOYMENT_ENVIRONMENTS.has(railwayEnvironment) &&
    deploymentEnvironment !== railwayEnvironment
  ) {
    errors.push('DEPLOYMENT_ENV ne correspond pas à l’environnement Railway validé');
  }
  if (PRODUCTION_LIKE_ENVS.has(env) && !deploymentEnvironment) {
    errors.push('DEPLOYMENT_ENV est obligatoire pour un runtime de déploiement');
  }
  if (
    deploymentEnvironment &&
    DEPLOYMENT_ENVIRONMENTS.has(deploymentEnvironment) &&
    !PRODUCTION_LIKE_ENVS.has(env)
  ) {
    errors.push('NODE_ENV doit être staging ou production pour un déploiement strict');
  }
  if (env === 'staging' && deploymentEnvironment === 'production') {
    errors.push('NODE_ENV=staging est incompatible avec DEPLOYMENT_ENV=production');
  }

  if (!SUPPORTED_RUNTIME_ENVIRONMENTS.has(env)) {
    errors.push(
      `NODE_ENV doit être l'une des valeurs suivantes : ${[...SUPPORTED_RUNTIME_ENVIRONMENTS].join(
        ', '
      )}`
    );
  }
  const declaredEnvironment = normalizeEnvironment(config.NODE_ENV);
  if (declaredEnvironment && !SUPPORTED_RUNTIME_ENVIRONMENTS.has(declaredEnvironment)) {
    errors.push('NODE_ENV configuré est inconnu');
  } else if (declaredEnvironment && declaredEnvironment !== env) {
    errors.push('NODE_ENV ne correspond pas à l’environnement validé');
  }

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
  } else if (PRODUCTION_LIKE_ENVS.has(env)) {
    required('APP_URL', config.APP_URL);
    if (config.APP_URL && !isValidHttpsAppUrl(config.APP_URL)) {
      errors.push('APP_URL doit être une URL HTTPS publique sans identifiants');
    }
  } else if (config.APP_URL && !isValidDevelopmentAppUrl(config.APP_URL)) {
    errors.push('APP_URL doit être une URL HTTP(S) valide sans identifiants');
  }

  // Keep the production runtime's remaining integration checks intact. The
  // deployment target changes only the Stripe account mode; it must not turn
  // off webhook or email safeguards when NODE_ENV=production.
  if (env === 'production' || deploymentEnvironment === 'production') {
    required('STRIPE_WEBHOOK_SECRET', config.STRIPE_WEBHOOK_SECRET);
    if (
      config.STRIPE_WEBHOOK_SECRET &&
      !/^whsec_[A-Za-z0-9]+$/.test(config.STRIPE_WEBHOOK_SECRET)
    ) {
      errors.push('STRIPE_WEBHOOK_SECRET est invalide');
    }

    const hasMailgunKey = Boolean(config.MAILGUN_API_KEY);
    const hasMailgunDomain = Boolean(config.MAILGUN_DOMAIN);
    if (hasMailgunKey !== hasMailgunDomain) {
      errors.push('MAILGUN_API_KEY et MAILGUN_DOMAIN doivent être fournis ensemble');
    }
    if (!hasMailgunKey && !config.EMAIL_HOST) {
      errors.push('Une configuration Mailgun complète ou EMAIL_HOST est obligatoire');
    }
  }

  if (deploymentEnvironment === 'production') {
    required('STRIPE_SECRET_KEY', config.STRIPE_SECRET_KEY);
    // La cible production accepte les deux comptes Stripe : le déploiement de
    // démonstration tourne en runtime production avec une clé de test.
    if (
      config.STRIPE_SECRET_KEY &&
      !/^sk_(?:live|test)_[A-Za-z0-9]+$/.test(config.STRIPE_SECRET_KEY)
    ) {
      errors.push('STRIPE_SECRET_KEY doit être une clé Stripe sk_live_ ou sk_test_');
    }
  } else if (deploymentEnvironment === 'staging' && config.STRIPE_SECRET_KEY) {
    if (!/^sk_test_[A-Za-z0-9]+$/.test(config.STRIPE_SECRET_KEY)) {
      errors.push('STRIPE_SECRET_KEY doit être une clé Stripe test en staging');
    }
  }

  // Les fichiers publics sont servis par le backend, pas par le frontend.
  // Cette origine est donc distincte de APP_URL et doit être configurée
  // explicitement pour les environnements déployés.
  if (PRODUCTION_LIKE_ENVS.has(env)) required('PUBLIC_API_URL', config.PUBLIC_API_URL);
  if (config.PUBLIC_API_URL) {
    try {
      parsePublicApiUrl(config.PUBLIC_API_URL, env);
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (PRODUCTION_LIKE_ENVS.has(env) && isConfigFlagEnabled(config.ALLOW_LEGACY_CLEAR_FILE_READ)) {
    errors.push('ALLOW_LEGACY_CLEAR_FILE_READ doit être désactivé en staging et en production');
  }

  if (PRODUCTION_LIKE_ENVS.has(env) && isConfigFlagEnabled(config.EMAIL_IGNORE_TLS)) {
    errors.push('EMAIL_IGNORE_TLS doit être désactivé en staging et en production');
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
    // Stripe mode is tied to the deployment target, not the Node runtime.
    // Keep the legacy Railway marker in the resolver only as a migration
    // fallback; new deployments must set DEPLOYMENT_ENV explicitly.
    DEPLOYMENT_ENV: getDeploymentEnvironment(),
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
    // Origine publique du backend : les fichiers sous /uploads sont servis
    // par cette origine, jamais par APP_URL ni par l'en-tête Host de la requête.
    PUBLIC_API_URL:
      value('PUBLIC_API_URL') ||
      (PRODUCTION_LIKE_ENVS.has(environment) ? '' : 'http://localhost:4000'),
  };

  return validateConfig(config, environment);
}
