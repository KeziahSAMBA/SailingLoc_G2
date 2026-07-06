import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Scroll down to a static carousel section, well past the top of the page.
const staticSection = page
  .locator('h2:has-text("Annonces consultées récemment")')
  .locator('xpath=../..');
await staticSection.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

const scrollYBeforeClick = await page.evaluate(() => window.scrollY);
console.log('scrollY before clicking heart:', scrollYBeforeClick);

const heart = staticSection
  .locator('button[aria-label="Ajouter aux favoris"], button[aria-label="Retirer des favoris"]')
  .first();
await heart.click({ force: true });
await page.waitForTimeout(600);

console.log('URL after click:', page.url());
const scrollYAfterOpen = await page.evaluate(() => window.scrollY);
console.log('scrollY after auth modal opens:', scrollYAfterOpen);

// Close the modal (click the close button / backdrop) and check scroll again.
const closeButton = page.locator('button[aria-label="Fermer"], button:has-text("×")').first();
if (await closeButton.count()) {
  await closeButton.click();
} else {
  await page.keyboard.press('Escape');
}
await page.waitForTimeout(600);
console.log('URL after close:', page.url());
const scrollYAfterClose = await page.evaluate(() => window.scrollY);
console.log('scrollY after closing modal:', scrollYAfterClose);

console.log(
  'RESULT:',
  scrollYAfterOpen > 100 && scrollYAfterClose > 100
    ? 'PASS (scroll preserved)'
    : 'FAIL (scroll reset to top)'
);

await browser.close();
