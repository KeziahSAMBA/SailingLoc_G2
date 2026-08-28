import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'secret-de-test-unitaire';

jest.unstable_mockModule('../src/config/appConfig.js', () => ({
  initConfig: () => ({ JWT_SECRET }),
}));

const { protect, requireRole, requireAdmin } = await import('../src/middlewares/authMiddleware.js');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function sign(payload, options) {
  return jwt.sign(payload, JWT_SECRET, options);
}

let res;
let next;

beforeEach(() => {
  res = makeRes();
  next = jest.fn();
});

describe('protect', () => {
  it('laisse passer un token valide et expose le payload sur req.user', () => {
    const req = {
      headers: { authorization: `Bearer ${sign({ id_user: 7, role: 'locataire' })}` },
    };

    protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toMatchObject({ id_user: 7, role: 'locataire' });
  });

  it('refuse une requête sans en-tête Authorization', () => {
    const req = { headers: {} };

    protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ['schéma Basic', 'Basic abc.def.ghi'],
    ['token nu sans schéma', 'abc.def.ghi'],
    ['casse incorrecte', 'bearer abc.def.ghi'],
    ['en-tête vide', ''],
  ])('refuse un en-tête mal formé : %s', (_label, authorization) => {
    protect({ headers: { authorization } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('refuse un token signé avec un autre secret', () => {
    const token = jwt.sign({ id_user: 7, role: 'admin' }, 'mauvais-secret');

    protect({ headers: { authorization: `Bearer ${token}` } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('refuse un token expiré', () => {
    const token = sign({ id_user: 7, role: 'admin' }, { expiresIn: '-1s' });

    protect({ headers: { authorization: `Bearer ${token}` } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('refuse un token altéré', () => {
    const token = sign({ id_user: 7, role: 'locataire' });
    const [header, payload, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ id_user: 7, role: 'admin' })).toString('base64url');

    protect({ headers: { authorization: `Bearer ${header}.${forged}.${signature}` } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
    expect(payload).not.toBe(forged);
  });

  it('refuse « Bearer » suivi d’un token vide', () => {
    protect({ headers: { authorization: 'Bearer ' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('refuse un token dont l’algorithme est « none »', () => {
    const token = jwt.sign({ id_user: 7, role: 'admin' }, '', { algorithm: 'none' });

    protect({ headers: { authorization: `Bearer ${token}` } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('laisse passer un rôle autorisé', () => {
    requireRole('proprietaire')({ user: { role: 'proprietaire' } }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepte n’importe lequel des rôles listés', () => {
    const middleware = requireRole('proprietaire', 'admin');

    middleware({ user: { role: 'admin' } }, res, next);
    middleware({ user: { role: 'proprietaire' } }, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('renvoie 401 quand protect n’a pas renseigné req.user', () => {
    requireRole('admin')({}, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Non authentifié.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('renvoie 403 pour un rôle non autorisé', () => {
    requireRole('admin')({ user: { role: 'locataire' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Accès refusé.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('distingue 401 (non authentifié) de 403 (authentifié mais interdit)', () => {
    const anonymous = makeRes();
    const forbidden = makeRes();

    requireRole('admin')({}, anonymous, next);
    requireRole('admin')({ user: { role: 'proprietaire' } }, forbidden, next);

    expect(anonymous.status).toHaveBeenCalledWith(401);
    expect(forbidden.status).toHaveBeenCalledWith(403);
  });

  it('refuse tout le monde quand aucun rôle n’est autorisé', () => {
    requireRole()({ user: { role: 'admin' } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('refuse un rôle absent du payload', () => {
    requireRole('admin')({ user: { id_user: 7 } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  it('laisse passer un admin', () => {
    requireAdmin({ user: { role: 'admin' } }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each(['locataire', 'proprietaire'])('refuse le rôle %s', (role) => {
    requireAdmin({ user: { role } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
