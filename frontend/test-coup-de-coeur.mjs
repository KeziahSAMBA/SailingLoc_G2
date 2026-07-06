import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const badgeCount = await page.locator('text=Coup de cœur').count();
console.log(
  '"Coup de cœur" badges shown on cards (page 1, may be capped by visibleCount):',
  badgeCount
);

// Open filter panel and toggle the new checkbox
await page.locator('text=Filtres').first().click();
await page.waitForTimeout(300);
const checkbox = page.locator('label:has-text("Coup de cœur") input[type="checkbox"]');
console.log('coup de coeur checkbox found:', await checkbox.count());
await checkbox.check();
await page.waitForTimeout(500);

const counterText = await page.locator('text=/bateaux disponibles/').innerText();
console.log('counter after enabling Coup de cœur filter:', counterText);

const grid = page.locator('.grid.grid-cols-2').first();
const cardsShown = await grid.locator('article').count();
console.log('boat cards shown in grid after filter:', cardsShown);

const allBadged = await grid
  .locator('article')
  .evaluateAll((articles) =>
    articles.map((a) => a.innerText.toLowerCase().includes('coup de cœur'))
  );
console.log('all visible cards have the badge:', allBadged.every(Boolean), allBadged);

const firstArticleText = await grid.locator('article').first().innerText();
console.log('--- first article text ---');
console.log(firstArticleText);

await browser.close();
