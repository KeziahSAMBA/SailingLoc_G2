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

const aside = await page.getByRole('complementary').boundingBox();
console.log('aside box:', aside);

await page.screenshot({ path: '_tmp_full2.png', clip: { x: 900, y: 200, width: 540, height: 450 } });

await browser.close();
