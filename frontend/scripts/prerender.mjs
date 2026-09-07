import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, preview } from 'vite';
import { isProductionLike } from '../src/security/apiOrigin.js';
import { PUBLIC_PATHS } from '../src/utils/seoMetadata.js';

const DEFAULT_SITE_ORIGIN = 'https://dsp-dev-o24a-g2.com';
const SYSTEM_CHROMIUM_CANDIDATES = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
];
const NAVIGATION_TIMEOUT = 20000;
const RENDER_TIMEOUT = 15000;
const SETTLE_DELAY = 1500;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDirectory, '..');
const distDirectory = path.join(frontendRoot, 'dist');
const shellPath = path.join(distDirectory, 'index.html');
const fallbackPath = path.join(distDirectory, 'app.html');
const sitemapPath = path.join(distDirectory, 'sitemap.xml');

const buildEnvironment = String(process.env.VITE_BUILD_ENV || process.env.NODE_ENV || 'production')
  .trim()
  .toLowerCase();
const railwayBuild = Boolean(
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_PROJECT_ID
);
const fileEnv = loadEnv(buildEnvironment, frontendRoot, 'VITE_');
const productionLike = isProductionLike(buildEnvironment, railwayBuild);

function report(message) {
  console.log(`[frontend prerender] ${message}`);
}

function fail(message) {
  console.error(`[frontend prerender] ${message}`);
  process.exit(1);
}

function validatedSiteOrigin(value) {
  const trimmed = String(value || '')
    .trim()
    .replace(/\/+$/, '');
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('VITE_SITE_ORIGIN doit être une URL absolue.');
  }
  if (url.protocol !== 'https:' || url.origin !== trimmed || url.username || url.password) {
    throw new Error('VITE_SITE_ORIGIN doit être une origine HTTPS, sans chemin ni identifiants.');
  }
  return url.origin;
}

function renderSitemap(siteOrigin, routePaths) {
  const entries = routePaths
    .map(
      (routePath) =>
        `  <url>\n    <loc>${new URL(routePath, siteOrigin).toString()}</loc>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function withSiteOrigin(html, previewOrigin, siteOrigin) {
  const encodedPreview = encodeURIComponent(previewOrigin);
  const encodedSite = encodeURIComponent(siteOrigin);
  return html
    .split(previewOrigin)
    .join(siteOrigin)
    .split(encodedPreview)
    .join(encodedSite)
    .split(encodedPreview.toLowerCase())
    .join(encodedSite);
}

function assertRewritten(routePath, html, previewOrigin) {
  const { host } = new URL(previewOrigin);
  const leaks = [host, host.replace(':', '%3A'), host.replace(':', '%3a')];
  if (leaks.some((leak) => html.includes(leak))) {
    throw new Error(`${routePath} : l’origine de pré-rendu subsiste dans le HTML.`);
  }
}

function outputPathFor(routePath) {
  if (routePath === '/') return shellPath;
  return path.join(distDirectory, `${routePath.slice(1)}.html`);
}

function write(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, { encoding: 'utf8', mode: 0o644 });
}

async function capture(browser, previewOrigin, routePath) {
  const page = await browser.newPage();
  page.setDefaultTimeout(RENDER_TIMEOUT);
  try {
    await page.goto(new URL(routePath, previewOrigin).toString(), {
      waitUntil: 'load',
      timeout: NAVIGATION_TIMEOUT,
    });
    await page
      .waitForFunction(() => document.getElementById('root')?.childElementCount > 0, null, {
        timeout: RENDER_TIMEOUT,
      })
      .catch(() => report(`${routePath} : rendu incomplet, capture de l’état courant.`));
    await page.waitForTimeout(SETTLE_DELAY);
    return await page.content();
  } finally {
    await page.close();
  }
}

function resolveChromiumPath() {
  const configured = String(process.env.PRERENDER_CHROMIUM_PATH || '').trim();
  if (configured) return configured;
  return SYSTEM_CHROMIUM_CANDIDATES.find((candidate) => fs.existsSync(candidate));
}

async function loadChromium() {
  const { chromium } = await import('playwright');
  return chromium.launch({
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}

async function main() {
  if (!fs.existsSync(shellPath)) {
    fail('dist/index.html est absent : lancer « vite build » avant le pré-rendu.');
  }

  let siteOrigin;
  try {
    siteOrigin = validatedSiteOrigin(
      process.env.VITE_SITE_ORIGIN || fileEnv.VITE_SITE_ORIGIN || DEFAULT_SITE_ORIGIN
    );
  } catch (error) {
    fail(error.message);
  }

  const routePaths = [...PUBLIC_PATHS];
  write(sitemapPath, renderSitemap(siteOrigin, routePaths));
  report(`sitemap.xml généré pour ${routePaths.length} routes.`);

  const shell = fs.readFileSync(shellPath, 'utf8');

  let browser;
  try {
    browser = await loadChromium();
  } catch (error) {
    const message = `Chromium indisponible (${error.message.split('\n')[0]}).`;
    const hint = 'Indiquer un navigateur avec PRERENDER_CHROMIUM_PATH=/chemin/vers/chromium.';
    if (productionLike) fail(`${message} Le pré-rendu est obligatoire pour ce build. ${hint}`);
    report(`${message} Pré-rendu ignoré, le bundle reste en rendu client. ${hint}`);
    return;
  }

  const server = await preview({
    root: frontendRoot,
    logLevel: 'warn',
    preview: { host: '127.0.0.1', port: 4183, strictPort: false },
  });
  const previewOrigin = new URL(server.resolvedUrls.local[0]).origin;

  const rendered = new Map();
  try {
    for (const routePath of routePaths) {
      const captured = await capture(browser, previewOrigin, routePath);
      const html = withSiteOrigin(captured, previewOrigin, siteOrigin);
      assertRewritten(routePath, html, previewOrigin);
      rendered.set(routePath, html);
    }
  } catch (error) {
    fail(`Échec du pré-rendu : ${error.message.split('\n')[0]}`);
  } finally {
    await browser.close();
    await server.close();
  }

  write(fallbackPath, shell);
  for (const [routePath, html] of rendered) {
    write(outputPathFor(routePath), html);
  }
  report(`${rendered.size} routes pré-rendues, app.html conservé comme coquille SPA.`);
}

main().catch((error) => fail(error.message));
