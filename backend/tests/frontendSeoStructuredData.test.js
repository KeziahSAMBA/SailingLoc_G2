import { describe, expect, it } from '@jest/globals';
import {
  createSeoStructuredData,
  getSeoMetadata,
  serializeJsonLd,
} from '../../frontend/src/utils/seoMetadata.js';

const ORIGIN = 'https://www.example.test';

describe('données structurées SEO frontend', () => {
  it('décrit le site sur l’accueil avec son origine courante', () => {
    const data = createSeoStructuredData(getSeoMetadata('/'), {
      origin: ORIGIN,
      pathname: '/',
      language: 'fr',
    });

    expect(data).toEqual([
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'SailingLoc',
        url: ORIGIN,
      },
    ]);
  });

  it('construit les fils d’Ariane des routes publiques réellement disponibles', () => {
    const expected = [
      ['/categorie', 'Catégorie'],
      ['/a-propos', 'À propos'],
      ['/contact', 'Contact'],
      ['/mentions-legales', 'Mentions légales'],
      ['/cgu', "Conditions générales d'utilisation"],
      ['/cgv', 'Conditions générales de vente'],
      ['/politique-de-confidentialite', 'Politique de confidentialité'],
    ];

    for (const [pathname, label] of expected) {
      const [breadcrumb] = createSeoStructuredData(getSeoMetadata(pathname), {
        origin: ORIGIN,
        pathname,
        language: 'fr',
      });

      expect(breadcrumb['@type']).toBe('BreadcrumbList');
      expect(breadcrumb.itemListElement).toEqual([
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Accueil',
          item: `${ORIGIN}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: label,
          item: `${ORIGIN}${pathname}`,
        },
      ]);
    }
  });

  it('décrit un produit chargé avec uniquement ses données réelles', () => {
    const product = {
      id_boat: 42,
      name: 'Le Mistral',
      type: 'voilier',
      description: 'Voilier familial pour une sortie en Méditerranée.',
      images: [{ url: '/uploads/boats/mistral.jpg' }],
    };
    const metadata = getSeoMetadata('/product/42', { language: 'fr', product });
    const data = createSeoStructuredData(metadata, {
      origin: ORIGIN,
      pathname: '/product/42',
      language: 'fr',
      product,
    });
    const productData = data.find((entry) => entry['@type'] === 'Product');
    const breadcrumb = data.find((entry) => entry['@type'] === 'BreadcrumbList');

    expect(productData).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Le Mistral',
      image: `${ORIGIN}/uploads/boats/mistral.jpg`,
      category: 'voilier',
      description: product.description,
    });
    expect(breadcrumb.itemListElement.at(-1)).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: 'Le Mistral',
      item: `${ORIGIN}/product/42`,
    });
    expect(productData).not.toHaveProperty('offers');
    expect(productData).not.toHaveProperty('aggregateRating');
    expect(productData).not.toHaveProperty('review');
    expect(productData).not.toHaveProperty('price');
    expect(productData).not.toHaveProperty('availability');
  });

  it('omet les champs absents et exclut les produits invalides ou les routes privées', () => {
    const product = { name: 'Sans détails', images: [{ url: '' }] };
    const productData = createSeoStructuredData(getSeoMetadata('/product/15', { product }), {
      origin: ORIGIN,
      pathname: '/product/15',
      language: 'fr',
      product,
    }).find((entry) => entry['@type'] === 'Product');

    expect(productData).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Sans détails',
    });

    for (const pathname of ['/product', '/product/999999', '/login', '/locataire', '/inconnu']) {
      const data = createSeoStructuredData(getSeoMetadata(pathname), {
        origin: ORIGIN,
        pathname,
        language: 'fr',
      });
      expect(data).toEqual([]);
    }
  });

  it('sérialise les valeurs dynamiques sans pouvoir fermer la balise script', () => {
    const value = {
      name: "</script><script>alert('x')</script>&",
      separator: '\u2028',
    };
    const serialized = serializeJsonLd(value);

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('<script>');
    expect(JSON.parse(serialized)).toEqual(value);
  });
});
