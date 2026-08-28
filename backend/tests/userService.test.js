import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = 'secret-de-test-unitaire';
const VALID_PASSWORD = 'MotDePasse!123';

jest.unstable_mockModule('../src/config/appConfig.js', () => ({
  initConfig: () => ({ JWT_SECRET }),
}));

// bcrypt réel coûte ~300 ms par hash en 12 tours. Le substitut garde la
// sémantique hash/compare sans laisser apparaître le mot de passe en clair,
// sinon les assertions de non-fuite seraient vraies par construction.
const fakeHash = (plain) =>
  `bcrypt$${crypto.createHash('sha256').update(String(plain)).digest('hex')}`;

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: jest.fn(async (plain) => fakeHash(plain)),
    compare: jest.fn(async (plain, hash) => hash === fakeHash(plain)),
  },
}));

const repo = {
  findUserByEmailAndRole: jest.fn(),
  findUserByVerificationToken: jest.fn(),
  findUserByResetToken: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  createRefreshToken: jest.fn(),
  findRefreshTokenByHash: jest.fn(),
  revokeRefreshToken: jest.fn(),
  revokeAllUserRefreshTokens: jest.fn(),
};
jest.unstable_mockModule('../src/repositories/userRepository.js', () => repo);

const emails = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendAccountCreatedEmail: jest.fn(),
};
jest.unstable_mockModule('../src/services/emailService.js', () => emails);

const mockReactivate = jest.fn();
jest.unstable_mockModule('../src/services/accountClosureService.js', () => ({
  reactivateOwnAccount: mockReactivate,
}));

