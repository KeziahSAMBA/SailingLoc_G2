import jwt from 'jsonwebtoken';
import { initConfig } from '../config/appConfig.js';
import prisma from '../config/db.js';

const { JWT_SECRET } = initConfig();

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'sailingloc-api',
      audience: 'sailingloc-web',
    });
    if (!Number.isInteger(decoded.id_user) || !Number.isInteger(decoded.ver)) {
      return res.status(401).json({ message: 'Session invalide.' });
    }

    const user = await prisma.user.findUnique({
      where: { id_user: decoded.id_user },
      select: {
        id_user: true,
        role: true,
        is_active: true,
        email_verified: true,
        auth_version: true,
        deleted_at: true,
      },
    });
    if (
      !user ||
      !user.is_active ||
      !user.email_verified ||
      user.deleted_at ||
      user.auth_version !== decoded.ver
    ) {
      return res.status(401).json({ message: 'Session expirée. Reconnectez-vous.' });
    }

    req.user = { id_user: user.id_user, role: user.role };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Session invalide.' });
  }
}

// Fabrique de middleware : restreint une route aux rôles passés en argument.
// À utiliser après `protect` (qui renseigne req.user). Ex : requireRole('proprietaire', 'admin').
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
