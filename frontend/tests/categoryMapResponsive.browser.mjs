import { chromium } from 'playwright';

const BASE_URL = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:5173';
const STORAGE_KEY = 'sailingloc:visual-preferences:v1';
const CONSENT_KEY = 'sailingloc_cookie_consent';
const TABLET_WIDTHS = [640, 768, 820, 912, 1024, 1180, 1279];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForVisualStability(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(350);
}

async function readLayout(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };
    const searchSection = [...document.querySelectorAll('main section')].find(
      (element) => element.className.includes('fixed') || element.className.includes('sticky')
    );
    const searchForm = document.querySelector('main form');
    const mapPanel = document.querySelector('.category-map-panel');
    const mapWrapper = mapPanel?.firstElementChild;
    const mapCanvas = document.querySelector('.category-map-canvas');
    const panel = mapPanel?.querySelector('.leaflet-container')?.closest('.overflow-hidden');

    return {
      viewport: { width: innerWidth, height: innerHeight },
      searchSection: rect(searchSection),
      searchForm: rect(searchForm),
      mapPanel: rect(mapPanel),
      mapWrapper: rect(mapWrapper),
      mapCanvas: rect(mapCanvas),
      mapContainer: rect(document.querySelector('.leaflet-container')),
      mapPanelOverflow: panel ? getComputedStyle(panel).overflow : null,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

async function openCategory(page, theme) {
  await page.goto(new URL('/', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ storageKey, nextTheme }) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ theme: nextTheme, colorVision: 'standard' })
      );
    },
    { storageKey: STORAGE_KEY, nextTheme: theme }
  );
  await page.goto(new URL('/categorie', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.locator('main').waitFor({ state: 'visible' });
  await page.locator('.category-map-panel').waitFor({ state: 'visible', timeout: 15_000 });
  await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 15_000 });
  await waitForVisualStability(page);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1024, height: 800 } });
await context.addInitScript(
  ({ consentKey }) => {
    localStorage.setItem(
      consentKey,
      JSON.stringify({
        version: 2,
        date: new Date().toISOString(),
        purposes: { analytics: false, ads: false, personalization: false },
      })
    );
  },
  { consentKey: CONSENT_KEY }
);

const page = await context.newPage();

try {
  for (const theme of ['light', 'dark']) {
    await openCategory(page, theme);

    for (const width of TABLET_WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await waitForVisualStability(page);
      const layout = await readLayout(page);
      const lowerEdge = Math.max(layout.searchSection?.bottom ?? 0, layout.searchForm?.bottom ?? 0);

      assert(
        layout.mapPanel?.top >= lowerEdge - 1,
        `${theme} ${width}px: le panneau cartographique recouvre la recherche (${layout.mapPanel?.top} < ${lowerEdge}).`
      );
      assert(
        layout.mapWrapper?.top >= lowerEdge - 1,
        `${theme} ${width}px: l'en-tête de la carte recouvre la recherche (${layout.mapWrapper?.top} < ${lowerEdge}).`
      );
      assert(
        layout.mapCanvas?.top >= lowerEdge - 1,
        `${theme} ${width}px: le plan recouvre la recherche (${layout.mapCanvas?.top} < ${lowerEdge}).`
      );
      assert(
        layout.scrollWidth <= layout.viewport.width + 1,
        `${theme} ${width}px: débordement horizontal détecté (${layout.scrollWidth - layout.viewport.width}px).`
      );
    }
  }

  // À partir de xl, la grille desktop reste latérale : ce test vérifie seulement
  // qu'elle conserve sa géométrie et qu'elle ne crée pas de débordement.
  await page.setViewportSize({ width: 1280, height: 800 });
  await waitForVisualStability(page);
  const desktop = await readLayout(page);
  assert(
    desktop.scrollWidth <= desktop.viewport.width + 1,
    `1280px: débordement horizontal desktop (${desktop.scrollWidth - desktop.viewport.width}px).`
  );
} finally {
  await browser.close();
}

console.log('Responsive recherche/carte : OK');
