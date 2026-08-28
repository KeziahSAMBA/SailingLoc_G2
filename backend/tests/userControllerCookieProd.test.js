import { jest, describe, it, expect } from '@jest/globals';

// Le contrôleur fige sa politique de cookie à l'import, d'après NODE_ENV.
// Ce fichier est séparé pour pouvoir l'importer en « production » : les
// attributs Secure et SameSite=strict ne sont vérifiables qu'ainsi.
process.env.NODE_ENV = 'production';

jest.unstable_mockModule('../src/services/userService.js', () => ({
  create: jest.fn(),
  adminCreate: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  login: jest.fn().mockResolvedValue({
    accessToken: 'access',
    refreshToken: 'refresh',
    user: { id_user: 1 },
    reactivated: false,
  }),
  refreshSession: jest.fn(),
  logoutSession: jest.fn().mockResolvedValue(undefined),
  getCurrentUser: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  checkResetToken: jest.fn(),
  updateAvatar: jest.fn(),
  removeAvatar: jest.fn(),
  REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
}));

jest.unstable_mockModule('../src/services/accountClosureService.js', () => ({
  getClosureStatus: jest.fn(),
  deactivateOwnAccount: jest.fn(),
  deleteOwnAccount: jest.fn(),
  DELETION_RETENTION_DAYS: 30,
  PAUSE_RETENTION_DAYS: 30,
}));

jest.unstable_mockModule('../src/services/logService.js', () => ({ logActivity: jest.fn() }));

const { login, logout } = await import('../src/controllers/userController.js');

function makeRes() {
  const res = { locals: {} };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.cookie = jest.fn(() => res);
  res.clearCookie = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

const req = { body: {}, cookies: {}, headers: {}, ip: '203.0.113.7', user: { id_user: 1 } };

describe('cookie de rafraîchissement en production', () => {
  it('pose le cookie en Secure et SameSite=strict', async () => {
    const res = makeRes();

    await login(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'sl_refresh',
      'refresh',
      expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'strict' })
    );
  });

  it('efface le cookie avec les mêmes attributs, sinon le navigateur le conserve', async () => {
    const res = makeRes();

    await logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      'sl_refresh',
      expect.objectContaining({ secure: true, sameSite: 'strict', maxAge: 0 })
    );
  });
});
