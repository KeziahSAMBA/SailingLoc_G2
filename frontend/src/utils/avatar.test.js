import { describe, it, expect } from 'vitest';
import { nameToAvatarUrl } from './avatar.js';

// L'avatar est un SVG encodé en data-URI : on le décode pour lire ce qu'il
// contient réellement plutôt que de faire des assertions sur une chaîne opaque.
const svg = (nom) => decodeURIComponent(nameToAvatarUrl(nom).replace('data:image/svg+xml,', ''));
const initiales = (nom) => svg(nom).match(/>([^<]*)<\/text>/)[1];
const teinte = (nom) => Number(svg(nom).match(/hsl\((\d+),/)[1]);

describe('nameToAvatarUrl', () => {
  it('produit une data-URI SVG', () => {
    expect(nameToAvatarUrl('Lea Marin')).toMatch(/^data:image\/svg\+xml,/);
  });

  it('prend la première lettre du prénom et du nom', () => {
    expect(initiales('Lea Marin')).toBe('LM');
  });

  it('prend le premier et le dernier mot sur trois', () => {
    expect(initiales('Jean Pierre Dupont')).toBe('JD');
  });

  it('prend les deux premières lettres d’un nom unique', () => {
    expect(initiales('Salim')).toBe('SA');
  });

  it('met les initiales en capitales', () => {
    expect(initiales('lea marin')).toBe('LM');
  });

  it('tolère les espaces superflus', () => {
    expect(initiales('   Lea   Marin   ')).toBe('LM');
  });

  // Un utilisateur sans nom renseigné ne doit pas casser l'affichage.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['chaîne vide', ''],
    ['espaces seuls', '   '],
  ])('retombe sur « SL » pour %s', (_label, valeur) => {
    expect(initiales(valeur)).toBe('SL');
  });

  it('accepte un nom d’une seule lettre', () => {
    expect(initiales('A')).toBe('A');
  });
});

describe('couleur de fond', () => {
  // La couleur est dérivée du nom : un même utilisateur doit garder le même
  // avatar d'un écran à l'autre et d'une session à l'autre.
  it('est stable pour un même nom', () => {
    expect(nameToAvatarUrl('Lea Marin')).toBe(nameToAvatarUrl('Lea Marin'));
  });

  it('diffère d’un nom à l’autre', () => {
    expect(teinte('Lea Marin')).not.toBe(teinte('Paul Durand'));
  });

  it('reste une teinte valide', () => {
    for (const nom of ['Lea Marin', 'Z', '', 'Éléonore de La Tour-Fondue']) {
      expect(teinte(nom)).toBeGreaterThanOrEqual(0);
      expect(teinte(nom)).toBeLessThan(360);
    }
  });
});
