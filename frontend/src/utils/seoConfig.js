const DEFAULT_DESCRIPTION =
  'Louez un bateau entre particuliers en France : voiliers, catamarans et bateaux à moteur proposés par des propriétaires.';

const PUBLIC_ROUTES = {
  '/': {
    fr: {
      title: 'Location de bateau entre particuliers en France | SailingLoc',
      description:
        'Trouvez une location de bateau entre particuliers en France : voilier, catamaran ou bateau à moteur, avec ou sans skipper.',
    },
    en: {
      title: 'Peer-to-peer boat rental in France | SailingLoc',
      description:
        'Find a peer-to-peer boat rental in France: sailboats, catamarans and motorboats, with or without a skipper.',
    },
  },
  '/categorie': {
    fr: {
      title: 'Location de bateaux en France : voiliers et catamarans | SailingLoc',
      description:
        'Découvrez les bateaux disponibles à la location en France et filtrez les offres par port, type de bateau, capacité et prix.',
    },
    en: {
      title: 'Boat rental in France: sailboats and catamarans | SailingLoc',
      description:
        'Browse boats available to rent in France and filter listings by port, boat type, capacity and price.',
    },
  },
  '/product': {
    fr: {
      title: 'Bateau disponible à la location | SailingLoc',
      description:
        'Consultez les caractéristiques, équipements, disponibilités et avis de ce bateau proposé à la location sur SailingLoc.',
    },
    en: {
      title: 'Boat available to rent | SailingLoc',
      description:
        'View the specifications, equipment, availability and reviews for this boat available to rent on SailingLoc.',
    },
    robots: 'noindex, follow',
  },
  '/contact': {
    fr: {
      title: 'Contact et aide | SailingLoc',
      description:
        "Contactez l'équipe SailingLoc pour obtenir de l'aide au sujet d'une location, d'une annonce ou de votre compte.",
    },
  },
  '/a-propos': {
    fr: {
      title: 'À propos de SailingLoc | Location de bateaux entre particuliers',
      description:
        'Découvrez SailingLoc, sa mission et son fonctionnement pour faciliter la location de bateaux entre particuliers.',
    },
    en: {
      title: 'About SailingLoc | Peer-to-peer boat rental',
      description:
        'Learn about SailingLoc, its mission and how it makes peer-to-peer boat rental easier.',
    },
  },
  '/mentions-legales': {
    fr: {
      title: 'Mentions légales | SailingLoc',
      description: 'Consultez les mentions légales du site SailingLoc.',
    },
  },
  '/cgu': {
    fr: {
      title: "Conditions générales d'utilisation | SailingLoc",
      description: "Consultez les conditions générales d'utilisation de SailingLoc.",
    },
  },
  '/cgv': {
    fr: {
      title: 'Conditions générales de vente | SailingLoc',
      description: 'Consultez les conditions générales de vente de SailingLoc.',
    },
  },
  '/politique-de-confidentialite': {
    fr: {
      title: 'Politique de confidentialité | SailingLoc',
      description:
        'Consultez la politique de confidentialité et les règles de protection des données de SailingLoc.',
    },
  },
};

const PRIVATE_PREFIXES = [
  '/admin',
  '/documents',
  '/forgot-password',
  '/locataire',
  '/login',
  '/proprietaire',
  '/register',
  '/reservation',
  '/reset-password',
  '/verify-email',
];

function normalizePathname(pathname = '/') {
  const normalized = `/${pathname}`.replace(/\/+/g, '/').replace(/\/$/, '');
  return normalized || '/';
}

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function resolveSeo(pathname, requestedLanguage = 'fr') {
  const normalizedPath = normalizePathname(pathname);
  const language = requestedLanguage === 'en' ? 'en' : 'fr';

  if (/^\/product\/[^/]+$/.test(normalizedPath)) {
    return {
      ...(PUBLIC_ROUTES['/product'][language] ?? PUBLIC_ROUTES['/product'].fr),
      canonicalPath: normalizedPath,
      robots: 'index, follow',
      language,
    };
  }

  const publicRoute = PUBLIC_ROUTES[normalizedPath];
  if (publicRoute) {
    const contentLanguage = publicRoute[language] ? language : 'fr';
    return {
      ...(publicRoute[contentLanguage] ?? publicRoute.fr),
      canonicalPath: normalizedPath,
      robots: publicRoute.robots ?? 'index, follow',
      language: contentLanguage,
    };
  }

  if (isPrivatePath(normalizedPath)) {
    return {
      title: language === 'en' ? 'Secure area | SailingLoc' : 'Espace sécurisé | SailingLoc',
      description:
        language === 'en'
          ? 'Sign in to access your secure SailingLoc account.'
          : DEFAULT_DESCRIPTION,
      canonicalPath: normalizedPath,
      robots: 'noindex, nofollow',
      language,
    };
  }

  return {
    title: 'Page introuvable | SailingLoc',
    description: "Cette page n'existe pas ou n'est plus disponible sur SailingLoc.",
    canonicalPath: normalizedPath,
    robots: 'noindex, nofollow',
    language: 'fr',
  };
}

export { DEFAULT_DESCRIPTION };
