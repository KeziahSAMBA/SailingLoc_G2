function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(value, siteOrigin) {
  if (!value) return null;

  try {
    return new URL(value, `${siteOrigin}/`).toString();
  } catch {
    return null;
  }
}

export function buildProductSeo(boat, typeLabel, siteOrigin) {
  const name = cleanText(boat.name);
  const type = cleanText(typeLabel || boat.type);
  const city = cleanText(boat.port?.city);
  const price = Number(boat.daily_price);
  const canonicalUrl = `${siteOrigin}/product/${boat.id_boat}`;
  const locationLabel = city ? ` à ${city}` : '';
  const priceLabel = Number.isFinite(price) ? ` dès ${price} €/jour` : '';
  const title = `${name} - Location de ${type}${locationLabel}${priceLabel} | SailingLoc`;
  const fallbackDescription =
    `Louez ${name}, ${type}${locationLabel}${priceLabel} sur SailingLoc. ` +
    `Consultez ses équipements, disponibilités et avis.`;
  const description = cleanText(boat.description || fallbackDescription).slice(0, 160);
  const images = (boat.images ?? [])
    .map((image) => absoluteUrl(image.url, siteOrigin))
    .filter(Boolean);

  const product = {
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    name,
    description,
    url: canonicalUrl,
    category: type,
    image: images,
    brand: {
      '@type': 'Brand',
      name: 'SailingLoc',
    },
  };

  if (Number.isFinite(price)) {
    product.offers = {
      '@type': 'Offer',
      url: canonicalUrl,
      price,
      priceCurrency: 'EUR',
      availability:
        (boat.availabilities?.length ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    };
  }

  const rating = Number(boat.avg_rating);
  const reviewCount = Number(boat.review_count);
  if (Number.isFinite(rating) && Number.isInteger(reviewCount) && reviewCount > 0) {
    product.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const itemListElement = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Accueil',
      item: `${siteOrigin}/`,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Catalogue',
      item: `${siteOrigin}/categorie`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name,
      item: canonicalUrl,
    },
  ];

  return {
    title,
    description,
    canonicalUrl,
    image: images[0] ?? null,
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        product,
        {
          '@type': 'BreadcrumbList',
          '@id': `${canonicalUrl}#breadcrumb`,
          itemListElement,
        },
      ],
    },
  };
}
