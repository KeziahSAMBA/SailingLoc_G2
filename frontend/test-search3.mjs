import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
});

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// Fill the homepage search bar like a real user
await page.getByPlaceholder('Lieu / Port de départ').fill('Marseille');
const dateInputs = page.locator('input[type="date"]');
console.log('date inputs found:', await dateInputs.count());
await dateInputs.nth(0).fill('2026-07-10');
await dateInputs.nth(1).fill('2026-07-20');
await page.getByPlaceholder('Nombre de personnes').fill('4');

await page.getByRole('button', { name: /Rechercher/i }).click();
await page.waitForTimeout(1200);

console.log('URL after submit from homepage:', page.url());
const t = await page.locator('text=/bateaux disponibles|Aucune offre/').first().innerText();
console.log('result:', t);

await browser.close();
