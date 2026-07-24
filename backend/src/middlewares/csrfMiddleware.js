const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function canonicalOrigin(value) {
  try {
    return new URL(String(value)).origin;
  } catch {
    return null;
  }
}

export function createCsrfProtection(trustedOrigins) {
  const allowed = new Set(
    trustedOrigins.map(canonicalOrigin).filter(Boolean)
  );

  return function csrfProtection(req, res, next) {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.get('origin');
    if (origin) {
      const requestOrigin = canonicalOrigin(origin);
      if (!requestOrigin || !allowed.has(requestOrigin)) {
        return res.status(403).json({ message: 'Origine de requête non autorisée.' });
      }
      return next();
    }

    // Sec-Fetch-Site est ajouté par les navigateurs modernes. Une requête
    // cross-site sans Origin reste donc bloquée.
    if (req.get('sec-fetch-site') === 'cross-site') {
      return res.status(403).json({ message: 'Origine de requête non autorisée.' });
    }

    // Le cookie de renouvellement est une authentification ambiante : sans
    // Origin vérifiable, une mutation qui le transporte est refusée.
    if (req.cookies?.sl_refresh) {
      return res.status(403).json({ message: 'Origine de requête non autorisée.' });
    }

    // Les clients non-navigateurs utilisant un Bearer ou les endpoints publics
    // sans cookie restent utilisables (scripts locaux, CLI et tests d'API).
    return next();
  };
}
