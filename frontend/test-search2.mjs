import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

async function search(url) {
  await page.goto(`http://localhost:5173${url}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const t = await page.locator('text=/bateaux disponibles|Aucune offre/').first().innerText();
  console.log(url, '->', t);
}

await search('/categorie');
await search('/categorie?travelers=2');
await search('/categorie?travelers=20');
await search('/categorie?start=2026-07-05&end=2026-07-10');
await search('/categorie?start=2026-12-01&end=2026-12-10');
await search('/categorie?destination=nice&travelers=4');

await browser.close();
