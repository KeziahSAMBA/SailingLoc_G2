import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

const mockFindUnique = jest.fn();
jest.unstable_mockModule('../src/config/db.js', () => ({
  default: { user: { findUnique: mockFindUnique } },
}));

const { initConfig } = await import('../src/config/appConfig.js');
const { protect } = await import('../src/middlewares/authMiddleware.js');
const { JWT_SECRET } = initConfig();

function token(payload = {}, options = {}) {
  return jwt.sign({ id_user: 7, ver: 2, ...payload }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'sailingloc-api',
    audience: 'sailingloc-web',
    ...options,
  });
}

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

function activeUser(overrides = {}) {
  return {
    id_user: 7,
    role: 'locataire',
    is_active: true,
    email_verified: true,
    auth_version: 2,
    deleted_at: null,
    ...overrides,
  };
}

describe('access token security', () => {
  beforeEach(() => mockFindUnique.mockReset());

  it('reloads the current role from the database instead of trusting the JWT', async () => {
    mockFindUnique.mockResolvedValue(activeUser({ role: 'proprietaire' }));
    const req = { headers: { authorization: `Bearer ${token()}` } };
    const res = response();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id_user: 7, role: 'proprietaire' });
  });

  it.each([
    activeUser({ is_active: false }),
    activeUser({ email_verified: false }),
    activeUser({ deleted_at: new Date() }),
    activeUser({ auth_version: 3 }),
    null,
  ])('rejects a token when the account or session was invalidated', async (user) => {
    mockFindUnique.mockResolvedValue(user);
    const res = response();
    const next = jest.fn();

    await protect({ headers: { authorization: `Bearer ${token()}` } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects tokens with the wrong issuer or without a session version', async () => {
    const wrongIssuer = token({}, { issuer: 'attacker' });
    const legacyToken = jwt.sign({ id_user: 7 }, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: '15m',
      issuer: 'sailingloc-api',
      audience: 'sailingloc-web',
    });

    for (const raw of [wrongIssuer, legacyToken]) {
      const res = response();
      const next = jest.fn();
      await protect({ headers: { authorization: `Bearer ${raw}` } }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    }
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

describe('production JWT configuration', () => {
  it('refuses the default or a short signing secret in production', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousSecret = process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'change-me';

    try {
      expect(() => initConfig()).toThrow(/JWT_SECRET/);
      process.env.JWT_SECRET = 'too-short';
      expect(() => initConfig()).toThrow(/JWT_SECRET/);
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      process.env.JWT_SECRET = previousSecret;
    }
  });
});
