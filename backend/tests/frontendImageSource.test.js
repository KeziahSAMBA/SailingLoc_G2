import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nameToAvatarUrl } from '../../frontend/src/utils/avatar.js';
import {
  isSafeImageSource,
  normalizeImageSource,
  selectImageSource,
} from '../../frontend/src/utils/imageSource.js';

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
  it('représente les sources vides, non textuelles ou dangereuses par null', () => {
    expect(normalizeImageSource('  /uploads/boat.jpg  ')).toBe('/uploads/boat.jpg');
    expect(normalizeImageSource('images/boat.jpg')).toBe('images/boat.jpg');
    expect(normalizeImageSource('./images/boat.jpg')).toBe('./images/boat.jpg');
    expect(normalizeImageSource('')).toBeNull();
    expect(normalizeImageSource('   ')).toBeNull();
    expect(normalizeImageSource(undefined)).toBeNull();

    for (const unsafe of [
      'javascript:alert(1)',
      'vbscript:msgbox(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:image/svg+xml,<svg onload=alert(1)>',
      'https://user:password@example.test/avatar.jpg',
      'https://@example.test/avatar.jpg',
      'http://example.test/avatar.jpg',
      'http://localhost:bad/avatar.jpg',
      '//evil.example/avatar.jpg',
      '../private/avatar.jpg',
      'images/../private/avatar.jpg',
      '/uploads/%2e%2e/private.jpg',
      '/uploads/foo%2f..%2fprivate.jpg',
      '/uploads/%2e%2e%2fprivate.jpg',
      '/uploads/%252e%252e%252fprivate.jpg',
      '/uploads/foo%5c..%5cprivate.jpg',
      'https://images.example/uploads/foo%2f..%2fprivate.jpg',
      'https://example.test/%ZZ.jpg',
      'https://example.test/%0a.jpg',
      'https://example.test/avatar.jpg\u0000',
      'https://[::1/avatar.jpg',
    ]) {
      expect(normalizeImageSource(unsafe)).toBeNull();
      expect(isSafeImageSource(unsafe)).toBe(false);
    }
  });

  it('accepte les URLs HTTPS, les URLs HTTP locales et les aperçus blob', () => {
    for (const safe of [
      'https://images.example/avatar.jpg',
      'https://images.example/avatar.jpg?size=small#preview',
      'http://localhost:4000/uploads/boats/boat.jpg',
      'http://127.0.0.1:5173/uploads/boats/boat.jpg',
      'http://[::1]:4000/uploads/boats/boat.jpg',
      'blob:http://localhost:5173/3bb2f3f2-3a77-4f13-a2fc-9eb0a4f4c5d2',
      'blob:https://app.example.test/3bb2f3f2-3a77-4f13-a2fc-9eb0a4f4c5d2',
      'blob:null/3bb2f3f2-3a77-4f13-a2fc-9eb0a4f4c5d2',
    ]) {
      expect(isSafeImageSource(safe)).toBe(true);
      expect(normalizeImageSource(safe)).toBe(safe);
    }

    expect(normalizeImageSource('blob:http://example.test/id')).toBeNull();
    expect(normalizeImageSource('blob:javascript:alert(1)')).toBeNull();
    expect(normalizeImageSource('blob:null/../id')).toBeNull();
    expect(normalizeImageSource('blob:https://user:pass@example.test/id')).toBeNull();
  });

  it('limite HTTP au même hôte de développement et aux boucles locales', () => {
    const lanHttpPage = { pageOrigin: 'http://192.168.1.98:5173' };
    const lanHttpsPage = { pageOrigin: 'https://192.168.1.98' };

    expect(
      normalizeImageSource('http://192.168.1.98:4000/uploads/boats/boat.jpg', lanHttpPage)
    ).toBe('http://192.168.1.98:4000/uploads/boats/boat.jpg');
    expect(
      normalizeImageSource('http://192.168.1.99:4000/uploads/boats/boat.jpg', lanHttpPage)
    ).toBeNull();
    expect(
      normalizeImageSource('http://192.168.1.98:4000/uploads/boats/boat.jpg', lanHttpsPage)
    ).toBeNull();
    expect(normalizeImageSource('http://localhost:4000/uploads/boats/boat.jpg', lanHttpPage)).toBe(
      'http://localhost:4000/uploads/boats/boat.jpg'
    );
    expect(
      normalizeImageSource('http://127.0.0.1:4000/uploads/boats/boat.jpg', lanHttpsPage)
    ).toBeNull();
    expect(
      normalizeImageSource(
        'blob:http://192.168.1.98:5173/3bb2f3f2-3a77-4f13-a2fc-9eb0a4f4c5d2',
        lanHttpPage
      )
    ).not.toBeNull();
    expect(
      normalizeImageSource(
        'blob:http://192.168.1.98:5173/uploads/%252e%252e%252fprivate.jpg',
        lanHttpPage
      )
    ).toBeNull();
  });

  it('conserve les chemins valides avec des espaces encodés', () => {
    for (const safe of [
      '/uploads/boats/Le%20Mistral.jpg',
      './images/Port%20de%20Brest.webp',
      'https://images.example/boats/Le%20Mistral.jpg',
    ]) {
      expect(normalizeImageSource(safe)).toBe(safe);
    }
  });

  it('accepte uniquement les données raster base64 et les avatars SVG générés', () => {
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    expect(normalizeImageSource(png)).toBe(png);
    expect(normalizeImageSource('data:image/svg+xml;base64,PHN2Zy8+')).toBeNull();
    expect(normalizeImageSource('data:image/png,not-base64')).toBeNull();
    expect(normalizeImageSource('data:image/png;base64,AAAA=')).toBeNull();
    expect(normalizeImageSource('data:text/plain;base64,SGVsbG8=')).toBeNull();

    for (const name of ['Jean Dupont', '<Ada', 'O’Reilly', '&<>"']) {
      const avatar = nameToAvatarUrl(name);
      expect(isSafeImageSource(avatar)).toBe(true);
      expect(normalizeImageSource(avatar)).toBe(avatar);
      expect(decodeURIComponent(avatar.split(',', 2)[1])).not.toMatch(/<script|onload\s*=/iu);
    }

    const maliciousSvg =
      'data:image/svg+xml,' + encodeURIComponent('<svg><script>alert(1)</script></svg>');
    expect(normalizeImageSource(maliciousSvg)).toBeNull();
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
        source: 'javascript:alert(1)',
        fallbackSource: 'https://cdn.example/avatar.svg',
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

  it('ne laisse aucun composant ciblé déclarer une balise image vide ou transmettre des props arbitraires', () => {
    for (const relativePath of MEDIA_COMPONENTS) {
      const source = readFileSync(resolve(ROOT, relativePath), 'utf8');
      expect(source).toContain('SafeImage');
      expect(source).not.toMatch(/<img\b[^>]*\bsrc\s*=\s*(['"])\s*\1/iu);
    }

    const safeImage = readFileSync(
      resolve(ROOT, 'frontend/src/components/common/SafeImage.jsx'),
      'utf8'
    );
    expect(safeImage).not.toContain('...imageProps');
    expect(safeImage).not.toContain('dangerouslySetInnerHTML');
  });
});
