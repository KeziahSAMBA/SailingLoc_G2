import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FRONTEND_SRC = resolve(ROOT, 'frontend/src');

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

/**
 * Returns one complete CSS block, including nested braces. This keeps the
 * assertions scoped to the base theme and to the dark theme instead of
 * accidentally reading a similarly named token in a later profile block.
 */
function cssBlock(css, selector) {
  let start = css.indexOf(selector);
  expect(start).toBeGreaterThanOrEqual(0);

  while (start >= 0) {
    const open = css.indexOf('{', start);
    expect(open).toBeGreaterThan(start);

    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === '{') depth += 1;
      if (css[index] === '}' && --depth === 0) {
        const candidate = css.slice(open + 1, index);
        // Theme blocks contain tokens; skip nested selectors that happen to
        // share the same prefix (for example the dark border override).
        if (candidate.includes('--sl-page:')) return candidate;
        break;
      }
    }
    start = css.indexOf(selector, open + 1);
  }

  throw new Error(`Bloc CSS non fermé : ${selector}`);
}

function tokenValue(block, token) {
  const match = block.match(new RegExp(`${token}:\\s*([^;]+);`, 'u'));
  expect(match).not.toBeNull();
  return match[1].trim();
}

function rgb(value) {
  const channels = value.match(/\d+(?:\.\d+)?/gu);
  expect(channels).not.toBeNull();
  return channels.slice(0, 3).map(Number);
}

function luminance(value) {
  return rgb(value)
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function frontendSourceFiles(directory = FRONTEND_SRC) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return frontendSourceFiles(path);
    return /\.(?:css|js|jsx|mjs)$/u.test(entry.name) ? [path] : [];
  });
}

