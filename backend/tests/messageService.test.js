import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  message: {
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  booking: { count: jest.fn() },
  boat: { findFirst: jest.fn() },
  $queryRaw: jest.fn(),
};
jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const {
  listConversations,
  getThread,
  countUnread,
  sendMessage,
  contactBoatOwner,
  updateMessage,
  deleteMessage,
  contactSupport,
  resolveSupport,
} = await import('../src/services/messageService.js');

const LOCATAIRE = { id_user: 1, role: 'locataire' };
const PROPRIETAIRE = { id_user: 2, role: 'proprietaire' };
const ADMIN = { id_user: 9, role: 'admin' };

beforeEach(() => {
  jest.clearAllMocks();
  db.user.findUnique.mockResolvedValue({ id_user: 2, role: 'proprietaire' });
  db.user.findMany.mockResolvedValue([]);
  db.message.count.mockResolvedValue(0);
  db.message.findMany.mockResolvedValue([]);
  db.message.findFirst.mockResolvedValue(null);
  db.message.create.mockResolvedValue({
    id_message: 100,
    content: 'Bonjour',
    sent_at: new Date('2026-06-01'),
    type: null,
    is_read: false,
  });
  db.message.updateMany.mockResolvedValue({ count: 0 });
  db.booking.count.mockResolvedValue(0);
  db.$queryRaw.mockResolvedValue([]);
});

describe('canMessage — qui a le droit d’écrire à qui', () => {
  it('laisse un admin écrire à n’importe qui, sans vérification', async () => {
    await sendMessage(ADMIN, 5, 'Bonjour');

    expect(db.user.findUnique).not.toHaveBeenCalled();
    expect(db.message.create).toHaveBeenCalled();
  });

  it('laisse tout le monde écrire à un admin', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'admin' });

    await sendMessage(LOCATAIRE, 9, 'Besoin d’aide');

    expect(db.message.create).toHaveBeenCalled();
    expect(db.booking.count).not.toHaveBeenCalled();
  });

  it('autorise l’écriture quand une conversation existe déjà', async () => {
    db.message.count.mockResolvedValue(3);
    db.booking.count.mockResolvedValue(0);

    await expect(sendMessage(LOCATAIRE, 2, 'Bonjour')).resolves.toBeDefined();
  });

  it('autorise l’écriture quand une réservation lie les deux personnes', async () => {
    db.message.count.mockResolvedValue(0);
    db.booking.count.mockResolvedValue(1);

    await expect(sendMessage(LOCATAIRE, 2, 'Bonjour')).resolves.toBeDefined();
  });

  it('refuse d’écrire à un inconnu, sans réservation ni historique', async () => {
    db.message.count.mockResolvedValue(0);
    db.booking.count.mockResolvedValue(0);

    await expect(sendMessage(LOCATAIRE, 2, 'Bonjour')).rejects.toMatchObject({ status: 403 });
    expect(db.message.create).not.toHaveBeenCalled();
  });

  it('refuse d’écrire à un utilisateur inexistant', async () => {
    db.user.findUnique.mockResolvedValue(null);

    await expect(sendMessage(LOCATAIRE, 404, 'Bonjour')).rejects.toMatchObject({ status: 403 });
  });
});

describe('sendMessage', () => {
  beforeEach(() => {
    db.message.count.mockResolvedValue(1);
  });

  it('enregistre le message rogné et le renvoie', async () => {
    const result = await sendMessage(LOCATAIRE, 2, '  Bonjour  ');

    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_sender: 1, id_receiver: 2, content: 'Bonjour' }),
      })
    );
    expect(result).toMatchObject({ id_message: 100, from_me: true });
  });

  it.each([
    ['contenu vide', ''],
    ['contenu fait d’espaces', '    '],
    ['contenu absent', undefined],
  ])('refuse un %s', async (_label, content) => {
    await expect(sendMessage(LOCATAIRE, 2, content)).rejects.toMatchObject({
      status: 400,
      message: 'Le message est vide.',
    });
  });

  it('refuse un message de plus de 2000 caractères', async () => {
    await expect(sendMessage(LOCATAIRE, 2, 'a'.repeat(2001))).rejects.toMatchObject({
      status: 400,
    });
  });

  it('accepte un message de 2000 caractères exactement', async () => {
    await expect(sendMessage(LOCATAIRE, 2, 'a'.repeat(2000))).resolves.toBeDefined();
  });

  it('refuse de s’écrire à soi-même', async () => {
    await expect(sendMessage(LOCATAIRE, 1, 'Bonjour')).rejects.toMatchObject({
      status: 400,
      message: 'Destinataire invalide.',
    });
  });

  it('refuse un identifiant de destinataire non numérique', async () => {
    await expect(sendMessage(LOCATAIRE, 'abc', 'Bonjour')).rejects.toMatchObject({ status: 400 });
  });
});

