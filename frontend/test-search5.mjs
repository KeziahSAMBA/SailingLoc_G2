import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const before = await page.locator('text=/bateaux disponibles/').innerText();
console.log('before filter:', before);

await page.getByText('Filtres').click();
await page.waitForTimeout(300);
await page.getByText('Voiliers', { exact: true }).click();
await page.waitForTimeout(500);

const after = await page.locator('text=/bateaux disponibles/').innerText();
console.log('after selecting "Voiliers" filter:', after);

await browser.close();
