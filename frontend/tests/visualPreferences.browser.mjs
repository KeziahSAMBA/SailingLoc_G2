import { chromium } from 'playwright';

const BASE_URL = process.env.VISUAL_TEST_BASE_URL || 'http://localhost:5173';
const STORAGE_KEY = 'sailingloc:visual-preferences:v1';
const CONSENT_KEY = 'sailingloc_cookie_consent';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rgbChannels(value) {
  return value
    .match(/[\d.]+/gu)
    .slice(0, 3)
    .map(Number);
}

function luminance(rgb) {
  return rgb
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(first, second) {
  const values = [luminance(rgbChannels(first)), luminance(rgbChannels(second))];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

async function waitForVisualStability(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  // The settings panel uses a 180 ms transition.  A bounded delay after the
  // fonts settle also covers browsers that do not dispatch transitionend for
  // an element that is mounted during the transition.
  await page.waitForTimeout(350);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript(
  ({ consentKey, storageKey }) => {
    localStorage.setItem(
      consentKey,
      JSON.stringify({
        version: 2,
        date: new Date().toISOString(),
        purposes: { analytics: false, ads: false, personalization: false },
      })
    );
    if (!sessionStorage.getItem('sailingloc-visual-test-initialized')) {
      localStorage.removeItem(storageKey);
      sessionStorage.setItem('sailingloc-visual-test-initialized', '1');
    }
  },
  { consentKey: CONSENT_KEY, storageKey: STORAGE_KEY }
);

const page = await context.newPage();
await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await page.locator('main').waitFor({ state: 'visible' });
await page
  .locator('[role="status"].fixed.inset-0')
  .waitFor({ state: 'hidden', timeout: 15_000 })
  .catch(() => {});

const readVisualState = () =>
  page.evaluate((storageKey) => {
    const styles = getComputedStyle(document.documentElement);
    const bodyStyles = getComputedStyle(document.body);
    return {
      theme: document.documentElement.dataset.sailinglocTheme,
      colorVision: document.documentElement.dataset.sailinglocColorVision,
      page: styles.getPropertyValue('--sl-page').trim(),
      surface: styles.getPropertyValue('--sl-surface').trim(),
      success: styles.getPropertyValue('--sl-success').trim(),
      info: styles.getPropertyValue('--sl-info').trim(),
      bodyBackground: bodyStyles.backgroundColor,
      bodyColor: bodyStyles.color,
      stored: JSON.parse(localStorage.getItem(storageKey)),
    };
  }, STORAGE_KEY);

const settings = page.locator('button[aria-label="Paramètres"]:visible').first();
const clickSettings = () => settings.evaluate((button) => button.click());
assert(
  (await settings.getAttribute('aria-expanded')) === 'false',
  'Le panneau doit rester fermé au chargement.'
);
assert(
  (await page.locator('[data-visual-settings-panel]').count()) === 0,
  'Un panneau fermé ne doit pas rester dans le DOM interactif.'
);
await clickSettings();
await page
  .getByRole('button', { name: 'Mode sombre' })
  .first()
  .evaluate((button) => button.click());

async function assertFocusRestorationCycles(width, cycles = 5) {
  await page.setViewportSize({ width, height: 800 });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });

  const settingsButton = page
    .locator('button[aria-label="Paramètres"]:visible, button[aria-label="Settings"]:visible')
    .first();
  const visibleGlassesButton = page.locator(
    '[data-settings-color-vision-trigger="true"]:visible'
  );

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    if ((await settingsButton.getAttribute('aria-expanded')) !== 'true') {
      await settingsButton.evaluate((button) => button.click());
    }
    await page.locator('[data-visual-settings-panel]:visible').waitFor({ state: 'visible' });

    await visibleGlassesButton.first().evaluate((button) => button.click());
    await page
      .locator('[data-settings-color-vision-options][aria-hidden="false"]')
      .waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');

    await page.waitForFunction(() => {
      const trigger = [...document.querySelectorAll('[data-settings-color-vision-trigger="true"]')].find(
        (element) =>
          window.getComputedStyle(element).display !== 'none' && element.getClientRects().length > 0
      );
      return trigger?.getAttribute('aria-expanded') === 'false' && document.activeElement === trigger;
    });
    assert(
      (await settingsButton.getAttribute('aria-expanded')) === 'true',
      `Le panneau principal doit rester ouvert après le cycle CVD ${cycle + 1} à ${width}px.`
    );

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      const settings = document.querySelector(
        'button[aria-label="Paramètres"], button[aria-label="Settings"]'
      );
      return settings?.getAttribute('aria-expanded') === 'false' && document.activeElement === settings;
    });
  }
}