describe('listConversations', () => {
  const row = (overrides = {}) => ({
    other_id: 2,
    content: 'Dernier message',
    sent_at: new Date('2026-06-01'),
    deleted_at: null,
    from_me: false,
    first_name: 'Marie',
    last_name: 'Dupont',
    role: 'proprietaire',
    unread: 3,
    ...overrides,
  });

  it('met à plat une conversation avec son compteur de non-lus', async () => {
    db.$queryRaw.mockResolvedValue([row()]);

    const [conversation] = await listConversations(1);

    expect(conversation).toEqual({
      user: { id_user: 2, first_name: 'Marie', last_name: 'Dupont', role: 'proprietaire' },
      last_message: {
        content: 'Dernier message',
        deleted: false,
        sent_at: new Date('2026-06-01'),
        from_me: false,
      },
      unread: 3,
    });
  });

  it('masque le contenu d’un dernier message supprimé', async () => {
    db.$queryRaw.mockResolvedValue([row({ deleted_at: new Date(), content: 'Secret' })]);

    const [conversation] = await listConversations(1);

    expect(conversation.last_message).toMatchObject({ content: null, deleted: true });
  });

  it('renvoie une liste vide sans conversation', async () => {
    db.$queryRaw.mockResolvedValue([]);

    await expect(listConversations(1)).resolves.toEqual([]);
  });
});

describe('getThread', () => {
  beforeEach(() => {
    db.message.count.mockResolvedValue(1);
    db.user.findUnique.mockResolvedValue({
      id_user: 2,
      first_name: 'Marie',
      last_name: 'Dupont',
      role: 'proprietaire',
    });
  });

  const storedMessage = (overrides = {}) => ({
    id_message: 10,
    id_sender: 2,
    content: 'Bonjour',
    type: null,
    sent_at: new Date('2026-06-01'),
    is_read: false,
    updated_at: null,
    deleted_at: null,
    ...overrides,
  });

  it('renvoie le fil et l’interlocuteur', async () => {
    db.message.findMany.mockResolvedValue([storedMessage()]);

    const thread = await getThread(LOCATAIRE, '2');

    expect(thread.user).toEqual({
      id_user: 2,
      first_name: 'Marie',
      last_name: 'Dupont',
      role: 'proprietaire',
    });
    expect(thread.messages[0]).toMatchObject({
      content: 'Bonjour',
      from_me: false,
      deleted: false,
    });
  });

  it('marque from_me sur mes propres messages', async () => {
    db.message.findMany.mockResolvedValue([storedMessage({ id_sender: 1 })]);

    const thread = await getThread(LOCATAIRE, '2');

    expect(thread.messages[0].from_me).toBe(true);
  });

  it('masque le contenu d’un message supprimé mais le garde dans le fil', async () => {
    db.message.findMany.mockResolvedValue([
      storedMessage({ deleted_at: new Date(), content: 'Secret' }),
    ]);

    const thread = await getThread(LOCATAIRE, '2');

    expect(thread.messages[0]).toMatchObject({ content: null, deleted: true, edited: false });
  });

  it('signale un message modifié', async () => {
    db.message.findMany.mockResolvedValue([storedMessage({ updated_at: new Date() })]);

    const thread = await getThread(LOCATAIRE, '2');

    expect(thread.messages[0].edited).toBe(true);
  });

  it('ne signale pas « modifié » sur un message supprimé', async () => {
    db.message.findMany.mockResolvedValue([
      storedMessage({ updated_at: new Date(), deleted_at: new Date() }),
    ]);

    const thread = await getThread(LOCATAIRE, '2');

    expect(thread.messages[0].edited).toBe(false);
  });

  it('marque comme lus les messages reçus, en excluant ceux masqués pour moi', async () => {
    await getThread(LOCATAIRE, '2');

    expect(db.message.updateMany).toHaveBeenCalledWith({
      where: {
        id_sender: 2,
        id_receiver: 1,
        is_read: false,
        deleted_at: null,
        receiver_deleted_at: null,
      },
      data: { is_read: true, read_at: expect.any(Date) },
    });
  });

  it.each([
    ['identifiant non numérique', 'abc'],
    ['identifiant décimal', '2.5'],
  ])('renvoie 404 pour un %s', async (_label, id) => {
    await expect(getThread(LOCATAIRE, id)).rejects.toMatchObject({ status: 404 });
  });

  it('renvoie 404 quand on demande son propre fil', async () => {
    await expect(getThread(LOCATAIRE, '1')).rejects.toMatchObject({ status: 404 });
  });

  it('renvoie 404 sans lien avec l’utilisateur, sans révéler son existence', async () => {
    db.message.count.mockResolvedValue(0);
    db.booking.count.mockResolvedValue(0);

    await expect(getThread(LOCATAIRE, '2')).rejects.toMatchObject({
      status: 404,
      message: 'Utilisateur introuvable.',
    });
    expect(db.message.findMany).not.toHaveBeenCalled();
  });

  it('renvoie 404 si l’interlocuteur a disparu entre-temps', async () => {
    db.user.findUnique.mockResolvedValueOnce({ role: 'proprietaire' }).mockResolvedValueOnce(null);

    await expect(getThread(LOCATAIRE, '2')).rejects.toMatchObject({ status: 404 });
  });
});

