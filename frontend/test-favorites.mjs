import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// --- 1. Anonymous visitor: heart icons visible on boat cards, not on port cards ---
const heartButtons = page.locator('button[aria-label="Ajouter aux favoris"], button[aria-label="Retirer des favoris"]');
console.log('heart buttons found (anonymous):', await heartButtons.count());

// Port carousel section ("Choisissez votre port de départ") should have 0 hearts inside it
const portSection = page.locator('h2:has-text("Choisissez votre port de départ")').locator('xpath=../..');
const heartsInPortSection = portSection.locator('button[aria-label="Ajouter aux favoris"], button[aria-label="Retirer des favoris"]');
console.log('hearts inside port section (should be 0):', await heartsInPortSection.count());

// Click a heart in a static (non-animating) section while logged out -> should navigate to /login and show AuthModal
const staticSection = page.locator('h2:has-text("Annonces consultées récemment")').locator('xpath=../..');
const staticHeart = staticSection
  .locator('button[aria-label="Ajouter aux favoris"], button[aria-label="Retirer des favoris"]')
  .first();
await staticHeart.scrollIntoViewIfNeeded();
await staticHeart.click({ force: true });
await page.waitForTimeout(800);
console.log('URL after clicking heart while logged out:', page.url());
const authModalVisible = await page.locator('text=/Connexion|Se connecter/i').first().isVisible().catch(() => false);
console.log('Auth modal visible:', authModalVisible);

// --- 2. Log in as a locataire test account ---
// Close modal state by navigating home first (clean slate), then go straight to /login
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Try to fill login form (locataire role should be default or selectable)
const emailInput = page.locator('input[type="email"], input[name="email"]').first();
const passwordInput = page.locator('input[type="password"]').first();
await emailInput.fill('thomas.bernard@email.fr');
await passwordInput.fill('Locataire@2025Secure');
await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
await page.waitForTimeout(1500);
console.log('URL after login:', page.url());

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// --- 3. Toggle a favorite as logged-in locataire ---
const staticSection2 = page.locator('h2:has-text("Annonces consultées récemment")').locator('xpath=../..');
const heartButtons2 = staticSection2.locator(
  'button[aria-label="Ajouter aux favoris"], button[aria-label="Retirer des favoris"]'
);
const count2 = await heartButtons2.count();
console.log('heart buttons found in static section (logged in):', count2);

const firstHeart = heartButtons2.first();
await firstHeart.scrollIntoViewIfNeeded();
const labelBefore = await firstHeart.getAttribute('aria-label');
console.log('first heart label before click:', labelBefore);

const [response] = await Promise.all([
  page.waitForResponse(
    (res) =>
      res.url().includes('/favorites/') &&
      (res.request().method() === 'POST' || res.request().method() === 'DELETE')
  ),
  firstHeart.click({ force: true }),
]);
console.log('favorite API call:', response.request().method(), response.url(), response.status());

await page.waitForTimeout(500);
const labelAfter = await firstHeart.getAttribute('aria-label');
console.log('first heart label after click:', labelAfter);

// Reload and verify persistence
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const staticSection3 = page.locator('h2:has-text("Annonces consultées récemment")').locator('xpath=../..');
const heartButtons3 = staticSection3.locator(
  'button[aria-label="Ajouter aux favoris"], button[aria-label="Retirer des favoris"]'
);
const labelAfterReload = await heartButtons3.first().getAttribute('aria-label');
console.log('first heart label after reload (persistence check):', labelAfterReload);

await browser.close();
