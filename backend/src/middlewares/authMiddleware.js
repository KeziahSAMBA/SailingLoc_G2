import jwt from 'jsonwebtoken';
import { initConfig } from '../config/appConfig.js';

const { JWT_SECRET } = initConfig();

export function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
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
