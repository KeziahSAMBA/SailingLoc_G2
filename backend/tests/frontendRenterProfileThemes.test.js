import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PROFILE = readFileSync(resolve(ROOT, 'frontend/src/pages/RenterProfilePage.jsx'), 'utf8');

describe('thèmes visuels de la fiche locataire', () => {
  it('utilise les tokens photo et verre pour les surfaces et le contenu', () => {
    expect(PROFILE).toContain('bg-glass-fill/5');
    expect(PROFILE).toContain('sailingloc-glass-shadow');
    expect(PROFILE).toContain('bg-glass-fill/10');
    expect(PROFILE).toContain('text-photo-text');
    expect(PROFILE).toContain('text-photo-action');
    expect(PROFILE).toContain('focus-visible:ring-2 focus-visible:ring-photo-action');
    expect(PROFILE).not.toMatch(/\bbg-surface\//u);
    expect(PROFILE).not.toMatch(/\btext-on-dark\b/u);
  });

  it('conserve une forme distincte pour chaque statut affiché', () => {
    expect(PROFILE).toContain('status-indicator--warning');
    expect(PROFILE).toContain('status-indicator--success');
    expect(PROFILE).toContain('status-indicator--danger');
    expect(PROFILE).toContain('status-indicator--neutral');
    expect(PROFILE).toContain('NEUTRAL_STATUS_CLS');
  });

  it('ne contient pas de couleur de contenu codée en dur', () => {
    expect(PROFILE).not.toMatch(/#[0-9a-f]{3,8}\b/iu);
    expect(PROFILE).not.toMatch(/rgba?\(\s*\d/iu);
  });
});
