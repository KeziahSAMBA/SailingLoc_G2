import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('console', (msg) => console.log('CONSOLE:', msg.text()));
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const countText = await page.locator('text=/bateaux disponibles/').innerText();
console.log('counter before search:', countText);

// Fill destination
await page.getByPlaceholder('Lieu / Port de départ').fill('Nice');
await page.getByRole('button', { name: /Rechercher/i }).click();
await page.waitForTimeout(1000);

console.log('URL after search:', page.url());
const countTextAfter = await page.locator('text=/bateaux disponibles/').innerText();
console.log('counter after search "Nice":', countTextAfter);

const bodyText = await page.locator('body').innerText();
console.log('Contains "Aucune offre"?', bodyText.includes('Aucune offre'));

await browser.close();
