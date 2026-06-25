import api from './api.js';

export function fetchPorts() {
  return api.get('/ports');
}