async function assertResponsiveSettingsPanel(width, scrollY) {
  await page.setViewportSize({ width, height: 800 });
  await page.evaluate((top) => scrollTo(0, top), scrollY);
  await waitForVisualStability(page);

  const settingsButton = page
    .locator('button[aria-label="Paramètres"]:visible, button[aria-label="Settings"]:visible')
    .first();
  const readMetrics = () =>
    page.evaluate(() => {
      const rect = (element) => {
        if (!element) return null;
        const value = element.getBoundingClientRect();
        return {
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          left: value.left,
          width: value.width,
          height: value.height,
        };
      };
      const header = document.querySelector('header');
      const bar = document.querySelector('[data-header-bar]');
      const settings = document.querySelector('[data-visual-settings-panel]');
      const group = settings?.closest('[data-settings-group]');
      const trigger = document.querySelector(
        'button[aria-label="Paramètres"], button[aria-label="Settings"]'
      );
      const controls = settings?.querySelector('[data-settings-controls]');
      const headerBackground = header?.firstElementChild
        ? getComputedStyle(header.firstElementChild).backgroundColor
        : null;
      const settingsStyles = settings ? getComputedStyle(settings) : null;
      const groupStyles = group ? getComputedStyle(group) : null;
      const controlsRect = rect(controls);
      const controlRects = controls
        ? [...controls.children].map((element) => rect(element))
        : [];
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        header: rect(header),
        bar: rect(bar),
        settings: rect(settings),
        group: rect(group),
        trigger: rect(trigger),
        controls: controlsRect,
        controlRects,
        headerBackground,
        settingsBackground: settingsStyles?.backgroundColor ?? null,
        settingsPosition: groupStyles?.position ?? null,
        row: document.querySelector('[data-header-settings-row]'),
        spacer: document.querySelector('[data-header-settings-spacer]'),
        scrollWidth: document.documentElement.scrollWidth,
        mainTop: rect(document.querySelector('main'))?.top ?? null,
      };
    });

  if ((await settingsButton.getAttribute('aria-expanded')) === 'true') {
    await settingsButton.evaluate((button) => button.click());
    await page.locator('[data-visual-settings-panel]').waitFor({ state: 'detached' });
  }
  const closedMetrics = await readMetrics();

  await settingsButton.evaluate((button) => button.click());
  await page.locator('[data-visual-settings-panel]:visible').waitFor({ state: 'visible' });
  await waitForVisualStability(page);
  const metrics = await readMetrics();

  assert(metrics.settings, `Le panneau flottant ${width}px est absent.`);
  assert(metrics.group, `Le groupe flottant ${width}px est absent.`);
  assert(metrics.settingsPosition === 'fixed', `Le panneau ${width}px doit être fixe.`);
  assert(!metrics.row && !metrics.spacer, `Le panneau ${width}px modifie le flux du header.`);
  assert(
    Math.abs(metrics.header.height - metrics.bar.height) < 1 &&
      Math.abs(closedMetrics.header.height - closedMetrics.bar.height) < 1,
    `La barre principale ${width}px n'a pas une hauteur autonome.`
  );
  assert(
    Math.abs(metrics.header.height - closedMetrics.header.height) < 1,
    `Le header ${width}px grandit à l'ouverture des réglages.`
  );
  assert(
    metrics.settings.left >= 8 - 1 && metrics.settings.right <= width - 8 + 1,
    `Le panneau flottant ${width}px sort des marges de sécurité.`
  );
  assert(
    metrics.settings.top >= metrics.trigger.bottom - 1,
    `Le panneau flottant ${width}px n'est pas sous l'engrenage.`
  );
  const expectedRight = Math.min(
    width - 8,
    Math.max(8 + metrics.settings.width, metrics.trigger.right)
  );
  assert(
    Math.abs(metrics.settings.right - expectedRight) < 2,
    `Le panneau flottant ${width}px n'est pas aligné sur l'engrenage.`
  );
  assert(
    metrics.settings.width <= width - 16 + 1 &&
      Math.abs(metrics.settings.width - metrics.group.width) < 1,
    `La largeur du panneau ${width}px ne correspond pas aux quatre commandes.`
  );
  assert(metrics.controls, `Les commandes ${width}px sont absentes.`);
  for (const [index, control] of metrics.controlRects.entries()) {
    assert(control.width >= 24 && control.height >= 24, `Commande ${index + 1} trop petite.`);
    assert(
      Math.abs(control.top - metrics.controls.top) < 2 &&
        control.bottom <= metrics.controls.bottom + 1,
      `Les quatre commandes ${width}px ne restent pas sur une ligne.`
    );
  }
  for (let index = 1; index < metrics.controlRects.length; index += 1) {
    assert(
      metrics.controlRects[index - 1].right <= metrics.controlRects[index].left + 1,
      `Les commandes ${width}px se chevauchent.`
    );
  }
  assert(
    metrics.settingsBackground === metrics.headerBackground,
    `Le panneau ${width}px n'utilise pas le fond du header.`
  );
  assert(
    metrics.scrollWidth <= width + 1 &&
      Math.abs(metrics.mainTop - closedMetrics.mainTop) < 1,
    `Le panneau ${width}px pousse ou élargit le contenu.`
  );

  return metrics;
}

