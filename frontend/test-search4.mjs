import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('response', (res) => {
  if (res.status() >= 400) console.log(res.status(), res.request().method(), res.url());
});

await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await browser.close();
