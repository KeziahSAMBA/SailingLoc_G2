import {
  getMyDocuments,
  uploadDocument,
  deleteMyDocument,
  getDocumentFile,
  listAllDocuments,
  setDocumentStatus,
} from '../services/documentService.js';
import { mimeTypeForFileName, safeDisplayName } from '../utils/fileSecurity.js';
import { readDecrypted } from '../utils/fileCrypto.js';

export async function listMyDocuments(req, res) {
  try {
    const documents = await getMyDocuments(req.user.id_user);
    res.json({ documents });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function uploadMyDocument(req, res) {
  try {
    const document = await uploadDocument(req.user, req.body?.type, req.file);
    res.locals.auditTargetId = String(document.id_document);
    res.status(201).json({ document });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function deleteMyDocumentController(req, res) {
  try {
    await deleteMyDocument(req.user.id_user, req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function downloadDocument(req, res) {
  try {
    const { absPath, file_name, mime_type } = await getDocumentFile(req.user, req.params.id);
    const content = await readDecrypted(absPath);
    const downloadName = safeDisplayName(file_name, mime_type || mimeTypeForFileName(file_name));
    const encodedName = encodeURIComponent(downloadName);
    res.setHeader('Content-Type', mime_type || mimeTypeForFileName(downloadName));
    res.setHeader('Content-Length', String(content.length));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName.replace(/["\\\r\n]/g, '_')}"; filename*=UTF-8''${encodedName}`
    );
    return res.send(content);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// --- Administration ---

export async function adminListDocuments(req, res) {
  try {
    const documents = await listAllDocuments(req.query);
    res.json({ documents });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminSetDocumentStatus(req, res) {
  try {
    const document = await setDocumentStatus(req.params.id, req.body?.status);
    res.json({ document });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
