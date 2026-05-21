import fs from 'fs';
import path from 'path';
import {
  createDocument,
  findDocumentsByUser,
  findDocumentsByUserAndType,
  findDocumentById,
  findAllDocuments,
  updateDocument,
  deleteDocument as deleteDocumentRepo,
} from '../repositories/documentRepository.js';

const VALIDATION_STATUSES = ['pending', 'validated', 'refused'];

// Documents obligatoires selon le rôle.
export const DOCUMENT_TYPES = {
  locataire: ['permis_conduire', 'piece_identite', 'cv_nautique'],
  proprietaire: ['permis', 'assurance', 'cv_marin', 'acte_francisation'],
};

// Types pour lesquels l'utilisateur peut déposer PLUSIEURS fichiers (pas de remplacement).
const MULTI_TYPES = ['acte_francisation'];

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

export async function uploadDocument(requester, type, file) {
  if (!file) {
    throw Object.assign(new Error('Aucun fichier fourni.'), { status: 400 });
  }
  const allowedTypes = DOCUMENT_TYPES[requester.role] || [];
  if (!allowedTypes.includes(type)) {
    removeFileQuiet(file.path);
    throw Object.assign(new Error('Type de document invalide.'), { status: 400 });
  }

  // Types "simples" : un seul document → on remplace l'éventuel existant (fichier inclus).
  // Types "multiples" (ex. acte de francisation) : on ajoute sans rien supprimer.
  if (!MULTI_TYPES.includes(type)) {
    const existing = await findDocumentsByUserAndType(requester.id_user, type);
    for (const doc of existing) {
      removeFileQuiet(doc.file_url);
      await deleteDocumentRepo(doc.id_document);
    }
  }

  const doc = await createDocument({
    id_user: requester.id_user,
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

// --- Administration ---

function publicDocumentWithUser(doc) {
  return {
    ...publicDocument(doc),
    user: doc.user
      ? {
          id_user: doc.user.id_user,
          first_name: doc.user.first_name,
          last_name: doc.user.last_name,
          email: doc.user.email,
          role: doc.user.role,
        }
      : null,
  };
}

export async function listAllDocuments({ status, type, role, search } = {}) {
  const where = {};
  if (status && VALIDATION_STATUSES.includes(status)) where.status = status;
  if (type) where.type = type;

  const userFilter = {};
  if (role) userFilter.role = role;
  if (search && String(search).trim()) {
    const s = String(search).trim();
    userFilter.OR = [
      { first_name: { contains: s, mode: 'insensitive' } },
      { last_name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
    ];
  }
  if (Object.keys(userFilter).length > 0) where.user = userFilter;

  const docs = await findAllDocuments(where);
  return docs.map(publicDocumentWithUser);
}

export async function setDocumentStatus(id_document, status) {
  if (!VALIDATION_STATUSES.includes(status)) {
    throw Object.assign(new Error('Statut invalide.'), { status: 400 });
  }
  const id = Number(id_document);
  const doc = await findDocumentById(id);
  if (!doc) {
    throw Object.assign(new Error('Document introuvable.'), { status: 404 });
  }
  const updated = await updateDocument(id, { status, updated_at: new Date() });
  return publicDocument(updated);
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