async function assertColorVisionSubmenuLayout(width) {
  await page.setViewportSize({ width, height: 800 });
  await waitForVisualStability(page);
  const settingsButton = page
    .locator('button[aria-label="Paramètres"]:visible, button[aria-label="Settings"]:visible')
    .first();
  if ((await settingsButton.getAttribute('aria-expanded')) !== 'true') {
    await settingsButton.evaluate((button) => button.click());
  }
  await page.locator('[data-visual-settings-panel]:visible').waitFor({ state: 'visible' });
  const glassesButton = page.locator('[data-settings-color-vision-trigger="true"]:visible').first();
  await glassesButton.evaluate((button) => button.click());
  const options = page.locator('[data-settings-color-vision-options][aria-hidden="false"]');
  await options.waitFor({ state: 'visible' });
  await waitForVisualStability(page);
  const metrics = await page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        left: value.left,
        width: value.width,
        height: value.height,
      };
    };
    const panel = document.querySelector('[data-visual-settings-panel]');
    const group = panel?.closest('[data-settings-group]');
    const block = group?.querySelector('[data-settings-color-vision-block]');
    const optionButtons = block ? [...block.querySelectorAll('button')] : [];
    const header = document.querySelector('header');
    const bar = document.querySelector('[data-header-bar]');
    const headerBackground = header?.firstElementChild
      ? getComputedStyle(header.firstElementChild).backgroundColor
      : null;
    const panelBackground = panel ? getComputedStyle(panel).backgroundColor : null;
    const blockBackground = block ? getComputedStyle(block).backgroundColor : null;
    return {
      panel: rect(panel),
      group: rect(group),
      block: rect(block),
      options: rect(group?.querySelector('[data-settings-color-vision-options]')),
      optionButtons: optionButtons.map((button) => ({
        rect: rect(button),
        tabIndex: button.tabIndex,
        labelRect: rect(button.querySelector('span')),
      })),
      header: rect(header),
      bar: rect(bar),
      headerBackground,
      panelBackground,
      blockBackground,
      row: document.querySelector('[data-header-settings-row]'),
      spacer: document.querySelector('[data-header-settings-spacer]'),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  assert(metrics.panel && metrics.block, `Les blocs CVD ${width}px sont absents.`);
  assert(!metrics.row && !metrics.spacer, `Le sous-menu CVD ${width}px modifie le flux.`);
  assert(
    Math.abs(metrics.header.height - metrics.bar.height) < 1,
    `Le header ${width}px grandit avec le sous-menu CVD.`
  );
  assert(
    metrics.panelBackground === metrics.headerBackground &&
      metrics.blockBackground === metrics.headerBackground,
    `Les fonds du panneau/CVD ${width}px ne correspondent pas à celui du header.`
  );
  assert(
    Math.abs(metrics.panel.width - metrics.block.width) < 1 &&
      Math.abs(metrics.panel.left - metrics.block.left) < 1 &&
      Math.abs(metrics.panel.right - metrics.block.right) < 1,
    `Le bloc CVD ${width}px n'a pas la largeur ou l'alignement du panneau.`
  );
  assert(
    metrics.options.top >= metrics.panel.bottom - 1,
    `Le bloc CVD ${width}px n'est pas sous le panneau principal.`
  );
  for (const [index, option] of metrics.optionButtons.entries()) {
    assert(option.rect.width >= 44 && option.rect.height >= 44, `Profil CVD ${index + 1} trop petit.`);
    assert(option.tabIndex === 0, `Profil CVD ${index + 1} non navigable.`);
    assert(
      option.rect.left >= metrics.block.left - 1 &&
        option.rect.right <= metrics.block.right + 1 &&
        option.labelRect &&
        option.labelRect.left >= option.rect.left - 1 &&
        option.labelRect.right <= option.rect.right + 1 &&
        option.labelRect.top >= option.rect.top - 1 &&
        option.labelRect.bottom <= option.rect.bottom + 1,
      `Libellé CVD ${index + 1} déborde de sa cellule.`
    );
    if (index > 0) {
      const previous = metrics.optionButtons[index - 1].rect;
      assert(
        previous.bottom <= option.rect.top + 1,
        `Les profils CVD ${width}px se chevauchent verticalement.`
      );
      assert(
        Math.abs(previous.left - option.rect.left) < 1 &&
          Math.abs(previous.right - option.rect.right) < 1,
        `Les profils CVD ${width}px ne sont pas empilés sur toute la largeur.`
      );
    }
  }
  assert(metrics.scrollWidth <= width + 1, `Le sous-menu CVD ${width}px provoque un débordement.`);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const trigger = [...document.querySelectorAll('[data-settings-color-vision-trigger="true"]')].find(
      (element) => window.getComputedStyle(element).display !== 'none' && element.getClientRects().length > 0
    );
    return trigger?.getAttribute('aria-expanded') === 'false' && document.activeElement === trigger;
  });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => {
    const settings = document.querySelector(
      'button[aria-label="Paramètres"], button[aria-label="Settings"]'
    );
    return settings?.getAttribute('aria-expanded') === 'false' && document.activeElement === settings;
  });
  return metrics;
}

