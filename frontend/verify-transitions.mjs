// Capture screencast des transitions categorie <-> produit (script jetable).
import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT =
  'C:/Users/kezia/AppData/Local/Temp/claude/c--Users-kezia-ProjetsFormation-SailingLoc-G2/cb19f68a-4b4d-4470-9f6f-49069f14db2a/scratchpad/frames';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForSelector('article[id^="boat-"]');
await page.waitForTimeout(500);

const cdp = await page.context().newCDPSession(page);
let frames = [];
cdp.on('Page.screencastFrame', ({ data, sessionId }) => {
  frames.push(data);
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});

async function record(name, action, ms) {
  frames = [];
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 55,
    everyNthFrame: 2,
  });
  await action();
  await page.waitForTimeout(ms);
  await cdp.send('Page.stopScreencast');
  frames.forEach((f, i) =>
    fs.writeFileSync(`${OUT}/${name}-${String(i).padStart(3, '0')}.jpg`, Buffer.from(f, 'base64'))
  );
  console.log(`${name}: ${frames.length} frames, url=${page.url()}`);
}

// categorie -> produit (sortie 2300ms + entree 2300ms)
await record('cat2prod', () => page.click('article[id^="boat-"]'), 5400);
// laisse les sections differees se monter et le scroll se deverrouiller
await page.waitForTimeout(2200);

// produit -> categorie via le fil d'ariane
await record('prod2cat', () => page.click('a[href="/categorie"]'), 5400);

console.log('console errors:', JSON.stringify(errors, null, 2));
await browser.close();
