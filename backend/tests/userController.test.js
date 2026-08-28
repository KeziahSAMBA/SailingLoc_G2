import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const service = {
  create: jest.fn(),
  adminCreate: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  login: jest.fn(),
  refreshSession: jest.fn(),
  logoutSession: jest.fn(),
  getCurrentUser: jest.fn(),
  updateProfile: jest.fn(),
  changePassword: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  checkResetToken: jest.fn(),
  updateAvatar: jest.fn(),
  removeAvatar: jest.fn(),
  REFRESH_TOKEN_TTL_MS: 7 * 24 * 60 * 60 * 1000,
};
jest.unstable_mockModule('../src/services/userService.js', () => service);

const closure = {
  getClosureStatus: jest.fn(),
  deactivateOwnAccount: jest.fn(),
  deleteOwnAccount: jest.fn(),
  DELETION_RETENTION_DAYS: 30,
  PAUSE_RETENTION_DAYS: 30,
};
jest.unstable_mockModule('../src/services/accountClosureService.js', () => closure);

const mockLogActivity = jest.fn();
jest.unstable_mockModule('../src/services/logService.js', () => ({
  logActivity: mockLogActivity,
}));

const controller = await import('../src/controllers/userController.js');

const REFRESH_COOKIE = 'sl_refresh';

function makeRes() {
  const res = { locals: {} };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.cookie = jest.fn(() => res);
  res.clearCookie = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
}

function makeReq(overrides = {}) {
  return {
    body: {},
    params: {},
    cookies: {},
    headers: { 'user-agent': 'Firefox' },
    ip: '203.0.113.7',
    user: { id_user: 1 },
    ...overrides,
  };
}

const publicUser = { id_user: 1, email: 'jean@example.com', role: 'locataire' };
const loginResult = {
  accessToken: 'access',
  refreshToken: 'refresh',
  user: publicUser,
  reactivated: false,
};

// Erreur telle que la lèvent les services : message + status HTTP porté par l'objet.
const httpError = (status, message) => Object.assign(new Error(message), { status });

let res;