for (const width of [320, 375, 639, 640, 768, 1023, 1024, 1279, 1280, 1440]) {
  for (const scrollY of [0, 200]) await assertResponsiveSettingsPanel(width, scrollY);
}

// Le redimensionnement doit faire passer le panneau du bloc sous-header à la
// barre principale, puis revenir au même état après un nouveau changement.
const transitionWide = await assertResponsiveSettingsPanel(1920, 0);
const transitionNarrow = await assertResponsiveSettingsPanel(320, 0);
const transitionWideAgain = await assertResponsiveSettingsPanel(1920, 0);
assert(
  transitionWide.viewportWidth === 1920 &&
    transitionNarrow.viewportWidth === 320 &&
    transitionWideAgain.viewportWidth === 1920,
  'La géométrie mesurée ne suit pas les redimensionnements successifs.'
);

// Un changement de langue ferme le panneau, conserve une sélection explicite
// et doit permettre de le rouvrir sans débordement ni perte de placement.
const englishLanguage = page.getByRole('button', { name: 'English' }).first();
assert(
  (await englishLanguage.getAttribute('aria-pressed')) === 'false',
  'English ne doit pas être sélectionné au départ.'
);
await englishLanguage.evaluate((button) => button.click());
await page.waitForFunction(() => Boolean(document.querySelector('button[aria-label="Settings"]')));
assert(
  (await page.locator('[data-visual-settings-panel]').count()) === 0,
  'Le changement de langue doit fermer le panneau.'
);
const englishSettings = page.locator('button[aria-label="Settings"]:visible').first();
await englishSettings.evaluate((button) => button.click());
await page.locator('[data-visual-settings-panel]:visible').waitFor({ state: 'visible' });
await assertResponsiveSettingsPanel(1024, 0);
assert(
  (await page.getByRole('button', { name: 'English' }).first().getAttribute('aria-pressed')) ===
    'true',
  'English doit rester sélectionné après la réouverture.'
);
await page
  .getByRole('button', { name: 'Français' })
  .first()
  .evaluate((button) => button.click());
