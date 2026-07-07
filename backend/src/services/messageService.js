import prisma from '../config/db.js';

const MAX_CONTENT_LENGTH = 2000;

function publicUser(u) {
  return u
    ? { id_user: u.id_user, first_name: u.first_name, last_name: u.last_name, role: u.role }
    : null;
}

// Qui peut écrire à qui : l'admin à tout le monde ; un locataire/propriétaire
// seulement à un admin, à une personne avec qui une conversation existe déjà,
// ou à l'autre partie d'une réservation (locataire ↔ propriétaire du bateau).
// Pas d'annuaire libre pour les non-admins.
async function canMessage(sender, id_receiver) {
  if (sender.role === 'admin') return true;

  const receiver = await prisma.user.findUnique({
    where: { id_user: id_receiver },
    select: { role: true },
  });
  if (!receiver) return false;
  if (receiver.role === 'admin') return true;

  const [existing, bookingLink] = await Promise.all([
    prisma.message.count({
      where: {
        deleted_at: null,
        OR: [
          { id_sender: sender.id_user, id_receiver },
          { id_sender: id_receiver, id_receiver: sender.id_user },
        ],
      },
    }),
    prisma.booking.count({
      where: {
        deleted_at: null,
        OR: [
          { id_user: sender.id_user, boat: { id_user: id_receiver } },
          { id_user: id_receiver, boat: { id_user: sender.id_user } },
        ],
      },
    }),
  ]);
  return existing > 0 || bookingLink > 0;
}

// Conversations de l'utilisateur : un interlocuteur par entrée, avec le
// dernier message et le nombre de non-lus.
export async function listConversations(id_user) {
  const messages = await prisma.message.findMany({
    // Exclut ce que j'ai supprimé « pour moi » ; les messages supprimés pour
    // tout le monde restent listés (placeholder « Message supprimé »).
    where: {
      OR: [
        { id_sender: id_user, sender_deleted_at: null },
        { id_receiver: id_user, receiver_deleted_at: null },
      ],
    },
    orderBy: { sent_at: 'desc' },
    select: {
      id_message: true,
      id_sender: true,
      id_receiver: true,
      content: true,
      sent_at: true,
      is_read: true,
      deleted_at: true,
      sender: { select: { id_user: true, first_name: true, last_name: true, role: true } },
      receiver: { select: { id_user: true, first_name: true, last_name: true, role: true } },
    },
  });

  const byUser = new Map();
  for (const m of messages) {
    const other = m.id_sender === id_user ? m.receiver : m.sender;
    let conv = byUser.get(other.id_user);
    if (!conv) {
      conv = {
        user: publicUser(other),
        last_message: {
          content: m.deleted_at ? null : m.content,
          deleted: Boolean(m.deleted_at),
          sent_at: m.sent_at,
          from_me: m.id_sender === id_user,
        },
        unread: 0,
      };
      byUser.set(other.id_user, conv);
    }
    if (m.id_receiver === id_user && !m.is_read && !m.deleted_at) conv.unread += 1;
  }
  return [...byUser.values()];
}

