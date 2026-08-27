import fs from 'fs';
import { describe, expect, it } from '@jest/globals';
import {
  securityHeaders,
  API_CONTENT_SECURITY_POLICY,
  PERMISSIONS_POLICY,
} from '../src/middlewares/securityHeaders.js';
import { allowedCorsOrigins, normalizeRequestOrigin } from '../src/utils/corsSecurity.js';

function responseDouble() {
  const headers = new Map();
  return {
    headers,
    setHeader(name, value) {
      headers.set(name.toLowerCase(), value);
    },
  };
}

describe('HTTP security headers', () => {
  it('sets deny-by-default API protections and HSTS for HTTPS production traffic', () => {
    const response = responseDouble();
    const request = {
      secure: true,
      get: (name) => (name.toLowerCase() === 'x-forwarded-proto' ? 'https' : undefined),
    };
    let called = false;

    securityHeaders({ environment: 'production' })(request, response, () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('content-security-policy')).toBe(API_CONTENT_SECURITY_POLICY);
    expect(response.headers.get('permissions-policy')).toBe(PERMISSIONS_POLICY);
    expect(response.headers.get('strict-transport-security')).toMatch(/max-age=31536000/);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('does not emit HSTS for an HTTP staging smoke test', () => {
    const response = responseDouble();
    securityHeaders({ environment: 'staging' })(
      { secure: false, get: () => 'http' },
      response,
      () => {}
    );
    expect(response.headers.has('strict-transport-security')).toBe(false);
  });
});

describe('credentialed CORS allowlist', () => {
  it('normalizes APP_URL and accepts only explicitly configured origins', () => {
    const origins = allowedCorsOrigins({
      appUrl: 'https://app.example.test/platform',
      configuredOrigins: 'https://admin.example.test, https://app.example.test/',
      environment: 'production',
    });

    expect(origins).toEqual(new Set(['https://app.example.test', 'https://admin.example.test']));
    expect(normalizeRequestOrigin('https://app.example.test')).toBe('https://app.example.test');
    expect(normalizeRequestOrigin('null')).toBeNull();
    expect(normalizeRequestOrigin('https://app.example.test/path')).toBeNull();
  });

  it('rejects wildcard and non-HTTPS staging origins', () => {
    expect(() =>
      allowedCorsOrigins({
        appUrl: 'https://app.example.test',
        configuredOrigins: 'https://*.example.test',
        environment: 'staging',
      })
    ).toThrow(/origine invalide|uniquement/);

    expect(() =>
      allowedCorsOrigins({
        appUrl: 'https://app.example.test',
        configuredOrigins: 'http://localhost:5174',
        environment: 'staging',
      })
    ).toThrow(/HTTPS/);
  });
});

describe('frontend CSP', () => {
  it('keeps the browser policy explicit for all runtime integrations', () => {
    const nginx = fs.readFileSync(new URL('../../frontend/nginx.conf', import.meta.url), 'utf8');
    expect(nginx).toContain("script-src 'self' https://js.stripe.com");
    expect(nginx).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(nginx).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(nginx).toContain('https://nominatim.openstreetmap.org');
    expect(nginx).toContain('https://a.basemaps.cartocdn.com');
    expect(nginx).toContain('https://analytics.sailingloc.fr');
    expect(nginx).toContain("frame-ancestors 'self'");
    expect(nginx).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(nginx).toContain('listen 8080');
  });
});
