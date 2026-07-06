import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const hearts = page.locator(
  'button[aria-label="Ajouter aux favoris"], button[aria-label="Retirer des favoris"]'
);
console.log('heart buttons found on /categorie:', await hearts.count());

const firstCard = page.locator('h3').first();
const box = await firstCard.boundingBox();
console.log('first title box:', box);

await page.screenshot({
  path: 'category-favorite.png',
  clip: { x: 0, y: Math.max(0, (box?.y ?? 0) - 250), width: 700, height: 500 },
});
console.log('screenshot saved to category-favorite.png');

await browser.close();
