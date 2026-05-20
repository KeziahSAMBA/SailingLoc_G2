import {
  getMyDocuments,
  uploadDocument,
  deleteMyDocument,
  getDocumentFile,
} from '../services/documentService.js';

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
    const document = await uploadDocument(req.user.id_user, req.body?.type, req.file);
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
    const { absPath, file_name } = await getDocumentFile(req.user, req.params.id);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file_name)}"`);
    res.sendFile(absPath);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
