import { chromium } from 'playwright';

const BASE_URL = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:5173';
const STORAGE_KEY = 'sailingloc:visual-preferences:v1';
const CONSENT_KEY = 'sailingloc_cookie_consent';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rgbChannels(value) {
  return value
    .match(/[\d.]+/gu)
    .slice(0, 3)
    .map(Number);
}

function luminance(rgb) {
  return rgb
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(first, second) {
  const values = [luminance(rgbChannels(first)), luminance(rgbChannels(second))];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript(
  ({ consentKey, storageKey }) => {
    localStorage.setItem(
      consentKey,
      JSON.stringify({
        version: 2,
        date: new Date().toISOString(),
        purposes: { analytics: false, ads: false, personalization: false },
      })
    );
    if (!sessionStorage.getItem('sailingloc-visual-test-initialized')) {
      localStorage.removeItem(storageKey);
      sessionStorage.setItem('sailingloc-visual-test-initialized', '1');
    }
  },
  { consentKey: CONSENT_KEY, storageKey: STORAGE_KEY }
);

const page = await context.newPage();
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.locator('main').waitFor({ state: 'visible' });
await page
  .locator('[role="status"].fixed.inset-0')
  .waitFor({ state: 'hidden', timeout: 15_000 })
  .catch(() => {});

const readVisualState = () =>
  page.evaluate((storageKey) => {
    const styles = getComputedStyle(document.documentElement);
    const bodyStyles = getComputedStyle(document.body);
    return {
      theme: document.documentElement.dataset.sailinglocTheme,
      colorVision: document.documentElement.dataset.sailinglocColorVision,
      page: styles.getPropertyValue('--sl-page').trim(),
      surface: styles.getPropertyValue('--sl-surface').trim(),
      success: styles.getPropertyValue('--sl-success').trim(),
      info: styles.getPropertyValue('--sl-info').trim(),
      bodyBackground: bodyStyles.backgroundColor,
      bodyColor: bodyStyles.color,
      stored: JSON.parse(localStorage.getItem(storageKey)),
    };
  }, STORAGE_KEY);

const settings = page.locator('button[aria-label="Paramètres"]:visible').first();
const clickSettings = () => settings.evaluate((button) => button.click());
assert(
  (await settings.getAttribute('aria-expanded')) === 'false',
  'Le panneau doit rester fermé au chargement.'
);
assert(
  (await page.locator('[data-visual-settings-panel]').count()) === 0,
  'Un panneau fermé ne doit pas rester dans le DOM interactif.'
);
await clickSettings();
await page
  .getByRole('button', { name: 'Mode sombre' })
  .first()
  .evaluate((button) => button.click());

async function assertResponsiveSettingsPanel(width, scrollY) {
  await page.setViewportSize({ width, height: 800 });
  await page.evaluate((top) => scrollTo(0, top), scrollY);
  await page.waitForTimeout(350);
  const panel = page.locator('[data-visual-settings-panel]');
  await panel.waitFor({ state: 'visible' });
  const metrics = await page.evaluate(() => {
    const header = document.querySelector('header');
    const bar = document.querySelector('[data-header-bar]');
    const panel = document.querySelector('[data-visual-settings-panel]');
    const spacer = document.querySelector('[data-header-settings-spacer]');
    const panelRect = panel?.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect();
    const barRect = bar?.getBoundingClientRect();
    const spacerRect = spacer?.getBoundingClientRect();
    const backgroundRect = header?.firstElementChild?.getBoundingClientRect();
    const panelStyles = panel ? getComputedStyle(panel) : null;
    const focusedControl = panel?.querySelector('button');
    focusedControl?.focus();
    const focusedStyles = focusedControl ? getComputedStyle(focusedControl) : null;
    return {
      panelPosition: panel ? getComputedStyle(panel).position : null,
      panelLeft: panelRect?.left,
      panelRight: panelRect?.right,
      headerHeight: headerRect?.height,
      barHeight: barRect?.height,
      spacerHeight: spacerRect?.height,
      viewportWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      backgroundHeight: backgroundRect?.height,
      panelBackground: panelStyles?.backgroundColor,
      panelColor: focusedStyles?.color,
      focusColor: focusedStyles?.outlineColor,
    };
  });

  assert(metrics.panelPosition === 'static', `Le panneau ${width}px doit rester dans le flux.`);
  assert(metrics.panelLeft >= 8, `Le panneau ${width}px sort par la gauche.`);
  assert(
    metrics.panelRight <= metrics.viewportWidth - 8,
    `Le panneau ${width}px sort par la droite.`
  );
  assert(metrics.headerHeight > metrics.barHeight, `Le header ${width}px ne grandit pas.`);
  assert(
    Math.abs(metrics.spacerHeight - (metrics.headerHeight - metrics.barHeight)) < 1,
    `Le contenu ${width}px n'est pas poussé par la hauteur du panneau.`
  );
  assert(
    metrics.scrollWidth <= metrics.viewportWidth + 1,
    `Le panneau ${width}px provoque un défilement horizontal.`
  );
  assert(
    Math.abs(metrics.backgroundHeight - metrics.barHeight) < 1,
    `Le fond du header ${width}px/${scrollY}px déborde derrière le panneau.`
  );
  assert(
    contrast(metrics.panelColor, metrics.panelBackground) >= 4.5,
    `Contraste texte du panneau insuffisant à ${width}px/${scrollY}px.`
  );
  assert(
    contrast(metrics.focusColor, metrics.panelBackground) >= 3,
    `Contraste focus du panneau insuffisant à ${width}px/${scrollY}px.`
  );
}

for (const width of [320, 375, 639, 640, 768, 1023, 1024, 1279, 1280, 1440]) {
  for (const scrollY of [0, 200]) await assertResponsiveSettingsPanel(width, scrollY);
}

await page.setViewportSize({ width: 1280, height: 800 });
await clickSettings();
assert(
  (await settings.getAttribute('aria-expanded')) === 'false',
  'Le second clic doit fermer le panneau.'
);
await settings.focus();
await settings.press('Enter');
await page.locator('[data-visual-settings-panel]').waitFor({ state: 'visible' });
await page.keyboard.press('Escape');
assert((await settings.getAttribute('aria-expanded')) === 'false', 'Echap doit fermer le panneau.');
assert(
  await settings.evaluate((element) => element === document.activeElement),
  'Echap doit restituer le focus au bouton Paramètres.'
);
await clickSettings();

let state = await readVisualState();
assert(state.theme === 'dark', 'Le clic doit activer le thème sombre.');
assert(state.page === '2 6 23', `La page sombre attend 2 6 23, reçu ${state.page}.`);
assert(state.surface === '15 23 42', `La surface sombre attend 15 23 42, reçu ${state.surface}.`);

const expectedProfiles = {
  protanopia: '139 227 185',
  deuteranopia: '86 180 233',
  tritanopia: '86 197 150',
};

for (const [profile, expectedSuccess] of Object.entries(expectedProfiles)) {
  const glasses = page.getByRole('button', { name: 'Mode daltonien' }).first();
  if ((await glasses.getAttribute('aria-expanded')) !== 'true')
    await glasses.evaluate((button) => button.click());
  const label = {
    protanopia: 'Protanopie',
    deuteranopia: 'Deutéranopie',
    tritanopia: 'Tritanopie',
  }[profile];
  await page
    .getByRole('button', { name: label })
    .first()
    .evaluate((button) => button.click());
  state = await readVisualState();
  assert(state.theme === 'dark', `Le profil ${profile} doit se combiner au thème sombre.`);
  assert(state.colorVision === profile, `Le profil ${profile} doit être actif.`);
  assert(
    state.success === expectedSuccess,
    `Le succès ${profile} attend ${expectedSuccess}, reçu ${state.success}.`
  );
}

await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('main').waitFor({ state: 'visible' });
state = await readVisualState();
assert(
  state.theme === 'dark' && state.colorVision === 'tritanopia',
  'Le reload doit persister la combinaison.'
);
assert(
  state.page === '31 12 3' && state.success === '86 197 150',
  'Le reload doit restaurer les couleurs calculées.'
);

const combinations = [];
for (const theme of ['light', 'dark']) {
  for (const colorVision of ['standard', 'protanopia', 'deuteranopia', 'tritanopia']) {
    await page.evaluate(
      ({ storageKey, theme, colorVision }) => {
        localStorage.setItem(storageKey, JSON.stringify({ theme, colorVision }));
      },
      { storageKey: STORAGE_KEY, theme, colorVision }
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor({ state: 'visible' });
    const combination = await readVisualState();
    assert(combination.theme === theme, `Thème ${theme} non appliqué.`);
    assert(combination.colorVision === colorVision, `Profil ${colorVision} non appliqué.`);
    combinations.push(combination);
  }
}
for (const theme of ['light', 'dark']) {
  assert(
    new Set(
      combinations
        .filter((item) => item.theme === theme)
        .map((item) => `${item.success}/${item.info}/${item.page}`)
    ).size === 4,
    `Les quatre profils ${theme} doivent produire quatre couleurs sémantiques distinctes.`
  );
}
assert(
  new Set(combinations.map((item) => `${item.bodyBackground}/${item.bodyColor}`)).size === 8,
  'Les huit combinaisons doivent produire huit styles structurels distincts.'
);

// Second clic sur un profil actif : retour au standard.
await clickSettings();
const glassesButton = page.getByRole('button', { name: /daltonien/i }).first();
await glassesButton.evaluate((button) => button.click());
await page
  .getByRole('button', { name: /Tritanopie/i })
  .first()
  .evaluate((button) => button.click());
state = await readVisualState();
assert(state.colorVision === 'standard', 'Le second clic profil doit revenir au standard.');

// Le clic extérieur ferme le panneau comme Échap, déjà vérifié plus haut.
if ((await settings.getAttribute('aria-expanded')) !== 'true') await clickSettings();
await page.locator('main').click({ position: { x: 2, y: 2 }, force: true });
assert(
  (await settings.getAttribute('aria-expanded')) === 'false',
  'Le clic extérieur doit fermer.'
);

// Une écriture réelle dans un second onglet doit être propagée par l'événement storage.
const secondPage = await context.newPage();
await secondPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await secondPage.locator('main').waitFor({ state: 'visible' });
await secondPage.evaluate((storageKey) => {
  localStorage.setItem(storageKey, JSON.stringify({ theme: 'dark', colorVision: 'deuteranopia' }));
}, STORAGE_KEY);
await page.waitForFunction(
  () =>
    document.documentElement.dataset.sailinglocTheme === 'dark' &&
    document.documentElement.dataset.sailinglocColorVision === 'deuteranopia'
);
await secondPage.close();

// Une fenêtre de 640/320 CSS px simule le reflow attendu à 200/400 % depuis 1280 px.
for (const [width, zoom] of [
  [640, 200],
  [320, 400],
]) {
  await page.setViewportSize({ width, height: 900 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(overflow <= 1, `Défilement horizontal au reflow ${zoom} %: ${overflow}px.`);
}

await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
const systemState = await page.evaluate(() => {
  const probe = document.querySelector('[class*="animate-"]');
  const media = [...document.querySelectorAll('img, video, picture, canvas, .leaflet-tile')];
  return {
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    forced: matchMedia('(forced-colors: active)').matches,
    animationDuration: probe ? getComputedStyle(probe).animationDuration : null,
    filteredMedia: media.filter((element) => getComputedStyle(element).filter !== 'none').length,
    brokenImages: [...document.images].filter(
      (image) => image.complete && image.currentSrc && image.naturalWidth === 0
    ).length,
  };
});
assert(systemState.reduced, 'La réduction des mouvements doit être émulée.');
assert(systemState.forced, 'Les couleurs forcées doivent être émulées.');
if (systemState.animationDuration)
  assert(systemState.animationDuration === '0.01ms', 'Une animation reste active en mode réduit.');
assert(systemState.filteredMedia === 0, 'Un média ou une tuile est filtré.');
assert(systemState.brokenImages === 0, 'Une image chargée est cassée.');

await browser.close();
console.log('Préférences visuelles interactives : OK');
