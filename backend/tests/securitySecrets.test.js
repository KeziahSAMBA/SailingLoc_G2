import { describe, expect, it } from '@jest/globals';
import { validateConfig } from '../src/config/appConfig.js';
import { enforceSeedPolicy } from '../prisma/seedPolicy.js';

const validProductionConfig = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://db.internal/sailingloc',
  JWT_SECRET: 'v3ry-long-random-production-secret-value-123',
  FILE_ENCRYPTION_KEY: 'a'.repeat(64),
  APP_URL: 'https://app.sailingloc.example',
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

  it('rejects development Stripe keys and invalid encryption keys in production', () => {
    expect(() =>
      validateConfig(
        {
          ...validProductionConfig,
          STRIPE_SECRET_KEY: 'sk_test_only',
          FILE_ENCRYPTION_KEY: 'not-a-key',
        },
        'production'
      )
    ).toThrow(/Stripe live|64 caractères hexadécimaux/);
  });
});

describe('deployment configuration boundaries', () => {
  it('rejects unknown runtime environments instead of falling back to development', () => {
    expect(() => validateConfig(validProductionConfig, 'qa')).toThrow(/NODE_ENV/);
  });

  it('rejects disabled email TLS in staging as well as production', () => {
    expect(() =>
      validateConfig(
        {
          ...validProductionConfig,
          NODE_ENV: 'staging',
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
});
