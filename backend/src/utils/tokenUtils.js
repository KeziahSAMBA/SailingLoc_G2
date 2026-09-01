import jwt from 'jsonwebtoken';
import { initConfig } from '../config/appConfig.js';
import { JWT_ALGORITHM, JWT_AUDIENCE, JWT_ISSUER } from '../config/auth.js';

const { JWT_SECRET } = initConfig();

export function createToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}
