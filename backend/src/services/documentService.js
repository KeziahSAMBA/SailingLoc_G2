import {
  inspectUploadedFile,
  mimeTypeForFileName,
  resolveExistingPrivateFile,
  safeDisplayName,
  storagePath,
} from '../utils/fileSecurity.js';
import { encryptFileInPlace } from '../utils/fileCrypto.js';
import { removeUnreferencedFiles, asFileReference } from './fileCleanupService.js';
import {
  createDocument,
  findDocumentsByUser,
  findDocumentsByUserAndType,
  findDocumentsByFileUrl,
  findDocumentById,
  findAllDocuments,
  updateDocument,
  deleteDocument as deleteDocumentRepo,
  hasBookingAccessToDocument,
} from '../repositories/documentRepository.js';

const VALIDATION_STATUSES = ['pending', 'validated', 'refused'];

// Documents obligatoires selon le rôle.
export const DOCUMENT_TYPES = {
  locataire: ['permis_conduire', 'piece_identite', 'cv_nautique'],
  proprietaire: ['permis', 'assurance', 'cv_marin', 'acte_francisation'],
};

// Types pour lesquels l'utilisateur peut déposer PLUSIEURS fichiers (pas de
// remplacement) : un par bateau.
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
    // Bateau auquel le document est rattaché (ex. acte de francisation) — null sinon.
    id_boat: doc.id_boat ?? null,
  };
}

// file_url contient le chemin disque (ex. "storage/documents/xxx.pdf").
async function removeFileQuiet(diskPath, id_document = null) {
  if (!diskPath) return 0;
  if (id_document !== null) {
    let references;
    try {
      references = (await findDocumentsByFileUrl(diskPath)).map((row) =>
        asFileReference(row.id_document, row.file_url)
      );
    } catch {
      // A failed reference lookup is fail-closed: another row may still point
      // at the same object, so keep the file for a later cleanup pass.
      return 0;
    }
    return removeUnreferencedFiles([{ id: id_document, value: diskPath }], {
      kind: 'document',
      references,
      removedIds: [id_document],
    });
  }

  // A freshly rejected upload has no persisted row and therefore cannot be
  // shared. Its path is still constrained by the private resolver.
  return removeUnreferencedFiles([{ id: 'upload', value: diskPath }], {
    kind: 'document',
    references: [asFileReference('upload', diskPath)],
    removedIds: ['upload'],
  });
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
    await removeFileQuiet(file.path);
    throw Object.assign(new Error('Type de document invalide.'), { status: 400 });
  }

  let metadata;
  try {
    metadata = file.detectedMimeType
      ? {
          mimeType: file.detectedMimeType,
          safeName:
            file.safeOriginalName || safeDisplayName(file.originalname, file.detectedMimeType),
        }
      : await inspectUploadedFile(file, 'document');
    const safePath = await resolveExistingPrivateFile(file.path, 'document', { lexical: true });
    await encryptFileInPlace(safePath);
  } catch (err) {
    await removeFileQuiet(file.path);
    throw Object.assign(new Error('Le fichier n’a pas pu être sécurisé.'), {
      status: err.status || 400,
    });
  }

  // Types "simples" : un seul document → on remplace l'éventuel existant (fichier inclus).
  // Types "multiples" (ex. acte de francisation) : on ajoute sans rien supprimer.
  if (!MULTI_TYPES.includes(type)) {
    const existing = await findDocumentsByUserAndType(requester.id_user, type);
    for (const doc of existing) {
      await deleteDocumentRepo(doc.id_document);
      await removeFileQuiet(doc.file_url, doc.id_document);
    }
  }

  const doc = await createDocument({
    id_user: requester.id_user,
    type,
    file_name: metadata.safeName,
    mime_type: metadata.mimeType,
    file_url: storagePath(file.path),
    upload_date: new Date(),
    status: 'pending',
  });
  return publicDocument(doc);
}

// Renvoie le chemin absolu du fichier si le demandeur a le droit de le lire
// (propriétaire du document, admin, ou propriétaire d'un bateau réservé par le
// locataire propriétaire du document). Sert la route de téléchargement protégée.
export async function getDocumentFile(requester, id_document) {
  const id = Number(id_document);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw Object.assign(new Error('Document introuvable.'), { status: 404 });
  }
  const doc = await findDocumentById(id);
  if (!doc) {
    throw Object.assign(new Error('Document introuvable.'), { status: 404 });
  }
  const isOwner = doc.id_user === requester.id_user;
  const isAdmin = requester.role === 'admin';
  // Le propriétaire ne voit que les documents locataire et seulement si ce
  // locataire a une réservation sur l'un de ses bateaux.
  const isBookingOwner =
    requester.role === 'proprietaire' &&
    DOCUMENT_TYPES.locataire.includes(doc.type) &&
    doc.status === 'validated' &&
    (await hasBookingAccessToDocument(requester.id_user, doc.id_user, doc.id_document));
  if (!isOwner && !isAdmin && !isBookingOwner) {
    throw Object.assign(new Error('Accès refusé.'), { status: 403 });
  }

  let absPath;
  try {
    absPath = await resolveExistingPrivateFile(doc.file_url, 'document');
  } catch {
    throw Object.assign(new Error('Fichier introuvable.'), { status: 404 });
  }
  return {
    absPath,
    file_name: doc.file_name,
    mime_type: doc.mime_type || mimeTypeForFileName(doc.file_name),
  };
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
  // Un document rattaché à une annonce (ex. acte de francisation) ne se
  // supprime pas d'ici : il faut d'abord le remplacer depuis le bateau.
  if (doc.id_boat) {
    throw Object.assign(
      new Error('Ce document est rattaché à une annonce : remplacez-le depuis le bateau concerné.'),
      { status: 400 }
    );
  }
  await deleteDocumentRepo(id);
  await removeFileQuiet(doc.file_url, doc.id_document);
}
