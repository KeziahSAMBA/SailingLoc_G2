const GENERIC_SERVER_MESSAGE = 'Une erreur interne est survenue.';

function logInternalError(req, error) {
  const summary = {
    method: req.method,
    path: req.path,
    error: error?.name || 'InternalError',
    code: error?.code || undefined,
  };
  console.error('[request-error]', summary);
  if (process.env.NODE_ENV !== 'production' && error?.stack) {
    console.error(error.stack);
  }
}

// Certains contrôleurs historiques répondent eux-mêmes aux exceptions. Cette
// enveloppe empêche malgré tout qu'un message Prisma, Stripe ou système soit
// renvoyé au client lorsqu'il s'agit d'une erreur 5xx.
export function safeErrorResponses(req, res, next) {
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500) {
      logInternalError(req, body instanceof Error ? body : null);
      return sendJson({ message: GENERIC_SERVER_MESSAGE });
    }
    return sendJson(body);
  };
  next();
}

export function secureErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Corps de requête trop volumineux.' });
  }
  if (err instanceof SyntaxError && err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Corps JSON invalide.' });
  }

  const status = Number(err?.status);
  if (status >= 400 && status < 500) {
    return res.status(status).json({ message: err.message || 'Requête invalide.' });
  }

  logInternalError(req, err);
  return res.status(500).json({ message: GENERIC_SERVER_MESSAGE });
}
