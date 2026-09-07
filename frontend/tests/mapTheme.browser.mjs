import { chromium } from 'playwright';

const BASE_URL = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:5173';
const STORAGE_KEY = 'sailingloc:visual-preferences:v1';
const CONSENT_KEY = 'sailingloc_cookie_consent';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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

async function setTheme(theme) {
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
  await page.locator('.leaflet-container').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page
    .locator('.leaflet-container img.leaflet-tile')
    .first()
    .waitFor({ state: 'attached', timeout: 15_000 });
  await page.waitForTimeout(800);
}

async function readMapLayers() {
  return page.evaluate(() => {
    const map = document.querySelector('.leaflet-container');
    const layers = [...(map?.querySelectorAll('.leaflet-layer') ?? [])]
      .map((layer) => ({
        zIndex: getComputedStyle(layer).zIndex,
        urls: [...layer.querySelectorAll('img.leaflet-tile')].map(
          (tile) => tile.currentSrc || tile.src
        ),
      }))
      .filter(({ urls }) => urls.length > 0);
    const tiles = [...(map?.querySelectorAll('img.leaflet-tile') ?? [])];
    const labelTiles = tiles.filter((tile) => tile.closest('.leaflet-layer.sailingloc-map-labels'));
    const baseTiles = tiles.filter((tile) => !tile.closest('.leaflet-layer.sailingloc-map-labels'));
    return {
      layers,
      filteredTiles: tiles.filter((tile) => getComputedStyle(tile).filter !== 'none').length,
      labelTiles: labelTiles.length,
      labelFilteredTiles: labelTiles.filter((tile) => getComputedStyle(tile).filter === 'invert(1)')
        .length,
      baseFilteredTiles: baseTiles.filter((tile) => getComputedStyle(tile).filter !== 'none')
        .length,
    };
  });
}

try {
  await setTheme('dark');
  const dark = await readMapLayers();
  const darkUrls = dark.layers.flatMap(({ urls }) => urls);
  assert(dark.layers.length === 2, 'Le mode sombre doit charger deux couches de tuiles.');
  assert(
    darkUrls.some((url) => url.includes('/dark_nolabels/')),
    'Le fond sombre sans libellés est absent.'
  );
  assert(
    darkUrls.some((url) => url.includes('/light_only_labels/')),
    'La couche de libellés clairs est absente.'
  );
  assert(
    dark.layers.some(({ zIndex }) => zIndex === '10'),
    'La couche de libellés clairs doit être au-dessus du fond.'
  );
  assert(dark.labelTiles > 0, 'Les tuiles de libellés doivent porter la classe dédiée.');
  assert(
    dark.labelFilteredTiles === dark.labelTiles,
    'Seules les tuiles de libellés doivent recevoir le filtre inverse.'
  );
  assert(dark.baseFilteredTiles === 0, 'Une tuile de fond sombre est filtrée.');
  assert(!darkUrls.some((url) => url.includes('dark_all')), 'L’ancien fond sombre est chargé.');
  assert(
    dark.filteredTiles === dark.labelFilteredTiles,
    'Le nombre de tuiles filtrées doit correspondre uniquement aux libellés.'
  );

  await setTheme('light');
  const light = await readMapLayers();
  const lightUrls = light.layers.flatMap(({ urls }) => urls);
  assert(light.layers.length === 1, 'Le mode clair doit charger une seule couche de tuiles.');
  assert(
    lightUrls.length > 0 && lightUrls.every((url) => url.includes('/rastertiles/voyager/')),
    'Le mode clair doit utiliser uniquement Voyager.'
  );
  assert(
    !lightUrls.some(
      (url) => url.includes('/dark_nolabels/') || url.includes('/light_only_labels/')
    ),
    'Une couche sombre reste chargée en mode clair.'
  );
  assert(!lightUrls.some((url) => url.includes('dark_all')), 'Le fond sombre est chargé en clair.');
  assert(light.filteredTiles === 0, 'Une tuile claire est filtrée.');
  assert(light.labelTiles === 0, 'La couche de libellés sombres reste chargée en clair.');
} finally {
  await browser.close();
}

console.log('Thème des couches cartographiques : OK');
