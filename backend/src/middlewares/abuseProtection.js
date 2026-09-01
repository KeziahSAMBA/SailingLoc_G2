import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// The project does not include a Redis client/store. The built-in store is
// intentionally used as a safe single-process fallback; adding a distributed
// store here without a real Redis connection would make limits fail open.
const keyGenerator = (req) => {
  const userId = req.user?.id_user;
  if (Number.isSafeInteger(userId) && userId > 0) return `user:${userId}`;
  return `ip:${ipKeyGenerator(req.ip || 'unknown')}`;
};

export function createAbuseLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    message: { message },
  });
}

// Expensive state-changing actions are deliberately bounded separately so a
// burst of messages or uploads cannot consume the booking budget (and vice
// versa). Limits are per authenticated user, or per normalized IP for public
// routes.
export const bookingCreateLimiter = createAbuseLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Trop de demandes de réservation. Réessayez dans quelques minutes.',
});

export const bookingActionLimiter = createAbuseLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Trop d’actions sur les réservations. Réessayez dans quelques minutes.',
});

export const messageLimiter = createAbuseLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: 'Trop de messages envoyés. Réessayez dans quelques minutes.',
});

export const uploadLimiter = createAbuseLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Trop de fichiers envoyés. Réessayez dans quelques minutes.',
});
