// Shared privacy helpers for request diagnostics and audit metadata.
//
// Values reaching this module are untrusted: they can originate in request
// bodies, headers, third-party SDK errors, or user-controlled names.  Keep all
// transformations bounded and deterministic so logging an error can never
// become a second injection or data-leak channel.

export const REDACTED_VALUE = '[REDACTED]';

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 6;
const MAX_ENTRIES = 100;
const MAX_ARRAY_ITEMS = 50;

// Normalize camelCase and punctuation before matching.  This catches
// accessToken, access_token, ACCESS-TOKEN, and similar spellings alike.
function normalizedKey(key) {
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

const SENSITIVE_KEY_RE =
  /(^|_)(?:password|passwd|pwd|token|secret|authorization|cookie|api_key|client_secret|private_key|access_token|refresh_token|signature|credential)(_|$)/i;

export function isSensitiveKey(key) {
  return SENSITIVE_KEY_RE.test(normalizedKey(key));
}

// CR/LF and the rest of the C0 range must not be allowed to create forged log
// records or response headers.  Keep ordinary Unicode text intact for useful
// diagnostics while replacing control characters with a visible separator.
export function sanitizeLogText(value, maxLength = MAX_STRING_LENGTH) {
  if (value === undefined || value === null) return null;
  let text = String(value);
  // eslint-disable-next-line no-control-regex -- deliberately strip C0 controls from untrusted log text
  text = text.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ');

  // Secrets can occur inside an SDK error string instead of under a named
  // object key.  Redact the common header/query/assignment forms as well.
  text = text
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [REDACTED]')
    .replace(
      /((?:password|passwd|pwd|token|secret|authorization|cookie|api[-_ ]?key|client[-_ ]?secret|signature)\s*[:=]\s*)[^\s,;&]+/gi,
      '$1[REDACTED]'
    )
    .replace(
      /([?&](?:token|access_token|refresh_token|code|secret|signature)=)[^&#\s]*/gi,
      '$1[REDACTED]'
    );

  text = text.trim();
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

function sanitizePrimitive(value) {
  if (typeof value === 'string') return sanitizeLogText(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value);
  if (['number', 'boolean'].includes(typeof value) || value === null) return value;
  return undefined;
}

// Recursively redact values before they reach a persistent activity log or a
// process log.  The WeakSet also makes this safe for accidental circular
// objects passed by an SDK.
export function redactSensitive(value, options = {}) {
  const maxDepth = Number.isInteger(options.maxDepth) ? options.maxDepth : MAX_DEPTH;
  const maxEntries = Number.isInteger(options.maxEntries) ? options.maxEntries : MAX_ENTRIES;
  const maxArrayItems = Number.isInteger(options.maxArrayItems)
    ? options.maxArrayItems
    : MAX_ARRAY_ITEMS;
  const seen = new WeakSet();

  function visit(current, depth) {
    const primitive = sanitizePrimitive(current);
    if (primitive !== undefined) return primitive;
    if (typeof current === 'function' || typeof current === 'symbol') return undefined;
    if (current === undefined) return undefined;
    if (depth >= maxDepth) return '[TRUNCATED]';

    if (current instanceof Date)
      return Number.isNaN(current.getTime()) ? null : current.toISOString();
    if (current instanceof Error) {
      return {
        name: sanitizeLogText(current.name, 100),
        message: sanitizeLogText(current.message),
        ...(current.code ? { code: sanitizeLogText(current.code, 100) } : {}),
        ...(current.stack ? { stack: sanitizeLogText(current.stack, 2000) } : {}),
      };
    }
    if (Buffer.isBuffer(current)) return `[Buffer ${current.length} bytes]`;
    if (typeof current !== 'object') return sanitizeLogText(current);
    if (seen.has(current)) return '[CIRCULAR]';
    seen.add(current);

    if (Array.isArray(current)) {
      return current.slice(0, maxArrayItems).map((item) => visit(item, depth + 1));
    }

    const clean = {};
    for (const [key, child] of Object.entries(current).slice(0, maxEntries)) {
      if (isSensitiveKey(key)) {
        clean[key] = REDACTED_VALUE;
        continue;
      }
      const sanitized = visit(child, depth + 1);
      if (sanitized !== undefined) clean[key] = sanitized;
    }
    return clean;
  }

  return visit(value, 0);
}

// Request snapshots are deliberately an allow-list.  A deny-list is brittle:
// a new password-like field would silently become PII in the audit table.
const AUDIT_SAFE_KEYS = new Set([
  'name',
  'type',
  'status',
  'action',
  'scope',
  'draft',
  'is_published',
  'id_boat',
  'id_booking',
  'id_document',
  'id_image',
  'id_port',
  'id_review',
  'id_user',
  'start_date',
  'end_date',
  'refund_percent',
  'refund_commission',
]);

const AUDIT_PII_KEYS = new Set([
  'email',
  'phone',
  'address',
  'first_name',
  'last_name',
  'reason',
  'content',
  'comment',
  'description',
  'user_agent',
]);

export function sanitizeAuditMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const safe = {};
  for (const [key, child] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    if (AUDIT_PII_KEYS.has(normalized) || !AUDIT_SAFE_KEYS.has(normalized)) continue;
    const sanitized = redactSensitive(child, { maxDepth: 3, maxEntries: 20, maxArrayItems: 10 });
    if (sanitized !== undefined) safe[normalized] = sanitized;
  }
  return Object.keys(safe).length ? safe : null;
}

export function sanitizePublicBody(body) {
  const sanitized = redactSensitive(body, { maxDepth: 5, maxEntries: 50, maxArrayItems: 20 });
  return sanitized === undefined ? {} : sanitized;
}

// Keep the useful account identity in audit rows while ensuring a malformed
// value cannot inject a newline or grow the column unexpectedly.  Account
// anonymisation remains responsible for removing the address after retention.
export function sanitizeAuditEmail(email) {
  const value = sanitizeLogText(email, 255);
  return value && value.includes('@') ? value : value || null;
}

export function sanitizeAuditIp(ip) {
  return sanitizeLogText(ip, 64);
}

export function serializeSanitizedLog(value) {
  let serialized;
  try {
    const redacted = redactSensitive(value, {
      maxDepth: 6,
      maxEntries: 100,
      maxArrayItems: 50,
    });
    serialized = JSON.stringify(redacted);
  } catch {
    serialized = JSON.stringify({ error: '[UNSERIALIZABLE]' });
  }
  const text = String(serialized || 'null');
  return sanitizeLogText(text, text.length) || 'null';
}

// Background jobs and best-effort integrations do not have an Express
// request context, but their errors still come from external systems or
// untrusted input. Keep those diagnostics on the same bounded, redacted path
// as request errors.
export function logSanitizedError(label, error, level = 'error') {
  const safeLabel = sanitizeLogText(label, 100) || 'error';
  const payload = redactSensitive(error, { maxDepth: 4, maxEntries: 40 });
  // JSON.stringify may preserve U+2028/U+2029 and object keys are not covered
  // by the recursive value sanitizer. Sanitize the complete line immediately
  // before handing it to the writer so one diagnostic can never forge records.
  // JSON.stringify is also applied to the label before restoring the historic
  // `[label] payload` format. The serialized value is the only label fragment
  // interpolated into the record, so static analysis can verify the barrier.
  const safeLabelJson = JSON.stringify(safeLabel);
  const safeLabelText = safeLabelJson.slice(1, -1);
  const safeJson = serializeSanitizedLog({ error: payload });
  const safeLine =
    sanitizeLogText(`[${safeLabelText}] ${safeJson}`, MAX_STRING_LENGTH * 5) || 'null';
  if (level === 'warn') console.warn(safeLine);
  else console.error(safeLine);
}
