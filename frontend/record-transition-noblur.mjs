import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:5173';
const OUT_DIR = './frames-h2p-noblur';

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.addInitScript(() => {
  window.sessionStorage.setItem('sailingloc:intro-seen', '1');
  window.sessionStorage.setItem('sailingloc:intro-revealed', '1');
});

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
// Diagnostic seulement : neutralise tout backdrop-filter pour vérifier si
// c'est bien le coût de rendu du flou qui cause les sauts de frames.
await page.addStyleTag({
  content: '* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
});
await page.waitForTimeout(800);

const client = await page.context().newCDPSession(page);
await client.send('Page.startScreencast', { format: 'jpeg', quality: 70, everyNthFrame: 1 });

const frames = [];
client.on('Page.screencastFrame', async ({ data, sessionId }) => {
  frames.push({ t: Date.now(), data });
  await client.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

const startTime = Date.now();
await page.evaluate(() => {
  window.dispatchEvent(
    new window.CustomEvent('sailingloc:product-transition', { detail: { to: '/product/1' } })
  );
});

await page.waitForTimeout(4200);
await client.send('Page.stopScreencast').catch(() => {});

console.log(`Captured ${frames.length} frames`);
let lastSaved = -1000;
let idx = 0;
for (const f of frames) {
  const relT = f.t - startTime;
  if (relT - lastSaved >= 80 && relT >= 0) {
    fs.writeFileSync(
      path.join(OUT_DIR, `f_${String(relT).padStart(5, '0')}.jpg`),
      Buffer.from(f.data, 'base64')
    );
    lastSaved = relT;
    idx++;
  }
}
console.log(`Saved ${idx} sampled frames to ${OUT_DIR}`);

await browser.close();
process.exit(0);