const db = {
  user: { update: jest.fn() },
  image: { findMany: jest.fn(), deleteMany: jest.fn(), create: jest.fn() },
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const {
  create,
  adminCreate,
  resendVerification,
  login,
  refreshSession,
  logoutSession,
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  checkResetToken,
  resetPassword,
  verifyEmail,
  updateAvatar,
  removeAvatar,
  REFRESH_TOKEN_TTL_MS,
} = await import('../src/services/userService.js');

function makeUser(overrides = {}) {
  return {
    id_user: 1,
    email: 'jean@example.com',
    role: 'locataire',
    first_name: 'Jean',
    last_name: 'Dupont',
    phone: '+33612345678',
    password: fakeHash(VALID_PASSWORD),
    is_active: true,
    email_verified: true,
    deleted_at: null,
    deactivated_at: null,
    images: [],
    ...overrides,
  };
}

function validSignup(overrides = {}) {
  return {
    first_name: 'Jean',
    last_name: 'Dupont',
    email: 'Jean@Example.COM',
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
    role: 'locataire',
    phone: '+33612345678',
    ...overrides,
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

const hoursFromNow = (h) => new Date(Date.now() + h * 3600 * 1000);

beforeEach(() => {
  jest.clearAllMocks();
  repo.findUserByEmailAndRole.mockResolvedValue(null);
  repo.findUserById.mockResolvedValue(makeUser());
  repo.createUser.mockImplementation(async (data) => ({ id_user: 42, images: [], ...data }));
  repo.updateUser.mockImplementation(async (id_user, data) => makeUser({ id_user, ...data }));
  repo.createRefreshToken.mockResolvedValue({});
  repo.revokeRefreshToken.mockResolvedValue({});
  repo.revokeAllUserRefreshTokens.mockResolvedValue({});
  emails.sendVerificationEmail.mockResolvedValue();
  emails.sendPasswordResetEmail.mockResolvedValue();
  emails.sendAccountCreatedEmail.mockResolvedValue();
  db.user.update.mockResolvedValue({});
  db.image.findMany.mockResolvedValue([]);
  db.image.deleteMany.mockResolvedValue({ count: 0 });
  db.image.create.mockResolvedValue({});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('create — validation', () => {
  it.each([
    ['first_name', { first_name: '' }],
    ['last_name', { last_name: '' }],
    ['email', { email: '' }],
    ['password', { password: '' }],
    ['confirmPassword', { confirmPassword: '' }],
    ['role', { role: '' }],
  ])('exige le champ %s', async (_champ, patch) => {
    await expect(create(validSignup(patch))).rejects.toMatchObject({ status: 400 });
    expect(repo.createUser).not.toHaveBeenCalled();
  });

  it.each([
    ['prénom trop long', { first_name: 'a'.repeat(101) }],
    ['nom trop long', { last_name: 'a'.repeat(101) }],
    ['prénom fait uniquement d’espaces', { first_name: '   ' }],
  ])('refuse un %s', async (_label, patch) => {
    await expect(create(validSignup(patch))).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    ['sans arobase', 'jeanexample.com'],
    ['sans domaine', 'jean@'],
    ['avec espace', 'je an@example.com'],
    ['extension trop courte', 'jean@example.f'],
    ['trop long', `${'a'.repeat(250)}@example.com`],
  ])('refuse un email %s', async (_label, email) => {
    await expect(create(validSignup({ email }))).rejects.toMatchObject({ status: 400 });
  });

  it.each(['admin', 'root', 'inconnu'])(
    'refuse le rôle %s à l’inscription publique',
    async (role) => {
      await expect(create(validSignup({ role }))).rejects.toMatchObject({ status: 400 });
    }
  );

  it.each([
    ['trop court', 'Court!1a'],
    ['sans majuscule', 'motdepasse!123'],
    ['sans minuscule', 'MOTDEPASSE!123'],
    ['sans caractère spécial', 'MotDePasse1234'],
  ])('refuse un mot de passe %s', async (_label, password) => {
    await expect(
      create(validSignup({ password, confirmPassword: password }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuse deux mots de passe différents', async () => {
    await expect(
      create(validSignup({ confirmPassword: 'AutreMotDePasse!9' }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuse un téléphone au mauvais format', async () => {
    await expect(create(validSignup({ phone: 'abcdef' }))).rejects.toMatchObject({ status: 400 });
  });

  it('accepte un téléphone absent', async () => {
    await expect(create(validSignup({ phone: undefined }))).resolves.toBeDefined();
    expect(repo.createUser).toHaveBeenCalledWith(expect.objectContaining({ phone: null }));
  });
});

describe('create — inscription', () => {
  it('normalise l’email et rogne les espaces des noms', async () => {
    await create(validSignup({ first_name: '  Jean  ', last_name: '  Dupont  ' }));

    expect(repo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Jean',
        last_name: 'Dupont',
        email: 'jean@example.com',
      })
    );
  });

  it('enregistre le mot de passe haché, jamais en clair', async () => {
    await create(validSignup());

    const payload = repo.createUser.mock.calls[0][0];
    expect(payload.password).toBe(fakeHash(VALID_PASSWORD));
    expect(JSON.stringify(payload)).not.toContain(VALID_PASSWORD);
  });

  it('crée le compte non vérifié avec un jeton de confirmation', async () => {
    await create(validSignup());

    const payload = repo.createUser.mock.calls[0][0];
    expect(payload.email_verified).toBe(false);
    expect(payload.email_verification_token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('envoie l’email de confirmation avec le jeton créé', async () => {
    await create(validSignup());

    const { email_verification_token } = repo.createUser.mock.calls[0][0];
    expect(emails.sendVerificationEmail).toHaveBeenCalledWith(
      'jean@example.com',
      email_verification_token,
      'Jean'
    );
  });

  it('renvoie une réponse générique si l’email est déjà pris, sans créer de compte', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    const result = await create(validSignup());

    expect(result).toEqual({ id_user: null, email: 'jean@example.com', role: 'locataire' });
    expect(repo.createUser).not.toHaveBeenCalled();
    expect(emails.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('crée quand même le compte si l’envoi d’email échoue', async () => {
    emails.sendVerificationEmail.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(create(validSignup())).resolves.toMatchObject({ id_user: 42 });
    expect(repo.createUser).toHaveBeenCalled();
  });
});

describe('adminCreate', () => {
  const validAdminInput = (overrides = {}) => ({
    first_name: 'Alice',
    last_name: 'Martin',
    email: 'alice@example.com',
    role: 'admin',
    phone: '',
    ...overrides,
  });

  it('accepte le rôle admin, contrairement à l’inscription publique', async () => {
    await expect(adminCreate(validAdminInput())).resolves.toBeDefined();
  });

  it.each(['root', 'inconnu', ''])('refuse le rôle %s', async (role) => {
    await expect(adminCreate(validAdminInput({ role }))).rejects.toMatchObject({ status: 400 });
  });

  it.each([
    ['prénom vide', { first_name: '  ' }],
    ['prénom trop long', { first_name: 'a'.repeat(101) }],
    ['nom vide', { last_name: '' }],
    ['nom trop long', { last_name: 'a'.repeat(101) }],
    ['email invalide', { email: 'pas-un-email' }],
    ['email trop long', { email: `${'a'.repeat(250)}@example.com` }],
    ['téléphone invalide', { phone: 'abcdef' }],
  ])('refuse un %s', async (_label, patch) => {
    await expect(adminCreate(validAdminInput(patch))).rejects.toMatchObject({ status: 400 });
    expect(repo.createUser).not.toHaveBeenCalled();
  });

  it.each([
    ['first_name', { first_name: '' }],
    ['last_name', { last_name: '' }],
    ['email', { email: '' }],
    ['role', { role: '' }],
  ])('exige le champ %s', async (_label, patch) => {
    await expect(adminCreate(validAdminInput(patch))).rejects.toMatchObject({ status: 400 });
  });

  it('accepte un téléphone valide et le conserve', async () => {
    await adminCreate(validAdminInput({ phone: '  +33612345678  ' }));

    expect(repo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+33612345678' })
    );
  });

  it('remonte un conflit 409 explicite si le couple email/rôle existe', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    await expect(adminCreate(validAdminInput())).rejects.toMatchObject({ status: 409 });
    expect(repo.createUser).not.toHaveBeenCalled();
  });

  it('crée le compte déjà vérifié, sans jeton de confirmation', async () => {
    await adminCreate(validAdminInput());

    expect(repo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email_verified: true, email_verification_token: null })
    );
  });

  it('pose un mot de passe aléatoire inutilisable et un jeton de définition à 24 h', async () => {
    const before = Date.now();
    await adminCreate(validAdminInput());
    const payload = repo.createUser.mock.calls[0][0];

    expect(payload.password).toMatch(/^bcrypt\$[a-f0-9]{64}$/);
    expect(payload.reset_token).toMatch(/^[a-f0-9]{64}$/);
    const ttl = payload.reset_token_expires_at.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(24 * 3600 * 1000);
    expect(ttl).toBeLessThan(24 * 3600 * 1000 + 5000);
  });

  it('envoie le jeton en clair par email, mais n’en stocke que le condensat', async () => {
    await adminCreate(validAdminInput());

    const rawToken = emails.sendAccountCreatedEmail.mock.calls[0][1];
    const { reset_token } = repo.createUser.mock.calls[0][0];
    expect(reset_token).toBe(sha256(rawToken));
    expect(reset_token).not.toBe(rawToken);
  });

  it('crée quand même le compte si l’envoi d’email échoue', async () => {
    emails.sendAccountCreatedEmail.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(adminCreate(validAdminInput())).resolves.toBeDefined();
  });
});

describe('resendVerification', () => {
  it.each([
    ['email manquant', { email: '', role: 'locataire' }],
    ['rôle manquant', { email: 'jean@example.com', role: '' }],
  ])('refuse un %s', async (_label, input) => {
    await expect(resendVerification(input)).rejects.toMatchObject({ status: 400 });
  });

  it('refuse le rôle admin', async () => {
    await expect(
      resendVerification({ email: 'jean@example.com', role: 'admin' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('reste silencieux pour un email inconnu (anti-énumération)', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(null);

    await expect(
      resendVerification({ email: 'inconnu@example.com', role: 'locataire' })
    ).resolves.toBeUndefined();
    expect(repo.updateUser).not.toHaveBeenCalled();
    expect(emails.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('ne fait rien si l’email est déjà vérifié', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser({ email_verified: true }));

    await resendVerification({ email: 'jean@example.com', role: 'locataire' });

    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it('régénère un jeton et renvoie l’email pour un compte non vérifié', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser({ email_verified: false }));

    await resendVerification({ email: 'jean@example.com', role: 'locataire' });

    const [, data] = repo.updateUser.mock.calls[0];
    expect(data.email_verification_token).toMatch(/^[a-f0-9]{64}$/);
    expect(emails.sendVerificationEmail).toHaveBeenCalledWith(
      'jean@example.com',
      data.email_verification_token,
      'Jean'
    );
  });

  it('n’échoue pas si l’envoi d’email casse', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser({ email_verified: false }));
    emails.sendVerificationEmail.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(
      resendVerification({ email: 'jean@example.com', role: 'locataire' })
    ).resolves.toBeUndefined();
  });
});

describe('login', () => {
  const credentials = (overrides = {}) => ({
    email: 'jean@example.com',
    password: VALID_PASSWORD,
    role: 'locataire',
    ...overrides,
  });

  it('renvoie un couple de jetons et le profil public', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    const result = await login(credentials(), { userAgent: 'Firefox' });

    expect(result.user).toEqual({
      id_user: 1,
      email: 'jean@example.com',
      role: 'locataire',
      first_name: 'Jean',
      last_name: 'Dupont',
      phone: '+33612345678',
      avatar: null,
    });
    expect(result.refreshToken).toMatch(/^[a-f0-9]{128}$/);
    expect(result.reactivated).toBe(false);
  });

  it('signe un access token exploitable, sans mot de passe dedans', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    const { accessToken } = await login(credentials());
    const decoded = jwt.verify(accessToken, JWT_SECRET);

    expect(decoded).toMatchObject({ id_user: 1, email: 'jean@example.com', role: 'locataire' });
    expect(decoded.password).toBeUndefined();
  });

  it('ne stocke que le condensat du refresh token, avec une durée de 7 jours', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());
    const before = Date.now();

    const { refreshToken } = await login(credentials(), { userAgent: 'Firefox' });

    const stored = repo.createRefreshToken.mock.calls[0][0];
    expect(stored.token_hash).toBe(sha256(refreshToken));
    expect(stored.token_hash).not.toBe(refreshToken);
    const ttl = stored.expires_at.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(REFRESH_TOKEN_TTL_MS);
    expect(ttl).toBeLessThan(REFRESH_TOKEN_TTL_MS + 5000);
    expect(stored.user_agent).toBe('Firefox');
  });

  it('tronque un user-agent trop long à 255 caractères', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    await login(credentials(), { userAgent: 'x'.repeat(400) });

    expect(repo.createRefreshToken.mock.calls[0][0].user_agent).toHaveLength(255);
  });

  it('accepte l’absence de user-agent', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    await login(credentials());

    expect(repo.createRefreshToken.mock.calls[0][0].user_agent).toBeNull();
  });

  it('remet à zéro le compte à rebours d’inactivité', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    await login(credentials());

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id_user: 1 },
      data: { last_login_at: expect.any(Date), inactivity_notified_at: null },
    });
  });

  it.each([
    ['email manquant', { email: '' }],
    ['mot de passe manquant', { password: '' }],
    ['rôle manquant', { role: '' }],
    ['rôle inexistant', { role: 'root' }],
  ])('renvoie 401 générique pour %s', async (_label, patch) => {
    await expect(login(credentials(patch))).rejects.toMatchObject({
      status: 401,
      message: 'Identifiants invalides.',
    });
  });

  it('renvoie le même message pour un compte inconnu que pour un mot de passe faux', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(null);
    const unknown = await login(credentials()).catch((e) => e);

    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());
    const wrongPassword = await login(credentials({ password: 'MauvaisMdp!123' })).catch((e) => e);

    expect(unknown.message).toBe(wrongPassword.message);
    expect(unknown.status).toBe(wrongPassword.status);
  });

  it('compare quand même un hash factice pour un compte inconnu (anti-timing)', async () => {
    const bcrypt = (await import('bcryptjs')).default;
    repo.findUserByEmailAndRole.mockResolvedValue(null);

    await login(credentials()).catch(() => {});

    expect(bcrypt.compare).toHaveBeenCalledWith(
      VALID_PASSWORD,
      expect.stringMatching(/^\$2a\$12\$/)
    );
  });

  it('refuse un compte supprimé sans divulguer la raison', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser({ deleted_at: new Date() }));

    await expect(login(credentials())).rejects.toMatchObject({
      status: 401,
      message: 'Identifiants invalides.',
    });
  });

  it('refuse un compte désactivé par un admin', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(
      makeUser({ is_active: false, deactivated_at: null })
    );

    await expect(login(credentials())).rejects.toMatchObject({ status: 403 });
  });

  it('refuse un email non confirmé', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser({ email_verified: false }));

    await expect(login(credentials())).rejects.toMatchObject({ status: 403 });
    expect(repo.createRefreshToken).not.toHaveBeenCalled();
  });

  it('réactive un compte mis en pause par son propriétaire', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(
      makeUser({ is_active: false, deactivated_at: new Date() })
    );

    const result = await login(credentials());

    expect(mockReactivate).toHaveBeenCalledWith(1);
    expect(result.reactivated).toBe(true);
    expect(result.accessToken).toBeDefined();
  });

  it('ne réactive rien lors d’une connexion ordinaire', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    await login(credentials());

    expect(mockReactivate).not.toHaveBeenCalled();
  });
});

