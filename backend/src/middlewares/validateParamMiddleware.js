const MAX_DATABASE_ID = 2_147_483_647;
const POSITIVE_INTEGER = /^[1-9]\d*$/;

export function validatePositiveIdParam(req, res, next, value) {
  const raw = String(value);
  const parsed = Number(raw);

  if (
    !POSITIVE_INTEGER.test(raw) ||
    !Number.isSafeInteger(parsed) ||
    parsed > MAX_DATABASE_ID
  ) {
    return res.status(400).json({ message: 'Identifiant invalide.' });
  }

  return next();
}

export function registerPositiveIdParams(router, names) {
  for (const name of names) {
    router.param(name, validatePositiveIdParam);
  }
}
