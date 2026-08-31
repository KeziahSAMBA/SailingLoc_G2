import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeImageSource, selectImageSource } from '../../frontend/src/utils/imageSource.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MEDIA_COMPONENTS = [
  'frontend/src/pages/CategoryPage.jsx',
  'frontend/src/components/common/Carrousel.jsx',
  'frontend/src/pages/ProductPage.jsx',
  'frontend/src/pages/ReservationPage.jsx',
  'frontend/src/components/common/ClientReviews.jsx',
  'frontend/src/components/common/BoatReviews.jsx',
  'frontend/src/components/common/Header/DashboardHeader.jsx',
  'frontend/src/components/account/AccountForm.jsx',
  'frontend/src/components/locataire/LocataireDashboard.jsx',
  'frontend/src/components/locataire/LocataireFavorites.jsx',
  'frontend/src/components/locataire/LocataireReservations.jsx',
  'frontend/src/components/proprietaire/ProprietaireDashboard.jsx',
  'frontend/src/components/proprietaire/ProprietaireBoats.jsx',
  'frontend/src/components/proprietaire/ProprietaireReservations.jsx',
  'frontend/src/pages/HomePageProprio.jsx',
];

describe('normalisation des sources d’images frontend', () => {
  it('représente les sources vides ou non textuelles par null', () => {
    expect(normalizeImageSource('  /uploads/boat.jpg  ')).toBe('/uploads/boat.jpg');
    expect(normalizeImageSource('')).toBeNull();
    expect(normalizeImageSource('   ')).toBeNull();
    expect(normalizeImageSource(undefined)).toBeNull();
  });

  it('sélectionne un fallback sans réessayer une source déjà défaillante', () => {
    expect(
      selectImageSource({ source: '', fallbackSource: 'https://cdn.example/avatar.svg' })
    ).toEqual({ kind: 'fallback', src: 'https://cdn.example/avatar.svg' });
    expect(
      selectImageSource({
        source: 'https://cdn.example/avatar.svg',
        fallbackSource: 'https://cdn.example/avatar.svg',
        failedSource: 'https://cdn.example/avatar.svg',
      })
    ).toEqual({ kind: 'none', src: null });
    expect(
      selectImageSource({
        source: 'https://cdn.example/invalid.jpg',
        fallbackSource: 'https://cdn.example/avatar.svg',
        failedSource: 'https://cdn.example/invalid.jpg',
      })
    ).toEqual({ kind: 'fallback', src: 'https://cdn.example/avatar.svg' });
    expect(
      selectImageSource({
        source: 'https://cdn.example/invalid.jpg',
        fallbackSource: 'https://cdn.example/avatar.svg',
        failedSource: 'https://cdn.example/avatar.svg',
      })
    ).toEqual({ kind: 'primary', src: 'https://cdn.example/invalid.jpg' });
  });

  it('ne laisse aucun composant ciblé déclarer une balise image vide', () => {
    for (const relativePath of MEDIA_COMPONENTS) {
      const source = readFileSync(resolve(ROOT, relativePath), 'utf8');
      expect(source).toContain('SafeImage');
      expect(source).not.toMatch(/<img\b[^>]*\bsrc\s*=\s*(['"])\s*\1/i);
    }
  });
});