describe('refreshSession', () => {
  const storedToken = (overrides = {}) => ({
    id_refresh: 10,
    id_user: 1,
    revoked_at: null,
    expires_at: hoursFromNow(24),
    ...overrides,
  });

  it('fait tourner le couple de jetons et révoque l’ancien', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue(storedToken());

    const result = await refreshSession('jeton-brut');

    expect(repo.revokeRefreshToken).toHaveBeenCalledWith(10);
    expect(repo.createRefreshToken).toHaveBeenCalledTimes(1);
    expect(result.refreshToken).not.toBe('jeton-brut');
    expect(result.user.id_user).toBe(1);
  });

  it('cherche le jeton par son condensat, jamais en clair', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue(storedToken());

    await refreshSession('jeton-brut');

    expect(repo.findRefreshTokenByHash).toHaveBeenCalledWith(sha256('jeton-brut'));
  });

  it('refuse un jeton absent', async () => {
    await expect(refreshSession(undefined)).rejects.toMatchObject({ status: 401 });
    expect(repo.findRefreshTokenByHash).not.toHaveBeenCalled();
  });

  it('refuse un jeton inconnu', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue(null);

    await expect(refreshSession('inconnu')).rejects.toMatchObject({ status: 401 });
  });

  it('révoque TOUTES les sessions si un jeton déjà révoqué est rejoué', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue(storedToken({ revoked_at: new Date() }));

    await expect(refreshSession('rejoué')).rejects.toMatchObject({
      status: 401,
      message: 'Session compromise détectée. Reconnectez-vous.',
    });
    expect(repo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(1);
    expect(repo.createRefreshToken).not.toHaveBeenCalled();
  });

  it('refuse un jeton expiré sans purger les autres sessions', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue(storedToken({ expires_at: hoursFromNow(-1) }));

    await expect(refreshSession('expiré')).rejects.toMatchObject({ status: 401 });
    expect(repo.revokeAllUserRefreshTokens).not.toHaveBeenCalled();
  });

  it.each([
    ['utilisateur supprimé', null],
    ['utilisateur désactivé', makeUser({ is_active: false })],
  ])('refuse quand le porteur est un %s', async (_label, user) => {
    repo.findRefreshTokenByHash.mockResolvedValue(storedToken());
    repo.findUserById.mockResolvedValue(user);

    await expect(refreshSession('jeton-brut')).rejects.toMatchObject({ status: 401 });
    expect(repo.createRefreshToken).not.toHaveBeenCalled();
  });
});

