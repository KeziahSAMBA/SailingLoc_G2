/**
 * Small, dependency-free input helpers shared by API services.
 *
 * Keeping these checks at the service boundary is intentional: controllers,
 * jobs and tests can call a service directly without bypassing the same
 * limits enforced for HTTP requests.
 */

export const MAX_LIST_ITEMS = 500;
export const MAX_QUERY_LENGTH = 100;

export function invalidInput(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

/** Parse a decimal positive integer without accepting exponent notation. */
export function parsePositiveId(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!/^[1-9]\d*$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function requirePositiveId(value, label = 'Identifiant') {
  const parsed = parsePositiveId(value);
  if (parsed === null) throw invalidInput(`${label} invalide.`);
  return parsed;
}

/** Only real booleans and their multipart equivalents are accepted. */
export function parseStrictBoolean(value, label = 'Valeur') {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw invalidInput(`${label} doit être un booléen.`);
}

/** Trim and bound a user supplied string, rejecting objects and arrays. */
export function boundedString(value, { label = 'Champ', max = 255, min = 0 } = {}) {
  if (typeof value !== 'string') throw invalidInput(`${label} est invalide.`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) {
    throw invalidInput(`${label} doit contenir entre ${min} et ${max} caractères.`);
  }
  return clean;
}

/** Parse a calendar date exactly in YYYY-MM-DD form (UTC, no normalization). */
export function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    !Number.isFinite(timestamp) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Parse an API page request while bounding both offset and page size.  The
 * default is deliberately small enough to keep accidental full-table scans
 * cheap; callers can still request a later page without changing their
 * existing array response shape.
 */
export function parsePagination({ page, pageSize } = {}, defaultPageSize = 25) {
  const parse = (value, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const text = String(value).trim();
    if (!/^\d+$/.test(text)) return null;
    const parsed = Number(text);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  };
  const currentPage = parse(page, 1);
  const requestedSize = parse(pageSize, defaultPageSize);
  if (currentPage === null || requestedSize === null) {
    throw invalidInput('Pagination invalide.');
  }
  const size = Math.min(MAX_LIST_ITEMS, requestedSize);
  const offset = (currentPage - 1) * size;
  if (!Number.isSafeInteger(offset)) throw invalidInput('Pagination invalide.');
  return { page: currentPage, pageSize: size, skip: offset, take: size };
}
