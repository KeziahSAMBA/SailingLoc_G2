import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (msg) => console.log('CONSOLE:', msg.text()));
await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });
await page.waitForSelector('.leaflet-container', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1000);

// Cliquer "Charger plus" plusieurs fois pour charger un maximum de bateaux
for (let i = 0; i < 6; i++) {
  const btn = page.getByText(/charger plus|load more/i);
  if (await btn.count()) {
    await btn
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(300);
  }
}

const info = await page.evaluate(() => {
  const cards = document.querySelectorAll('article[id^="boat-"]');
  const parent = document.querySelector('aside')?.parentElement;
  return {
    cardCount: cards.length,
    parentHeight: parent ? parent.getBoundingClientRect().height : null,
    docHeight: document.body.scrollHeight,
  };
});
console.log('AFTER LOAD MORE', JSON.stringify(info));

async function measure() {
  return page.evaluate(() => {
    const aside = document.querySelector('aside');
    const asideRect = aside ? aside.getBoundingClientRect() : null;
    return { scrollY: window.scrollY, asideTop: asideRect ? asideRect.top : null };
  });
}

const maxScroll = info.docHeight - 900;
const steps = 12;
for (let i = 0; i <= steps; i++) {
  const y = Math.round((maxScroll / steps) * i);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(250);
  const m = await measure();
  console.log(JSON.stringify(m));
}

await browser.close();
