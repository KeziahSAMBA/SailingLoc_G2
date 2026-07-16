import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function measure(url, label) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // let entry animation finish
  const navCount = await page.locator('nav').count();
  console.log('  nav count:', navCount);
  const searchBar = await page.locator('form').first().boundingBox();
  const breadcrumb = await page.locator('nav', { hasText: 'Accueil' }).last().boundingBox();
  console.log(label, url);
  console.log('  searchBar bbox:', searchBar);
  console.log('  breadcrumb bbox:', breadcrumb);
  if (searchBar && breadcrumb) {
    console.log('  gap (breadcrumb.top - searchBar.bottom):', breadcrumb.y - (searchBar.y + searchBar.height));
  }
  await page.screenshot({ path: `_tmp_${label}.png`, clip: { x: 0, y: 0, width: 900, height: 260 } });
}

// find a boat id
const res = await fetch('http://localhost:4000/api/boats').catch(() => null);
let boatId = 1;
if (res && res.ok) {
  const data = await res.json();
  const list = data.data ?? data;
  if (Array.isArray(list) && list.length > 0) boatId = list[0].id_boat ?? boatId;
}
console.log('using boatId', boatId);

await measure('http://localhost:5173/categorie', 'category');
await measure(`http://localhost:5173/product/${boatId}`, 'product');

await browser.close();
