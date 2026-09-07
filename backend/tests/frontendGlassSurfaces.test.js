import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function token(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*([^;]+);`, 'u'));
  expect(match).not.toBeNull();
  return match[1].trim();
}

function rgb(value) {
  return value
    .match(/\d+(?:\.\d+)?/gu)
    .slice(0, 3)
    .map(Number);
}

function luminance(values) {
  return values
    .map((value) => value / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(first, second) {
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

function blend(foreground, background, alpha) {
  return foreground.map((value, index) => value * alpha + background[index] * (1 - alpha));
}

function block(css, selector) {
  let start = css.indexOf(selector);
  expect(start).toBeGreaterThanOrEqual(0);

  while (start >= 0) {
    const open = css.indexOf('{', start);
    let depth = 0;
    for (let index = open; index < css.length; index += 1) {
      if (css[index] === '{') depth += 1;
      if (css[index] === '}' && --depth === 0) {
        const candidate = css.slice(open + 1, index);
        if (candidate.includes('--sl-page:')) return candidate;
        break;
      }
    }
    start = css.indexOf(selector, open + 1);
  }
  throw new Error(`Bloc CSS non fermé : ${selector}`);
}

describe('surfaces vitrées thémables', () => {
  it('sépare le remplissage, la bordure et l’ombre tout en conservant le clair', () => {
    const css = source('frontend/src/index.css');
    const root = block(css, ':root');
    const dark = block(css, "html[data-sailingloc-theme='dark']");

    expect(root).toContain('--sl-glass-fill: 255 255 255');
    expect(root).toContain('--sl-glass-border: 255 255 255');
    expect(root).toContain('--sl-glass-shadow: 0 0 0');
    expect(dark).toContain('--sl-glass-fill: 0 0 0');
    expect(dark).toContain('--sl-glass-border: 226 232 240');
    expect(dark).toContain('--sl-glass-shadow: 0 0 0');
    expect(css).toContain('.sailingloc-glass-shadow');
  });

  it('déclare les trois tokens dans Tailwind et conserve glass comme bordure', () => {
    const tailwind = source('frontend/tailwind.config.js');
    expect(tailwind).toContain("glass: 'rgb(var(--sl-glass-border) / <alpha-value>)'");
    expect(tailwind).toContain("'glass-fill': 'rgb(var(--sl-glass-fill) / <alpha-value>)'");
    expect(tailwind).toContain("'glass-border': 'rgb(var(--sl-glass-border) / <alpha-value>)'");
    expect(tailwind).toContain("'glass-shadow': 'rgb(var(--sl-glass-shadow) / <alpha-value>)'");
  });

  it('garantit 3:1 pour les bordures glass composées réellement en mode nuit', () => {
    const css = source('frontend/src/index.css');
    const root = block(css, ':root');
    const dark = block(css, "html[data-sailingloc-theme='dark']");
    const border = rgb(token(dark, '--sl-glass-border'));
    const alpha = Number(token(dark, '--sl-glass-functional-alpha'));

    expect(token(root, '--sl-glass-functional-alpha')).toBe('0.2');
    expect(token(root, '--sl-glass-control-alpha')).toBe('0.3');
    expect(token(root, '--sl-glass-subtle-alpha')).toBe('0.15');
    expect(alpha).toBe(0.4);
    expect(token(dark, '--sl-glass-control-alpha')).toBe('0.4');
    expect(token(dark, '--sl-glass-subtle-alpha')).toBe('0.4');
    expect(css).toContain(
      'border-color: rgb(var(--sl-glass-border) / var(--sl-glass-functional-alpha));'
    );

    for (const surface of [
      [2, 6, 23],
      [8, 31, 43],
      [31, 18, 53],
      [54, 27, 12],
    ]) {
      expect(contrast(blend(border, surface, alpha), surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it('branche les cartes et champs publics sur le remplissage adaptatif', () => {
    for (const relativePath of [
      'frontend/src/components/common/BoatReviews.jsx',
      'frontend/src/components/common/ClientReviews.jsx',
      'frontend/src/components/common/FilterBar.jsx',
      'frontend/src/components/common/FilAriane.jsx',
      'frontend/src/components/common/SearchBar.jsx',
      'frontend/src/components/common/ShareButton.jsx',
      'frontend/src/pages/CategoryPage.jsx',
      'frontend/src/pages/ProductPage.jsx',
      'frontend/src/components/common/Footer.jsx',
    ]) {
      expect(source(relativePath)).toContain('--sl-glass-');
    }
  });

  it('ne conserve pas de blanc direct pour les remplissages glass migrés', () => {
    for (const relativePath of [
      'frontend/src/components/common/BoatReviews.jsx',
      'frontend/src/components/common/ClientReviews.jsx',
      'frontend/src/components/common/SearchBar.jsx',
      'frontend/src/components/common/ShareButton.jsx',
      'frontend/src/pages/ProductPage.jsx',
      'frontend/src/components/common/Footer.jsx',
    ]) {
      const text = source(relativePath);
      expect(text).not.toMatch(/rgba\(255,255,255,0\.(?:1|2|3)\)/u);
    }
  });
});
