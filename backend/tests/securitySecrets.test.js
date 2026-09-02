import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import { validateConfig } from '../src/config/appConfig.js';
import { isProtectedDeployment } from '../src/config/deploymentProtection.js';
import { enforceSeedPolicy } from '../prisma/seedPolicy.js';

const validProductionConfig = {
  NODE_ENV: 'production',
  DEPLOYMENT_ENV: 'production',
  DATABASE_URL: 'postgresql://db.internal/sailingloc',
  JWT_SECRET: 'v3ry-long-random-production-secret-value-123',
  FILE_ENCRYPTION_KEY: 'a'.repeat(64),
  APP_URL: 'https://app.sailingloc.example',
  PUBLIC_API_URL: 'https://api.sailingloc.example',
  STRIPE_SECRET_KEY: 'sk_live_51productionKey123',
  STRIPE_WEBHOOK_SECRET: 'whsec_productionWebhook123',
  EMAIL_HOST: 'smtp.example.test',
  EMAIL_IGNORE_TLS: false,
  MAILGUN_API_KEY: '',
  MAILGUN_DOMAIN: '',
};

describe('production configuration', () => {
  it('accepts a complete production configuration', () => {
    expect(validateConfig(validProductionConfig, 'production')).toBe(validProductionConfig);
  });

  it('requires critical secrets instead of accepting insecure defaults', () => {
    expect(() =>
      validateConfig(
        { ...validProductionConfig, JWT_SECRET: '', FILE_ENCRYPTION_KEY: '' },
        'production'
      )
    ).toThrow(/JWT_SECRET.*obligatoire/);

    expect(() =>
      validateConfig({ ...validProductionConfig, JWT_SECRET: 'change-me' }, 'production')
    ).toThrow(/JWT_SECRET/);
  });

  it('rejects invalid encryption keys in production', () => {
    expect(() =>
      validateConfig({ ...validProductionConfig, FILE_ENCRYPTION_KEY: 'not-a-key' }, 'production')
    ).toThrow(/64 caractères hexadécimaux/);
  });

  it('accepts a test Stripe key for a staging deployment running the production runtime', () => {
    const stagingConfig = {
      ...validProductionConfig,
      DEPLOYMENT_ENV: 'staging',
      STRIPE_SECRET_KEY: 'sk_test_51stagingKey123',
    };

    expect(validateConfig(stagingConfig, 'production')).toBe(stagingConfig);
  });

  it('rejects a live Stripe key for a staging deployment', () => {
    expect(() =>
      validateConfig({ ...validProductionConfig, DEPLOYMENT_ENV: 'staging' }, 'production')
    ).toThrow(/Stripe test/);
  });

  it('accepts a live Stripe key for a production deployment', () => {
    expect(validateConfig(validProductionConfig, 'production')).toBe(validProductionConfig);
  });

  it('accepts a test Stripe key for a production deployment', () => {
    const demoConfig = {
      ...validProductionConfig,
      STRIPE_SECRET_KEY: 'sk_test_51stagingKey123',
    };

    expect(validateConfig(demoConfig, 'production')).toBe(demoConfig);
  });

  it('rejects a malformed Stripe key for a production deployment', () => {
    expect(() =>
      validateConfig(
        { ...validProductionConfig, STRIPE_SECRET_KEY: 'pk_test_51stagingKey123' },
        'production'
      )
    ).toThrow(/sk_live_ ou sk_test_/);
  });

  it('requires a separate public backend origin for uploaded assets', () => {
    expect(() =>
      validateConfig({ ...validProductionConfig, PUBLIC_API_URL: '' }, 'production')
    ).toThrow(/PUBLIC_API_URL.*obligatoire/);

    expect(() =>
      validateConfig(
        { ...validProductionConfig, PUBLIC_API_URL: 'http://localhost:4000' },
        'production'
      )
    ).toThrow(/PUBLIC_API_URL.*HTTPS/);
  });

  it('applique une validation stricte d origine identique au constructeur d URL', () => {
    expect(
      validateConfig(
        { ...validProductionConfig, PUBLIC_API_URL: 'https://api.sailingloc.example/' },
        'production'
      )
    ).toBeDefined();

    for (const PUBLIC_API_URL of [
      'https://api.sailingloc.example/api',
      'https://user:pass@api.sailingloc.example',
      'https://api.sailingloc.example?source=host',
      'https://api.sailingloc.example#fragment',
      'https://[::1]:4000',
      'https://0.0.0.0:4000',
      'https://127.0.0.2:4000',
      'https://[::ffff:127.0.0.1]:4000',
      'https://[::ffff:7f00:1]:4000',
      'https://localhost.:4000',
    ]) {
      expect(() =>
        validateConfig({ ...validProductionConfig, PUBLIC_API_URL }, 'production')
      ).toThrow(/PUBLIC_API_URL/);
    }
  });
});