describe('countUnread', () => {
  it('ne compte que les messages reçus, non lus et non masqués', async () => {
    db.message.count.mockResolvedValue(4);

    await expect(countUnread(1)).resolves.toBe(4);
    expect(db.message.count).toHaveBeenCalledWith({
      where: { id_receiver: 1, is_read: false, deleted_at: null, receiver_deleted_at: null },
    });
  });
});

describe('contactBoatOwner', () => {
  const publishedBoat = {
    name: 'Pen Duick',
    owner: { id_user: 2, first_name: 'Marie', last_name: 'Dupont', role: 'proprietaire' },
  };

  it('ouvre la conversation et pose un message de contexte au premier contact', async () => {
    db.boat.findFirst.mockResolvedValue(publishedBoat);
    db.message.count.mockResolvedValue(0);

    const result = await contactBoatOwner(LOCATAIRE, '4');

    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'boat_contact',
          content: 'Conversation ouverte au sujet du bateau « Pen Duick ».',
        }),
      })
    );
    expect(result).toEqual({ owner: publishedBoat.owner, boat_name: 'Pen Duick' });
  });

  it('ne repose pas de message de contexte si la conversation existe déjà', async () => {
    db.boat.findFirst.mockResolvedValue(publishedBoat);
    db.message.count.mockResolvedValue(5);

    await contactBoatOwner(LOCATAIRE, '4');

    expect(db.message.create).not.toHaveBeenCalled();
  });

  it('ne cherche que parmi les bateaux publiés d’un propriétaire actif', async () => {
    db.boat.findFirst.mockResolvedValue(publishedBoat);

    await contactBoatOwner(LOCATAIRE, '4');

    expect(db.boat.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_boat: 4,
          is_published: true,
          deleted_at: null,
          owner: { is_active: true, deleted_at: null },
        }),
      })
    );
  });

  it('renvoie 404 pour un identifiant non numérique', async () => {
    await expect(contactBoatOwner(LOCATAIRE, 'abc')).rejects.toMatchObject({ status: 404 });
    expect(db.boat.findFirst).not.toHaveBeenCalled();
  });

  it('renvoie 404 pour un bateau introuvable ou dépublié', async () => {
    db.boat.findFirst.mockResolvedValue(null);

    await expect(contactBoatOwner(LOCATAIRE, '4')).rejects.toMatchObject({ status: 404 });
  });

  it('renvoie 404 si le titulaire du bateau n’est pas un propriétaire', async () => {
    db.boat.findFirst.mockResolvedValue({ name: 'X', owner: { id_user: 2, role: 'admin' } });

    await expect(contactBoatOwner(LOCATAIRE, '4')).rejects.toMatchObject({ status: 404 });
  });
});

