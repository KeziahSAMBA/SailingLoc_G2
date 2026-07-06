import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

async function count() {
  return page.locator('text=/bateaux disponibles/').innerText();
}

await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
console.log('baseline:', await count());

await page.getByText('Filtres').click();
await page.waitForTimeout(300);

await page.getByText('Skipper inclus', { exact: true }).click();
await page.waitForTimeout(400);
console.log('after "Skipper inclus" (now under Permis):', await count());

await browser.close();
