import prisma from '../config/db.js';

export async function createDocument(data) {
  return prisma.document.create({ data });
}

export async function findDocumentsByUser(id_user) {
  return prisma.document.findMany({
    where: { id_user },
    orderBy: { upload_date: 'desc' },
  });
}

export async function findDocumentsByUserAndType(id_user, type) {
  return prisma.document.findMany({ where: { id_user, type } });
}

export async function findDocumentsByFileUrl(file_url) {
  return prisma.document.findMany({
    where: { file_url },
    select: { id_document: true, file_url: true },
  });
}

// Vrai si le locataire a (eu) une réservation sur un bateau du propriétaire :
// borne l'accès du propriétaire aux documents de ce locataire.
export async function hasBookingAccessToDocument(id_owner, id_guest, id_document) {
  const bookingDocument = await prisma.bookingDocument.findFirst({
    where: {
      id_document,
      document: { id_user: id_guest },
      booking: {
        deleted_at: null,
        id_user: id_guest,
        boat: { id_user: id_owner, deleted_at: null },
      },
    },
    select: { id_booking: true },
  });
  return Boolean(bookingDocument);
}

export async function findDocumentById(id_document) {
  return prisma.document.findUnique({ where: { id_document } });
}

export async function findAllDocuments(where) {
  return prisma.document.findMany({
    where: where || {},
    include: {
      user: {
        select: { id_user: true, first_name: true, last_name: true, email: true, role: true },
      },
    },
    orderBy: { upload_date: 'desc' },
  });
}

export async function updateDocument(id_document, data) {
  return prisma.document.update({ where: { id_document }, data });
}

export async function deleteDocument(id_document) {
  // Les pièces peuvent être rattachées à des réservations déjà payées. Leur
  // remplacement/suppression retire ces liens dans la même transaction afin
  // d'éviter un échec de la FK BookingDocument (RESTRICT).
  if (prisma.bookingDocument?.deleteMany && prisma.$transaction) {
    return prisma.$transaction(async (tx) => {
      await tx.bookingDocument.deleteMany({ where: { id_document } });
      return tx.document.delete({ where: { id_document } });
    });
  }
  return prisma.document.delete({ where: { id_document } });
}
