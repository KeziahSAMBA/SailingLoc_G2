import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CSS = readFileSync(resolve(ROOT, 'frontend/src/index.css'), 'utf8');

const THEMES = ['light', 'dark'];
const PROFILES = ['standard', 'protanopia', 'deuteranopia', 'tritanopia'];

/*
 * Contrat de contexte pour l'interface visuelle. Les premiers noms de chaque
 * liste sont les tokens dédiés attendus par les composants. Les alias
 * historiques restent acceptés pendant la migration afin que ce garde-fou
 * puisse être intégré avant le changement simultané de tous les composants.
 * Dans tous les cas, le contraste est mesuré dans le contexte réel et non
 * uniquement sur le fond de la page.
 */
const CONTEXT_TOKENS = {
  'header-bar-bg': ['header-bar-bg', 'brand-navy', 'dark-surface'],
  'header-text': ['header-text', 'on-dark'],
  'header-icon': ['header-icon', 'on-dark'],
  'header-settings-bg': ['header-settings-bg', 'brand-navy', 'dark-surface'],
  'header-settings-text': ['header-settings-text', 'on-dark', 'header-panel-scrolled-text'],
  'header-focus': ['header-focus', 'on-dark', 'brand-focus'],
  'photo-surface': ['photo-surface', 'dark-surface', 'home-sea'],
  'photo-text': ['photo-text', 'on-dark', 'content-bright'],
  'photo-action': ['photo-action', 'action-bright', 'brand-soft'],
  'photo-action-hover': ['photo-action-hover', 'action-bright', 'brand-soft'],
  'photo-icon': ['photo-icon', 'action-bright', 'brand-soft'],
  'surface-link': ['surface-link', 'brand-text', 'brand-navy', 'action-deep'],
  'surface-link-hover': ['surface-link-hover', 'brand-focus', 'action-deep', 'brand-hover'],
  'control-border': ['control-border', 'field-border-strong', 'field-border'],
  'focus-ring': ['focus-ring', 'brand-focus', 'field-border-strong'],
};

const HEADER_FILES = [
  'src/components/common/Header/Header.jsx',
  'src/components/common/Header/DashboardHeader.jsx',
  'src/components/common/Header/shared/HeaderDropdown.jsx',
  'src/components/common/Header/shared/HeaderLogo.jsx',
  'src/components/common/Header/shared/HeaderShell.jsx',
  'src/components/common/Header/shared/PanelLink.jsx',
  'src/components/common/Header/shared/SettingsMenu.jsx',
  'src/components/common/Header/shared/SidePanel.jsx',
  'src/components/common/Header/shared/BurgerIcon.jsx',
  'src/components/common/Header/shared/hoverUnderline.js',
];

const PHOTO_FILES = [
  'src/pages/AboutPage.jsx',
  'src/pages/ContactPage.jsx',
  'src/pages/CategoryPage.jsx',
  'src/pages/ProductPage.jsx',
  'src/components/common/ClientReviews.jsx',
];

