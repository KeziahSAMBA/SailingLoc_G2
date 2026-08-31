import { afterAll, afterEach, describe, expect, it, jest } from '@jest/globals';

const createTransport = jest.fn((options) => ({ options }));

jest.unstable_mockModule('nodemailer', () => ({
  default: { createTransport },
}));

const { createTransporter } = await import('../src/services/emailService.js');

const originalEnvironment = { ...process.env };
const CONFIG_KEYS = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'FILE_ENCRYPTION_KEY',
  'APP_URL',
  'PUBLIC_API_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_SECURE',
  'EMAIL_IGNORE_TLS',
  'EMAIL_USER',
  'EMAIL_PASS',
  'MAILGUN_API_KEY',
  'MAILGUN_DOMAIN',
  'MAILGUN_HOST',
  'CORS_ORIGINS',
];

function configureEnvironment(values) {
  for (const key of CONFIG_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

function restoreEnvironment() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnvironment)) delete process.env[key];
  }
  Object.assign(process.env, originalEnvironment);
}

const stagingEnvironment = {
  NODE_ENV: 'staging',
  DATABASE_URL: 'postgresql://db.internal/sailingloc',
  JWT_SECRET: 'v3ry-long-random-staging-secret-value-123',
  FILE_ENCRYPTION_KEY: 'a'.repeat(64),
  APP_URL: 'https://staging.sailingloc.example',
  PUBLIC_API_URL: 'https://api.sailingloc.example',
  EMAIL_HOST: 'smtp.example.test',
  EMAIL_IGNORE_TLS: 'false',
  MAILGUN_API_KEY: '',
  MAILGUN_DOMAIN: '',
};

afterEach(() => {
  createTransport.mockClear();
  restoreEnvironment();
});

afterAll(() => {
  restoreEnvironment();
});

describe('SMTP transport security', () => {
  it('requires STARTTLS on staging SMTP even when EMAIL_SECURE is misconfigured', () => {
    configureEnvironment({
      ...stagingEnvironment,
      EMAIL_PORT: '587',
      EMAIL_SECURE: 'true',
    });

    createTransporter();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.test',
        port: 587,
        secure: false,
        requireTLS: true,
        ignoreTLS: false,
      })
    );
  });

  it('uses implicit TLS on production port 465 and still requires TLS', () => {
    configureEnvironment({
      ...stagingEnvironment,
      NODE_ENV: 'production',
      APP_URL: 'https://app.sailingloc.example',
      STRIPE_SECRET_KEY: 'sk_live_51productionKey123',
      STRIPE_WEBHOOK_SECRET: 'whsec_productionWebhook123',
      EMAIL_PORT: '465',
      EMAIL_SECURE: 'false',
    });

    createTransporter();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        port: 465,
        secure: true,
        requireTLS: true,
        ignoreTLS: false,
      })
    );
  });

  it.each(['development', 'test'])('preserves local TLS overrides in %s', (environment) => {
    configureEnvironment({
      NODE_ENV: environment,
      APP_URL: 'http://localhost:5173',
      EMAIL_HOST: 'localhost',
      EMAIL_PORT: '1025',
      EMAIL_SECURE: 'true',
      EMAIL_IGNORE_TLS: 'true',
    });

    createTransporter();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'localhost',
        port: 1025,
        secure: true,
        ignoreTLS: true,
      })
    );
    expect(createTransport.mock.calls[0][0]).not.toHaveProperty('requireTLS');
  });
});
