import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/categorie', { waitUntil: 'networkidle' });

await page.waitForSelector('.leaflet-container', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(1000);

async function measure() {
  return page.evaluate(() => {
    const aside = document.querySelector('aside');
    const cards = document.querySelectorAll('article[id^="boat-"]');
    const asideRect = aside ? aside.getBoundingClientRect() : null;
    const firstCard = cards[0] ? cards[0].getBoundingClientRect() : null;
    const lastCard = cards.length ? cards[cards.length - 1].getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      asideTop: asideRect ? asideRect.top : null,
      firstCardTop: firstCard ? firstCard.top : null,
      lastCardTop: lastCard ? lastCard.top : null,
      cardCount: cards.length,
    };
  });
}

const steps = [0, 300, 600, 900, 1200, 1500, 1800, 2100];
for (const y of steps) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(400);
  const m = await measure();
  console.log(JSON.stringify(m));
}

// Ancestor chain diagnostics
const chain = await page.evaluate(() => {
  const aside = document.querySelector('aside');
  const result = [];
  let el = aside;
  while (el) {
    const cs = window.getComputedStyle(el);
    result.push({
      tag: el.tagName,
      cls: el.className?.toString().slice(0, 60),
      position: cs.position,
      overflow: cs.overflow,
      overflowX: cs.overflowX,
      overflowY: cs.overflowY,
      transform: cs.transform,
      display: cs.display,
      height: cs.height,
    });
    el = el.parentElement;
  }
  return result;
});
console.log('ANCESTOR_CHAIN', JSON.stringify(chain, null, 2));

await browser.close();
