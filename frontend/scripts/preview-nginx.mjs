import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderNginxConfig } from './build-security-config.mjs';

const DEFAULT_API_ORIGIN = 'https://api.dsp-dev-o24a-g2.com';
const IMAGE = 'nginxinc/nginx-unprivileged:1.27-alpine';
const PORT = process.env.PREVIEW_PORT || '4180';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, '..');
const distDirectory = path.join(frontendRoot, 'dist');
const generatedDirectory = path.join(frontendRoot, '.generated');
const configPath = path.join(generatedDirectory, 'preview.conf');

function fail(message) {
  console.error(`[frontend preview] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(distDirectory, 'app.html'))) {
  fail('dist/app.html est absent : lancer « npm run build » avant la prévisualisation.');
}

let rendered;
try {
  rendered = renderNginxConfig(
    fs.readFileSync(path.join(frontendRoot, 'nginx.conf'), 'utf8'),
    process.env.PREVIEW_API_ORIGIN || DEFAULT_API_ORIGIN
  );
} catch (error) {
  fail(error.message);
}

fs.mkdirSync(generatedDirectory, { recursive: true });
fs.writeFileSync(configPath, rendered, { encoding: 'utf8', mode: 0o644 });

console.log(`[frontend preview] http://127.0.0.1:${PORT} — Ctrl+C pour arrêter`);

const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '-p',
    `127.0.0.1:${PORT}:8080`,
    '-v',
    `${distDirectory}:/usr/share/nginx/html:ro`,
    '-v',
    `${configPath}:/etc/nginx/conf.d/default.conf:ro`,
    IMAGE,
  ],
  { stdio: 'inherit' }
);

if (result.error) fail(result.error.message);
process.exit(result.status ?? 0);