beforeEach(() => {
  jest.clearAllMocks();
  res = makeRes();
  service.login.mockResolvedValue(loginResult);
  service.refreshSession.mockResolvedValue(loginResult);
  service.getCurrentUser.mockResolvedValue(publicUser);
  service.updateProfile.mockResolvedValue(publicUser);
  service.updateAvatar.mockResolvedValue(publicUser);
  service.removeAvatar.mockResolvedValue(publicUser);
  service.adminCreate.mockResolvedValue(publicUser);
  service.checkResetToken.mockResolvedValue(true);
  closure.getClosureStatus.mockResolvedValue({ state: 'active' });
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('register', () => {
  it('répond 201 après une inscription réussie', async () => {
    const req = makeReq({ body: { email: 'jean@example.com' } });

    await controller.register(req, res);

    expect(service.create).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('relaie le statut porté par l’erreur du service', async () => {
    service.create.mockRejectedValue(httpError(400, 'Rôle invalide.'));

    await controller.register(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Rôle invalide.' });
  });

  it('retombe sur 500 quand l’erreur ne porte pas de statut', async () => {
    service.create.mockRejectedValue(new Error('Panne base de données'));

    await controller.register(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('adminCreateUser', () => {
  it('répond 201 et dépose l’identifiant créé pour la trace d’audit', async () => {
    await controller.adminCreateUser(makeReq(), res);

    expect(res.locals.auditTargetId).toBe('1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ user: publicUser });
  });

  it('tolère un corps de requête absent', async () => {
    await controller.adminCreateUser(makeReq({ body: undefined }), res);

    expect(service.adminCreate).toHaveBeenCalledWith({});
  });

  it('relaie un conflit 409', async () => {
    service.adminCreate.mockRejectedValue(httpError(409, 'Existe déjà.'));

    await controller.adminCreateUser(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.locals.auditTargetId).toBeUndefined();
  });
});

describe('login', () => {
  it('renvoie l’access token et le profil', async () => {
    await controller.login(makeReq({ body: { email: 'jean@example.com' } }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      accessToken: 'access',
      user: publicUser,
      reactivated: false,
    });
  });

  it('dépose le refresh token dans un cookie httpOnly cantonné à /api/users', async () => {
    await controller.login(makeReq(), res);

    const [name, value, options] = res.cookie.mock.calls[0];
    expect(name).toBe(REFRESH_COOKIE);
    expect(value).toBe('refresh');
    expect(options).toMatchObject({ httpOnly: true, path: '/api/users' });
  });

  it('ne renvoie jamais le refresh token dans le corps de la réponse', async () => {
    await controller.login(makeReq(), res);

    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toContain('refresh');
  });

  it('transmet le user-agent au service', async () => {
    await controller.login(makeReq(), res);

    expect(service.login).toHaveBeenCalledWith(expect.anything(), { userAgent: 'Firefox' });
  });

  it('refuse le rôle admin sans même appeler le service', async () => {
    await controller.login(makeReq({ body: { role: 'admin' } }), res);

    expect(service.login).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Identifiants invalides.' });
  });

  it('trace la réactivation quand le compte sortait de pause', async () => {
    service.login.mockResolvedValue({ ...loginResult, reactivated: true });

    await controller.login(makeReq(), res);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.reactivate_self', actorId: 1, ip: '203.0.113.7' })
    );
  });

  it('ne trace rien lors d’une connexion ordinaire', async () => {
    await controller.login(makeReq(), res);

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('relaie une erreur d’identifiants sans poser de cookie', async () => {
    service.login.mockRejectedValue(httpError(401, 'Identifiants invalides.'));

    await controller.login(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.cookie).not.toHaveBeenCalled();
  });
});

describe('adminLogin', () => {
  it('force le rôle admin quel que soit le corps envoyé', async () => {
    await controller.adminLogin(
      makeReq({ body: { email: 'a@b.fr', password: 'x', role: 'locataire' } }),
      res
    );

    expect(service.login).toHaveBeenCalledWith(
      { email: 'a@b.fr', password: 'x', role: 'admin' },
      { userAgent: 'Firefox' }
    );
  });

  it('trace la connexion admin réussie', async () => {
    await controller.adminLogin(makeReq(), res);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'auth', action: 'admin.login', actorId: 1 })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('trace un échec de connexion admin en warning, avec l’email tenté', async () => {
    service.login.mockRejectedValue(httpError(401, 'Identifiants invalides.'));

    await controller.adminLogin(makeReq({ body: { email: 'pirate@example.com' } }), res);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warning',
        action: 'admin.login_failed',
        actorEmail: 'pirate@example.com',
      })
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('tolère un corps absent lors d’un échec', async () => {
    service.login.mockRejectedValue(httpError(401, 'Identifiants invalides.'));

    await controller.adminLogin(makeReq({ body: undefined }), res);

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ actorEmail: undefined })
    );
  });
});

describe('refresh', () => {
  it('fait tourner le cookie et renvoie un nouvel access token', async () => {
    const req = makeReq({ cookies: { [REFRESH_COOKIE]: 'ancien' } });

    await controller.refresh(req, res);

    expect(service.refreshSession).toHaveBeenCalledWith('ancien', { userAgent: 'Firefox' });
    expect(res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE, 'refresh', expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'access', user: publicUser });
  });

  it('efface le cookie quand la session est refusée', async () => {
    service.refreshSession.mockRejectedValue(httpError(401, 'Session expirée. Reconnectez-vous.'));

    await controller.refresh(makeReq(), res);

    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      expect.objectContaining({ maxAge: 0 })
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('appelle le service avec undefined quand aucun cookie n’est présent', async () => {
    await controller.refresh(makeReq({ cookies: undefined }), res);

    expect(service.refreshSession).toHaveBeenCalledWith(undefined, expect.any(Object));
  });
});

describe('logout', () => {
  it('révoque la session et répond 204', async () => {
    const req = makeReq({ cookies: { [REFRESH_COOKIE]: 'jeton' } });

    await controller.logout(req, res);

    expect(service.logoutSession).toHaveBeenCalledWith('jeton');
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('efface le cookie et répond 204 même si la révocation échoue', async () => {
    service.logoutSession.mockRejectedValue(new Error('Base injoignable'));

    await controller.logout(makeReq({ cookies: { [REFRESH_COOKIE]: 'jeton' } }), res);

    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('répond 204 même sans cookie', async () => {
    await controller.logout(makeReq({ cookies: undefined }), res);

    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('me / updateMe', () => {
  it('renvoie le profil de l’utilisateur authentifié', async () => {
    await controller.me(makeReq(), res);

    expect(service.getCurrentUser).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ user: publicUser });
  });

  it('relaie un 404 sur profil introuvable', async () => {
    service.getCurrentUser.mockRejectedValue(httpError(404, 'Utilisateur introuvable.'));

    await controller.me(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('met à jour le profil de l’utilisateur authentifié, jamais un autre', async () => {
    const req = makeReq({ body: { first_name: 'Marie', id_user: 99 } });

    await controller.updateMe(req, res);

    expect(service.updateProfile).toHaveBeenCalledWith(1, req.body);
  });

  it('tolère un corps absent à la mise à jour', async () => {
    await controller.updateMe(makeReq({ body: undefined }), res);

    expect(service.updateProfile).toHaveBeenCalledWith(1, {});
  });

  it('relaie une erreur de validation', async () => {
    service.updateProfile.mockRejectedValue(httpError(400, 'Aucune donnée à mettre à jour.'));

    await controller.updateMe(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('changeMyPassword', () => {
  it('efface le cookie courant, toutes les sessions étant révoquées', async () => {
    await controller.changeMyPassword(makeReq({ body: { newPassword: 'x' } }), res);

    expect(service.changePassword).toHaveBeenCalledWith(1, { newPassword: 'x' });
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  it('ne touche pas au cookie si le changement échoue', async () => {
    service.changePassword.mockRejectedValue(httpError(400, 'Mot de passe actuel incorrect.'));

    await controller.changeMyPassword(makeReq(), res);

    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('fermeture de compte', () => {
  it('renvoie l’état de clôture', async () => {
    await controller.getMyClosureStatus(makeReq(), res);

    expect(closure.getClosureStatus).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ state: 'active' });
  });

  it('relaie une erreur sur l’état de clôture', async () => {
    closure.getClosureStatus.mockRejectedValue(httpError(404, 'Introuvable.'));

    await controller.getMyClosureStatus(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('déconnecte l’utilisateur après une mise en pause', async () => {
    await controller.deactivateMe(makeReq(), res);

    expect(closure.deactivateOwnAccount).toHaveBeenCalledWith(1, {});
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it('déconnecte l’utilisateur après une suppression', async () => {
    await controller.deleteMe(makeReq(), res);

    expect(closure.deleteOwnAccount).toHaveBeenCalledWith(1, {});
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it.each([
    ['deactivateMe', 'deactivateOwnAccount'],
    ['deleteMe', 'deleteOwnAccount'],
  ])('%s ne déconnecte pas en cas d’échec', async (handler, serviceFn) => {
    closure[serviceFn].mockRejectedValue(httpError(400, 'Mot de passe requis.'));

    await controller[handler](makeReq(), res);

    expect(res.clearCookie).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('parcours email et mot de passe oublié', () => {
  it('renvoie une réponse neutre au renvoi de confirmation', async () => {
    await controller.resend(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].message).toMatch(/Si un compte/);
  });

  it('relaie une erreur de validation au renvoi de confirmation', async () => {
    service.resendVerification.mockRejectedValue(httpError(400, 'Rôle invalide.'));

    await controller.resend(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('renvoie une réponse neutre sur mot de passe oublié (anti-énumération)', async () => {
    await controller.forgotPassword(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].message).toMatch(/Si un compte/);
  });

  it('relaie une panne interne sur mot de passe oublié', async () => {
    service.requestPasswordReset.mockRejectedValue(new Error('SMTP mort'));

    await controller.forgotPassword(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('confirme la réinitialisation du mot de passe', async () => {
    await controller.resetPassword(makeReq({ body: { token: 't' } }), res);

    expect(service.resetPassword).toHaveBeenCalledWith({ token: 't' });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('relaie un lien de réinitialisation expiré', async () => {
    service.resetPassword.mockRejectedValue(httpError(400, 'Lien invalide ou expiré.'));

    await controller.resetPassword(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('valide un jeton de réinitialisation', async () => {
    await controller.verifyResetToken(makeReq({ params: { token: 'jeton' } }), res);

    expect(service.checkResetToken).toHaveBeenCalledWith('jeton');
    expect(res.json).toHaveBeenCalledWith({ valid: true });
  });

  it('répond 400 et valid:false pour un jeton refusé', async () => {
    service.checkResetToken.mockResolvedValue(false);

    await controller.verifyResetToken(makeReq({ params: { token: 'jeton' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ valid: false }));
  });

  it('relaie une panne lors de la vérification du jeton', async () => {
    service.checkResetToken.mockRejectedValue(new Error('Base injoignable'));

    await controller.verifyResetToken(makeReq({ params: { token: 'jeton' } }), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('confirme une adresse email', async () => {
    await controller.confirmEmail(makeReq({ params: { token: 'jeton' } }), res);

    expect(service.verifyEmail).toHaveBeenCalledWith('jeton');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  it('relaie un jeton de confirmation inconnu', async () => {
    service.verifyEmail.mockRejectedValue(httpError(404, 'Token invalide ou expiré.'));

    await controller.confirmEmail(makeReq({ params: { token: 'x' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('repli sur 500 — aucune erreur inattendue ne doit passer pour un succès', () => {
  const avatarReq = {
    ...makeReq(),
    protocol: 'https',
    get: () => 'api.sailingloc.fr',
    file: { filename: 'p.png' },
  };

  it.each([
    ['adminCreateUser', service, 'adminCreate', makeReq()],
    ['login', service, 'login', makeReq()],
    ['adminLogin', service, 'login', makeReq()],
    ['refresh', service, 'refreshSession', makeReq()],
    ['me', service, 'getCurrentUser', makeReq()],
    ['updateMe', service, 'updateProfile', makeReq()],
    ['changeMyPassword', service, 'changePassword', makeReq()],
    ['resend', service, 'resendVerification', makeReq()],
    ['resetPassword', service, 'resetPassword', makeReq()],
    ['confirmEmail', service, 'verifyEmail', makeReq({ params: { token: 'x' } })],
    ['patchMyAvatar', service, 'updateAvatar', avatarReq],
    ['getMyClosureStatus', closure, 'getClosureStatus', makeReq()],
    ['deactivateMe', closure, 'deactivateOwnAccount', makeReq()],
    ['deleteMe', closure, 'deleteOwnAccount', makeReq()],
  ])('%s répond 500 sur une erreur sans statut', async (handler, module, fn, req) => {
    module[fn].mockRejectedValue(new Error('Panne inattendue'));

    await controller[handler](req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Panne inattendue' });
  });
});

describe('avatar', () => {
  const avatarReq = (overrides = {}) =>
    makeReq({
      protocol: 'https',
      get: jest.fn(() => 'api.sailingloc.fr'),
      file: { filename: 'photo.png' },
      ...overrides,
    });

  it('reconstruit l’origine à partir de la requête', async () => {
    await controller.patchMyAvatar(avatarReq(), res);

    expect(service.updateAvatar).toHaveBeenCalledWith(
      1,
      { filename: 'photo.png' },
      'https://api.sailingloc.fr'
    );
    expect(res.json).toHaveBeenCalledWith({ user: publicUser });
  });

  it('relaie l’absence de fichier', async () => {
    service.updateAvatar.mockRejectedValue(httpError(400, 'Aucune image fournie.'));

    await controller.patchMyAvatar(avatarReq({ file: undefined }), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('supprime l’avatar de l’utilisateur authentifié', async () => {
    await controller.deleteMyAvatar(makeReq(), res);

    expect(service.removeAvatar).toHaveBeenCalledWith(1);
    expect(res.json).toHaveBeenCalledWith({ user: publicUser });
  });

  it('relaie une panne à la suppression de l’avatar', async () => {
    service.removeAvatar.mockRejectedValue(new Error('Disque plein'));

    await controller.deleteMyAvatar(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