describe('updateMessage', () => {
  const mine = (overrides = {}) => ({
    id_message: 10,
    id_sender: 1,
    deleted_at: null,
    sender_deleted_at: null,
    ...overrides,
  });

  beforeEach(() => {
    db.message.update.mockResolvedValue({
      id_message: 10,
      content: 'Corrigé',
      sent_at: new Date('2026-06-01'),
      is_read: false,
    });
  });

  it('modifie le contenu et marque le message comme édité', async () => {
    db.message.findUnique.mockResolvedValue(mine());

    const result = await updateMessage(LOCATAIRE, '10', '  Corrigé  ');

    expect(db.message.update).toHaveBeenCalledWith({
      where: { id_message: 10 },
      data: { content: 'Corrigé', updated_at: expect.any(Date) },
    });
    expect(result).toMatchObject({ content: 'Corrigé', edited: true, from_me: true });
  });

  it.each([
    ['contenu vide', ''],
    ['contenu fait d’espaces', '   '],
  ])('refuse un %s', async (_label, content) => {
    await expect(updateMessage(LOCATAIRE, '10', content)).rejects.toMatchObject({ status: 400 });
    expect(db.message.findUnique).not.toHaveBeenCalled();
  });

  it('refuse un contenu de plus de 2000 caractères', async () => {
    await expect(updateMessage(LOCATAIRE, '10', 'a'.repeat(2001))).rejects.toMatchObject({
      status: 400,
    });
  });

  it.each([
    ['message inexistant', null],
    ['message supprimé pour tous', mine({ deleted_at: new Date() })],
    ['message masqué pour moi', mine({ sender_deleted_at: new Date() })],
    ['message d’un autre expéditeur', mine({ id_sender: 99 })],
  ])('renvoie 404 pour un %s', async (_label, message) => {
    db.message.findUnique.mockResolvedValue(message);

    await expect(updateMessage(LOCATAIRE, '10', 'Corrigé')).rejects.toMatchObject({ status: 404 });
    expect(db.message.update).not.toHaveBeenCalled();
  });
});

describe('deleteMessage', () => {
  const message = (overrides = {}) => ({
    id_message: 10,
    id_sender: 1,
    id_receiver: 2,
    deleted_at: null,
    ...overrides,
  });

  it('supprime pour tout le monde à la demande de l’expéditeur', async () => {
    db.message.findUnique.mockResolvedValue(message());

    await deleteMessage(LOCATAIRE, '10', 'all');

    expect(db.message.update).toHaveBeenCalledWith({
      where: { id_message: 10 },
      data: { deleted_at: expect.any(Date) },
    });
  });

  it('interdit au destinataire de supprimer pour tout le monde', async () => {
    db.message.findUnique.mockResolvedValue(message({ id_sender: 2, id_receiver: 1 }));

    await expect(deleteMessage(LOCATAIRE, '10', 'all')).rejects.toMatchObject({ status: 403 });
    expect(db.message.update).not.toHaveBeenCalled();
  });

  it('masque côté expéditeur quand celui-ci supprime « pour moi »', async () => {
    db.message.findUnique.mockResolvedValue(message());

    await deleteMessage(LOCATAIRE, '10', 'me');

    expect(db.message.update).toHaveBeenCalledWith({
      where: { id_message: 10 },
      data: { sender_deleted_at: expect.any(Date) },
    });
  });

  it('masque côté destinataire quand celui-ci supprime « pour moi »', async () => {
    db.message.findUnique.mockResolvedValue(message({ id_sender: 2, id_receiver: 1 }));

    await deleteMessage(LOCATAIRE, '10', 'me');

    expect(db.message.update).toHaveBeenCalledWith({
      where: { id_message: 10 },
      data: { receiver_deleted_at: expect.any(Date) },
    });
  });

  it('permet encore de masquer « pour moi » un message déjà supprimé pour tous', async () => {
    db.message.findUnique.mockResolvedValue(message({ deleted_at: new Date() }));

    await expect(deleteMessage(LOCATAIRE, '10', 'me')).resolves.toBeUndefined();
  });

  it.each([
    ['message inexistant', null, 'me'],
    ['message étranger à l’utilisateur', { id_sender: 5, id_receiver: 6 }, 'me'],
    [
      'message déjà supprimé pour tous',
      { id_sender: 1, id_receiver: 2, deleted_at: new Date() },
      'all',
    ],
  ])('renvoie 404 pour un %s', async (_label, stored, scope) => {
    db.message.findUnique.mockResolvedValue(stored);

    await expect(deleteMessage(LOCATAIRE, '10', scope)).rejects.toMatchObject({ status: 404 });
  });
});

