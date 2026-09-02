const EXPLICITLY_SAFE_LOCAL_RUNTIMES = new Set(['development', 'test']);

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function deploymentSignals(env = process.env) {
  return {
    runtimeEnvironment: normalize(env.NODE_ENV),
    deploymentEnvironment: normalize(env.DEPLOYMENT_ENV),
    railwayEnvironmentName: normalize(env.RAILWAY_ENVIRONMENT_NAME),
    railwayEnvironment: normalize(env.RAILWAY_ENVIRONMENT),
    railwayProjectId: String(env.RAILWAY_PROJECT_ID || '').trim(),
  };
}

// This guard is deliberately more conservative than initConfig validation.
// Scripts and low-level file helpers may run without initConfig, so any
// explicit DEPLOYMENT_ENV (including an invalid value), any Railway marker or
// any NODE_ENV other than an explicitly safe local mode must fail closed.
export function isProtectedDeployment(env = process.env) {
  const signals = deploymentSignals(env);
  return (
    Boolean(signals.deploymentEnvironment) ||
    Boolean(signals.railwayProjectId) ||
    Boolean(signals.railwayEnvironmentName) ||
    Boolean(signals.railwayEnvironment) ||
    (Boolean(signals.runtimeEnvironment) &&
      !EXPLICITLY_SAFE_LOCAL_RUNTIMES.has(signals.runtimeEnvironment))
  );
}

export function protectedDeploymentLabel(env = process.env) {
  const signals = deploymentSignals(env);
  return (
    signals.deploymentEnvironment ||
    signals.runtimeEnvironment ||
    signals.railwayEnvironmentName ||
    signals.railwayEnvironment ||
    (signals.railwayProjectId ? 'railway' : 'development')
  );
}
