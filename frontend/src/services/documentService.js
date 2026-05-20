import api from './api.js';

export function getMyDocuments() {
  return api.get('/documents');
}

export function uploadDocument(type, file) {
  const form = new FormData();
  form.append('type', type);
  form.append('file', file);
  // On laisse axios/le navigateur poser le Content-Type (avec le boundary multipart).
  // `undefined` écrase le défaut 'application/json' de l'instance api.
  return api.post('/documents', form, {
    headers: { 'Content-Type': undefined },
  });
}

export function deleteDocument(id) {
  return api.delete(`/documents/${id}`);
}

// Récupère le fichier via la route protégée (le token est ajouté par l'intercepteur).
export function fetchDocumentFile(id) {
  return api.get(`/documents/${id}/file`, { responseType: 'blob' });
}
