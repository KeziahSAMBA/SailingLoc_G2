import { describe, it, expect, vi, beforeEach } from 'vitest';

const api = {
  get: vi.fn(() => Promise.resolve({ data: {} })),
  post: vi.fn(() => Promise.resolve({ data: {} })),
  patch: vi.fn(() => Promise.resolve({ data: {} })),
  delete: vi.fn(() => Promise.resolve({ data: {} })),
};
vi.mock('./api.js', () => ({ default: api, UPLOAD_TIMEOUT_MS: 60000 }));

const cache = { cachedRequest: vi.fn((_cle, req) => req()), invalidateCachedRequest: vi.fn() };
vi.mock('./requestCache.js', () => cache);

vi.mock('./publicPagination.js', () => ({
  fetchBoundedPublicPages: vi.fn((requete) => requete({ page: 1, pageSize: 25 })),
}));

const admin = await import('./adminService.js');
const proprio = await import('./proprietaireService.js');
const messages = await import('./messageService.js');
const boats = await import('./boatService.js');

beforeEach(() => {
  vi.clearAllMocks();
});

const appel = (verbe) => api[verbe].mock.calls[0];

describe('adminService — lectures', () => {
  it.each([
    ['getAdminStats', () => admin.getAdminStats(), '/admin/stats'],
    ['listUsers', () => admin.listUsers(), '/admin/users'],
    ['listDocuments', () => admin.listDocuments(), '/admin/documents'],
    ['listBoats', () => admin.listBoats(), '/admin/boats'],
    ['listBookings', () => admin.listBookings(), '/admin/bookings'],
    ['listReviews', () => admin.listReviews(), '/admin/reviews'],
    ['listPorts', () => admin.listPorts(), '/admin/ports'],
    ['listPayments', () => admin.listPayments(), '/admin/payments'],
    ['getPaymentStats', () => admin.getPaymentStats(), '/admin/payments/stats'],
    ['listContactRequests', () => admin.listContactRequests(), '/admin/contact-requests'],
    ['listLogs', () => admin.listLogs(), '/admin/logs'],
    ['listCronJobs', () => admin.listCronJobs(), '/admin/cron/jobs'],
    ['listCronRuns', () => admin.listCronRuns(), '/admin/cron/runs'],
  ])('%s interroge %s', async (_nom, invoquer, chemin) => {
    await invoquer();
    expect(appel('get')[0]).toBe(chemin);
  });

  // Les filtres de l'écran d'administration passent par la requête, pas par
  // l'URL : les perdre afficherait la liste entière.
  it('transmet les filtres reçus', async () => {
    await admin.listUsers({ role: 'locataire', page: 2 });
    expect(appel('get')[1]).toEqual({ params: { role: 'locataire', page: 2 } });
  });
});

describe('adminService — écritures', () => {
  it('modifie un compte', async () => {
    await admin.updateUser(7, { is_active: false });
    expect(appel('patch')).toEqual(['/admin/users/7', { is_active: false }]);
  });

  it('supprime un compte', async () => {
    await admin.deleteUser(7);
    expect(appel('delete')[0]).toBe('/admin/users/7');
  });

  it('statue sur un justificatif', async () => {
    await admin.setDocumentStatus(3, 'validated');
    expect(appel('patch')).toEqual(['/admin/documents/3', { status: 'validated' }]);
  });

  it('publie ou retire une annonce', async () => {
    await admin.setBoatPublished(9, true);
    expect(appel('patch')[0]).toBe('/admin/boats/9');
  });

  it('annule une réservation avec son motif', async () => {
    await admin.cancelBooking(12, 'bateau indisponible');
    expect(appel('patch')).toEqual([
      '/admin/bookings/12/cancel',
      { reason: 'bateau indisponible' },
    ]);
  });

  it('crée puis supprime un port', async () => {
    await admin.createPort({ name: 'Sète' });
    expect(appel('post')).toEqual(['/admin/ports', { name: 'Sète' }]);

    vi.clearAllMocks();
    await admin.deletePort(4);
    expect(appel('delete')[0]).toBe('/admin/ports/4');
  });

  it('modifie puis supprime un avis', async () => {
    await admin.updateReview(5, { status: 'validated' });
    expect(appel('patch')[0]).toBe('/admin/reviews/5');

    vi.clearAllMocks();
    await admin.deleteReview(5);
    expect(appel('delete')[0]).toBe('/admin/reviews/5');
  });

  it('déclenche une tâche planifiée', async () => {
    await admin.runCronJob('users.paused.purge');
    expect(appel('post')[0]).toContain('users.paused.purge');
  });

  it('modifie la planification d’une tâche', async () => {
    await admin.updateCronJob('users.paused.purge', { schedule: '0 3 * * *' });
    expect(appel('patch')[0]).toContain('users.paused.purge');
  });
});

