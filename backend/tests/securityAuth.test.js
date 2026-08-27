import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'local-security-test-secret-with-more-than-32-chars';

const db = {
  user: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  refreshToken: { updateMany: jest.fn() },
};
db.$transaction = jest.fn((fn) => fn(db));

const repo = {
  findUserByEmailAndRole: jest.fn(),
  findUserByVerificationToken: jest.fn(),
  findUserByResetToken: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  createRefreshToken: jest.fn(),
  findRefreshTokenByHash: jest.fn(),
  rotateRefreshToken: jest.fn(),
  revokeAllUserRefreshTokens: jest.fn(),
  consumeEmailVerificationToken: jest.fn(),
};

const mockCompare = jest.fn();
const mockHash = jest.fn();

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));
jest.unstable_mockModule('../src/repositories/userRepository.js', () => repo);
jest.unstable_mockModule('bcryptjs', () => ({
  default: { compare: mockCompare, hash: mockHash },
  compare: mockCompare,
  hash: mockHash,
}));
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendAccountCreatedEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.unstable_mockModule('../src/services/accountClosureService.js', () => ({
  reactivateOwnAccount: jest.fn().mockResolvedValue(undefined),
}));

const { login, refreshSession, create, verifyEmail } =
  await import('../src/services/userService.js');
const { protect } = await import('../src/middlewares/authMiddleware.js');
const { JWT_ALGORITHM, JWT_AUDIENCE, JWT_ISSUER } = await import('../src/config/auth.js');

const USER = {
  id_user: 7,
  email: 'lea@example.com',
  role: 'locataire',
  first_name: 'Léa',
  last_name: 'Martin',
  phone: null,
  password: 'bcrypt-hash',
  auth_version: 4,
  is_active: true,
  deleted_at: null,
  email_verified: true,
  images: [],
};

const signClaims = (claims, options = {}) =>
  jwt.sign(claims, process.env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
    ...options,
  });

const response = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCompare.mockResolvedValue(true);
  mockHash.mockResolvedValue('new-bcrypt-hash');
  repo.createRefreshToken.mockResolvedValue({});
  repo.rotateRefreshToken.mockResolvedValue(true);
  repo.consumeEmailVerificationToken.mockResolvedValue({ count: 1 });
  db.user.update.mockResolvedValue({});
  db.user.updateMany.mockResolvedValue({ count: 1 });
  db.refreshToken.updateMany.mockResolvedValue({ count: 1 });
});

describe('access-token claims and account state', () => {
  it('signs an access token with a fixed algorithm, issuer, audience and auth version', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(USER);

    const { accessToken } = await login(
      { email: USER.email, password: 'Valid-password!', role: USER.role },
      { userAgent: 'test' }
    );
    const payload = jwt.verify(accessToken, process.env.JWT_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    expect(payload).toMatchObject({ id_user: 7, sub: '7', role: USER.role, auth_version: 4 });
  });

  it('rejects a validly signed token whose account version is stale', async () => {
    const token = signClaims({ id_user: 7, sub: '7', role: 'locataire', auth_version: 3 });
    db.user.findUnique.mockResolvedValue({ ...USER, auth_version: 4 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects an alternative JWT algorithm', async () => {
    const token = jwt.sign(
      { id_user: 7, sub: '7', role: 'locataire', auth_version: 4 },
      process.env.JWT_SECRET,
      { algorithm: 'HS384', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
    );
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('refresh and verification tokens', () => {
  it('rotates a refresh token through the atomic repository operation', async () => {
    const stored = {
      id_refresh: 11,
      id_user: 7,
      revoked_at: null,
      expires_at: new Date(Date.now() + 60_000),
    };
    repo.findRefreshTokenByHash.mockResolvedValue(stored);
    repo.findUserById.mockResolvedValue(USER);

    const result = await refreshSession('raw-refresh-token', { userAgent: 'test-agent' });

    expect(repo.rotateRefreshToken).toHaveBeenCalledTimes(1);
    expect(repo.rotateRefreshToken.mock.calls[0][0]).toBe(11);
    expect(repo.rotateRefreshToken.mock.calls[0][1]).toMatchObject({ id_user: 7 });
    expect(result.refreshToken).toHaveLength(128);
  });

  it('stores only a hash and expiry for email verification', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(null);
    repo.createUser.mockResolvedValue({ ...USER, email_verified: false });

    await create({
      first_name: 'Léa',
      last_name: 'Martin',
      email: USER.email,
      password: 'Valid-password!',
      confirmPassword: 'Valid-password!',
      role: 'locataire',
    });

    const data = repo.createUser.mock.calls[0][0];
    expect(data.email_verification_token).toMatch(/^[a-f0-9]{64}$/);
    expect(data.email_verification_token_expires_at.getTime()).toBeGreaterThan(Date.now());
  });

  it('consumes email verification atomically and rejects a concurrent reuse', async () => {
    repo.findUserByVerificationToken.mockResolvedValue(USER);
    repo.consumeEmailVerificationToken.mockResolvedValue({ count: 0 });

    await expect(verifyEmail('raw-verification-token')).rejects.toMatchObject({ status: 400 });
    expect(repo.consumeEmailVerificationToken).toHaveBeenCalledWith(
      7,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date)
    );
  });
});
