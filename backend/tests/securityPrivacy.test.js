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
import {
  buildAppUrl,
  canonicalApiUrl,
  canonicalAppUrl,
  publicAssetUrl,
  validatePublicImageUrl,
} from '../src/utils/urlSecurity.js';

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
    const previousPublicApiUrl = process.env.PUBLIC_API_URL;
    process.env.NODE_ENV = 'test';
    process.env.APP_URL = 'https://app.example.test/base';
    process.env.PUBLIC_API_URL = 'https://api.example.test';
    try {
      expect(buildAppUrl('/reset-password', { token: 'a&b' })).toBe(
        'https://app.example.test/base/reset-password?token=a%26b'
      );
      expect(canonicalApiUrl()).toBe('https://api.example.test');
      expect(canonicalApiUrl('http://[::1]:4000/', 'development')).toBe('http://[::1]:4000');
      expect(canonicalApiUrl('http://[::ffff:127.0.0.1]:4000/', 'development')).toBe(
        'http://[::ffff:7f00:1]:4000'
      );
      expect(publicAssetUrl('avatars', 'safe-file.png')).toBe(
        'https://api.example.test/uploads/avatars/safe-file.png'
      );
      expect(publicAssetUrl('boats', 'new-boat.webp')).toBe(
        'https://api.example.test/uploads/boats/new-boat.webp'
      );
      expect(() => canonicalApiUrl('https://api.example.test/api', 'production')).toThrow(
        /sans chemin/
      );
      expect(() => canonicalApiUrl('http://localhost:4000', 'production')).toThrow(/HTTPS/);
      expect(() => canonicalApiUrl('https://[::1]:4000', 'production')).toThrow(/HTTPS/);
      expect(() => canonicalApiUrl('https://0.0.0.0:4000', 'production')).toThrow(/HTTPS/);
      expect(() => canonicalApiUrl('https://127.0.0.2:4000', 'production')).toThrow(/HTTPS/);
      expect(() => canonicalApiUrl('https://[::ffff:127.0.0.1]:4000', 'production')).toThrow(
        /HTTPS/
      );
      expect(() => canonicalApiUrl('https://[::ffff:7f00:1]:4000', 'production')).toThrow(/HTTPS/);
      expect(() => canonicalApiUrl('https://api.example.test?host=evil', 'production')).toThrow(
        /query string/
      );
    } finally {
      if (previousEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnvironment;
      if (previousAppUrl === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = previousAppUrl;
      if (previousPublicApiUrl === undefined) delete process.env.PUBLIC_API_URL;
      else process.env.PUBLIC_API_URL = previousPublicApiUrl;
    }
  });

  it('valide les URL de photos de ports sans casser les query strings des fixtures', () => {
    const unsplash =
      'https://images.unsplash.com/photo-1496309838698-63bfac391248?auto=format&fit=crop&w=800&q=80';
    expect(validatePublicImageUrl(`  ${unsplash}  `, 'production')).toBe(unsplash);
    expect(validatePublicImageUrl('', 'production')).toBeNull();
    expect(validatePublicImageUrl(null, 'production')).toBeNull();

    expect(() => validatePublicImageUrl('javascript:alert(1)', 'development')).toThrow();
    expect(() =>
      validatePublicImageUrl('https://images.example/photo.jpg#fragment', 'production')
    ).toThrow();
    expect(() => validatePublicImageUrl('http://localhost:4000/photo.jpg', 'production')).toThrow(
      /HTTPS/
    );
    expect(() => validatePublicImageUrl(`https://${'a'.repeat(501)}`, 'production')).toThrow();
  });
});
