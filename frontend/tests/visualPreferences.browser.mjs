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

const readVisualState = () =>
  page.evaluate((storageKey) => {
    const styles = getComputedStyle(document.documentElement);
    return {
      theme: document.documentElement.dataset.sailinglocTheme,
      colorVision: document.documentElement.dataset.sailinglocColorVision,
      page: styles.getPropertyValue('--sl-page').trim(),
      surface: styles.getPropertyValue('--sl-surface').trim(),
      success: styles.getPropertyValue('--sl-success').trim(),
      stored: JSON.parse(localStorage.getItem(storageKey)),
    };
  }, STORAGE_KEY);

const settings = page.getByRole('button', { name: 'Paramètres' }).first();
await settings.click();
await page.getByRole('button', { name: 'Mode sombre' }).first().click();

let state = await readVisualState();
assert(state.theme === 'dark', 'Le clic doit activer le thème sombre.');
assert(state.page === '2 6 23', `La page sombre attend 2 6 23, reçu ${state.page}.`);
assert(state.surface === '15 23 42', `La surface sombre attend 15 23 42, reçu ${state.surface}.`);

const expectedProfiles = {
  protanopia: '94 208 242',
  deuteranopia: '103 183 255',
  tritanopia: '82 214 162',
};

for (const [profile, expectedSuccess] of Object.entries(expectedProfiles)) {
  const glasses = page.getByRole('button', { name: 'Mode daltonien' }).first();
  if ((await glasses.getAttribute('aria-expanded')) !== 'true')
    await glasses.click({ force: true });
  const label = {
    protanopia: 'Protanopie',
    deuteranopia: 'Deutéranopie',
    tritanopia: 'Tritanopie',
  }[profile];
  await page.getByRole('button', { name: label }).first().click({ force: true });
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
  state.page === '2 6 23' && state.success === '82 214 162',
  'Le reload doit restaurer les couleurs calculées.'
);

await browser.close();
console.log('Préférences visuelles interactives : OK');
