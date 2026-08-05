import fs from 'fs';
import path from 'path';
import prisma from '../config/db.js';

const DAY_MS = 86400000;
const ANONYMOUS_NAME = 'Anonyme';
// Aucun hash bcrypt ne peut valoir cette chaîne : le compte devient
// définitivement non connectable, y compris par réinitialisation.
const UNUSABLE_PASSWORD = 'anonymise';

const clampDays = (value) => {
  const days = Number(value);
  return Number.isFinite(days) && days >= 1 ? Math.trunc(days) : 30;
};

// Domaine réservé par la RFC 2606 : ne peut appartenir à personne, et préserve
// la contrainte d'unicité (email, role).
export const anonymizedEmail = (id_user) => `anonyme.${id_user}@supprime.invalid`;

// Comptes dont la suppression est actée depuis assez longtemps, pas encore
// traités. anonymized_at fait aussi office de preuve d'exécution (art. 5.2).
export function anonymizableUsersWhere(params = {}, now = new Date()) {
  return {
    deleted_at: { lt: new Date(now.getTime() - clampDays(params.retentionDays) * DAY_MS) },
    anonymized_at: null,
  };
}

// Les avatars stockent une URL publique ; le fichier vit sous UPLOADS_DIR.
const avatarDiskPath = (url) =>
  typeof url === 'string' && url.includes('/uploads/avatars/')
    ? path.join(process.env.UPLOADS_DIR || 'uploads', 'avatars', path.basename(url))
    : null;

const removeFileQuiet = (diskPath) => {
  if (diskPath) fs.promises.unlink(diskPath).catch(() => {});
};

export async function anonymizeUser(id_user, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id_user },
    select: { id_user: true, role: true },
  });
  if (!user) return null;

  const [documents, avatars, boats] = await Promise.all([
    prisma.document.findMany({ where: { id_user }, select: { id_document: true, file_url: true } }),
    prisma.image.findMany({ where: { id_user }, select: { id_image: true, url: true } }),
    prisma.boat.findMany({ where: { id_user, deleted_at: null }, select: { id_boat: true } }),
  ]);

  const documentIds = documents.map((doc) => doc.id_document);
  const boatIds = boats.map((boat) => boat.id_boat);
  const isOwner = user.role === 'proprietaire';

  // La réponse du propriétaire vit sur l'avis d'un locataire : supprimer la
  // ligne effacerait le texte d'un tiers, on ne retire que la réponse.
  const ownerReplies = isOwner
    ? await prisma.review.findMany({
        where: { booking: { id_boat: { in: boatIds } }, owner_reply: { not: null } },
        select: { id_review: true },
      })
    : [];

  const counts = await prisma.$transaction(async (tx) => {
    // Le lien vers la réservation part avec le document qu'il désigne.
    await tx.bookingDocument.deleteMany({ where: { id_document: { in: documentIds } } });
    const removedDocuments = await tx.document.deleteMany({ where: { id_user } });
    const removedImages = await tx.image.deleteMany({ where: { id_user } });
    await tx.refreshToken.deleteMany({ where: { id_user } });
    await tx.userBoatFavorite.deleteMany({ where: { id_user } });

    const removedReviews = isOwner
      ? { count: 0 }
      : await tx.review.deleteMany({ where: { id_user } });

    if (ownerReplies.length) {
      await tx.review.updateMany({
        where: { id_review: { in: ownerReplies.map((review) => review.id_review) } },
        data: { owner_reply: null, owner_reply_at: null, updated_at: now },
      });
    }

    // Une annonce dont le propriétaire est anonymisé n'a plus d'interlocuteur.
    const unpublishedBoats = boatIds.length
      ? await tx.boat.updateMany({
          where: { id_boat: { in: boatIds } },
          data: { is_published: false, deleted_at: now, updated_at: now },
        })
      : { count: 0 };

    // Sans cette réécriture l'anonymisation serait incomplète : l'adresse
    // survivrait dans les journaux jusqu'à leur propre rétention.
    const scrubbedLogs = await tx.activityLog.updateMany({
      where: { actor_id: id_user },
      data: { actor_email: anonymizedEmail(id_user) },
    });
    const scrubbedRuns = await tx.cronRun.updateMany({
      where: { actor_id: id_user },
      data: { actor_email: anonymizedEmail(id_user) },
    });

    await tx.user.update({
      where: { id_user },
      data: {
        first_name: ANONYMOUS_NAME,
        last_name: ANONYMOUS_NAME,
        email: anonymizedEmail(id_user),
        password: UNUSABLE_PASSWORD,
        phone: null,
        stripe_account_id: null,
        reset_token: null,
        reset_token_expires_at: null,
        email_verification_token: null,
        email_verified: false,
        is_active: false,
        anonymized_at: now,
        updated_at: now,
      },
    });

    return {
      documents: removedDocuments.count,
      images: removedImages.count,
      reviews: removedReviews.count,
      ownerReplies: ownerReplies.length,
      boats: unpublishedBoats.count,
      activityLogs: scrubbedLogs.count,
      cronRuns: scrubbedRuns.count,
    };
  });

  // Hors transaction : un effacement disque ne se rejoue pas en arrière.
  const diskPaths = [
    ...documents.map((doc) => doc.file_url),
    ...avatars.map((image) => avatarDiskPath(image.url)),
  ].filter(Boolean);
  diskPaths.forEach(removeFileQuiet);

  return { ...counts, files: diskPaths.length };
}