describe('proprietaireService', () => {
  it.each([
    ['getDashboard', () => proprio.getDashboard(), '/users/me/proprietaire/dashboard'],
    ['getBookings', () => proprio.getBookings(), '/users/me/proprietaire/bookings'],
    ['getPayments', () => proprio.getPayments(), '/users/me/proprietaire/payments'],
    ['getBoats', () => proprio.getBoats(), '/users/me/proprietaire/boats'],
  ])('%s interroge %s', async (_nom, invoquer, chemin) => {
    await invoquer();
    expect(appel('get')[0]).toBe(chemin);
  });

  it('accepte ou refuse une demande de réservation', async () => {
    await proprio.updateBookingStatus(12, 'accept', null);
    expect(appel('patch')[0]).toBe('/users/me/proprietaire/bookings/12');
  });

  // Une facture est un PDF : sans ce type de réponse, le fichier téléchargé
  // serait corrompu.
  it('demande la facture en binaire', async () => {
    await proprio.getBookingInvoice(12);
    expect(appel('get')[1]).toMatchObject({ responseType: 'blob' });
  });

  it('joint les photos au signalement de litige', async () => {
    await proprio.reportDispute(12, 'coque rayée', [new File(['x'], 'photo.png')]);
    expect(appel('post')[1]).toBeInstanceOf(FormData);
  });

  it('envoie une annonce en multipart avec un délai allongé', async () => {
    const form = new FormData();
    form.append('name', 'Pen Duick');

    await proprio.createBoat(form);

    const [, corps, config] = appel('post');
    expect(corps).toBe(form);
    expect(config.timeout).toBe(60000);
  });
});

describe('messageService', () => {
  it.each([
    ['getConversations', () => messages.getConversations(), '/messages/conversations'],
    ['getUnreadCount', () => messages.getUnreadCount(), '/messages/unread'],
  ])('%s interroge %s', async (_nom, invoquer, chemin) => {
    await invoquer();
    expect(appel('get')[0]).toBe(chemin);
  });

  it('lit la conversation d’un interlocuteur', async () => {
    await messages.getThread(7);
    expect(appel('get')[0]).toContain('7');
  });

  it('envoie un message à son destinataire', async () => {
    await messages.sendMessage(7, 'Bonjour');
    expect(appel('post')[1]).toMatchObject({ content: 'Bonjour' });
  });

  it('modifie un message', async () => {
    await messages.updateMessage(3, 'Corrigé');
    expect(appel('patch')[1]).toMatchObject({ content: 'Corrigé' });
  });

  // Un message peut être retiré pour soi seul ou pour tout le monde : perdre
  // cette portée effacerait le message chez l'interlocuteur sans le vouloir.
  it('transmet la portée d’une suppression', async () => {
    await messages.deleteMessage(3, 'everyone');
    expect(JSON.stringify(appel('delete'))).toContain('everyone');
  });
});

describe('boatService', () => {
  it('parcourt les pages du catalogue', async () => {
    await boats.fetchBoats();
    expect(appel('get')[0]).toBe('/boats');
    expect(appel('get')[1].params).toMatchObject({ page: 1, pageSize: 25 });
  });

  it('passe par le cache court', async () => {
    await boats.fetchBoats();
    expect(cache.cachedRequest).toHaveBeenCalledWith('boats', expect.any(Function));
  });

  // Après publication d'une annonce, le catalogue en cache est périmé.
  it('vide le cache après une relecture forcée', async () => {
    await boats.fetchBoatsFresh();
    expect(cache.invalidateCachedRequest).toHaveBeenCalledWith('boats');
  });

  it('lit le catalogue groupé par type', async () => {
    await boats.fetchBoatsByType();
    expect(appel('get')[0]).toBe('/boats/by-type');
  });

  it('vide le cache après création d’une annonce', async () => {
    await boats.createBoat(new FormData());
    expect(cache.invalidateCachedRequest).toHaveBeenCalledWith('boats');
  });
});