describe('deployment configuration boundaries', () => {
  it('rejects unknown runtime environments instead of falling back to development', () => {
    expect(() => validateConfig(validProductionConfig, 'qa')).toThrow(/NODE_ENV/);
  });

  it('requires an explicit deployment target in a strict runtime', () => {
    const { DEPLOYMENT_ENV: _deploymentEnvironment, ...withoutDeployment } = validProductionConfig;
    expect(() => validateConfig(withoutDeployment, 'production')).toThrow(/DEPLOYMENT_ENV/);
  });

  it('rejects an unknown deployment target in a strict runtime', () => {
    expect(() =>
      validateConfig({ ...validProductionConfig, DEPLOYMENT_ENV: 'qa' }, 'production')
    ).toThrow(/DEPLOYMENT_ENV.*staging.*production/);
  });

  it('accepts the exact Railway environment name as a migration fallback', () => {
    const { DEPLOYMENT_ENV: _deploymentEnvironment, ...legacyRailwayConfig } = {
      ...validProductionConfig,
      STRIPE_SECRET_KEY: 'sk_test_51stagingKey123',
      RAILWAY_ENVIRONMENT_NAME: 'staging',
    };

    expect(validateConfig(legacyRailwayConfig, 'production')).toBe(legacyRailwayConfig);
  });

  it('rejects conflicting explicit and Railway deployment targets', () => {
    expect(() =>
      validateConfig(
        {
          ...validProductionConfig,
          DEPLOYMENT_ENV: 'staging',
          STRIPE_SECRET_KEY: 'sk_test_51stagingKey123',
          RAILWAY_ENVIRONMENT_NAME: 'production',
        },
        'production'
      )
    ).toThrow(/Railway/);
  });

  it('rejects a production deployment target with the legacy staging runtime', () => {
    expect(() =>
      validateConfig(
        {
          ...validProductionConfig,
          NODE_ENV: 'staging',
          DEPLOYMENT_ENV: 'production',
        },
        'staging'
      )
    ).toThrow(/NODE_ENV=staging.*DEPLOYMENT_ENV=production/);
  });

  it('rejects contradictory Railway fallback variables', () => {
    expect(() =>
      validateConfig(
        {
          ...validProductionConfig,
          DEPLOYMENT_ENV: 'staging',
          STRIPE_SECRET_KEY: 'sk_test_51stagingKey123',
          RAILWAY_ENVIRONMENT_NAME: 'staging',
          RAILWAY_ENVIRONMENT: 'production',
        },
        'production'
      )
    ).toThrow(/RAILWAY_ENVIRONMENT_NAME.*RAILWAY_ENVIRONMENT.*contradictoires/);
  });

  it('rejects disabled email TLS in staging as well as production', () => {
    expect(() =>
      validateConfig(
        {
          ...validProductionConfig,
          NODE_ENV: 'staging',
          DEPLOYMENT_ENV: 'staging',
          STRIPE_SECRET_KEY: 'sk_test_stagingKey123',
          EMAIL_IGNORE_TLS: true,
        },
        'staging'
      )
    ).toThrow(/EMAIL_IGNORE_TLS/);
  });

  it('rejects the legacy cleartext file switch in staging and production', () => {
    for (const environment of ['staging', 'production']) {
      expect(() =>
        validateConfig(
          {
            ...validProductionConfig,
            NODE_ENV: environment,
            ALLOW_LEGACY_CLEAR_FILE_READ: 'true',
          },
          environment
        )
      ).toThrow(/ALLOW_LEGACY_CLEAR_FILE_READ/);
    }
  });

  it('keeps explicit legacy cleartext compatibility available in development and tests', () => {
    for (const environment of ['development', 'test']) {
      const config = validateConfig(
        {
          ...validProductionConfig,
          NODE_ENV: environment,
          DEPLOYMENT_ENV: undefined,
          ALLOW_LEGACY_CLEAR_FILE_READ: 'true',
        },
        environment
      );
      expect(config.ALLOW_LEGACY_CLEAR_FILE_READ).toBe('true');
    }
  });
});

