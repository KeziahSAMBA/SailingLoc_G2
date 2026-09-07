import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, preview } from 'vite';
import { isProductionLike } from '../src/security/apiOrigin.js';
import { PUBLIC_PATHS } from '../src/utils/seoMetadata.js';
import { DEFAULT_SITE_ORIGIN, renderSitemap, validatedSiteOrigin } from './sitemap.mjs';

const SYSTEM_CHROMIUM_CANDIDATES = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
];
const NAVIGATION_TIMEOUT = 20000;
const RENDER_TIMEOUT = 15000;
const SETTLE_DELAY = 1500;
const GATE_TIMEOUT = 10000;
const QUIET_PERIOD = 900;
const QUIET_TIMEOUT = 20000;
const GATE_SELECTOR = 'div[role="status"][aria-live="polite"].fixed.inset-0';

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
  const encodedHost = encodeURIComponent(host);
  const leaks = [host, encodedHost, encodedHost.toLowerCase()];
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

function apiOriginFromEnv() {
  const raw = String(process.env.VITE_API_BASE_URL || fileEnv.VITE_API_BASE_URL || '').trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

async function allowApiRequests(page, apiOrigin, previewOrigin) {
  const corsHeaders = {
    'access-control-allow-origin': previewOrigin,
    'access-control-allow-credentials': 'true',
  };

  await page.route(
    (url) => url.origin === apiOrigin,
    async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            ...corsHeaders,
            'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'access-control-allow-headers':
              request.headers()['access-control-request-headers'] || 'content-type',
          },
        });
        return;
      }

      try {
        const forwarded = { ...request.headers() };
        delete forwarded.origin;
        delete forwarded.referer;
        const response = await route.fetch({ headers: forwarded });
        const headers = { ...response.headers(), ...corsHeaders };
        delete headers['content-encoding'];
        delete headers['content-length'];
        await route.fulfill({ response, headers });
      } catch {
        await route.abort();
      }
    }
  );
}

async function capture(browser, previewOrigin, routePath, apiOrigin) {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(RENDER_TIMEOUT);
  if (apiOrigin) await allowApiRequests(page, apiOrigin, previewOrigin);
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
    await page
      .evaluate(waitForQuietDom, { quietPeriod: QUIET_PERIOD, timeout: QUIET_TIMEOUT })
      .catch(() =>
        report(`${routePath} : le DOM n’a pas cessé de changer, capture de l’état courant.`)
      );
    await page
      .waitForFunction((selector) => !document.querySelector(selector), GATE_SELECTOR, {
        timeout: GATE_TIMEOUT,
      })
      .catch(() =>
        report(`${routePath} : écran de chargement encore affiché, il est retiré de la capture.`)
      );
    await page.evaluate((selector) => {
      document.querySelectorAll(selector).forEach((node) => node.remove());
    }, GATE_SELECTOR);
    await page.evaluate(() => {
      document.querySelectorAll('script[src], iframe[src]').forEach((node) => {
        const raw = node.getAttribute('src') || '';
        if (!/^https?:/i.test(raw)) return;
        if (new URL(raw, document.baseURI).origin !== window.location.origin) node.remove();
      });
    });
    return await page.content();
  } finally {
    await page.close();
  }
}

function waitForQuietDom({ quietPeriod, timeout }) {
  return new Promise((resolve) => {
    let timer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(finish, quietPeriod);
    });
    function finish() {
      clearTimeout(deadline);
      observer.disconnect();
      resolve();
    }
    const deadline = setTimeout(finish, timeout);
    timer = setTimeout(finish, quietPeriod);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  });
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

  const apiOrigin = apiOriginFromEnv();
  report(
    apiOrigin
      ? `appels API relayés vers ${apiOrigin} pour contourner le CORS du pré-rendu.`
      : 'VITE_API_BASE_URL absente : les pages dépendant de l’API seront pré-rendues sans données.'
  );

  const rendered = new Map();
  try {
    for (const routePath of routePaths) {
      const captured = await capture(browser, previewOrigin, routePath, apiOrigin);
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
