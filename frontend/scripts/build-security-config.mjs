import {
  isProductionLike,
  validatedApiOrigin,
} from '../src/security/apiOrigin.js';

export { isProductionLike, validatedApiOrigin };

export const API_ORIGIN_PLACEHOLDER = '__SAILINGLOC_API_ORIGIN__';

function validateRenderedOrigin(origin) {
  let parsed;
  try {
    parsed = new URL(origin);
    if (validatedApiOrigin(`${origin}/api`, { environment: 'production' }) !== origin) {
      throw new Error('non canonical origin');
    }
  } catch {
    throw new Error('Origine CSP de l’API invalide.');
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.origin !== origin ||
    parsed.pathname !== '/' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    /[\s;"'\\]/.test(origin)
  ) {
    throw new Error('Origine CSP de l’API invalide.');
  }
}

export function renderNginxConfig(template, apiOrigin) {
  validateRenderedOrigin(apiOrigin);
  const source = String(template || '');
  const placeholderCount = source.split(API_ORIGIN_PLACEHOLDER).length - 1;
  if (placeholderCount !== 2) {
    throw new Error('Le gabarit Nginx doit contenir exactement deux origines API.');
  }
  return source.replaceAll(API_ORIGIN_PLACEHOLDER, apiOrigin);
}
