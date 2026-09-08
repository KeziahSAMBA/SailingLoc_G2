import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OWNER_PAGE = readFileSync(resolve(ROOT, 'frontend/src/pages/OwnerProfilePage.jsx'), 'utf8');

const DIRECT_TAILWIND_COLOR =
  /\b(?:text|bg|border|ring|from|via|to|divide|placeholder|fill|stroke|decoration|accent|shadow)-(?:slate|gray|zinc|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-\d+)?(?:\/\d+)?|\b(?:text|bg|border|ring|from|via|to|divide|placeholder|fill|stroke|decoration|accent|shadow)-\[(?:#|rgba?|hsla?|oklch|color)[^\]]+\]/giu;

function directColorLiterals(source) {
  return (source.match(/#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|oklch|color)\([^)]*\)/giu) ?? []).filter(
    (literal) => !literal.toLowerCase().includes('var(')
  );
}

describe('thème de la fiche publique propriétaire', () => {
  it('branche tous les éléments photo sur les tokens visuels existants', () => {
    for (const tokenClass of [
      'text-photo-text',
      'text-photo-action',
      'text-warning-bright',
      'text-action-text',
      'focus-visible:ring-photo-action',
      'bg-glass-fill/5',
      'bg-glass-fill/10',
      'bg-glass-fill/20',
      'border-glass/20',
      'sailingloc-glass-shadow',
    ]) {
      expect(OWNER_PAGE).toContain(tokenClass);
    }
    expect(OWNER_PAGE).toContain('PHOTO_OVERLAY_DASHBOARD');
    expect(OWNER_PAGE).toContain('--sl-overlay');
    expect(OWNER_PAGE).toContain('owner-photo-heading');
  });

  it('ne réintroduit aucune couleur directe ou ombre figée dans la page', () => {
    expect(directColorLiterals(OWNER_PAGE)).toEqual([]);
    expect(OWNER_PAGE.match(DIRECT_TAILWIND_COLOR) ?? []).toEqual([]);
    expect(OWNER_PAGE).not.toContain('drop-shadow-[');
    expect(OWNER_PAGE).not.toContain('shadow-[');
  });

  it('conserve les fallbacks d’images pour le propriétaire, les bateaux et les avis', () => {
    expect(OWNER_PAGE).toContain('<SafeImage');
    expect(OWNER_PAGE).toContain('fallbackSrc={nameToAvatarUrl(fullName)}');
    expect(OWNER_PAGE).toContain('fallbackSrc={nameToAvatarUrl(review.name)}');
    expect(OWNER_PAGE).toContain('fallbackClassName=');
  });

  it('ne modifie pas les contrats de navigation ou de données du profil', () => {
    expect(OWNER_PAGE).toContain('getOwnerProfile(id)');
    expect(OWNER_PAGE).toContain('const to = `/product/${boat.id_boat}`;');
    expect(OWNER_PAGE).toContain('to="/categorie"');
    expect(OWNER_PAGE).toContain('to: `/proprietaires/${id}`');
  });
});
