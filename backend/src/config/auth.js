// Paramètres de validation des jetons d'accès.
// Ils sont volontairement stables et ne sont jamais dérivés d'une donnée de
// la requête : changer le secret JWT reste nécessaire pour isoler un
// environnement, tandis que l'issuer et l'audience identifient l'API et son
// client légitime.
export const JWT_ALGORITHM = 'HS256';
export const JWT_ISSUER = 'sailingloc-api';
export const JWT_AUDIENCE = 'sailingloc-web';
export const ACCESS_TOKEN_TTL = '15m';
