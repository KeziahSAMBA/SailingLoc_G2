/**
 * Small, dependency-free input helpers shared by API services.
 *
 * Keeping these checks at the service boundary is intentional: controllers,
 * jobs and tests can call a service directly without bypassing the same
 * limits enforced for HTTP requests.
 */

export const MAX_LIST_ITEMS = 500;

export function invalidInput(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

/**
 * Parse page / pageSize query parameters into Prisma's skip / take.
 *
 * The default is deliberately small enough to keep accidental full-table scans
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
