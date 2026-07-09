import api from './api.js';
import { cachedRequest } from './requestCache.js';

export function fetchPorts() {
  return cachedRequest('ports', () => api.get('/ports'));
}
