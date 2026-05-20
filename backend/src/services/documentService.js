import fs from 'fs';
import path from 'path';
import {
  createDocument,
  findDocumentsByUser,
  findDocumentsByUserAndType,
  findDocumentById,
  deleteDocument as deleteDocumentRepo,
} from '../repositories/documentRepository.js';

// Documents obligatoires du locataire.
export const DOCUMENT_TYPES = ['permis_conduire', 'piece_identite', 'cv_nautique'];

// On n'expose jamais le chemin disque (file_url) : l'accès au fichier passe
// par la route protégée /api/documents/:id/file.
function publicDocument(doc) {
  return {
    id_document: doc.id_document,
    type: doc.type,
    file_name: doc.file_name,
    status: doc.status,
    upload_date: doc.upload_date,
  };
}

// file_url contient le chemin disque (ex. "storage/documents/xxx.pdf").
function removeFileQuiet(diskPath) {
  if (!diskPath) return;
  fs.promises.unlink(diskPath).catch(() => {});
}

export async function getMyDocuments(id_user) {
  const docs = await findDocumentsByUser(id_user);
  return docs.map(publicDocument);
}

export async function uploadDocument(id_user, type, file) {
  if (!file) {
    throw Object.assign(new Error('Aucun fichier fourni.'), { status: 400 });
  }
  if (!DOCUMENT_TYPES.includes(type)) {
    removeFileQuiet(file.path);
    throw Object.assign(new Error('Type de document invalide.'), { status: 400 });
  }

  // Un seul document par type : on remplace l'éventuel existant (fichier inclus).
  const existing = await findDocumentsByUserAndType(id_user, type);
  for (const doc of existing) {
    removeFileQuiet(doc.file_url);
    await deleteDocumentRepo(doc.id_document);
  }

  const doc = await createDocument({
    id_user,
    type,
    file_name: file.originalname,
    file_url: file.path.replace(/\\/g, '/'),
    upload_date: new Date(),
    status: 'pending',
  });
  return publicDocument(doc);
}

// Renvoie le chemin absolu du fichier si le demandeur a le droit de le lire
// (propriétaire du document, ou admin). Sert la route de téléchargement protégée.
export async function getDocumentFile(requester, id_document) {
  const doc = await findDocumentById(Number(id_document));
  if (!doc) {
    throw Object.assign(new Error('Document introuvable.'), { status: 404 });
  }
  const isOwner = doc.id_user === requester.id_user;
  const isAdmin = requester.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw Object.assign(new Error('Accès refusé.'), { status: 403 });
  }

  const absPath = path.resolve(doc.file_url);
  if (!fs.existsSync(absPath)) {
    throw Object.assign(new Error('Fichier introuvable.'), { status: 404 });
  }
  return { absPath, file_name: doc.file_name };
}

export async function deleteMyDocument(id_user, id_document) {
  const id = Number(id_document);
  const doc = await findDocumentById(id);
  if (!doc || doc.id_user !== id_user) {
    throw Object.assign(new Error('Document introuvable.'), { status: 404 });
  }
  removeFileQuiet(doc.file_url);
  await deleteDocumentRepo(id);
}