// Fil de discussion avec un interlocuteur (ordre chronologique) ; les messages
// reçus sont marqués lus au passage.
export async function getThread(me, id_other) {
  const otherId = Number(id_other);
  const other = await prisma.user.findUnique({
    where: { id_user: otherId },
    select: { id_user: true, first_name: true, last_name: true, role: true },
  });
  if (!other) {
    throw Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  }

  const messages = await prisma.message.findMany({
    // Les messages supprimés pour tout le monde restent dans le fil (bulle
    // « Message supprimé ») ; ceux supprimés « pour moi » n'apparaissent pas.
    where: {
      OR: [
        { id_sender: me.id_user, id_receiver: otherId, sender_deleted_at: null },
        { id_sender: otherId, id_receiver: me.id_user, receiver_deleted_at: null },
      ],
    },
    orderBy: { sent_at: 'asc' },
    select: {
      id_message: true,
      id_sender: true,
      content: true,
      sent_at: true,
      is_read: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  await prisma.message.updateMany({
    where: { id_sender: otherId, id_receiver: me.id_user, is_read: false, deleted_at: null },
    // updated_at est réservé aux modifications de contenu (badge « modifié »).
    data: { is_read: true, read_at: new Date() },
  });

  return {
    user: publicUser(other),
    messages: messages.map((m) => ({
      id_message: m.id_message,
      // Le contenu d'un message supprimé n'est jamais renvoyé.
      content: m.deleted_at ? null : m.content,
      deleted: Boolean(m.deleted_at),
      sent_at: m.sent_at,
      from_me: m.id_sender === me.id_user,
      // Accusé de lecture, seulement pertinent pour mes propres messages.
      read: m.is_read,
      edited: !m.deleted_at && Boolean(m.updated_at),
    })),
  };
}

// Nombre total de messages non lus (badge de l'icône messagerie du header).
export async function countUnread(id_user) {
  return prisma.message.count({
    where: { id_receiver: id_user, is_read: false, deleted_at: null, receiver_deleted_at: null },
  });
}

// Envoie un message, si l'expéditeur a le droit d'écrire à ce destinataire.
export async function sendMessage(sender, id_receiver, content) {
  const receiverId = Number(id_receiver);
  const clean = content && String(content).trim();
  if (!clean) {
    throw Object.assign(new Error('Le message est vide.'), { status: 400 });
  }
  if (clean.length > MAX_CONTENT_LENGTH) {
    throw Object.assign(new Error('Message trop long (2000 caractères max).'), { status: 400 });
  }
  if (!Number.isInteger(receiverId) || receiverId === sender.id_user) {
    throw Object.assign(new Error('Destinataire invalide.'), { status: 400 });
  }
  if (!(await canMessage(sender, receiverId))) {
    throw Object.assign(
      new Error('Vous ne pouvez écrire qu’aux personnes liées à vos réservations ou au support.'),
      { status: 403 }
    );
  }

  const message = await prisma.message.create({
    data: {
      id_sender: sender.id_user,
      id_receiver: receiverId,
      content: clean,
      sent_at: new Date(),
    },
  });
  return {
    id_message: message.id_message,
    content: message.content,
    sent_at: message.sent_at,
    from_me: true,
  };
}

// Modifie le contenu d'un de mes messages (non supprimé).
export async function updateMessage(me, id_message, content) {
  const clean = content && String(content).trim();
  if (!clean) {
    throw Object.assign(new Error('Le message est vide.'), { status: 400 });
  }
  if (clean.length > MAX_CONTENT_LENGTH) {
    throw Object.assign(new Error('Message trop long (2000 caractères max).'), { status: 400 });
  }

  const message = await prisma.message.findUnique({
    where: { id_message: Number(id_message) },
    select: { id_message: true, id_sender: true, deleted_at: true, sender_deleted_at: true },
  });
  // 404 aussi pour le message d'un autre : on ne révèle rien.
  if (
    !message ||
    message.deleted_at ||
    message.sender_deleted_at ||
    message.id_sender !== me.id_user
  ) {
    throw Object.assign(new Error('Message introuvable.'), { status: 404 });
  }

  const updated = await prisma.message.update({
    where: { id_message: message.id_message },
    data: { content: clean, updated_at: new Date() },
  });
  return {
    id_message: updated.id_message,
    content: updated.content,
    sent_at: updated.sent_at,
    from_me: true,
    read: updated.is_read,
    edited: true,
  };
}

// Supprime un message : « pour tout le monde » (expéditeur uniquement) ou
// « pour moi » (chaque côté masque le message chez lui).
export async function deleteMessage(me, id_message, scope) {
  const message = await prisma.message.findUnique({
    where: { id_message: Number(id_message) },
    select: { id_message: true, id_sender: true, id_receiver: true, deleted_at: true },
  });
  const involved =
    message && (message.id_sender === me.id_user || message.id_receiver === me.id_user);
  if (!message || !involved || (message.deleted_at && scope === 'all')) {
    throw Object.assign(new Error('Message introuvable.'), { status: 404 });
  }

  if (scope === 'all') {
    if (message.id_sender !== me.id_user) {
      throw Object.assign(
        new Error('Seul l’expéditeur peut supprimer un message pour tout le monde.'),
        { status: 403 }
      );
    }
    await prisma.message.update({
      where: { id_message: message.id_message },
      data: { deleted_at: new Date() },
    });
    return;
  }

  // « Pour moi » : on masque le message du côté du demandeur seulement.
  await prisma.message.update({
    where: { id_message: message.id_message },
    data:
      message.id_sender === me.id_user
        ? { sender_deleted_at: new Date() }
        : { receiver_deleted_at: new Date() },
  });
}
