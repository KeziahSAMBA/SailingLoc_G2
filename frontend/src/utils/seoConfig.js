const DEFAULT_DESCRIPTION =
  'Louez un bateau entre particuliers en France : voiliers, catamarans et bateaux à moteur proposés par des propriétaires.';

const PUBLIC_ROUTES = {
  '/': {
    title: 'Location de bateau entre particuliers en France | SailingLoc',
    description:
      'Trouvez une location de bateau entre particuliers en France : voilier, catamaran ou bateau à moteur, avec ou sans skipper.',
  },
  '/categorie': {
    title: 'Location de bateaux en France : voiliers et catamarans | SailingLoc',
    description:
      'Découvrez les bateaux disponibles à la location en France et filtrez les offres par port, type de bateau, capacité et prix.',
  },
  '/product': {
    title: 'Bateau disponible à la location | SailingLoc',
    description:
      'Consultez les caractéristiques, équipements, disponibilités et avis de ce bateau proposé à la location sur SailingLoc.',
    robots: 'noindex, follow',
  },
  '/contact': {
    title: 'Contact et aide | SailingLoc',
    description:
      "Contactez l'équipe SailingLoc pour obtenir de l'aide au sujet d'une location, d'une annonce ou de votre compte.",
  },
  '/a-propos': {
    title: 'À propos de SailingLoc | Location de bateaux entre particuliers',
    description:
      'Découvrez SailingLoc, sa mission et son fonctionnement pour faciliter la location de bateaux entre particuliers.',
  },
  '/mentions-legales': {
    title: 'Mentions légales | SailingLoc',
    description: 'Consultez les mentions légales du site SailingLoc.',
  },
  '/cgu': {
    title: "Conditions générales d'utilisation | SailingLoc",
    description: "Consultez les conditions générales d'utilisation de SailingLoc.",
  },
  '/cgv': {
    title: 'Conditions générales de vente | SailingLoc',
    description: 'Consultez les conditions générales de vente de SailingLoc.',
  },
  '/politique-de-confidentialite': {
    title: 'Politique de confidentialité | SailingLoc',
    description:
      'Consultez la politique de confidentialité et les règles de protection des données de SailingLoc.',
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

export function resolveSeo(pathname) {
  const normalizedPath = normalizePathname(pathname);

  if (/^\/product\/[^/]+$/.test(normalizedPath)) {
    return {
      ...PUBLIC_ROUTES['/product'],
      canonicalPath: normalizedPath,
      robots: 'index, follow',
    };
  }

  const publicRoute = PUBLIC_ROUTES[normalizedPath];
  if (publicRoute) {
    return {
      ...publicRoute,
      canonicalPath: normalizedPath,
      robots: publicRoute.robots ?? 'index, follow',
    };
  }

  if (isPrivatePath(normalizedPath)) {
    return {
      title: 'Espace sécurisé | SailingLoc',
      description: DEFAULT_DESCRIPTION,
      canonicalPath: normalizedPath,
      robots: 'noindex, nofollow',
    };
  }

  return {
    title: 'Page introuvable | SailingLoc',
    description: "Cette page n'existe pas ou n'est plus disponible sur SailingLoc.",
    canonicalPath: normalizedPath,
    robots: 'noindex, nofollow',
  };
}

export { DEFAULT_DESCRIPTION };
