const SITE_NAME = 'SailingLoc';

const PUBLIC_PATHS = new Set([
  '/',
  '/categorie',
  '/a-propos',
  '/contact',
  '/mentions-legales',
  '/cgu',
  '/cgv',
  '/politique-de-confidentialite',
]);

const COPY = {
  fr: {
    home: {
      title: 'Location de bateaux entre particuliers en France | SailingLoc',
      description:
        'Découvrez des bateaux proposés à la location entre particuliers et recherchez votre prochaine sortie selon le port, les dates et le nombre de voyageurs.',
    },
    category: {
      title: 'Bateaux à louer en France | SailingLoc',
      description:
        'Consultez les bateaux disponibles à la location et filtrez les annonces par destination, dates et nombre de voyageurs.',
    },
    about: {
      title: 'SailingLoc — Location de bateaux entre particuliers',
      description:
        'SailingLoc met en relation des particuliers pour trouver et proposer des bateaux à la location dans les ports de France.',
    },
    contact: {
      title: 'Contact et aide | SailingLoc',
      description:
        'Contactez SailingLoc pour obtenir de l’aide concernant votre recherche, votre réservation ou votre annonce de bateau.',
    },
    legal: {
      title: 'Informations légales | SailingLoc',
      description:
        'Consultez les informations légales, les conditions et la politique de confidentialité de SailingLoc.',
    },
    private: {
      title: 'Espace personnel | SailingLoc',
      description: 'Accédez à votre espace personnel SailingLoc.',
    },
    notFound: {
      title: 'Page introuvable | SailingLoc',
      description: 'La page demandée est introuvable sur SailingLoc.',
    },
  },
  en: {
    home: {
      title: 'Boat rental between individuals in France | SailingLoc',
      description:
        'Discover boats offered for rental between individuals and find your next trip by port, dates and number of travellers.',
    },
    category: {
      title: 'Boats for rent in France | SailingLoc',
      description:
        'Browse boats available for rental and filter listings by destination, dates and number of travellers.',
    },
    about: {
      title: 'SailingLoc — Boat rental between individuals',
      description:
        'SailingLoc connects individuals looking to find or list boats for rental in ports across France.',
    },
    contact: {
      title: 'Contact and help | SailingLoc',
      description: 'Contact SailingLoc for help with your search, booking or boat listing.',
    },
    legal: {
      title: 'Legal information | SailingLoc',
      description: 'Read SailingLoc legal information, terms and privacy policy.',
    },
    private: {
      title: 'Personal area | SailingLoc',
      description: 'Access your SailingLoc personal area.',
    },
    notFound: {
      title: 'Page not found | SailingLoc',
      description: 'The requested page could not be found on SailingLoc.',
    },
  },
};

const BOAT_TYPE_LABELS = {
  fr: {
    bateau: 'bateau',
    voilier: 'voilier',
    catamaran: 'catamaran',
    yacht: 'yacht',
    jet_ski: 'jet-ski',
    jetski: 'jet-ski',
    semi_rigide: 'semi-rigide',
    bateau_moteur: 'bateau à moteur',
  },
  en: {
    bateau: 'boat',
    voilier: 'sailboat',
    catamaran: 'catamaran',
    yacht: 'yacht',
    jet_ski: 'jet ski',
    jetski: 'jet ski',
    semi_rigide: 'rigid inflatable boat',
    bateau_moteur: 'motorboat',
  },
};

const PRIVATE_PREFIXES = [
  '/documents',
  '/reservation/',
  '/locataire',
  '/proprietaire',
  '/admin',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
];

const PUBLIC_COPY_KEYS = {
  categorie: 'category',
  'a-propos': 'about',
};

const BREADCRUMB_LABELS = {
  fr: {
    '/': 'Accueil',
    '/categorie': 'Catégorie',
    '/a-propos': 'À propos',
    '/contact': 'Contact',
    '/mentions-legales': 'Mentions légales',
    '/cgu': "Conditions générales d'utilisation",
    '/cgv': 'Conditions générales de vente',
    '/politique-de-confidentialite': 'Politique de confidentialité',
  },
  en: {
    '/': 'Home',
    '/categorie': 'Category',
    '/a-propos': 'About',
    '/contact': 'Contact',
    '/mentions-legales': 'Legal notice',
    '/cgu': 'Terms of service',
    '/cgv': 'Terms of sale',
    '/politique-de-confidentialite': 'Privacy policy',
  },
};

