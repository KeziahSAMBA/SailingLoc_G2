import { logActivity } from '../services/logService.js';

const BODY_VALUE_MAX = 200;

function snapshotBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const snapshot = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      snapshot[key] = typeof value === 'string' ? value.slice(0, BODY_VALUE_MAX) : value;
    }
  }
  return Object.keys(snapshot).length ? snapshot : null;
}

// Trace une action d'administration. Le log est écrit après coup (res « finish »)
// et seulement si la requête a réussi : pas de trace pour une action rejetée.
export function audit(action, { targetType, targetId, meta, when } = {}) {
  const category = action.split('.')[0];

  return (req, res, next) => {
    const body = snapshotBody(req.body);

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      // Routes ouvertes à plusieurs rôles : `when` limite la trace aux actions admin.
      if (typeof when === 'function' && !when(req)) return;
      logActivity({
        category,
        action,
        actorId: req.user?.id_user,
        actorEmail: req.user?.email,
        actorRole: req.user?.role,
        targetType: targetType || category,
        // Sur une création, l'id n'existe pas dans l'URL : le contrôleur le dépose
        // dans res.locals.auditTargetId.
        targetId:
          typeof targetId === 'function'
            ? targetId(req)
            : req.params.id || res.locals.auditTargetId,
        meta: typeof meta === 'function' ? meta(req) : body,
        ip: req.ip,
      });
    });

    next();
  };
}
