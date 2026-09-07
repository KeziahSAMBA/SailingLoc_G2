import api from './api.js';

// Fiche publique d'un propriétaire : identité, badges de vérification, bateaux
// publiés et avis reçus. Consultable sans compte.
export function getOwnerProfile(id) {
  return api.get(`/owners/${id}`);
}