await page.waitForFunction(() =>
  Boolean(document.querySelector('button[aria-label="Paramètres"]'))
);
await clickSettings();
assert(
  (await page.getByRole('button', { name: 'Français' }).first().getAttribute('aria-pressed')) ===
    'true',
  'Français doit être resélectionné après le retour de langue.'
);

for (const width of [320, 375, 640, 1440, 1902]) await assertColorVisionSubmenuLayout(width);

for (const width of [1440, 1902]) await assertFocusRestorationCycles(width);

await page.setViewportSize({ width: 1280, height: 800 });
if ((await settings.getAttribute('aria-expanded')) === 'false') await clickSettings();
assert(
  (await settings.getAttribute('aria-expanded')) === 'true',
  'Le panneau doit être ouvert avant le test du second clic.'
);
await clickSettings();
assert(
  (await settings.getAttribute('aria-expanded')) === 'false',
  'Le second clic doit fermer le panneau.'
);
await settings.focus();
await settings.press('Enter');
await page.locator('[data-visual-settings-panel]').waitFor({ state: 'visible' });
await page.keyboard.press('Escape');
assert((await settings.getAttribute('aria-expanded')) === 'false', 'Echap doit fermer le panneau.');
assert(
  await settings.evaluate((element) => element === document.activeElement),
  'Echap doit restituer le focus au bouton Paramètres.'
);
await clickSettings();

let state = await readVisualState();
assert(state.theme === 'dark', 'Le clic doit activer le thème sombre.');
assert(state.page === '2 6 23', `La page sombre attend 2 6 23, reçu ${state.page}.`);
assert(state.surface === '15 23 42', `La surface sombre attend 15 23 42, reçu ${state.surface}.`);

const expectedProfiles = {
  protanopia: '139 227 185',
  deuteranopia: '86 180 233',
  tritanopia: '86 197 150',
};

for (const [profile, expectedSuccess] of Object.entries(expectedProfiles)) {
  const glasses = page.getByRole('button', { name: 'Mode daltonien' }).first();
  if ((await glasses.getAttribute('aria-expanded')) !== 'true')
    await glasses.evaluate((button) => button.click());
  const label = {
    protanopia: 'Protanopie',
    deuteranopia: 'Deutéranopie',
    tritanopia: 'Tritanopie',
  }[profile];
  await page
    .getByRole('button', { name: label })
    .first()
    .evaluate((button) => button.click());
  state = await readVisualState();
  assert(state.theme === 'dark', `Le profil ${profile} doit se combiner au thème sombre.`);
  assert(state.colorVision === profile, `Le profil ${profile} doit être actif.`);
  assert(
    state.success === expectedSuccess,
    `Le succès ${profile} attend ${expectedSuccess}, reçu ${state.success}.`
  );
}

await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('main').waitFor({ state: 'visible' });
state = await readVisualState();
assert(
  state.theme === 'dark' && state.colorVision === 'tritanopia',
  'Le reload doit persister la combinaison.'
);
assert(
  state.page === '31 12 3' && state.success === '86 197 150',
  'Le reload doit restaurer les couleurs calculées.'
);

