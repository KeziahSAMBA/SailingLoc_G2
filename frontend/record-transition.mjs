import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5173';
const OUT_DIR = process.argv[2] || './frames';
const DIRECTION = process.argv[3] || 'home-to-product'; // or 'product-to-home'

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.addInitScript(() => {
  window.sessionStorage.setItem('sailingloc:intro-seen', '1');
  window.sessionStorage.setItem('sailingloc:intro-revealed', '1');
});

if (DIRECTION === 'home-to-product') {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
} else {
  await page.goto(`${BASE}/product/1`, { waitUntil: 'networkidle' });
}
await page.waitForTimeout(800);

const client = await page.context().newCDPSession(page);
await client.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });

let frameCount = 0;
const frames = [];
client.on('Page.screencastFrame', async ({ data, sessionId }) => {
  const t = Date.now();
  frames.push({ t, data });
  frameCount++;
  await client.send('Page.screencastFrameAck', { sessionId });
});

const startTime = Date.now();
if (DIRECTION === 'home-to-product') {
  await page.evaluate(() => {
    window.dispatchEvent(
      new window.CustomEvent('sailingloc:product-transition', { detail: { to: '/product/1' } })
    );
  });
} else {
  await page.evaluate(() => {
    window.dispatchEvent(new window.CustomEvent('sailingloc:home-transition', { detail: { to: '/' } }));
  });
}

await page.waitForTimeout(4200);
await client.send('Page.stopScreencast');

console.log(`Captured ${frames.length} frames`);
// Ne garde qu'un sous-ensemble régulier pour l'inspection (toutes les ~80ms).
let lastSaved = -1000;
let idx = 0;
for (const f of frames) {
  const relT = f.t - startTime;
  if (relT - lastSaved >= 80 && relT >= 0) {
    const fname = path.join(OUT_DIR, `f_${String(relT).padStart(5, '0')}.jpg`);
    fs.writeFileSync(fname, Buffer.from(f.data, 'base64'));
    lastSaved = relT;
    idx++;
  }
}
console.log(`Saved ${idx} sampled frames to ${OUT_DIR}`);

await browser.close();
