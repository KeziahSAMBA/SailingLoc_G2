import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeVisualPreferences } from '../../frontend/src/utils/visualPreferences.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CSS = readFileSync(resolve(ROOT, 'frontend/src/index.css'), 'utf8');

const PALETTES = {
  'light/protanopia': {
    success: ['0 122 158', 'rgb(232 247 250)', '0 90 117'],
    warning: ['184 107 0', 'rgb(255 245 223)', '122 69 0'],
    danger: ['167 55 121', 'rgb(252 234 244)', '118 33 81'],
    info: ['78 95 210', 'rgb(238 240 255)', '55 63 155'],
    charts: ['0 114 178', '230 159 0', '204 121 167', '0 158 115', '111 76 155'],
    map: ['0 122 158', '118 33 81'],
  },
  'dark/protanopia': {
    success: ['94 208 242', 'rgb(94 208 242 / 0.15)', '94 208 242'],
    warning: ['255 193 90', 'rgb(255 193 90 / 0.15)', '255 193 90'],
    danger: ['240 138 194', 'rgb(240 138 194 / 0.15)', '240 138 194'],
    info: ['156 168 255', 'rgb(156 168 255 / 0.15)', '156 168 255'],
    charts: ['86 180 233', '255 193 90', '240 138 194', '94 208 179', '185 160 232'],
    map: ['94 208 242', '240 138 194'],
  },
  'light/deuteranopia': {
    success: ['0 107 182', 'rgb(232 243 252)', '0 81 143'],
    warning: ['166 106 0', 'rgb(255 246 222)', '112 69 0'],
    danger: ['166 62 120', 'rgb(252 234 244)', '119 32 79'],
    info: ['102 89 199', 'rgb(240 238 255)', '68 53 143'],
    charts: ['68 119 170', '204 187 68', '170 51 119', '34 136 51', '102 102 102'],
    map: ['0 107 182', '166 62 120'],
  },
  'dark/deuteranopia': {
    success: ['103 183 255', 'rgb(103 183 255 / 0.15)', '103 183 255'],
    warning: ['255 196 91', 'rgb(255 196 91 / 0.15)', '255 196 91'],
    danger: ['229 138 188', 'rgb(229 138 188 / 0.15)', '229 138 188'],
    info: ['175 161 255', 'rgb(175 161 255 / 0.15)', '175 161 255'],
    charts: ['119 170 221', '232 212 91', '238 153 187', '102 204 153', '187 187 187'],
    map: ['103 183 255', '229 138 188'],
  },
  'light/tritanopia': {
    success: ['11 123 89', 'rgb(232 248 241)', '8 96 68'],
    warning: ['181 74 0', 'rgb(255 240 230)', '132 53 0'],
    danger: ['180 35 60', 'rgb(253 236 239)', '143 25 48'],
    info: ['118 73 168', 'rgb(244 237 252)', '87 48 128'],
    charts: ['0 158 115', '213 94 0', '204 121 167', '122 62 157', '85 85 85'],
    map: ['8 127 91', '180 35 60'],
  },
  'dark/tritanopia': {
    success: ['82 214 162', 'rgb(82 214 162 / 0.15)', '82 214 162'],
    warning: ['255 154 98', 'rgb(255 154 98 / 0.15)', '255 154 98'],
    danger: ['255 135 149', 'rgb(255 135 149 / 0.15)', '255 135 149'],
    info: ['201 160 255', 'rgb(201 160 255 / 0.15)', '201 160 255'],
    charts: ['82 214 162', '255 154 98', '240 138 194', '201 160 255', '199 203 209'],
    map: ['82 214 162', '255 135 149'],
  },
};

function paletteBlock(theme, profile) {
  const selector =
    `html\\[data-sailingloc-theme=['"]${theme}['"]\\]` +
    `\\[data-sailingloc-color-vision=['"]${profile}['"]\\]`;
  const match = CSS.match(new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'u'));
  expect(match).not.toBeNull();
  return match[1];
}

