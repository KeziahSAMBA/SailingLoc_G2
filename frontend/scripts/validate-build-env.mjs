/*
 * Validate the public values that Vite is about to inline in the browser
 * bundle. This is intentionally a build-time check: changing a Railway
 * runtime variable cannot change an already-built static bundle.
 */

import { loadEnv } from 'vite';

const PRODUCTION_LIKE_ENVIRONMENTS = new Set(['production', 'staging']);
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const buildEnvironment = String(process.env.VITE_BUILD_ENV || process.env.NODE_ENV || 'production')
  .trim()
  .toLowerCase();
const fileEnv = loadEnv(buildEnvironment, process.cwd(), 'VITE_');
const value = String(process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL || '').trim();
const isRailwayBuild = Boolean(
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID
);
const productionLike = PRODUCTION_LIKE_ENVIRONMENTS.has(buildEnvironment) || isRailwayBuild;

function fail(message) {
  // Never include the configured URL in diagnostics: public values can still
  // contain deployment details that should not be copied into build logs.
  console.error(`[frontend build] ${message}`);
  process.exit(1);
}

if (!value) {
  if (productionLike) {
    fail('VITE_API_BASE_URL est obligatoire pour un build de déploiement.');
  }
  process.exit(0);
}

let parsed;
try {
  parsed = new URL(value);
} catch {
  fail('VITE_API_BASE_URL doit être une URL HTTP(S) valide.');
}

if (
  !['http:', 'https:'].includes(parsed.protocol) ||
  parsed.username ||
  parsed.password ||
  parsed.search ||
  parsed.hash
) {
  fail('VITE_API_BASE_URL doit être une URL HTTP(S) sans identifiants, query ou fragment.');
}

if (productionLike) {
  if (parsed.protocol !== 'https:') {
    fail('VITE_API_BASE_URL doit utiliser HTTPS pour staging et production.');
  }
  if (LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
    fail('VITE_API_BASE_URL ne peut pas cibler un hôte local pour un déploiement.');
  }
}
