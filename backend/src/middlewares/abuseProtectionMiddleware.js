import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const commonOptions = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

export function createRequestLimiter({
  windowMs,
  limit,
  message = 'Trop de requêtes. Réessayez dans quelques minutes.',
  skip,
  keyGenerator,
}) {
  return rateLimit({
    ...commonOptions,
    windowMs,
    limit,
    skip,
    keyGenerator,
    message: { message },
  });
}

export const apiLimiter = createRequestLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 500,
});

export const mutationLimiter = createRequestLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  message: 'Trop d’actions effectuées. Réessayez dans quelques minutes.',
});

export const registerLimiter = createRequestLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 5,
  message: 'Trop de tentatives. Réessayez dans quelques minutes.',
});

export const resendLimiter = createRequestLimiter({
  windowMs: 5 * 60 * 1000,
  limit: 3,
  message: 'Trop de renvois. Réessayez dans quelques minutes.',
});

export const loginLimiter = createRequestLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
});

export const adminLoginLimiter = createRequestLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: 'Trop de tentatives. Réessayez dans quelques minutes.',
});

export const loginAccountLimiter = createRequestLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `account:${String(req.body?.email || '').trim().toLowerCase()}`,
  message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
});

export const refreshLimiter = createRequestLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  message: 'Trop de renouvellements de session. Reconnectez-vous dans quelques minutes.',
});

export const forgotPasswordLimiter = createRequestLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  message: 'Trop de demandes. Réessayez dans quelques minutes.',
});

export const resetPasswordLimiter = createRequestLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: 'Trop de tentatives. Réessayez dans quelques minutes.',
});

export const contactLimiter = createRequestLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Trop de messages envoyés. Réessayez dans une heure.',
});

export const messageSendLimiter = createRequestLimiter({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) =>
    req.user?.id_user ? `user:${req.user.id_user}` : `ip:${ipKeyGenerator(req.ip)}`,
  message: 'Trop de messages envoyés. Patientez une minute.',
});
