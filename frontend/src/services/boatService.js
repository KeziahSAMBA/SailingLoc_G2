import api from './api.js';

export function fetchBoats() {
  return api.get('/boats');
}

export function createBoat(formData) {
  return api.post('/boats', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
