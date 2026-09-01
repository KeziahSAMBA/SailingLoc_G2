import {
  isProtectedDeployment,
  protectedDeploymentLabel,
} from '../src/config/deploymentProtection.js';

/**
 * Decide whether the demonstration seed may run. Kept independent from
 * Prisma so deployment checks can be tested without connecting to a database.
 */
export function getSeedEnvironment(env = process.env) {
  return protectedDeploymentLabel(env);
}

export function isSeedForced(env = process.env) {
  return (
    String(env.SEED_FORCE || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

export function enforceSeedPolicy(env = process.env) {
  const environment = getSeedEnvironment(env);
  const force = isSeedForced(env);
  const isDeployment = isProtectedDeployment(env);

  if (isDeployment) {
    if (force) {
      throw new Error('[seed] SEED_FORCE est interdit dans un environnement de déploiement.');
    }
    return { allowed: false, environment };
  }

  if (force && !['development', 'test'].includes(environment)) {
    throw new Error('[seed] SEED_FORCE est autorisé uniquement en développement ou test.');
  }

  return { allowed: true, environment };
}
