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
    select: { role: true, is_active: true, deleted_at: true },
  });
  if (!receiver || !receiver.is_active || receiver.deleted_at) return false;
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
// dernier message et le nombre de non-lus. Ce endpoint est pollé par le
// front : une seule requête SQL (DISTINCT ON) ramène juste le nécessaire au
// lieu de charger tout l'historique et de regrouper en JS.
// Règles conservées : les messages supprimés « pour moi » sont ignorés, ceux
// supprimés pour tout le monde restent listés (placeholder) mais ne comptent
// pas dans les non-lus.
export async function listConversations(id_user) {
  const rows = await prisma.$queryRaw`
    WITH mine AS (
      SELECT
        CASE WHEN m.id_sender = ${id_user} THEN m.id_receiver ELSE m.id_sender END AS other_id,
        m.content,
        m.sent_at,
        m.deleted_at,
        (m.id_sender = ${id_user}) AS from_me
      FROM message m
      WHERE (m.id_sender = ${id_user} AND m.sender_deleted_at IS NULL)
         OR (m.id_receiver = ${id_user} AND m.receiver_deleted_at IS NULL)
    ),
    last_msg AS (
      SELECT DISTINCT ON (other_id) * FROM mine ORDER BY other_id, sent_at DESC
    )
    SELECT
      l.other_id,
      l.content,
      l.sent_at,
      l.deleted_at,
      l.from_me,
      u.first_name,
      u.last_name,
      u.role::text AS role,
      (
        SELECT COUNT(*)::int FROM message x
        WHERE x.id_sender = l.other_id
          AND x.id_receiver = ${id_user}
          AND x.is_read = FALSE
          AND x.deleted_at IS NULL
          AND x.receiver_deleted_at IS NULL
      ) AS unread
    FROM last_msg l
    JOIN "user" u ON u.id_user = l.other_id
      AND u.is_active = TRUE
      AND u.deleted_at IS NULL
    ORDER BY l.sent_at DESC
  `;

  return rows.map((r) => ({
    user: {
      id_user: r.other_id,
      first_name: r.first_name,
      last_name: r.last_name,
      role: r.role,
    },
    last_message: {
      content: r.deleted_at ? null : r.content,
      deleted: Boolean(r.deleted_at),
      sent_at: r.sent_at,
      from_me: r.from_me,
    },
    unread: r.unread,
  }));
}

