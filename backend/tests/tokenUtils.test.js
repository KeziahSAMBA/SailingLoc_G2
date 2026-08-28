import { jest, describe, it, expect } from '@jest/globals';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'secret-de-test-unitaire';

jest.unstable_mockModule('../src/config/appConfig.js', () => ({
  initConfig: () => ({ JWT_SECRET }),
}));

const { createToken, verifyToken } = await import('../src/utils/tokenUtils.js');

describe('createToken', () => {
  it('produit un jeton relisible avec le secret de l’application', () => {
    const token = createToken({ id_user: 7, role: 'admin' });

    expect(jwt.verify(token, JWT_SECRET)).toMatchObject({ id_user: 7, role: 'admin' });
  });

  it('applique une durée de validité de 24 h par défaut', () => {
    const decoded = jwt.verify(createToken({ id_user: 7 }), JWT_SECRET);

    expect(decoded.exp - decoded.iat).toBe(24 * 3600);
  });

  it('accepte une durée de validité explicite', () => {
    const decoded = jwt.verify(createToken({ id_user: 7 }, '15m'), JWT_SECRET);

    expect(decoded.exp - decoded.iat).toBe(15 * 60);
  });
});

describe('verifyToken', () => {
  it('relit un jeton émis par createToken', () => {
    expect(verifyToken(createToken({ id_user: 7 }))).toMatchObject({ id_user: 7 });
  });

  it('rejette un jeton signé avec un autre secret', () => {
    const token = jwt.sign({ id_user: 7 }, 'mauvais-secret');

    expect(() => verifyToken(token)).toThrow();
  });

  it('rejette un jeton expiré', () => {
    expect(() => verifyToken(createToken({ id_user: 7 }, '-1s'))).toThrow();
  });

  it('rejette un jeton altéré', () => {
    const token = createToken({ id_user: 7 });
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ id_user: 999 })).toString('base64url');

    expect(() => verifyToken(`${header}.${forged}.${signature}`)).toThrow();
  });

  it('rejette un jeton dont l’algorithme est « none »', () => {
    const token = jwt.sign({ id_user: 7 }, '', { algorithm: 'none' });

    expect(() => verifyToken(token)).toThrow();
  });
});
