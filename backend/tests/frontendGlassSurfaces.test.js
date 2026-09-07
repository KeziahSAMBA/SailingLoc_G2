import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function source(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function block(css, selector) {
  const start = css.indexOf(selector);
  expect(start).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1;
    if (css[index] === '}' && --depth === 0) return css.slice(open + 1, index);
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
