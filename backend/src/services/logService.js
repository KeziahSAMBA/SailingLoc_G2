import prisma from '../config/db.js';

const LEVELS = ['info', 'warning', 'error'];
const ROLES = ['admin', 'proprietaire', 'locataire'];
const MAX_PAGE_SIZE = 100;
const MESSAGE_MAX = 500;
// Jamais stockés dans meta, même si un futur appelant les transmet par erreur.
const SENSITIVE_KEYS = ['password', 'token', 'accessToken', 'refreshToken', 'secret'];

function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.includes(key)) continue;
    if (value === undefined || typeof value === 'function') continue;
    clean[key] = value;
  }
  return Object.keys(clean).length ? clean : null;
}

function truncate(value, max) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

// Volontairement « fire and forget » : une écriture de log qui échoue ne doit
// jamais faire échouer l'action métier qu'elle trace.
export function logActivity({
  level = 'info',
  category,
  action,
  message,
  actorId,
  actorEmail,
  actorRole,
  targetType,
  targetId,
  meta,
  ip,
} = {}) {
  if (!category || !action) return Promise.resolve(null);

  return prisma.activityLog
    .create({
      data: {
        level: LEVELS.includes(level) ? level : 'info',
        category: truncate(category, 50),
        action: truncate(action, 100),
        message: truncate(message, MESSAGE_MAX),
        actor_id: Number.isInteger(actorId) ? actorId : null,
        actor_email: truncate(actorEmail, 255),
        actor_role: truncate(actorRole, 20),
        target_type: truncate(targetType, 50),
        target_id: truncate(targetId, 50),
        meta: sanitizeMeta(meta),
        ip: truncate(ip, 64),
      },
    })
    .catch((err) => {
      console.error('[logs] écriture impossible:', err.message);
      return null;
    });
}

export async function listLogs({
  level,
  category,
  action,
  actor,
  role,
  search,
  from,
  to,
  page,
  pageSize,
} = {}) {
  const where = {};
  if (LEVELS.includes(level)) where.level = level;
  if (category && String(category).trim()) where.category = String(category).trim();
  if (action && String(action).trim()) where.action = String(action).trim();
  if (ROLES.includes(role)) where.actor_role = role;
  if (actor !== undefined && actor !== '' && Number.isInteger(Number(actor))) {
    where.actor_id = Number(actor);
  }
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { actor_email: { contains: s, mode: 'insensitive' } },
      { action: { contains: s, mode: 'insensitive' } },
      { message: { contains: s, mode: 'insensitive' } },
      { target_id: { contains: s, mode: 'insensitive' } },
    ];
  }

  const createdAt = {};
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && !Number.isNaN(fromDate.getTime())) createdAt.gte = fromDate;
  if (toDate && !Number.isNaN(toDate.getTime())) createdAt.lte = toDate;
  if (Object.keys(createdAt).length) where.created_at = createdAt;

  const currentPage = Math.max(1, Number(page) || 1);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || 25));

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (currentPage - 1) * size,
      take: size,
      include: {
        actor: { select: { id_user: true, first_name: true, last_name: true, email: true } },
      },
    }),
  ]);

  return { logs, total, page: currentPage, pageSize: size };
}

// Alimente les listes déroulantes de filtres du back-office.
export async function listLogFilters() {
  const [categories, actions] = await Promise.all([
    prisma.activityLog.findMany({ distinct: ['category'], select: { category: true } }),
    prisma.activityLog.findMany({ distinct: ['action'], select: { action: true } }),
  ]);
  return {
    levels: LEVELS,
    roles: ROLES,
    categories: categories.map((c) => c.category).sort(),
    actions: actions.map((a) => a.action).sort(),
  };
}
