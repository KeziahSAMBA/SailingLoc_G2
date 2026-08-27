import jwt from 'jsonwebtoken';
import { initConfig } from '../config/appConfig.js';
import prisma from '../config/db.js';
import { JWT_ALGORITHM, JWT_AUDIENCE, JWT_ISSUER } from '../config/auth.js';

const { JWT_SECRET } = initConfig();
const ROLES = new Set(['admin', 'proprietaire', 'locataire']);

const unauthorized = (res) => res.status(401).json({ message: 'Unauthorized' });

function hasValidClaims(decoded) {
  return (
    decoded &&
    Number.isSafeInteger(decoded.id_user) &&
    decoded.id_user > 0 &&
    typeof decoded.sub === 'string' &&
    decoded.sub === String(decoded.id_user) &&
    ROLES.has(decoded.role) &&
    Number.isSafeInteger(decoded.auth_version) &&
    decoded.auth_version >= 0
  );
}

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token.split('.').length !== 3) return unauthorized(res);

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (!hasValidClaims(decoded)) return unauthorized(res);

  try {
    // Les droits ne sont jamais tirés uniquement du JWT : une désactivation,
    // une suppression ou un changement de rôle prend effet immédiatement.
    const account = await prisma.user.findUnique({
      where: { id_user: decoded.id_user },
      select: {
        id_user: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        is_active: true,
        deleted_at: true,
        auth_version: true,
      },
    });

    if (
      !account ||
      !account.is_active ||
      account.deleted_at ||
      !ROLES.has(account.role) ||
      account.role !== decoded.role ||
      account.auth_version !== decoded.auth_version
    ) {
      return unauthorized(res);
    }

    // Ne conserver dans req.user que l'identité relue en base et les claims
    // temporels utiles ; email/rôle ne peuvent ainsi pas être forgés par un
    // ancien token après une modification de compte.
    req.user = {
      ...decoded,
      id_user: account.id_user,
      email: account.email,
      first_name: account.first_name,
      last_name: account.last_name,
      role: account.role,
      auth_version: account.auth_version,
    };
    return next();
  } catch {
    // Une panne DB ne doit jamais transformer un token valide en accès
    // implicite : le middleware échoue fermé.
    return unauthorized(res);
  }
}

// Fabrique de middleware : restreint une route aux rôles passés en argument.
// À utiliser après `protect` (qui renseigne req.user). Ex : requireRole('proprietaire', 'admin').
// Variante pour les ressources publiques qui peuvent enrichir la réponse
// lorsqu'un utilisateur est déjà connecté. Sans Authorization la requête reste
// anonyme ; un jeton présent mais invalide est rejeté comme toute route privée.
export function optionalProtect(req, res, next) {
  if (!req.headers.authorization) return next();
  return protect(req, res, next);
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    next();
  };
}

// Conservé pour compatibilité : équivaut à requireRole('admin').
export const requireAdmin = requireRole('admin');