describe('demonstration seed policy', () => {
  it('blocks the seed and destructive force mode in production', () => {
    expect(enforceSeedPolicy({ NODE_ENV: 'production', SEED_FORCE: 'false' })).toMatchObject({
      allowed: false,
      environment: 'production',
    });

    expect(() => enforceSeedPolicy({ NODE_ENV: 'production', SEED_FORCE: 'true' })).toThrow(
      /SEED_FORCE/
    );
  });

  it('allows fixtures only for development and test environments', () => {
    expect(enforceSeedPolicy({ NODE_ENV: 'development', SEED_FORCE: 'true' })).toMatchObject({
      allowed: true,
      environment: 'development',
    });
    expect(() => enforceSeedPolicy({ NODE_ENV: 'qa', SEED_FORCE: 'true' })).toThrow(/SEED_FORCE/);
  });

  it.each(['staging', 'production'])(
    'blocks the seed when DEPLOYMENT_ENV=%s even if NODE_ENV is development',
    (deploymentEnvironment) => {
      expect(
        enforceSeedPolicy({
          NODE_ENV: 'development',
          DEPLOYMENT_ENV: deploymentEnvironment,
          SEED_FORCE: 'false',
        })
      ).toMatchObject({ allowed: false, environment: deploymentEnvironment });
    }
  );

  it('fails closed for an unknown explicit deployment target outside initConfig', () => {
    expect(
      enforceSeedPolicy({ NODE_ENV: 'development', DEPLOYMENT_ENV: 'qa', SEED_FORCE: 'false' })
    ).toMatchObject({ allowed: false, environment: 'qa' });
  });

  it.each([
    ['NODE_ENV=qa', { NODE_ENV: 'qa' }],
    ['RAILWAY_ENVIRONMENT_NAME=qa', { NODE_ENV: 'development', RAILWAY_ENVIRONMENT_NAME: 'qa' }],
    ['DEPLOYMENT_ENV=qa', { NODE_ENV: 'development', DEPLOYMENT_ENV: 'qa' }],
  ])('fails closed for the ambiguous marker %s', (_label, environment) => {
    expect(isProtectedDeployment(environment)).toBe(true);
    expect(enforceSeedPolicy({ ...environment, SEED_FORCE: 'false' })).toMatchObject({
      allowed: false,
    });
  });

  it('allows an unmarked local runtime only in explicit development or test mode', () => {
    expect(isProtectedDeployment({})).toBe(false);
    expect(isProtectedDeployment({ NODE_ENV: 'development' })).toBe(false);
    expect(isProtectedDeployment({ NODE_ENV: 'test' })).toBe(false);
  });

  it('guards every auxiliary demonstration-data script with the shared seed policy', () => {
    for (const scriptPath of ['../prisma/addMissingReviews.js', '../prisma/seedCronTestData.js']) {
      const source = fs.readFileSync(new URL(scriptPath, import.meta.url), 'utf8');
      expect(source).toContain("import { enforceSeedPolicy } from './seedPolicy.js';");
      expect(source).toContain('const seedPolicy = enforceSeedPolicy();');
      expect(source).toContain('if (!seedPolicy.allowed)');
    }
  });
});
