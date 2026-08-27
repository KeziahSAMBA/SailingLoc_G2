import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  REDACTED_VALUE,
  redactSensitive,
  sanitizeAuditMetadata,
  sanitizeLogText,
} from '../src/utils/privacy.js';
import {
  GENERIC_SERVER_MESSAGE,
  logInternalError,
  publicError,
  sendError,
} from '../src/middlewares/errorSecurityMiddleware.js';
import { buildAppUrl, canonicalAppUrl, publicAssetUrl } from '../src/utils/urlSecurity.js';

describe('privacy and diagnostic safeguards', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('removes control characters and redacts secrets embedded in text', () => {
    const value = sanitizeLogText(
      'forged\r\nrecord password=top-secret Bearer abc123 ?token=opaque&next=/home'
    );

    // eslint-disable-next-line no-control-regex -- assert that untrusted controls are removed
    expect(value).not.toMatch(/[\r\n\u0000-\u001f\u007f]/);
    expect(value).not.toContain('top-secret');
    expect(value).not.toContain('abc123');
    expect(value).not.toContain('opaque');
    expect(value).toContain('password=[REDACTED]');
  });

  it('redacts sensitive keys recursively and handles circular diagnostics', () => {
    const details = {
      password: 'hidden',
      nested: { ACCESS_TOKEN: 'hidden-too', safe: 'kept' },
      safe: 'kept',
    };
    details.circular = details;

    const clean = redactSensitive(details);

    expect(clean.password).toBe(REDACTED_VALUE);
    expect(clean.nested.ACCESS_TOKEN).toBe(REDACTED_VALUE);
    expect(clean.nested.safe).toBe('kept');
    expect(clean.safe).toBe('kept');
    expect(clean.circular).toBe('[CIRCULAR]');
  });

  it('keeps only non-PII allow-listed audit metadata', () => {
    expect(
      sanitizeAuditMetadata({
        name: 'Voilier',
        id_boat: 12,
        isPublished: true,
        reason: 'private explanation',
        email: 'owner@example.test',
        password: 'must not persist',
        arbitrary: 'must not persist',
      })
    ).toEqual({ name: 'Voilier', id_boat: 12, is_published: true });
  });

  it('returns a generic response for server errors while retaining safe client errors', () => {
    const serverError = Object.assign(new Error('Prisma password=secret'), { status: 500 });
    expect(publicError(serverError)).toEqual({
      status: 500,
      body: { message: GENERIC_SERVER_MESSAGE },
    });

    const clientError = Object.assign(new Error('Champ invalide\r\nforged'), { status: 400 });
    expect(publicError(clientError)).toEqual({
      status: 400,
      body: { message: 'Champ invalide  forged' },
    });
  });

  it('logs sanitized diagnostics without exposing secrets or forged lines', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = Object.assign(new Error('password=secret\r\nforged'), {
      status: 500,
      authorization: 'Bearer hidden',
    });

    logInternalError({ method: 'GET', path: '/api/users/me' }, error);

    const line = errorSpy.mock.calls[0][0];
    expect(line).not.toContain('secret');
    expect(line).not.toContain('hidden');
    expect(line).not.toMatch(/[\r\n]/);
  });

  it('normalizes error responses through the adapter', () => {
    const res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    expect(sendError(res, Object.assign(new Error('database details'), { status: 503 }))).toBe(res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ message: 'Service temporairement indisponible.' });
  });

  it('builds links from the configured canonical origin, never the request Host header', () => {
    expect(canonicalAppUrl('https://app.example.test/base/', 'production')).toBe(
      'https://app.example.test/base'
    );
    expect(() => canonicalAppUrl('https://app.example.test/base?host=evil', 'production')).toThrow(
      /query string/
    );
    expect(() => canonicalAppUrl('https://user:pass@app.example.test', 'production')).toThrow(
      /identifiants/
    );

    const previousEnvironment = process.env.NODE_ENV;
    const previousAppUrl = process.env.APP_URL;
    process.env.NODE_ENV = 'test';
    process.env.APP_URL = 'https://app.example.test/base';
    try {
      expect(buildAppUrl('/reset-password', { token: 'a&b' })).toBe(
        'https://app.example.test/base/reset-password?token=a%26b'
      );
      expect(publicAssetUrl('avatars', 'safe-file.png')).toBe(
        'https://app.example.test/base/uploads/avatars/safe-file.png'
      );
    } finally {
      if (previousEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnvironment;
      if (previousAppUrl === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previousAppUrl;
    }
  });
});
