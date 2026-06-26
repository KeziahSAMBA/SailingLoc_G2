import api from './api.js';

export function fetchBoats() {
  return api.get('/boats');
}

export function fetchBoatsByType() {
  return api.get('/boats/by-type');
}

export function createBoat(formData) {
  // On laisse axios/le navigateur poser le Content-Type (avec le boundary multipart).
  // `undefined` écrase le défaut 'application/json' de l'instance api.
  return api.post('/boats', formData, {
    headers: { 'Content-Type': undefined },
  });
}
