import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

const res = await fetch('http://localhost:4000/api/boats').catch(() => null);
let boatId = 1;
if (res && res.ok) {
  const data = await res.json();
  const list = data.data ?? data;
  if (Array.isArray(list) && list.length > 0) boatId = list[0].id_boat ?? boatId;
}

await page.goto(`http://localhost:5173/product/${boatId}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const panel = page.getByRole('complementary');
await panel.getByText('Ajouter des dates').click();
await page.waitForTimeout(300);
const availableDays = page.locator('button.bg-green-200');
await availableDays.nth(0).click();
await page.waitForTimeout(200);
await availableDays.nth(2).click();
await page.waitForTimeout(300);

// click the clear (X) button
await panel.locator('button[title="Effacer les dates"]').click();
await page.waitForTimeout(300);
const stillOpen = await page.locator('text=Juillet 2026').count();
console.log('calendar open after clear (should be 0 if it just cleared, not reopened):', stillOpen);
await page.screenshot({ path: '_tmp_panel_after_clear.png', clip: { x: 900, y: 200, width: 540, height: 350 } });

// now check the SearchBar (category page) rendering with the new clear button
await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const form = page.locator('form').first();
await form.getByText('Ajouter des dates').click();
await page.waitForTimeout(300);
const availableDays2 = page.locator('button.bg-green-200');
const count2 = await availableDays2.count();
if (count2 >= 3) {
  await availableDays2.nth(0).click();
  await page.waitForTimeout(200);
  await availableDays2.nth(2).click();
  await page.waitForTimeout(300);
}
await page.screenshot({ path: '_tmp_searchbar_with_dates.png', clip: { x: 250, y: 90, width: 700, height: 90 } });

await browser.close();
