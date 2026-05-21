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
  return prisma.document.delete({ where: { id_document } });
}