// Fil de discussion avec un interlocuteur (ordre chronologique) ; les messages
// reçus sont marqués lus au passage. Même règle d'accès que l'envoi
// (canMessage) : sans lien avec cet utilisateur, on ne révèle ni son
// existence ni ses informations (anti-énumération).
export async function getThread(me, id_other) {
  const otherId = Number(id_other);
  const notFound = () => Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  if (!Number.isInteger(otherId) || otherId === me.id_user) throw notFound();
  if (!(await canMessage(me, otherId))) throw notFound();

  const other = await prisma.user.findUnique({
    where: { id_user: otherId },
    select: { id_user: true, first_name: true, last_name: true, role: true },
  });
  if (!other) throw notFound();

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
      type: true,
      sent_at: true,
      is_read: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  await prisma.message.updateMany({
    // Un message supprimé « pour moi » n'est pas affiché, donc pas lu : on ne
    // fausse pas l'accusé de lecture côté expéditeur.
    where: {
      id_sender: otherId,
      id_receiver: me.id_user,
      is_read: false,
      deleted_at: null,
      receiver_deleted_at: null,
    },
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
      type: m.type,
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

// Ouvre une conversation depuis une fiche bateau sans exposer un annuaire de
// propriétaires. Le serveur résout lui-même le propriétaire du bateau publié
// et crée un message de contexte lors du tout premier contact.
export async function contactBoatOwner(me, id_boat) {
  const boatId = Number(id_boat);
  const notFound = () =>
    Object.assign(new Error('Bateau introuvable ou indisponible.'), { status: 404 });

  if (!Number.isInteger(boatId)) throw notFound();

  const boat = await prisma.boat.findFirst({
    where: {
      id_boat: boatId,
      is_published: true,
      deleted_at: null,
      owner: { is_active: true, deleted_at: null },
    },
    select: {
      name: true,
      owner: {
        select: { id_user: true, first_name: true, last_name: true, role: true },
      },
    },
  });
  if (!boat || boat.owner.role !== 'proprietaire') throw notFound();

  const existing = await prisma.message.count({
    where: {
      deleted_at: null,
      OR: [
        { id_sender: me.id_user, id_receiver: boat.owner.id_user },
        { id_sender: boat.owner.id_user, id_receiver: me.id_user },
      ],
    },
  });

  if (existing === 0) {
    await prisma.message.create({
      data: {
        id_sender: me.id_user,
        id_receiver: boat.owner.id_user,
        content: `Conversation ouverte au sujet du bateau « ${boat.name} ».`,
        type: 'boat_contact',
        sent_at: new Date(),
      },
    });
  }

  return { owner: publicUser(boat.owner), boat_name: boat.name };
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

// Message d'accueil envoyé automatiquement par le support à l'ouverture d'une
// nouvelle demande.
const SUPPORT_WELCOME =
  'Bonjour ! Nous avons bien reçu votre demande : décrivez-nous votre question, ' +
  'un conseiller SailingLoc vous répond au plus vite (du lundi au samedi, 9 h – 18 h).';

// Ouvre (ou retrouve) la conversation support de l'utilisateur.
// - Premier contact : admin choisi au hasard (il peut y avoir plusieurs
//   comptes admin) + message d'accueil automatique.
// - Demande en cours (pas encore marquée « traitée » par l'admin) : pas de
//   nouvel accueil — donc jamais répété à chaque message envoyé.
// - Demande précédente marquée traitée : nouveau problème → le même admin
//   renvoie l'accueil.
export async function contactSupport(me) {
  const last = await prisma.message.findFirst({
    where: {
      OR: [
        { id_sender: me.id_user, receiver: { role: 'admin' } },
        { id_receiver: me.id_user, sender: { role: 'admin' } },
      ],
    },
    orderBy: { sent_at: 'desc' },
    select: {
      sender: { select: { id_user: true, first_name: true, last_name: true, role: true } },
      receiver: { select: { id_user: true, first_name: true, last_name: true, role: true } },
    },
  });

  let admin;
  if (last) {
    admin = last.sender.role === 'admin' ? last.sender : last.receiver;

    const lastWelcome = await prisma.message.findFirst({
      where: { id_receiver: me.id_user, type: 'support_welcome' },
      orderBy: { sent_at: 'desc' },
      select: { sent_at: true },
    });
    if (lastWelcome) {
      const resolved = await prisma.message.count({
        where: {
          id_receiver: me.id_user,
          type: 'support_resolved',
          sent_at: { gt: lastWelcome.sent_at },
        },
      });
      if (resolved === 0) {
        // Demande encore ouverte : on n'empile pas les accueils.
        return { admin: publicUser(admin), first_contact: false };
      }
    }
    // Demande précédente marquée traitée (ou conversation d'avant l'accueil
    // automatique) : on repart sur un nouvel accueil.
  } else {
    const admins = await prisma.user.findMany({
      where: { role: 'admin', is_active: true },
      select: { id_user: true, first_name: true, last_name: true, role: true },
    });
    if (admins.length === 0) {
      throw Object.assign(new Error('Le support est indisponible pour le moment.'), {
        status: 503,
      });
    }
    admin = admins[Math.floor(Math.random() * admins.length)];
  }

  await prisma.message.create({
    data: {
      id_sender: admin.id_user,
      id_receiver: me.id_user,
      content: SUPPORT_WELCOME,
      type: 'support_welcome',
      sent_at: new Date(),
    },
  });
  return { admin: publicUser(admin), first_contact: true };
}

// L'admin marque la demande support d'un utilisateur comme traitée : un
// marqueur système est ajouté au fil, et le prochain passage par la page
// Contact rouvrira une nouvelle demande (nouvel accueil).
export async function resolveSupport(admin, id_user) {
  const userId = Number(id_user);
  const target = await prisma.user.findUnique({
    where: { id_user: userId },
    select: { id_user: true, role: true },
  });
  if (!target || target.role === 'admin') {
    throw Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  }

  const message = await prisma.message.create({
    data: {
      id_sender: admin.id_user,
      id_receiver: userId,
      content:
        'Votre demande a été marquée comme traitée. Besoin d’autre chose ? Repassez par la page Contact.',
      type: 'support_resolved',
      sent_at: new Date(),
    },
  });
  return {
    id_message: message.id_message,
    content: message.content,
    type: message.type,
    sent_at: message.sent_at,
    from_me: true,
  };
}
