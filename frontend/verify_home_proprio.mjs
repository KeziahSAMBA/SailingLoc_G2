import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

function log(label, val) {
  console.log(`[${label}]`, val);
}

// ── 1. Invité : la home classique doit rester inchangée ──────────────────
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const guestHasSearchBar = (await page.locator('input[placeholder], form').count()) > 0;
const guestHeroText = await page
  .locator('#hero')
  .innerText()
  .catch(() => '(no #hero)');
log('guest #hero present', await page.locator('#hero').count());
await page.screenshot({ path: 'verify_guest_home.png' });

// ── 2. Connexion en tant que propriétaire ─────────────────────────────────
await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'verify_login_page.png' });

// Chercher les champs email / mot de passe du modal de connexion
const emailInput = page.locator('input[type="email"]').first();
const passwordInput = page.locator('input[type="password"]').first();
await emailInput.waitFor({ state: 'visible', timeout: 10000 });
await emailInput.fill('luc.martin@email.fr');
await passwordInput.fill('Proprietaire@2025Secure');

await page.waitForTimeout(500);
await passwordInput.press('Enter');

await page.waitForTimeout(2500);
log('url after login', page.url());
await page.screenshot({ path: 'verify_after_login.png', fullPage: true });

// ── 3. Vérifications de la page HomePageProprio ───────────────────────────
const hasSearchBar = await page
  .locator('input[type="search"], input[placeholder*="estination" i], input[placeholder*="Où" i]')
  .count();
log('searchbar inputs found (should be 0)', hasSearchBar);

const logoBox = await page
  .locator('img[alt="SailingLoc"]')
  .first()
  .boundingBox()
  .catch(() => null);
log('logo bounding box (height should be reduced ~36-48px)', JSON.stringify(logoBox));

const addBoatCard = await page.getByText(/Ajouter un bateau/i).count();
log('"Ajouter un bateau" card found', addBoatCard);

const mobileAppCta = await page.getByText(/App Store/i).count();
log('mobile app CTA found', mobileAppCta);

await browser.close();
