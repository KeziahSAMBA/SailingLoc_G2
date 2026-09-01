/*
 * Validate values Vite embeds in the browser bundle, then render the Nginx
 * policy from the exact validated API origin for deployment images.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from 'vite';
import {
  isProductionLike,
  renderNginxConfig,
  validatedApiOrigin,
} from './build-security-config.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, '..');
const buildEnvironment = String(process.env.VITE_BUILD_ENV || process.env.NODE_ENV || 'production')
  .trim()
  .toLowerCase();
const fileEnv = loadEnv(buildEnvironment, frontendRoot, 'VITE_');
const value = String(process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL || '').trim();
const railwayBuild = Boolean(
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID
);

function fail(message) {
  // Never include the configured URL in diagnostics.
  console.error(`[frontend build] ${message}`);
  process.exit(1);
}

let apiOrigin;
try {
  apiOrigin = validatedApiOrigin(value, {
    environment: buildEnvironment,
    railwayBuild,
  });
} catch (error) {
  fail(error.message);
}

if (isProductionLike(buildEnvironment, railwayBuild)) {
  try {
    const templatePath = path.join(frontendRoot, 'nginx.conf');
    const outputDirectory = path.join(frontendRoot, '.generated');
    const outputPath = path.join(outputDirectory, 'default.conf');
    const template = fs.readFileSync(templatePath, 'utf8');
    const rendered = renderNginxConfig(template, apiOrigin);
    fs.mkdirSync(outputDirectory, { recursive: true });
    fs.writeFileSync(outputPath, rendered, { encoding: 'utf8', mode: 0o644 });
  } catch (error) {
    fail(error.message);
  }
}
