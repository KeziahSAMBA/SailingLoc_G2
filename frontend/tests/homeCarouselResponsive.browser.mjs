import { chromium } from 'playwright';

const BASE_URL = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:5173';
const CONSENT_KEY = 'sailingloc_cookie_consent';
const VISUAL_PREFERENCES_KEY = 'sailingloc:visual-preferences:v1';

const RESIZE_WIDTHS = [1024, 1100, 1280, 1440, 1902];
const DIRECT_WIDTHS = [320, 375, 639, 640];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeFixtures() {
  const typeByIndex = ['voilier', 'jet_ski', 'moteur'];
  return {
    boats: Array.from({ length: 9 }, (_, index) => ({
      id_boat: index + 1,
      name: `Bateau de test ${index + 1}`,
      type: typeByIndex[Math.floor(index / 3)],
      license_required: index < 6,
      daily_price: 100 + index,
      capacity: 4,
      description: 'Description de test',
      is_published: true,
      booking_count: index,
      avg_rating: 4.3,
      review_count: 4,
      port: { city: 'Brest' },
      images: [{ url: '/test-boat.webp' }],
      availabilities: [{ start_date: '2026-07-01', end_date: '2026-07-31' }],
    })),
    ports: ['Marseille', 'La Rochelle', 'Brest', 'Nice', 'Bordeaux'].map((city, index) => ({
      id_port: index + 1,
      city,
      name: `Port de ${city}`,
      region: 'Bretagne',
      country: 'France',
      image_url: '',
    })),
  };
}

async function installMocks(page, fixtures) {
  await page.route('**/api/boats*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixtures.boats),
    })
  );
  await page.route('**/api/ports*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixtures.ports),
    })
  );
  await page.route('**/api/users/refresh*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'visual-test-token',
        user: {
          id_user: 9001,
          email: 'visual-test@sailingloc.test',
          role: 'locataire',
          first_name: 'Test',
          last_name: 'Visuel',
        },
      }),
    })
  );
  await page.route('**/api/users/me/favorites*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ favorites: [] }),
    })
  );
  await page.route('**/api/reviews/public*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  );
  await page.route('**/api/messages/unread*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unread: 0 }),
    })
  );
}

async function waitForVisualStability(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await page.waitForTimeout(350);
}

async function readCurrentAnnouncements(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        left: value.left,
        right: value.right,
        width: value.width,
        height: value.height,
        top: value.top,
        bottom: value.bottom,
      };
    };

    const heading = [...document.querySelectorAll('#suggestions h2')].find(
      (element) =>
        element.textContent.includes('Annonces du moment') ||
        element.textContent.includes('Current listings')
    );
    const section = heading?.parentElement?.parentElement ?? null;
    const row = section?.querySelector(':scope > div:nth-child(2)') ?? null;
    const visibleWrappers = row
      ? [...row.children].filter((element) => getComputedStyle(element).display !== 'none')
      : [];
    const panels = visibleWrappers.map((wrapper) =>
      [...wrapper.querySelectorAll('div')].find(
        (element) =>
          element.classList.contains('rounded-[12px]') &&
          element.classList.contains('overflow-hidden') &&
          element.classList.contains('p-4')
      )
    );

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      suggestions: rect(document.querySelector('#suggestions')),
      heading: rect(heading),
      row: rect(row),
      wrappers: visibleWrappers.map(rect),
      panels: panels.map(rect),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
}

