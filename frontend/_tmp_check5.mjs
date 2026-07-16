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

// Open the date picker in the booking panel and pick a range
const panel = page.getByRole('complementary');
await panel.getByText('Ajouter des dates').click();
await page.waitForTimeout(300);
const availableDays = page.locator('button.bg-green-200');
const count = await availableDays.count();
console.log('available days count:', count);
if (count >= 3) {
  await availableDays.nth(0).click();
  await page.waitForTimeout(200);
  await availableDays.nth(2).click();
  await page.waitForTimeout(300);
}

await page.screenshot({ path: '_tmp_panel_with_dates.png', clip: { x: 900, y: 200, width: 540, height: 350 } });

await browser.close();
