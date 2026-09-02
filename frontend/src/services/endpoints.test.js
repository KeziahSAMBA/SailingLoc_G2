import { describe, it, expect, vi, beforeEach } from 'vitest';

// Les services de ce dossier sont des enveloppes minces autour du client HTTP :
// ce qu'ils apportent, c'est le verbe, le chemin et la forme du corps. Un test
// par fonction n'apprendrait rien de plus qu'une table, mais la table protège
// contre la faute qui compte — un chemin ou un verbe changé par mégarde.
const api = {
  get: vi.fn(() => Promise.resolve({ data: {} })),
  post: vi.fn(() => Promise.resolve({ data: {} })),
  patch: vi.fn(() => Promise.resolve({ data: {} })),
  put: vi.fn(() => Promise.resolve({ data: {} })),
  delete: vi.fn(() => Promise.resolve({ data: {} })),
};

vi.mock('./api.js', () => ({
  default: api,
  UPLOAD_TIMEOUT_MS: 60000,
}));

const auth = await import('./authService.js');
const locataire = await import('./locataireService.js');
const booking = await import('./bookingService.js');
const review = await import('./reviewService.js');
const documents = await import('./documentService.js');

beforeEach(() => {
  vi.clearAllMocks();
});

const appel = (verbe) => api[verbe].mock.calls[0];

describe('authService — comptes et session', () => {
  it.each([
    ['register', () => auth.register({ email: 'a@b.c' }), 'post', '/users/register'],
    ['login', () => auth.login({ email: 'a@b.c' }), 'post', '/users/login'],
    ['adminLogin', () => auth.adminLogin({ email: 'a@b.c' }), 'post', '/admin/login'],
    ['adminCreateUser', () => auth.adminCreateUser({}), 'post', '/admin/users'],
    ['refreshToken', () => auth.refreshToken(), 'post', '/users/refresh'],
    ['logout', () => auth.logout(), 'post', '/users/logout'],
    ['getMe', () => auth.getMe(), 'get', '/users/me'],
    ['updateMe', () => auth.updateMe({}), 'patch', '/users/me'],
    ['changePassword', () => auth.changePassword({}), 'patch', '/users/me/password'],
    ['resendVerification', () => auth.resendVerification({}), 'post', '/users/resend-verification'],
    ['requestPasswordReset', () => auth.requestPasswordReset({}), 'post', '/users/forgot-password'],
    ['resetPassword', () => auth.resetPassword({}), 'post', '/users/reset-password'],
    ['getClosureStatus', () => auth.getClosureStatus(), 'get', '/users/me/closure'],
    ['deactivateAccount', () => auth.deactivateAccount({}), 'post', '/users/me/deactivate'],
    ['deleteAvatar', () => auth.deleteAvatar(), 'delete', '/users/me/avatar'],
  ])('%s appelle %s %s', async (_nom, invoquer, verbe, chemin) => {
    await invoquer();
    expect(appel(verbe)[0]).toBe(chemin);
  });

  it('insère le jeton dans l’URL de vérification d’adresse', async () => {
    await auth.verifyEmail('jeton-abc');
    expect(appel('get')[0]).toBe('/users/verify-email/jeton-abc');
  });

  it('insère le jeton dans l’URL de vérification de réinitialisation', async () => {
    await auth.verifyResetToken('jeton-abc');
    expect(appel('get')[0]).toBe('/users/reset-password/jeton-abc');
  });

  it('transmet le corps reçu', async () => {
    await auth.login({ email: 'a@b.c', password: 'secret' });
    expect(appel('post')[1]).toEqual({ email: 'a@b.c', password: 'secret' });
  });

  it('extrait les données de la réponse', async () => {
    api.get.mockResolvedValueOnce({ data: { id_user: 7 } });
    await expect(auth.getMe()).resolves.toEqual({ id_user: 7 });
  });

  // Une suppression de compte porte un corps (confirmation, mot de passe) :
  // axios ne l'accepte que dans la configuration, pas en second argument.
  it('passe le corps de suppression de compte dans la configuration', async () => {
    await auth.deleteAccount({ password: 'secret' });
    expect(appel('delete')).toEqual(['/users/me', { data: { password: 'secret' } }]);
  });
});

describe('authService — photo de profil', () => {
  it('envoie le fichier en multipart sous le champ « avatar »', async () => {
    const fichier = new File(['x'], 'photo.png', { type: 'image/png' });
    await auth.updateAvatar(fichier);

    const [chemin, corps, config] = appel('patch');
    expect(chemin).toBe('/users/me/avatar');
    expect(corps).toBeInstanceOf(FormData);
    expect(corps.get('avatar')).toBe(fichier);
    // Laisser axios poser lui-même le Content-Type avec sa frontière multipart.
    expect(config.headers['Content-Type']).toBeUndefined();
  });

  it('accorde le délai long réservé aux envois de fichiers', async () => {
    await auth.updateAvatar(new File(['x'], 'photo.png'));
    expect(appel('patch')[2].timeout).toBe(60000);
  });
});

describe('locataireService', () => {
  it.each([
    ['getDashboard', () => locataire.getDashboard(), 'get', '/users/me/dashboard'],
    ['getBookings', () => locataire.getBookings(), 'get', '/users/me/bookings'],
  ])('%s appelle %s %s', async (_nom, invoquer, verbe, chemin) => {
    await invoquer();
    expect(appel(verbe)[0]).toBe(chemin);
  });

  it('dépose un avis sur la réservation visée', async () => {
    await locataire.createBookingReview(42, 5, 'Superbe séjour');

    expect(appel('post')).toEqual([
      '/users/me/bookings/42/review',
      { rating: 5, comment: 'Superbe séjour' },
    ]);
  });

  // Une facture est un PDF : sans ce type de réponse, axios la décoderait en
  // texte et le fichier téléchargé serait corrompu.
  it('demande la facture en binaire', async () => {
    await locataire.getBookingInvoice(42);
    expect(appel('get')[1]).toMatchObject({ responseType: 'blob' });
  });
});

describe('modules restants', () => {
  it('exposent uniquement des fonctions', () => {
    for (const module of [booking, review, documents]) {
      for (const [nom, valeur] of Object.entries(module)) {
        expect(valeur, `${nom} devrait être une fonction`).toBeTypeOf('function');
      }
    }
  });

  // Un chemin absolu échapperait à la baseURL du client et viserait le mauvais
  // hôte en production.
  it('n’émettent que des chemins relatifs à l’API', async () => {
    for (const module of [booking, review, documents]) {
      for (const fn of Object.values(module)) {
        vi.clearAllMocks();
        try {
          await fn(1, 1, 'x');
        } catch {
          // Une signature non satisfaite ne nous intéresse pas ici.
        }
        for (const verbe of ['get', 'post', 'patch', 'put', 'delete']) {
          for (const [chemin] of api[verbe].mock.calls) {
            expect(chemin).toMatch(/^\//);
            expect(chemin).not.toMatch(/^https?:/);
          }
        }
      }
    }
  });
});
