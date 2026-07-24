import api from './api.js';

// Conversations de l'utilisateur connecté (interlocuteur + dernier message + non-lus).
export function getConversations() {
  return api.get('/messages/conversations');
}

// Fil de discussion avec un interlocuteur (marque les messages reçus comme lus).
export function getThread(idUser) {
  return api.get(`/messages/with/${idUser}`);
}

// Envoie un message à un destinataire.
export function sendMessage(idReceiver, content) {
  return api.post('/messages', { id_receiver: idReceiver, content });
}

// Nombre total de messages non lus (badge du header).
export function getUnreadCount() {
  return api.get('/messages/unread');
}

// Modifie le contenu d'un de mes messages.
export function updateMessage(idMessage, content) {
  return api.patch(`/messages/${idMessage}`, { content });
}

// Supprime un message : scope 'all' (pour tout le monde) ou 'me' (pour moi).
export function deleteMessage(idMessage, scope) {
  return api.delete(`/messages/${idMessage}`, { params: { scope } });
}

// Ouvre la conversation support : le serveur choisit l'admin (au hasard au
// premier contact, avec message d'accueil automatique).
export function contactSupport() {
  return api.post('/messages/support');
}

export function contactBoatOwner(idBoat) {
  return api.post(`/messages/boat/${idBoat}/contact`);
}

// L'admin marque la demande support d'un utilisateur comme traitée.
export function resolveSupport(idUser) {
  return api.post(`/messages/support/${idUser}/resolve`);
}