describe('logoutSession', () => {
  it('révoque le jeton présenté', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue({ id_refresh: 10, revoked_at: null });

    await logoutSession('jeton-brut');

    expect(repo.revokeRefreshToken).toHaveBeenCalledWith(10);
  });

  it('ne fait rien sans jeton', async () => {
    await logoutSession(undefined);

    expect(repo.findRefreshTokenByHash).not.toHaveBeenCalled();
    expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('reste silencieux pour un jeton inconnu', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue(null);

    await expect(logoutSession('inconnu')).resolves.toBeUndefined();
    expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
  });

  it('ne révoque pas deux fois un jeton déjà révoqué', async () => {
    repo.findRefreshTokenByHash.mockResolvedValue({ id_refresh: 10, revoked_at: new Date() });

    await logoutSession('déjà-révoqué');

    expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  it('renvoie le profil public', async () => {
    repo.findUserById.mockResolvedValue(makeUser());

    await expect(getCurrentUser(1)).resolves.toMatchObject({ id_user: 1, avatar: null });
  });

  it('expose l’URL de l’avatar quand une image existe', async () => {
    repo.findUserById.mockResolvedValue(
      makeUser({ images: [{ url: 'http://localhost:4000/uploads/avatars/a.png' }] })
    );

    const user = await getCurrentUser(1);

    expect(user.avatar).toBe('http://localhost:4000/uploads/avatars/a.png');
  });

  it('n’expose jamais le mot de passe', async () => {
    repo.findUserById.mockResolvedValue(makeUser());

    const user = await getCurrentUser(1);

    expect(user).not.toHaveProperty('password');
  });

  it.each([
    ['utilisateur inconnu', null],
    ['utilisateur désactivé', makeUser({ is_active: false })],
  ])('renvoie 404 pour un %s', async (_label, user) => {
    repo.findUserById.mockResolvedValue(user);

    await expect(getCurrentUser(1)).rejects.toMatchObject({ status: 404 });
  });
});

describe('updateProfile', () => {
  it('met à jour les champs fournis uniquement', async () => {
    await updateProfile(1, { first_name: '  Marie  ' });

    const [id, data] = repo.updateUser.mock.calls[0];
    expect(id).toBe(1);
    expect(data.first_name).toBe('Marie');
    expect(data).not.toHaveProperty('last_name');
    expect(data.updated_at).toBeInstanceOf(Date);
  });

  it('met à jour le nom et le téléphone ensemble', async () => {
    await updateProfile(1, { last_name: '  Martin  ', phone: '  +33700000000  ' });

    const data = repo.updateUser.mock.calls[0][1];
    expect(data.last_name).toBe('Martin');
    expect(data.phone).toBe('+33700000000');
    expect(data).not.toHaveProperty('first_name');
  });

  it('refuse une mise à jour vide', async () => {
    await expect(updateProfile(1, {})).rejects.toMatchObject({ status: 400 });
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    ['prénom vide', { first_name: '   ' }],
    ['prénom trop long', { first_name: 'a'.repeat(101) }],
    ['nom vide', { last_name: '' }],
    ['nom trop long', { last_name: 'a'.repeat(101) }],
    ['téléphone invalide', { phone: 'abc' }],
  ])('refuse un %s', async (_label, patch) => {
    await expect(updateProfile(1, patch)).rejects.toMatchObject({ status: 400 });
  });

  it('efface le téléphone quand une chaîne vide est envoyée', async () => {
    await updateProfile(1, { phone: '' });

    expect(repo.updateUser.mock.calls[0][1].phone).toBeNull();
  });

  it('ne permet pas de changer l’email ni le rôle', async () => {
    await updateProfile(1, { first_name: 'Marie', email: 'pirate@example.com', role: 'admin' });

    const data = repo.updateUser.mock.calls[0][1];
    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('role');
  });
});

describe('changePassword', () => {
  const input = (overrides = {}) => ({
    currentPassword: VALID_PASSWORD,
    newPassword: 'NouveauMdp!456',
    confirmPassword: 'NouveauMdp!456',
    ...overrides,
  });

  it('remplace le mot de passe et déconnecte tous les appareils', async () => {
    await changePassword(1, input());

    expect(repo.updateUser).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ password: fakeHash('NouveauMdp!456') })
    );
    expect(repo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(1);
  });

  it.each([
    ['mot de passe actuel', { currentPassword: '' }],
    ['nouveau mot de passe', { newPassword: '' }],
    ['confirmation', { confirmPassword: '' }],
  ])('exige le champ %s', async (_label, patch) => {
    await expect(changePassword(1, input(patch))).rejects.toMatchObject({ status: 400 });
  });

  it('refuse un mot de passe actuel incorrect', async () => {
    await expect(
      changePassword(1, input({ currentPassword: 'Faux!123456789' }))
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it('refuse un nouveau mot de passe trop faible', async () => {
    await expect(
      changePassword(1, input({ newPassword: 'faible', confirmPassword: 'faible' }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuse une confirmation qui diffère', async () => {
    await expect(
      changePassword(1, input({ confirmPassword: 'AutreMdp!456789' }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuse de réutiliser le mot de passe actuel', async () => {
    await expect(
      changePassword(1, input({ newPassword: VALID_PASSWORD, confirmPassword: VALID_PASSWORD }))
    ).rejects.toMatchObject({ status: 400 });
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    ['inconnu', null],
    ['désactivé', makeUser({ is_active: false })],
  ])('renvoie 404 pour un utilisateur %s', async (_label, user) => {
    repo.findUserById.mockResolvedValue(user);

    await expect(changePassword(1, input())).rejects.toMatchObject({ status: 404 });
  });
});

describe('requestPasswordReset', () => {
  it('enregistre le condensat du jeton et envoie le jeton en clair', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());

    await requestPasswordReset({ email: 'jean@example.com', role: 'locataire' });

    const rawToken = emails.sendPasswordResetEmail.mock.calls[0][1];
    const [, data] = repo.updateUser.mock.calls[0];
    expect(data.reset_token).toBe(sha256(rawToken));
    expect(data.reset_token_expires_at).toBeInstanceOf(Date);
  });

  it('fixe une expiration à une heure', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());
    const before = Date.now();

    await requestPasswordReset({ email: 'jean@example.com', role: 'locataire' });

    const ttl = repo.updateUser.mock.calls[0][1].reset_token_expires_at.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(60 * 60 * 1000);
    expect(ttl).toBeLessThan(60 * 60 * 1000 + 5000);
  });

  it.each([
    ['email manquant', { email: '', role: 'locataire' }],
    ['rôle manquant', { email: 'jean@example.com', role: '' }],
    ['rôle inexistant', { email: 'jean@example.com', role: 'root' }],
  ])('reste silencieux pour un %s', async (_label, payload) => {
    await expect(requestPasswordReset(payload)).resolves.toBeUndefined();
    expect(repo.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    ['compte inconnu', null],
    ['compte désactivé', makeUser({ is_active: false })],
  ])('reste silencieux pour un %s (anti-énumération)', async (_label, user) => {
    repo.findUserByEmailAndRole.mockResolvedValue(user);

    await expect(
      requestPasswordReset({ email: 'jean@example.com', role: 'locataire' })
    ).resolves.toBeUndefined();
    expect(emails.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('n’échoue pas si l’envoi d’email casse', async () => {
    repo.findUserByEmailAndRole.mockResolvedValue(makeUser());
    emails.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(
      requestPasswordReset({ email: 'jean@example.com', role: 'locataire' })
    ).resolves.toBeUndefined();
  });
});

describe('checkResetToken', () => {
  it('accepte un jeton valide et non expiré', async () => {
    repo.findUserByResetToken.mockResolvedValue({ reset_token_expires_at: hoursFromNow(1) });

    await expect(checkResetToken('jeton')).resolves.toBe(true);
    expect(repo.findUserByResetToken).toHaveBeenCalledWith(sha256('jeton'));
  });

  it.each([
    ['jeton absent', undefined, null],
    ['jeton inconnu', 'jeton', null],
    ['jeton sans date d’expiration', 'jeton', { reset_token_expires_at: null }],
    ['jeton expiré', 'jeton', { reset_token_expires_at: hoursFromNow(-1) }],
  ])('rejette un %s', async (_label, token, user) => {
    repo.findUserByResetToken.mockResolvedValue(user);

    await expect(checkResetToken(token)).resolves.toBe(false);
  });
});

describe('resetPassword', () => {
  const input = (overrides = {}) => ({
    token: 'jeton',
    password: 'NouveauMdp!456',
    confirmPassword: 'NouveauMdp!456',
    ...overrides,
  });

  it('remplace le mot de passe, efface le jeton et déconnecte tout', async () => {
    repo.findUserByResetToken.mockResolvedValue(
      makeUser({ reset_token_expires_at: hoursFromNow(1) })
    );

    await resetPassword(input());

    expect(repo.updateUser).toHaveBeenCalledWith(1, {
      password: fakeHash('NouveauMdp!456'),
      reset_token: null,
      reset_token_expires_at: null,
    });
    expect(repo.revokeAllUserRefreshTokens).toHaveBeenCalledWith(1);
  });

  it.each([
    ['jeton manquant', { token: '' }],
    ['mot de passe manquant', { password: '' }],
    ['confirmation manquante', { confirmPassword: '' }],
  ])('refuse un %s', async (_label, patch) => {
    await expect(resetPassword(input(patch))).rejects.toMatchObject({ status: 400 });
  });

  it('refuse un mot de passe trop faible', async () => {
    await expect(
      resetPassword(input({ password: 'faible', confirmPassword: 'faible' }))
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuse une confirmation qui diffère', async () => {
    await expect(resetPassword(input({ confirmPassword: 'Autre!456789' }))).rejects.toMatchObject({
      status: 400,
    });
  });

  it.each([
    ['jeton inconnu', null],
    ['jeton sans expiration', makeUser({ reset_token_expires_at: null })],
    ['jeton expiré', makeUser({ reset_token_expires_at: hoursFromNow(-1) })],
  ])('refuse un %s avec un message neutre', async (_label, user) => {
    repo.findUserByResetToken.mockResolvedValue(user);

    await expect(resetPassword(input())).rejects.toMatchObject({
      status: 400,
      message: 'Lien invalide ou expiré.',
    });
    expect(repo.updateUser).not.toHaveBeenCalled();
  });
});

describe('verifyEmail', () => {
  it('marque l’email vérifié et consomme le jeton', async () => {
    repo.findUserByVerificationToken.mockResolvedValue(makeUser({ email_verified: false }));

    await verifyEmail('jeton');

    expect(repo.updateUser).toHaveBeenCalledWith(1, {
      email_verified: true,
      email_verification_token: null,
    });
  });

  it('refuse un jeton manquant', async () => {
    await expect(verifyEmail('')).rejects.toMatchObject({ status: 400 });
    expect(repo.findUserByVerificationToken).not.toHaveBeenCalled();
  });

  it('refuse un jeton inconnu', async () => {
    repo.findUserByVerificationToken.mockResolvedValue(null);

    await expect(verifyEmail('inconnu')).rejects.toMatchObject({ status: 404 });
    expect(repo.updateUser).not.toHaveBeenCalled();
  });
});

describe('updateAvatar', () => {
  const file = { filename: 'nouvel-avatar.png' };

  it('refuse un appel sans fichier', async () => {
    await expect(updateAvatar(1, null, 'http://localhost:4000')).rejects.toMatchObject({
      status: 400,
    });
    expect(db.image.create).not.toHaveBeenCalled();
  });

  it('supprime l’ancien avatar avant d’enregistrer le nouveau', async () => {
    db.image.findMany.mockResolvedValue([
      { id_image: 5, url: 'http://localhost:4000/uploads/avatars/ancien.png' },
    ]);

    await updateAvatar(1, file, 'http://localhost:4000');

    expect(db.image.deleteMany).toHaveBeenCalledWith({ where: { id_user: 1, type: 'avatar' } });
    expect(db.image.create).toHaveBeenCalledWith({
      data: {
        id_user: 1,
        type: 'avatar',
        url: 'http://localhost:4000/uploads/avatars/nouvel-avatar.png',
      },
    });
  });

  it('fonctionne quand l’utilisateur n’avait pas encore d’avatar', async () => {
    db.image.findMany.mockResolvedValue([]);

    await expect(updateAvatar(1, file, 'http://localhost:4000')).resolves.toMatchObject({
      id_user: 1,
    });
  });

  it('ignore une image dont l’URL ne pointe pas vers le dossier des avatars', async () => {
    db.image.findMany.mockResolvedValue([
      { id_image: 5, url: 'https://cdn.example.com/photo.png' },
    ]);

    await expect(updateAvatar(1, file, 'http://localhost:4000')).resolves.toBeDefined();
  });

  it('renvoie le profil à jour', async () => {
    repo.findUserById.mockResolvedValue(
      makeUser({ images: [{ url: 'http://localhost:4000/uploads/avatars/nouvel-avatar.png' }] })
    );

    const user = await updateAvatar(1, file, 'http://localhost:4000');

    expect(user.avatar).toBe('http://localhost:4000/uploads/avatars/nouvel-avatar.png');
  });
});

describe('removeAvatar', () => {
  it('supprime les images d’avatar et renvoie le profil', async () => {
    db.image.findMany.mockResolvedValue([
      { url: 'http://localhost:4000/uploads/avatars/ancien.png' },
    ]);

    const user = await removeAvatar(1);

    expect(db.image.deleteMany).toHaveBeenCalledWith({ where: { id_user: 1, type: 'avatar' } });
    expect(db.image.create).not.toHaveBeenCalled();
    expect(user).toMatchObject({ id_user: 1, avatar: null });
  });

  it('reste sans effet quand aucun avatar n’existe', async () => {
    db.image.findMany.mockResolvedValue([]);

    await expect(removeAvatar(1)).resolves.toMatchObject({ id_user: 1 });
  });

  it('ignore une image hébergée hors du dossier des avatars', async () => {
    db.image.findMany.mockResolvedValue([{ url: 'https://cdn.example.com/photo.png' }]);

    await expect(removeAvatar(1)).resolves.toBeDefined();
  });
});