const RAW_COLOR = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch|color)\([^)]*\)/giu;
const DIRECT_TAILWIND =
  /\b(?:text|bg|border|ring|from|via|to|divide|placeholder|fill|stroke|decoration|accent|shadow)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d+)?(?:\/\d+)?|\b(?:text|bg|border|ring|from|via|to|divide|placeholder|fill|stroke|decoration|accent|shadow)-\[(?:#|rgba?|hsla?|oklch|color)[^\]]+\]/giu;
const GENERIC_CONTEXT_COLOR = /\btext-(?:action|brand)(?![-\w])/gu;

function block(selector) {
  const start = CSS.indexOf(selector);
  if (start < 0) return null;
  const open = CSS.indexOf('{', start);
  if (open < 0) return null;
  let depth = 0;
  for (let index = open; index < CSS.length; index += 1) {
    if (CSS[index] === '{') depth += 1;
    if (CSS[index] === '}' && --depth === 0) return CSS.slice(open + 1, index);
  }
  return null;
}

function declarations(source) {
  const values = new Map();
  for (const match of source.matchAll(/--sl-([\w-]+)\s*:\s*([^;]+);/gu))
    values.set(match[1], match[2].trim());
  return values;
}

const ROOT_TOKENS = declarations(block(':root') ?? '');
const DARK_TOKENS = declarations(block("html[data-sailingloc-theme='dark']") ?? '');

function profileSelector(theme, colorVision) {
  if (colorVision === 'standard')
    return theme === 'dark' ? "html[data-sailingloc-theme='dark']" : ':root';
  return (
    "html[data-sailingloc-theme='" +
    theme +
    "'][data-sailingloc-color-vision='" +
    colorVision +
    "']"
  );
}

function tokenMaps(theme, colorVision) {
  const maps = [ROOT_TOKENS];
  if (theme === 'dark') maps.push(DARK_TOKENS);
  if (colorVision !== 'standard')
    maps.push(declarations(block(profileSelector(theme, colorVision)) ?? ''));
  return maps;
}

function tokenValue(name, theme, colorVision, seen = new Set()) {
  if (seen.has(name)) throw new Error('Référence circulaire du token --sl-' + name);
  seen.add(name);
  let value;
  for (const map of tokenMaps(theme, colorVision)) {
    if (map.has(name)) value = map.get(name);
  }
  if (value == null) return null;
  return value.replace(/var\(--sl-([\w-]+)\)/gu, (_match, nestedName) => {
    const nested = tokenValue(nestedName, theme, colorVision, new Set(seen));
    if (nested == null) throw new Error('Token --sl-' + nestedName + ' absent');
    return nested;
  });
}

function contextValue(context, theme, colorVision) {
  const aliases = CONTEXT_TOKENS[context] ?? [context];
  for (const alias of aliases) {
    const value = tokenValue(alias, theme, colorVision);
    if (value != null) return value;
  }
  return null;
}

function parseAlpha(value) {
  if (value == null) return 1;
  const normalized = value.trim();
  return normalized.endsWith('%') ? Number.parseFloat(normalized) / 100 : Number(normalized);
}

function parseColor(value) {
  if (value == null) return null;
  const normalized = value.trim();
  const rgbMatch = normalized.match(
    /^rgba?\(\s*([\d.]+)\s*[ ,]\s*([\d.]+)\s*[ ,]\s*([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/iu
  );
  if (rgbMatch)
    return {
      channels: rgbMatch.slice(1, 4).map(Number),
      alpha: parseAlpha(rgbMatch[4]),
    };

  const channels = normalized.match(/^([\d.]+)\s+([\d.]+)\s+([\d.]+)$/u);
  if (channels) return { channels: channels.slice(1, 4).map(Number), alpha: 1 };
  return null;
}

function colorToken(name, theme, colorVision) {
  return parseColor(tokenValue(name, theme, colorVision));
}

function contextColor(context, theme, colorVision) {
  return parseColor(contextValue(context, theme, colorVision));
}

function composite(foreground, background) {
  if (!foreground || !background) return null;
  const alpha = Math.max(0, Math.min(1, foreground.alpha));
  return {
    channels: foreground.channels.map(
      (channel, index) => channel * alpha + background.channels[index] * (1 - alpha)
    ),
    alpha: 1,
  };
}

function luminance(color) {
  return color.channels
    .map((channel) => channel / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function resolvedContextColor(name, theme, colorVision, underlayName = 'page') {
  const foreground = CONTEXT_TOKENS[name]
    ? contextColor(name, theme, colorVision)
    : colorToken(name, theme, colorVision);
  const underlay = colorToken(underlayName, theme, colorVision);
  return foreground?.alpha < 1 ? composite(foreground, underlay) : foreground;
}

function contrastInContext(foregroundName, backgroundName, theme, colorVision, underlayName) {
  const background = resolvedContextColor(backgroundName, theme, colorVision, underlayName);
  const foreground = CONTEXT_TOKENS[foregroundName]
    ? contextColor(foregroundName, theme, colorVision)
    : colorToken(foregroundName, theme, colorVision);
  if (!foreground || !background) return null;
  return contrast(
    foreground.alpha < 1 ? composite(foreground, background) : foreground,
    background
  );
}

function source(relative) {
  return readFileSync(resolve(ROOT, 'frontend', relative.replace(/^src[\\/]/u, 'src/')), 'utf8');
}

describe('contrastes contextuels des palettes daltoniennes', () => {
  it('résout un token sémantique pour chaque contexte dans les huit combinaisons', () => {
    const missing = [];
    const invalid = [];
    for (const theme of THEMES)
      for (const colorVision of PROFILES) {
        for (const [context, aliases] of Object.entries(CONTEXT_TOKENS)) {
          let value;
          try {
            value = contextValue(context, theme, colorVision);
          } catch (error) {
            invalid.push(
              theme +
                '/' +
                colorVision +
                '/' +
                context +
                ' (' +
                aliases.join(', ') +
                '): ' +
                error.message
            );
            continue;
          }
          if (value == null) missing.push(theme + '/' + colorVision + '/' + context);
          else if (!parseColor(value))
            invalid.push(theme + '/' + colorVision + '/' + context + ': ' + value);
        }
      }
    expect({ missing, invalid }).toEqual({ missing: [], invalid: [] });
  });

  it('respecte les seuils AA dans chaque contexte visuel', () => {
    const checks = [
      ['header-text', 'header-bar-bg', 4.5, 'home-sea'],
      ['header-icon', 'header-bar-bg', 3, 'home-sea'],
      ['header-settings-text', 'header-settings-bg', 4.5, 'header-bar-bg'],
      ['header-focus', 'header-settings-bg', 3, 'header-bar-bg'],
      ['photo-text', 'photo-surface', 4.5, 'home-sea'],
      ['photo-text', 'home-sea', 4.5, 'home-sea'],
      ['photo-action', 'photo-surface', 4.5, 'home-sea'],
      ['photo-action', 'home-sea', 4.5, 'home-sea'],
      ['photo-action-hover', 'photo-surface', 4.5, 'home-sea'],
      ['photo-action-hover', 'home-sea', 4.5, 'home-sea'],
      ['photo-icon', 'photo-surface', 3, 'home-sea'],
      ['photo-icon', 'home-sea', 3, 'home-sea'],
      ['surface-link', 'surface', 4.5, 'page'],
      ['surface-link', 'page', 4.5, 'page'],
      ['surface-link-hover', 'surface', 4.5, 'page'],
      ['control-border', 'surface', 3, 'page'],
      ['control-border', 'page', 3, 'page'],
      ['focus-ring', 'surface', 3, 'page'],
      ['focus-ring', 'page', 3, 'page'],
      ['action-text', 'action', 4.5, 'page'],
      ['action-text', 'action-hover', 4.5, 'page'],
    ];
    const failures = [];
    for (const theme of THEMES)
      for (const colorVision of PROFILES)
        for (const [foreground, background, minimum, underlay] of checks) {
          let ratio;
          try {
            ratio = contrastInContext(foreground, background, theme, colorVision, underlay);
          } catch (error) {
            failures.push(
              theme + '/' + colorVision + ' ' + foreground + '/' + background + ': ' + error.message
            );
            continue;
          }
          if (ratio == null || ratio < minimum)
            failures.push(
              theme +
                '/' +
                colorVision +
                ' ' +
                foreground +
                '/' +
                background +
                ': ' +
                (ratio == null ? 'invalide' : ratio.toFixed(2)) +
                ':1 < ' +
                minimum +
                ':1'
            );
        }
    expect(failures).toEqual([]);
  });

  it('branche le burger sur un token d’icône de header', () => {
    const burger = source('src/components/common/Header/shared/BurgerIcon.jsx');
    expect(burger).toMatch(/header-icon|currentColor|on-dark/iu);
    expect(burger).not.toMatch(/\bbg-surface\b/iu);
  });

  it('ne laisse pas de couleur directe dans le header ou ses panneaux', () => {
    const findings = [];
    for (const relative of HEADER_FILES) {
      const file = source(relative);
      const literals = (file.match(RAW_COLOR) ?? []).filter(
        (literal) => !literal.toLowerCase().includes('var(')
      );
      const tailwind = file.match(DIRECT_TAILWIND) ?? [];
      if (literals.length || tailwind.length) findings.push({ file: relative, literals, tailwind });
    }
    expect(findings).toEqual([]);
  });

  it('n’utilise pas les accents génériques sur les éléments des fonds photo', () => {
    const findings = [];
    for (const relative of PHOTO_FILES) {
      const generic = source(relative).match(GENERIC_CONTEXT_COLOR) ?? [];
      if (generic.length) findings.push({ file: relative, generic });
    }
    expect(findings).toEqual([]);
  });
});