describe('intégration transversale des thèmes visuels', () => {
  it('intègre le panneau de préférences dans le header sans portail ni superposition', () => {
    const settings = source('frontend/src/components/common/Header/shared/SettingsMenu.jsx');
    const shell = source('frontend/src/components/common/Header/shared/HeaderShell.jsx');

    expect(settings).toContain('data-visual-settings-panel="true"');
    expect(settings).toContain('className="contents"');
    expect(settings).toContain('order-last basis-full');
    expect(settings).toContain('sm:order-none sm:basis-auto');
    expect(settings).toContain('aria-hidden={!colorVisionOpen}');
    expect(settings).toContain('tabIndex={colorVisionOpen ? 0 : -1}');
    expect(settings).not.toContain('createPortal');
    expect(settings).not.toContain('panelContainerRef');
    expect(settings).not.toMatch(/className=.*\babsolute\b.*settings/u);

    expect(shell).toContain('settingsOpen');
    expect(shell).toContain('settingsHeight');
    expect(shell).toContain('data-header-settings-spacer="true"');
    expect(shell).toContain('className="absolute inset-0 -z-10"');
    expect(shell).not.toContain('settingsPanelRef');
  });

  it('sélectionne Voyager en clair et dark_all en mode nuit sans modifier les tuiles', () => {
    const map = source('frontend/src/components/common/MapView.jsx');

    expect(map).toContain('useVisualPreferences');
    expect(map).toContain(
      "light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'"
    );
    expect(map).toContain("dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'");
    expect(map).toContain(
      "const tileUrl = theme === 'dark' ? CARTO_TILE_URLS.dark : CARTO_TILE_URLS.light;"
    );
    expect(map).toContain('url={tileUrl}');
    expect(map).toContain('carto.com/attributions');
    expect(map).not.toContain('key={theme}');
    expect(map).not.toMatch(/\.leaflet-tile[^}]*\bfilter\s*:/u);
  });

  it('conserve un glass clair, un remplissage noir en nuit et une bordure visible', () => {
    const css = source('frontend/src/index.css');
    const tailwind = source('frontend/tailwind.config.js');
    const root = cssBlock(css, ':root');
    const dark = cssBlock(css, "html[data-sailingloc-theme='dark']");

    expect(tokenValue(root, '--sl-glass-fill')).toBe('255 255 255');
    expect(tokenValue(root, '--sl-glass-border')).toBe('255 255 255');
    expect(tokenValue(dark, '--sl-glass-fill')).toBe('0 0 0');
    expect(tokenValue(dark, '--sl-glass-border')).toBe('226 232 240');
    expect(css).toContain('.sailingloc-glass-shadow');
    expect(tailwind).toContain("'glass-fill': 'rgb(var(--sl-glass-fill) / <alpha-value>)'");
    expect(tailwind).toContain("'glass-border': 'rgb(var(--sl-glass-border) / <alpha-value>)'");

    const darkSurface = `rgb(${tokenValue(dark, '--sl-surface')})`;
    const darkBorder = `rgb(${tokenValue(dark, '--sl-glass-border')})`;
    expect(contrast(darkBorder, darkSurface)).toBeGreaterThanOrEqual(3);
  });

  it('renforce les voiles des photographies en mode nuit sur les écrans publics et privés', () => {
    const css = source('frontend/src/index.css');
    const root = cssBlock(css, ':root');
    const dark = cssBlock(css, "html[data-sailingloc-theme='dark']");
    const lightOverlayTokens = [
      ...root.matchAll(/(--sl-photo-overlay-[\w-]*-opacity):\s*([\d.]+);/gu),
    ];

    expect(lightOverlayTokens.length).toBeGreaterThanOrEqual(9);
    for (const [, token, lightValue] of lightOverlayTokens) {
      const darkValue = Number(tokenValue(dark, token));
      expect(darkValue).toBeGreaterThan(Number(lightValue));
    }

    expect(css).toContain('.sailingloc-photo-overlay');
    expect(css).toContain('background-color: rgb(var(--sl-overlay))');
    for (const relativePath of [
      'frontend/src/pages/HomePage.jsx',
      'frontend/src/pages/ReservationPage.jsx',
      'frontend/src/pages/MyDocumentsPage.jsx',
      'frontend/src/components/locataire/LocataireLayout.jsx',
      'frontend/src/components/proprietaire/ProprietaireLayout.jsx',
      'frontend/src/components/admin/AdminLayout.jsx',
    ]) {
      expect(source(relativePath)).toMatch(/sailingloc-photo-overlay--/u);
    }
  });

  it('n’applique aucun filtre CSS aux images, vidéos, canvas ou tuiles Leaflet', () => {
    const violations = [];

    for (const path of frontendSourceFiles()) {
      const text = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '');
      for (const match of text.matchAll(/([^{}]+)\{([^{}]*)\}/gsu)) {
        const [, selector, body] = match;
        if (
          /(?:\bimg\b|\bvideo\b|\bpicture\b|\bcanvas\b|\.leaflet-tile)/iu.test(selector) &&
          /\bfilter\s*:/iu.test(body)
        ) {
          violations.push(`${relative(FRONTEND_SRC, path)}: ${selector.trim()}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('préserve les valeurs de référence du thème clair', () => {
    const css = source('frontend/src/index.css');
    const root = cssBlock(css, ':root');

    for (const [token, expected] of Object.entries({
      '--sl-page': '248 250 252',
      '--sl-surface': '255 255 255',
      '--sl-content': '15 23 42',
      '--sl-content-muted': '71 85 105',
      '--sl-brand': '90 180 236',
      '--sl-brand-navy': '10 49 114',
      '--sl-action': '14 165 233',
      '--sl-glass-fill': '255 255 255',
      '--sl-glass-border': '255 255 255',
      '--sl-photo-overlay-boat-opacity': '0.5',
      '--sl-photo-overlay-dashboard-opacity': '0.4',
      '--sl-photo-overlay-footer-opacity': '0.6',
    })) {
      expect(tokenValue(root, token)).toBe(expected);
    }

    expect(css).not.toMatch(/:root\[data-sailingloc-(?:theme|color-vision)/u);
  });
});