describe('contactSupport', () => {
  const adminProfile = { id_user: 9, first_name: 'Sam', last_name: 'Admin', role: 'admin' };

  it('choisit un admin et envoie l’accueil au tout premier contact', async () => {
    db.message.findFirst.mockResolvedValue(null);
    db.user.findMany.mockResolvedValue([adminProfile]);

    const result = await contactSupport(LOCATAIRE);

    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_sender: 9, type: 'support_welcome' }),
      })
    );
    expect(result).toEqual({ admin: adminProfile, first_contact: true });
  });

  it('renvoie 503 quand aucun admin actif n’est disponible', async () => {
    db.message.findFirst.mockResolvedValue(null);
    db.user.findMany.mockResolvedValue([]);

    await expect(contactSupport(LOCATAIRE)).rejects.toMatchObject({ status: 503 });
    expect(db.message.create).not.toHaveBeenCalled();
  });

  it('n’empile pas les accueils tant que la demande est ouverte', async () => {
    db.message.findFirst
      .mockResolvedValueOnce({ sender: adminProfile, receiver: { id_user: 1, role: 'locataire' } })
      .mockResolvedValueOnce({ sent_at: new Date('2026-06-01') });
    db.message.count.mockResolvedValue(0);

    const result = await contactSupport(LOCATAIRE);

    expect(result).toEqual({ admin: adminProfile, first_contact: false });
    expect(db.message.create).not.toHaveBeenCalled();
  });

  it('renvoie un accueil quand la demande précédente a été traitée', async () => {
    db.message.findFirst
      .mockResolvedValueOnce({ sender: adminProfile, receiver: { id_user: 1, role: 'locataire' } })
      .mockResolvedValueOnce({ sent_at: new Date('2026-06-01') });
    db.message.count.mockResolvedValue(1);

    const result = await contactSupport(LOCATAIRE);

    expect(result.first_contact).toBe(true);
    expect(db.message.create).toHaveBeenCalled();
  });

  it('garde le même admin qu’à la conversation précédente', async () => {
    db.message.findFirst
      .mockResolvedValueOnce({ sender: { id_user: 1, role: 'locataire' }, receiver: adminProfile })
      .mockResolvedValueOnce(null);

    const result = await contactSupport(LOCATAIRE);

    expect(result.admin).toEqual(adminProfile);
  });

  it('renvoie un accueil sur une conversation antérieure au mécanisme d’accueil', async () => {
    db.message.findFirst
      .mockResolvedValueOnce({ sender: adminProfile, receiver: { id_user: 1, role: 'locataire' } })
      .mockResolvedValueOnce(null);

    const result = await contactSupport(LOCATAIRE);

    expect(result.first_contact).toBe(true);
  });
});

describe('resolveSupport', () => {
  it('ajoute un marqueur « traité » au fil de l’utilisateur', async () => {
    db.user.findUnique.mockResolvedValue({ id_user: 1, role: 'locataire' });
    db.message.create.mockResolvedValue({
      id_message: 200,
      content: 'Votre demande a été marquée comme traitée.',
      type: 'support_resolved',
      sent_at: new Date(),
    });

    const result = await resolveSupport(ADMIN, '1');

    expect(db.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_sender: 9, id_receiver: 1, type: 'support_resolved' }),
      })
    );
    expect(result).toMatchObject({ id_message: 200, from_me: true });
  });

  it.each([
    ['utilisateur inexistant', null],
    ['autre admin', { id_user: 8, role: 'admin' }],
  ])('renvoie 404 pour un %s', async (_label, target) => {
    db.user.findUnique.mockResolvedValue(target);

    await expect(resolveSupport(ADMIN, '1')).rejects.toMatchObject({ status: 404 });
    expect(db.message.create).not.toHaveBeenCalled();
  });
});

describe('cloisonnement propriétaire → locataire', () => {
  it('laisse un propriétaire écrire à un locataire lié par une réservation', async () => {
    db.user.findUnique.mockResolvedValue({ role: 'locataire' });
    db.message.count.mockResolvedValue(0);
    db.booking.count.mockResolvedValue(1);

    await expect(sendMessage(PROPRIETAIRE, 1, 'Bonjour')).resolves.toBeDefined();
  });
});
