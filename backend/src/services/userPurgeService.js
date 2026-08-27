import prisma from '../config/db.js';
import { asFileReference, removeUnreferencedFiles } from './fileCleanupService.js';

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

async function findManySafe(model, args) {
  if (typeof model?.findMany !== 'function') return [];
  try {
    return (await model.findMany(args)) || [];
  } catch {
    // A cleanup query must never make account anonymisation fail. The actual
    // unlink path still goes through a fail-closed resolver.
    return [];
  }
}

// Unlike the best-effort relationship reads above, a complete reference list
// is a prerequisite for deleting a physical object. `null` distinguishes a
// transient query failure from a valid empty table so cleanup can fail closed.
async function findManyForCleanup(model, args) {
  if (typeof model?.findMany !== 'function') return null;
  try {
    return (await model.findMany(args)) || [];
  } catch {
    return null;
  }
}

async function disputeIdsForUser(id_user) {
  const rows = await findManySafe(prisma.dispute, {
    where: {
      OR: [{ id_user }, { booking: { id_user } }, { booking: { boat: { id_user } } }],
    },
    select: { id_dispute: true },
  });
  return rows.map((row) => row.id_dispute).filter((id) => Number.isSafeInteger(id));
}

function imageKind(image) {
  if (image?.type === 'dispute' || image?.id_dispute) return 'dispute';
  if (image?.type === 'avatar' || /\/uploads\/avatars\//i.test(String(image?.url || ''))) {
    return 'avatar';
  }
  return 'boat';
}

// markDeleted : à poser quand l'anonymisation n'a pas été précédée d'une
// suppression admin (cas de l'inactivité), sinon le compte resterait listé
// dans le back-office, qui filtre sur deleted_at.
export async function anonymizeUser(id_user, now = new Date(), { markDeleted = false } = {}) {
  const user = await prisma.user.findUnique({
    where: { id_user },
    select: { id_user: true, role: true },
  });
  if (!user) return null;

  // Include already soft-deleted boats: their public photos are no longer
  // reachable from the UI but remain sensitive user uploads on disk.
  const boats = await findManySafe(prisma.boat, {
    where: { id_user },
    select: { id_boat: true },
  });
  const boatIds = boats.map((boat) => boat.id_boat).filter((id) => Number.isSafeInteger(id));
  const disputeIds = await disputeIdsForUser(id_user);

  const documents = await findManySafe(prisma.document, {
    where: { id_user },
    select: { id_document: true, file_url: true },
  });
  const imageWhere = {
    OR: [
      { id_user },
      ...(boatIds.length ? [{ id_boat: { in: boatIds } }] : []),
      ...(disputeIds.length ? [{ id_dispute: { in: disputeIds } }] : []),
    ],
  };
  const images = await findManySafe(prisma.image, {
    where: imageWhere,
    select: { id_image: true, url: true, type: true, id_boat: true, id_dispute: true },
  });

  // All references are loaded before the transaction. They are used only to
  // decide whether a physical object is shared; no path or personal field is
  // emitted to the purge journal.
  const allDocuments = await findManyForCleanup(prisma.document, {
    select: { id_document: true, file_url: true },
  });
  const allImages = await findManyForCleanup(prisma.image, {
    select: { id_image: true, url: true, type: true, id_boat: true, id_dispute: true },
  });

  const documentIds = documents.map((doc) => doc.id_document);
  const imageIds = images.map((image) => image.id_image);
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
    const removedImages = imageIds.length
      ? await tx.image.deleteMany({ where: { id_image: { in: imageIds } } })
      : await tx.image.deleteMany({ where: { id_user } });
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
        email_verification_token_expires_at: null,
        email_verified: false,
        is_active: false,
        auth_version: { increment: 1 },
        anonymized_at: now,
        updated_at: now,
        ...(markDeleted ? { deleted_at: now } : {}),
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

  // Hors transaction : le nettoyage est idempotent et le resolver refuse les
  // chemins hors racine ou les symlinks sortant du stockage configuré.
  const documentFiles = documents
    .filter((doc) => doc.file_url)
    .map((doc) => ({ id: doc.id_document, value: doc.file_url }));
  const removedDocumentFiles =
    allDocuments === null
      ? 0
      : await removeUnreferencedFiles(documentFiles, {
          kind: 'document',
          references: allDocuments
            .filter((doc) => doc.file_url)
            .map((doc) => asFileReference(doc.id_document, doc.file_url)),
          removedIds: documentIds,
        });

  let removedImageFiles = 0;
  if (allImages !== null) {
    for (const kind of ['boat', 'avatar', 'dispute']) {
      const selected = images
        .filter((image) => imageKind(image) === kind && image.url)
        .map((image) => ({ id: image.id_image, value: image.url }));
      const references = allImages
        .filter((image) => imageKind(image) === kind && image.url)
        .map((image) => asFileReference(image.id_image, image.url));
      removedImageFiles += await removeUnreferencedFiles(selected, {
        kind,
        isPublic: kind !== 'dispute',
        references,
        removedIds: imageIds,
      });
    }
  }

  return { ...counts, files: removedDocumentFiles + removedImageFiles };
}
