import { chromium } from 'playwright';
import fs from 'node:fs';

const outDir = 'C:/Users/kezia/AppData/Local/Temp/claude/c--Users-kezia-ProjetsFormation-SailingLoc-G2/b194871a-9217-42a7-a13d-334e362efb54/scratchpad/home-product';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

async function screencastAction(label, action) {
  const dir = `${outDir}/${label}`;
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  let frameCount = 0;
  cdp.on('Page.screencastFrame', async (frame) => {
    frameCount += 1;
    fs.writeFileSync(`${dir}/frame_${String(frameCount).padStart(3, '0')}.jpg`, Buffer.from(frame.data, 'base64'));
    await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
  });
  // everyNthFrame:1 pour capturer un maximum de frames et bien voir les saccades
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });
  await action();
  await page.waitForTimeout(1800);
  await cdp.send('Page.stopScreencast');
  console.log(`${label}: ${frameCount} frames -> ${dir}`);
}

// A) Home -> Product via Carrousel (avec le nom transmis desormais)
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Tout accepter/i }).click().catch(() => {});
await page.waitForTimeout(300);
await page.locator('#suggestions').scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await screencastAction('home-to-product', async () => {
  await page.locator('#suggestions [class*="cursor-pointer"]').first().click({ force: true });
  await page.waitForURL('**/product/**');
});

// B) Product -> Home (retour), via logo
await page.waitForTimeout(1500);
await screencastAction('product-to-home', async () => {
  await page.locator('header').getByRole('link', { name: 'SailingLoc' }).click();
  await page.waitForURL('http://localhost:5173/');
});

console.log('errors:', errors);
await browser.close();
console.log('done');
