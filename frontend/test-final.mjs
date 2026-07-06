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

const equipHeader = await page.locator('text=Équipements').count();
console.log('"Équipements" column present?', equipHeader > 0);

await page.getByText('Skipper inclus', { exact: true }).click();
await page.waitForTimeout(400);
console.log('after "Skipper inclus" (under Permis):', await count());

await page.getByText('Réinitialiser').click();
await page.waitForTimeout(300);
await page.getByText('Sans permis requis', { exact: true }).click();
await page.waitForTimeout(400);
console.log('after "Sans permis requis":', await count());

await browser.close();