const trimValue = (value) => (typeof value === 'string' ? value.trim() : '');

function languageCopy(language) {
  return COPY[language === 'en' ? 'en' : 'fr'];
}

export function getRouteKind(pathname) {
  const path = typeof pathname === 'string' && pathname ? pathname : '/';
  if (PUBLIC_PATHS.has(path)) return path === '/' ? 'home' : path.slice(1);
  if (path === '/product' || /^\/product\/[^/]+$/.test(path)) return 'product';
  if (PRIVATE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))) {
    return 'private';
  }
  return 'notFound';
}

export function buildCanonicalUrl(origin, pathname) {
  const rawPath = typeof pathname === 'string' && pathname.startsWith('/') ? pathname : '/';
  const safePath = rawPath.split(/[?#]/, 1)[0] || '/';
  if (!origin) return safePath;
  try {
    return new URL(safePath, origin).toString();
  } catch {
    return safePath;
  }
}

function buildAbsoluteUrl(origin, value) {
  const safeValue = trimValue(value);
  if (!safeValue || !origin) return null;
  try {
    const url = new URL(safeValue, origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeOrigin(origin) {
  const value = trimValue(origin);
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

function boatTypeLabel(type, language) {
  const rawType = trimValue(type);
  if (!rawType) return '';
  const labels = BOAT_TYPE_LABELS[language === 'en' ? 'en' : 'fr'];
  return labels[rawType.toLowerCase()] || rawType.replaceAll('_', ' ');
}

function productStructuredData(product, origin, language) {
  const name = trimValue(product?.name);
  if (!name) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
  };
  const category = boatTypeLabel(product.type, language);
  const description = trimValue(product.description);
  const image = Array.isArray(product.images)
    ? product.images.find((entry) => trimValue(entry?.url))?.url
    : '';
  const absoluteImage = buildAbsoluteUrl(origin, image);

  if (absoluteImage) data.image = absoluteImage;
  if (category) data.category = category;
  if (description) data.description = description;
  return data;
}

function breadcrumbLabel(pathname, language, product) {
  if (getRouteKind(pathname) === 'product') return trimValue(product?.name);
  const labels = BREADCRUMB_LABELS[language === 'en' ? 'en' : 'fr'];
  return labels[pathname] || '';
}

function breadcrumbStructuredData(pathname, origin, language, product) {
  const kind = getRouteKind(pathname);
  const currentLabel = breadcrumbLabel(pathname, language, product);
  if (!currentLabel || kind === 'home') return null;

  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: BREADCRUMB_LABELS[language === 'en' ? 'en' : 'fr']['/'],
      item: buildCanonicalUrl(origin, '/'),
    },
  ];
  if (kind === 'product') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: BREADCRUMB_LABELS[language === 'en' ? 'en' : 'fr']['/categorie'],
      item: buildCanonicalUrl(origin, '/categorie'),
    });
  }
  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: currentLabel,
    item: buildCanonicalUrl(origin, pathname),
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

function productMetadata(product, language) {
  const copy = languageCopy(language);
  if (!product || !trimValue(product.name)) {
    return {
      kind: 'product',
      indexable: false,
      title: copy.notFound.title,
      description: copy.notFound.description,
      canonical: null,
      image: null,
    };
  }

  const name = trimValue(product.name);
  const type = boatTypeLabel(product.type, language);
  const city = trimValue(product.port?.city);
  const rawCapacity = product.capacity;
  const hasCapacity =
    (typeof rawCapacity === 'number' && Number.isFinite(rawCapacity)) ||
    (typeof rawCapacity === 'string' &&
      rawCapacity.trim() !== '' &&
      Number.isFinite(Number(rawCapacity)));
  const capacity = hasCapacity ? Number(rawCapacity) : null;
  const titleParts = [name, type, city ? (language === 'en' ? `in ${city}` : `à ${city}`) : ''];
  const title = `${titleParts.filter(Boolean).join(' — ')} | ${SITE_NAME}`;
  const descriptionParts = [
    type ? (language === 'en' ? `${type} for rent` : `${type} à louer`) : '',
    city ? (language === 'en' ? `in ${city}` : `à ${city}`) : '',
    capacity != null
      ? language === 'en'
        ? `for up to ${capacity} travellers`
        : `pour jusqu’à ${capacity} voyageurs`
      : '',
  ].filter(Boolean);
  const description = descriptionParts.length
    ? `${name}, ${descriptionParts.join(' ')}. Découvrez cette annonce SailingLoc.`
    : `${name}. Découvrez cette annonce de bateau sur SailingLoc.`;
  const image = Array.isArray(product.images)
    ? product.images.find((entry) => trimValue(entry?.url))?.url.trim() || null
    : null;

  return {
    kind: 'product',
    indexable: true,
    title,
    description,
    canonical: true,
    image,
  };
}

export function getSeoMetadata(pathname, { language = 'fr', product = null } = {}) {
  const kind = getRouteKind(pathname);
  const copy = languageCopy(language);
  if (kind === 'product') return productMetadata(product, language);

  if (kind === 'home' || kind === 'categorie' || kind === 'a-propos' || kind === 'contact') {
    const pageCopy = copy[PUBLIC_COPY_KEYS[kind] || kind];
    return {
      kind,
      indexable: true,
      title: pageCopy.title,
      description: pageCopy.description,
      canonical: true,
      image: null,
    };
  }

  if (
    kind === 'mentions-legales' ||
    kind === 'cgu' ||
    kind === 'cgv' ||
    kind === 'politique-de-confidentialite'
  ) {
    return {
      kind: 'legal',
      indexable: true,
      title: copy.legal.title,
      description: copy.legal.description,
      canonical: true,
      image: null,
    };
  }

  if (kind === 'private') {
    return {
      kind,
      indexable: false,
      title: copy.private.title,
      description: copy.private.description,
      canonical: null,
      image: null,
    };
  }

  return {
    kind: 'notFound',
    indexable: false,
    title: copy.notFound.title,
    description: copy.notFound.description,
    canonical: null,
    image: null,
  };
}

export function createSeoTags(metadata, { origin = '', pathname = '/', language = 'fr' } = {}) {
  const canonical = metadata.canonical ? buildCanonicalUrl(origin, pathname) : null;
  const locale = language === 'en' ? 'en_US' : 'fr_FR';
  return {
    title: metadata.title,
    description: metadata.description,
    robots: metadata.indexable ? 'index,follow' : 'noindex,nofollow',
    canonical,
    openGraph: {
      title: metadata.title,
      description: metadata.description,
      type: metadata.kind === 'product' && metadata.indexable ? 'product' : 'website',
      url: canonical,
      siteName: SITE_NAME,
      locale,
      image: metadata.image ? buildAbsoluteUrl(origin, metadata.image) : null,
    },
    twitter: {
      card: 'summary',
      title: metadata.title,
      description: metadata.description,
    },
  };
}

export function createSeoStructuredData(
  metadata,
  { origin = '', pathname = '/', language = 'fr', product = null } = {}
) {
  if (!metadata?.indexable) return [];
  const safeOrigin = normalizeOrigin(origin);
  if (!safeOrigin) return [];

  const kind = getRouteKind(pathname);
  if (kind === 'home') {
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: safeOrigin,
      },
    ];
  }

  const breadcrumb = breadcrumbStructuredData(pathname, safeOrigin, language, product);
  if (!breadcrumb) return [];

  const structuredData = [breadcrumb];
  if (kind === 'product') {
    const productData = productStructuredData(product, safeOrigin, language);
    if (!productData) return [];
    structuredData.push(productData);
  }
  return structuredData;
}

export function serializeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export { SITE_NAME };