function assertLayout(layout, width, expectedVisibleCount) {
  assert(layout.row, `${width}px : ligne des annonces du moment introuvable.`);
  assert(layout.heading, `${width}px : titre des annonces du moment introuvable.`);
  assert(
    layout.wrappers.length === expectedVisibleCount,
    `${width}px : ${expectedVisibleCount} carrousel(s) attendu(s), ${layout.wrappers.length} visible(s).`
  );
  assert(
    layout.row.left >= layout.suggestions.left - 1 &&
      layout.row.right <= layout.suggestions.right + 1,
    `${width}px : la ligne sort des marges de la section (${layout.row.left}–${layout.row.right}).`
  );
  assert(
    layout.scrollWidth <= width + 1,
    `${width}px : débordement horizontal (${layout.scrollWidth - width}px).`
  );

  const expectedInset = width < 640 ? 14 : 22;
  assert(
    Math.abs(layout.wrappers[0].left - layout.heading.left - expectedInset) <= 1,
    `${width}px : inset horizontal attendu de ${expectedInset}px, obtenu ${layout.wrappers[0].left - layout.heading.left}px.`
  );
  assert(
    Math.abs(layout.row.height - 274) <= 1,
    `${width}px : hauteur de la ligne attendue de 274px, obtenue ${layout.row.height}px.`
  );

  for (const [index, wrapper] of layout.wrappers.entries()) {
    const panel = layout.panels[index];
    assert(panel, `${width}px : panneau du carrousel ${index + 1} introuvable.`);
    assert(
      panel.left >= wrapper.left - 1 && panel.right <= wrapper.right + 1,
      `${width}px : panneau ${index + 1} hors de son wrapper.`
    );
    assert(
      Math.abs(panel.height - 254) <= 1,
      `${width}px : hauteur historique du panneau ${index + 1} attendue de 254px, obtenue ${panel.height}px.`
    );
  }

  if (expectedVisibleCount === 3) {
    const widths = layout.wrappers.map((wrapper) => wrapper.width);
    assert(
      Math.max(...widths) - Math.min(...widths) <= 1,
      `${width}px : les trois carrousels ne sont pas équilibrés (${widths.join(', ')}).`
    );
    const totalWidth = widths.reduce((sum, value) => sum + value, 0) + 32;
    assert(
      totalWidth <= layout.row.width + 1,
      `${width}px : les trois carrousels dépassent la largeur disponible.`
    );
  }
}

async function createContext(browser, width, theme) {
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  await context.addInitScript(
    ({ consentKey, visualPreferencesKey, nextTheme }) => {
      sessionStorage.setItem('sailingloc:intro-seen', '1');
      sessionStorage.setItem('sailingloc:intro-revealed', '1');
      localStorage.setItem(
        consentKey,
        JSON.stringify({
          version: 2,
          date: new Date().toISOString(),
          purposes: { analytics: false, ads: false, personalization: false },
        })
      );
      localStorage.setItem(
        visualPreferencesKey,
        JSON.stringify({ theme: nextTheme, colorVision: 'standard' })
      );
    },
    { consentKey: CONSENT_KEY, visualPreferencesKey: VISUAL_PREFERENCES_KEY, nextTheme: theme }
  );
  return context;
}

async function openHome(page, fixtures) {
  await installMocks(page, fixtures);
  await page.goto(new URL('/', BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await page.locator('main').waitFor({ state: 'visible' });
  await page.locator('#suggestions h2').first().waitFor({ state: 'visible', timeout: 15_000 });
  await waitForAnnouncements(page, page.viewportSize().width >= 1024 ? 3 : 1);
  await waitForVisualStability(page);
}

async function waitForAnnouncements(page, expectedVisibleCount) {
  const hasExpectedCount = (expected) => {
    const heading = [...document.querySelectorAll('#suggestions h2')].find(
      (element) =>
        element.textContent.includes('Annonces du moment') ||
        element.textContent.includes('Current listings')
    );
    const section = heading?.parentElement?.parentElement;
    const row = section?.querySelector(':scope > div:nth-child(2)');
    const visible = row
      ? [...row.children].filter((element) => getComputedStyle(element).display !== 'none')
      : [];
    return visible.length === expected;
  };
  await page.waitForFunction(hasExpectedCount, expectedVisibleCount, { timeout: 15_000 });
  // Resize triggers React effects and the 3D carousels may briefly remount.
  // Require the expected row again after the transition before measuring it.
  await page.waitForTimeout(450);
  await page.waitForFunction(hasExpectedCount, expectedVisibleCount, { timeout: 15_000 });
}

const browser = await chromium.launch({ headless: true });
const fixtures = makeFixtures();

try {
  for (const theme of ['light', 'dark']) {
    const resizeContext = await createContext(browser, 800, theme);
    const resizePage = await resizeContext.newPage();
    await openHome(resizePage, fixtures);

    for (const width of RESIZE_WIDTHS) {
      await resizePage.setViewportSize({ width, height: 800 });
      await waitForAnnouncements(resizePage, 3);
      await waitForVisualStability(resizePage);
      assertLayout(await readCurrentAnnouncements(resizePage), width, 3);
    }
    await resizeContext.close();

    for (const width of DIRECT_WIDTHS) {
      const directContext = await createContext(browser, width, theme);
      const directPage = await directContext.newPage();
      await openHome(directPage, fixtures);
      assertLayout(await readCurrentAnnouncements(directPage), width, 1);
      await directContext.close();
    }
  }
} finally {
  await browser.close();
}

console.log('Responsive carrousel annonces du moment : OK');
