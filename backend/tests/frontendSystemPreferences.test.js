import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CSS = readFileSync(resolve(ROOT, 'frontend/src/index.css'), 'utf8');
const revenue = readFileSync(
  resolve(ROOT, 'frontend/src/components/proprietaire/ProprietaireRevenus.jsx'),
  'utf8'
);

describe('préférences système d’affichage', () => {
  it('renforce le focus uniquement avec la préférence de contraste élevée', () => {
    expect(CSS).toMatch(
      /@media\s*\(prefers-contrast:\s*more\)[\s\S]*?focus-visible[\s\S]*?outline:\s*3px\s+solid\s+rgb\(var\(--sl-brand-focus\)\)/u
    );
  });

  it('laisse les couleurs forcées au navigateur et conserve les états géométriques', () => {
    expect(CSS).toContain('@media (forced-colors: active)');
    expect(CSS).toContain('border-color: ButtonText !important');
    expect(CSS).toContain('border-color: Highlight !important');
    expect(CSS).toContain('background-image: repeating-linear-gradient');
    expect(CSS).toContain('background-image: none !important');
    expect(CSS).toContain('appearance: auto');
    expect(CSS).toContain('forced-color-adjust: auto');
    expect(CSS).not.toMatch(/@media\s*\(prefers-color-scheme:/u);
  });

  it('respecte la réduction des mouvements pour les animations et le défilement', () => {
    expect(CSS).toContain('@media (prefers-reduced-motion: reduce)');
    expect(CSS).toContain('animation-duration: 0.01ms !important');
    expect(CSS).toContain('transition-duration: 0.01ms !important');
    expect(CSS).toContain('scroll-behavior: auto !important');
  });

  it('identifie le graphique de revenus sans toucher à ses données', () => {
    expect(revenue).toContain('className="monthly-revenue-chart w-full"');
    expect(revenue).toContain('role="img"');
    expect(revenue).toContain('months.map((m, i) => {');
  });
});
