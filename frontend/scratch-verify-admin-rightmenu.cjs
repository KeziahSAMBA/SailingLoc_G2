const { chromium } = require('playwright');
const shotDir =
  'C:/Users/kezia/AppData/Local/Temp/claude/c--Users-kezia-ProjetsFormation-SailingLoc-G2/620a1b47-6826-4cd0-8a6d-bda4be1d989b/scratchpad';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/admin/login', { waitUntil: 'networkidle' });
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await page.fill('input[name="email"]', 'admin@sailingloc.fr');
  await page.fill('input[name="password"]', 'Admin@123456');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/login') && r.request().method() === 'POST'),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForSelector('header button[aria-label="Menu utilisateur"]', { timeout: 15000 });
  await page.click('header button[aria-label="Menu utilisateur"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shotDir}/admin-right-menu-simplified.png` });
  await browser.close();
})();
