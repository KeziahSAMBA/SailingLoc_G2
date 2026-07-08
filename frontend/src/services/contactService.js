import api from './api.js';

// Dépôt d'une demande via le formulaire public de la page Contact.
export function sendContactRequest(data) {
  return api.post('/contact', data);
}