function token(block, name) {
  const match = block.match(new RegExp(`--sl-${name}:\\s*([^;]+);`, 'u'));
  expect(match).not.toBeNull();
  return match[1].trim();
}

function channels(value) {
  return value
    .match(/\d+(?:\.\d+)?/gu)
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
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function blend(foreground, background, alpha) {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
}

describe('matrice des profils de vision des couleurs', () => {
  it.each(Object.entries(PALETTES))('déclare exactement la palette %s', (combination, expected) => {
    const [theme, profile] = combination.split('/');
    const block = paletteBlock(theme, profile);

    for (const status of ['success', 'warning', 'danger', 'info']) {
      expect([
        token(block, status),
        token(block, `${status}-surface`),
        token(block, `${status}-text`),
      ]).toEqual(expected[status]);
    }
    expect(Array.from({ length: 5 }, (_, index) => token(block, `chart-${index + 1}`))).toEqual(
      expected.charts
    );
    expect([token(block, 'map-available'), token(block, 'map-unavailable')]).toEqual(expected.map);
    expect(token(block, 'calendar-available')).toBe(expected.success[0]);
    expect(token(block, 'calendar-selected')).toBe(expected.info[0]);
    expect(token(block, 'calendar-reserved')).toBe(expected.danger[0]);
  });

  it('accepte les huit combinaisons thème et profil sans modifier les tokens structurels', () => {
    const profiles = ['standard', 'protanopia', 'deuteranopia', 'tritanopia'];
    for (const theme of ['light', 'dark']) {
      for (const colorVision of profiles) {
        expect(normalizeVisualPreferences({ theme, colorVision })).toEqual({ theme, colorVision });
      }
    }
    for (const [combination] of Object.entries(PALETTES)) {
      const [theme, profile] = combination.split('/');
      const block = paletteBlock(theme, profile);
      expect(block).not.toMatch(/--sl-(?:page|surface|content|brand|glass|overlay):/u);
    }
  });

  it('respecte les contrastes WCAG des textes de statut et des indicateurs', () => {
    for (const [combination, palette] of Object.entries(PALETTES)) {
      const dark = combination.startsWith('dark/');
      const page = dark ? [2, 6, 23] : [248, 250, 252];
      const structuralSurface = dark ? [15, 23, 42] : null;
      for (const status of ['success', 'warning', 'danger', 'info']) {
        const accent = channels(palette[status][0]);
        const surface = dark
          ? blend(accent, structuralSurface, 0.15)
          : channels(palette[status][1]);
        const text = channels(palette[status][2]);
        expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(accent, page)).toBeGreaterThanOrEqual(3);
      }
    }
    expect(contrast([10, 82, 122], [248, 250, 252])).toBeGreaterThanOrEqual(3);
    expect(contrast([125, 211, 252], [2, 6, 23])).toBeGreaterThanOrEqual(3);
  });

  it('garde les profils distincts et ne filtre aucun média', () => {
    const signatures = Object.values(PALETTES).map((palette) => JSON.stringify(palette));
    expect(new Set(signatures).size).toBe(6);
    expect(CSS).not.toMatch(/\b(?:img|video|picture|canvas|\.leaflet-tile)\s*\{[^}]*filter:/su);
    expect(CSS).not.toMatch(/data-sailingloc-color-vision[^}]*filter:/su);
  });
});

describe('sélection des profils', () => {
  it('revient au standard au second clic et reste indépendante du thème', () => {
    const settings = readFileSync(
      resolve(ROOT, 'frontend/src/components/common/Header/shared/SettingsMenu.jsx'),
      'utf8'
    );
    expect(settings).toContain("setColorVision(colorVision === value ? 'standard' : value)");
    expect(settings).toContain("setTheme(theme === 'dark' ? 'light' : 'dark')");
    expect(settings).toContain("aria-pressed={colorVision !== 'standard'}");
    expect(settings.match(/value: '(?:protanopia|deuteranopia|tritanopia)'/gu)).toHaveLength(3);
  });
});
