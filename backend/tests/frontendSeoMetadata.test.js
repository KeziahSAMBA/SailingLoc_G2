import { describe, expect, it } from '@jest/globals';
import {
  buildCanonicalUrl,
  createSeoTags,
  getRouteKind,
  getSeoMetadata,
} from '../../frontend/src/utils/seoMetadata.js';

describe('métadonnées SEO des routes frontend existantes', () => {
  it('rend indexables uniquement les pages publiques stables', () => {
    for (const pathname of [
      '/',
      '/categorie',
      '/a-propos',
      '/contact',
      '/mentions-legales',
      '/cgu',
      '/cgv',
      '/politique-de-confidentialite',
    ]) {
      const metadata = getSeoMetadata(pathname, { language: 'fr' });
      expect(metadata.indexable).toBe(true);
      expect(metadata.canonical).toBe(true);
      expect(metadata.title).toContain('SailingLoc');
      expect(metadata.description).toBeTruthy();
    }
  });

  it('protège les espaces privés, les routes inconnues et les fiches sans identifiant', () => {
    for (const pathname of [
      '/login',
      '/register',
      '/locataire',
      '/proprietaire/bateaux',
      '/admin',
      '/product',
      '/product/999999',
      '/route-inconnue',
    ]) {
      const metadata = getSeoMetadata(pathname, { language: 'fr' });
      const tags = createSeoTags(metadata, {
        origin: 'https://www.example.test',
        pathname,
        language: 'fr',
      });
      expect(metadata.indexable).toBe(false);
      expect(tags.robots).toBe('noindex,nofollow');
      expect(tags.canonical).toBeNull();
    }
  });

  it('construit la canonique depuis l’origine et le pathname sans query', () => {
    expect(buildCanonicalUrl('https://www.example.test', '/categorie')).toBe(
      'https://www.example.test/categorie'
    );
    expect(
      createSeoTags(getSeoMetadata('/categorie', { language: 'fr' }), {
        origin: 'https://www.example.test',
        pathname: '/categorie',
        language: 'fr',
      }).canonical
    ).toBe('https://www.example.test/categorie');
    expect(buildCanonicalUrl('https://www.example.test', '/categorie?port=Marseille')).toBe(
      'https://www.example.test/categorie'
    );
  });

  it('utilise uniquement les données réelles disponibles pour une fiche produit', () => {
    const metadata = getSeoMetadata('/product/42', {
      language: 'fr',
      product: {
        id_boat: 42,
        name: 'Le Mistral',
        type: 'voilier',
        capacity: 6,
        port: { city: 'Nice' },
        images: [{ url: '/uploads/boats/mistral.jpg' }],
      },
    });
    const tags = createSeoTags(metadata, {
      origin: 'https://www.example.test',
      pathname: '/product/42',
      language: 'fr',
    });

    expect(metadata.indexable).toBe(true);
    expect(metadata.title).toBe('Le Mistral — voilier — à Nice | SailingLoc');
    expect(metadata.description).toContain('pour jusqu’à 6 voyageurs');
    expect(metadata.description).not.toMatch(/undefined|null/iu);
    expect(tags.openGraph.type).toBe('product');
    expect(tags.openGraph.image).toBe('https://www.example.test/uploads/boats/mistral.jpg');
  });

  it('omet les champs de produit absents et refuse une fiche sans nom', () => {
    const metadata = getSeoMetadata('/product/15', {
      language: 'en',
      product: { type: 'jet_ski', images: [{ url: '' }] },
    });
    const missingProduct = getSeoMetadata('/product/15', { language: 'en', product: null });

    expect(metadata.indexable).toBe(false);
    expect(metadata.title).toBe('Page not found | SailingLoc');
    expect(metadata.description).not.toMatch(/undefined|null|in undefined/iu);
    expect(missingProduct.indexable).toBe(false);

    const incompleteProduct = getSeoMetadata('/product/16', {
      language: 'fr',
      product: { name: 'Un bateau', capacity: null, port: { city: '' } },
    });
    expect(incompleteProduct.description).not.toMatch(/0 voyageurs|à undefined/iu);
  });

  it('reconnaît les routes existantes sans transformer les chemins métier', () => {
    expect(getRouteKind('/')).toBe('home');
    expect(getRouteKind('/product/42')).toBe('product');
    expect(getRouteKind('/reservation/42')).toBe('private');
    expect(getRouteKind('/admin/ports')).toBe('private');
    expect(getRouteKind('/chemin-inconnu')).toBe('notFound');
  });
});
