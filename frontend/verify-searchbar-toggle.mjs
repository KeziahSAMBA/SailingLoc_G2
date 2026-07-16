import { chromium } from 'playwright';

const results = [];
function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}${detail ? ` (${detail})` : ''}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://localhost:5173/product/1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const form = page.locator('form').first();
const fields = form.locator('> div[aria-hidden]').first();
const arrow = form.locator('button[aria-expanded]').first();

async function fieldsWidth() {
  return fields.evaluate((el) => el.getBoundingClientRect().width);
}

// 1. État initial : rétractée, flèche présente
check('flèche présente à côté du bouton', (await arrow.count()) === 1);
const w0 = await fieldsWidth();
check('champs repliés au chargement', w0 < 1, `largeur=${w0}px`);
check('aria-expanded=false au chargement', (await arrow.getAttribute('aria-expanded')) === 'false');
await page.screenshot({ path: 'sb-1-initial.png' });

// 2. Survol du formulaire (bouton Rechercher + flèche) : ne doit PAS déployer
await form.locator('button[type="submit"]').hover();
await page.waitForTimeout(900);
const wHoverSubmit = await fieldsWidth();
check('pas de déploiement au survol du bouton Rechercher', wHoverSubmit < 1, `largeur=${wHoverSubmit}px`);
await arrow.hover();
await page.waitForTimeout(900);
const wHoverArrow = await fieldsWidth();
check('pas de déploiement au survol de la flèche', wHoverArrow < 1, `largeur=${wHoverArrow}px`);
await page.screenshot({ path: 'sb-2-hover.png' });

// 3. Clic sur la flèche : déploiement
await arrow.click();
await page.waitForTimeout(900);
const wOpen = await fieldsWidth();
check('déploiement au clic sur la flèche', wOpen > 200, `largeur=${wOpen}px`);
check('aria-expanded=true une fois déployée', (await arrow.getAttribute('aria-expanded')) === 'true');
check('aria-hidden levé sur les champs', (await fields.getAttribute('aria-hidden')) === 'false');
await page.screenshot({ path: 'sb-3-deployed.png' });

// 4. Second clic sur la flèche : repli
await arrow.click();
await page.waitForTimeout(900);
const wClosed = await fieldsWidth();
check('repli au second clic sur la flèche', wClosed < 1, `largeur=${wClosed}px`);
check('aria-expanded=false après repli', (await arrow.getAttribute('aria-expanded')) === 'false');
await page.screenshot({ path: 'sb-4-retracted.png' });

// 5. Re-déploiement puis clic Rechercher déployée : lance la recherche (navigation /categorie)
await arrow.click();
await page.waitForTimeout(900);
await form.locator('button[type="submit"]').click();
await page.waitForTimeout(2500);
check('Rechercher déployée navigue vers /categorie', page.url().includes('/categorie'), page.url());

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? '\nTOUT EST OK' : `\n${failed.length} ÉCHEC(S)`);
process.exit(failed.length === 0 ? 0 : 1);