const combinations = [];
for (const theme of ['light', 'dark']) {
  for (const colorVision of ['standard', 'protanopia', 'deuteranopia', 'tritanopia']) {
    await page.evaluate(
      ({ storageKey, theme, colorVision }) => {
        localStorage.setItem(storageKey, JSON.stringify({ theme, colorVision }));
      },
      { storageKey: STORAGE_KEY, theme, colorVision }
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('main').waitFor({ state: 'visible' });
    const combination = await readVisualState();
    assert(combination.theme === theme, `Thème ${theme} non appliqué.`);
    assert(combination.colorVision === colorVision, `Profil ${colorVision} non appliqué.`);
    combinations.push(combination);
  }
}
for (const theme of ['light', 'dark']) {
  assert(
    new Set(
      combinations
        .filter((item) => item.theme === theme)
        .map((item) => `${item.success}/${item.info}/${item.page}`)
    ).size === 4,
    `Les quatre profils ${theme} doivent produire quatre couleurs sémantiques distinctes.`
  );
}
assert(
  new Set(combinations.map((item) => `${item.bodyBackground}/${item.bodyColor}`)).size === 8,
  'Les huit combinaisons doivent produire huit styles structurels distincts.'
);

// Second clic sur un profil actif : retour au standard.
await clickSettings();
const glassesButton = page.getByRole('button', { name: /daltonien/i }).first();
await glassesButton.evaluate((button) => button.click());
await page
  .getByRole('button', { name: /Tritanopie/i })
  .first()
  .evaluate((button) => button.click());
state = await readVisualState();
assert(state.colorVision === 'standard', 'Le second clic profil doit revenir au standard.');

// Le clic extérieur ferme le panneau comme Échap, déjà vérifié plus haut.
if ((await settings.getAttribute('aria-expanded')) !== 'true') await clickSettings();
await page.locator('main').click({ position: { x: 2, y: 2 }, force: true });
assert(
  (await settings.getAttribute('aria-expanded')) === 'false',
  'Le clic extérieur doit fermer.'
);

// Une écriture réelle dans un second onglet doit être propagée par l'événement storage.
const secondPage = await context.newPage();
await secondPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
await secondPage.locator('main').waitFor({ state: 'visible' });
await secondPage.evaluate((storageKey) => {
  localStorage.setItem(storageKey, JSON.stringify({ theme: 'dark', colorVision: 'deuteranopia' }));
}, STORAGE_KEY);
await page.waitForFunction(
  () =>
    document.documentElement.dataset.sailinglocTheme === 'dark' &&
    document.documentElement.dataset.sailinglocColorVision === 'deuteranopia'
);
await secondPage.close();

// Une fenêtre de 640/320 CSS px simule le reflow attendu à 200/400 % depuis
// 1280 px. Le panneau reste ouvert afin de vérifier aussi ses limites réelles.
await clickSettings();
for (const [width, zoom] of [
  [640, 200],
  [320, 400],
]) {
  const metrics = await assertResponsiveSettingsPanel(width, 0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert(overflow <= 1, `Défilement horizontal au reflow ${zoom} %: ${overflow}px.`);
  assert(
    metrics.settings.left >= 8 && metrics.settings.right <= width - 8,
    `Le panneau sort de l'écran au reflow ${zoom} %.`
  );
}
await clickSettings();

await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
const systemState = await page.evaluate(() => {
  const probe = document.querySelector('[class*="animate-"]');
  const media = [...document.querySelectorAll('img, video, picture, canvas, .leaflet-tile')];
  return {
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    forced: matchMedia('(forced-colors: active)').matches,
    animationDuration: probe ? getComputedStyle(probe).animationDuration : null,
    filteredMedia: media.filter((element) => getComputedStyle(element).filter !== 'none').length,
    brokenImages: [...document.images].filter(
      (image) => image.complete && image.currentSrc && image.naturalWidth === 0
    ).length,
  };
});
assert(systemState.reduced, 'La réduction des mouvements doit être émulée.');
assert(systemState.forced, 'Les couleurs forcées doivent être émulées.');
if (systemState.animationDuration)
  assert(systemState.animationDuration === '0.01ms', 'Une animation reste active en mode réduit.');
assert(systemState.filteredMedia === 0, 'Un média ou une tuile est filtré.');
assert(systemState.brokenImages === 0, 'Une image chargée est cassée.');

// Une session neuve révèle le header avec une transition transform. Le panneau
// étant fixé au viewport, sa position doit suivre le bouton à chaque frame
// pendant cette animation, sans modifier le flux de la page.
async function assertIntroPanelTracking(width) {
  const introContext = await browser.newContext({ viewport: { width, height: 800 } });
  await introContext.addInitScript(({ consentKey }) => {
    localStorage.setItem(
      consentKey,
      JSON.stringify({
        version: 2,
        date: new Date().toISOString(),
        purposes: { analytics: false, ads: false, personalization: false },
      })
    );
    sessionStorage.removeItem('sailingloc:intro-seen');
    sessionStorage.removeItem('sailingloc:intro-revealed');
  }, { consentKey: CONSENT_KEY });

  const introPage = await introContext.newPage();
  try {
    await introPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await introPage.locator('main').waitFor({ state: 'visible' });
    const settings = introPage.locator('button[aria-label="Paramètres"]');
    await settings.evaluate((button) => button.click());
    await introPage.locator('[data-visual-settings-panel]:visible').waitFor({ state: 'visible' });
    await introPage.waitForFunction(() => {
      const header = document.querySelector('header');
      const transform = header ? getComputedStyle(header).transform : 'none';
      return transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)';
    });

    await introPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('sailingloc:intro-reveal'));
    });
    const samples = await introPage.evaluate(async () => {
      const header = document.querySelector('header');
      const trigger = document.querySelector('button[aria-label="Paramètres"]');
      const panel = document.querySelector('[data-visual-settings-panel]');
      const main = document.querySelector('main');
      const headerHeight = header?.getBoundingClientRect().height ?? null;
      const mainTop = main?.getBoundingClientRect().top ?? null;
      const values = [];
      const startedAt = performance.now();
      while (performance.now() - startedAt < 700) {
        const triggerRect = trigger?.getBoundingClientRect();
        const panelRect = panel?.getBoundingClientRect();
        values.push({
          delta: panelRect && triggerRect ? panelRect.top - triggerRect.bottom : null,
          headerHeight: header?.getBoundingClientRect().height ?? null,
          mainTop: main?.getBoundingClientRect().top ?? null,
        });
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return { values, headerHeight, mainTop };
    });

    assert(samples.values.length >= 10, `Trop peu de frames de suivi à ${width}px.`);
    for (const [index, sample] of samples.values.entries()) {
      assert(
        sample.delta !== null && sample.delta >= -1,
        `Le panneau passe au-dessus ou chevauche le bouton à ${width}px/frame ${index}.`
      );
      assert(
        sample.delta === null || (sample.delta >= 4 && sample.delta <= 12),
        `L'écart du panneau est anormal à ${width}px/frame ${index}: ${sample.delta}px.`
      );
      assert(
        samples.headerHeight !== null && Math.abs(sample.headerHeight - samples.headerHeight) < 1,
        `La hauteur du header change pendant l'intro à ${width}px.`
      );
      assert(
        samples.mainTop !== null && Math.abs(sample.mainTop - samples.mainTop) < 1,
        `Le flux principal change pendant l'intro à ${width}px.`
      );
    }
    assert(
      (await introPage.evaluate(() => document.documentElement.scrollWidth)) <= width + 1,
      `Le suivi du panneau provoque un débordement à ${width}px.`
    );
  } finally {
    await introContext.close();
  }
}

for (const width of [375, 1024]) await assertIntroPanelTracking(width);

await browser.close();
console.log('Préférences visuelles interactives : OK');
