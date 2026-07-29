import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'shot-top.png' });
await page.evaluate(() => window.scrollTo(0, 400));
await page.waitForTimeout(600);
await page.screenshot({ path: 'shot-scrolled.png' });
await browser.close();
