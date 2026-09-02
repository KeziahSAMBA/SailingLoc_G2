import fs from 'fs';
import { describe, expect, it } from '@jest/globals';
import {
  securityHeaders,
  API_CONTENT_SECURITY_POLICY,
  PERMISSIONS_POLICY,
} from '../src/middlewares/securityHeaders.js';
import { allowedCorsOrigins, normalizeRequestOrigin } from '../src/utils/corsSecurity.js';
import {
  API_ORIGIN_PLACEHOLDER,
  renderNginxConfig,
  validatedApiOrigin,
} from '../../frontend/scripts/build-security-config.mjs';
import { validatedApiBaseUrl } from '../../frontend/src/security/apiOrigin.js';

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
    const template = fs.readFileSync(new URL('../../frontend/nginx.conf', import.meta.url), 'utf8');
    const nginx = renderNginxConfig(
      template,
      validatedApiOrigin('https://api.sailingloc.fr/api', { environment: 'production' })
    );
    expect(nginx).toContain("script-src 'self' https://js.stripe.com");
    expect(nginx).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    expect(nginx).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(nginx).toContain('https://nominatim.openstreetmap.org');
    expect(nginx).toContain('https://a.basemaps.cartocdn.com');
    expect(nginx).toContain('https://analytics.sailingloc.fr');
    expect(nginx).toContain("frame-ancestors 'self'");
    expect(nginx).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(nginx).toContain('listen 8080');

    const csp = nginx.split(/\r?\n/).find((line) => line.includes('Content-Security-Policy'));
    expect(csp).not.toContain('localhost');
    expect(csp).not.toContain('127.0.0.1');
    const imgSrc = csp.split(';').find((directive) => directive.trim().startsWith('img-src'));
    expect(imgSrc.split(/\s+/)).toContain('https://api.sailingloc.fr');
    expect(imgSrc).not.toContain('https://*.sailingloc.fr');
    expect(csp).not.toContain('https://*');
    expect(nginx).not.toContain(API_ORIGIN_PLACEHOLDER);
    expect(nginx).not.toContain('https://api.sailingloc.fr/api');
  });

  it('renders an exact alternative staging API origin without widening the policy', () => {
    const template = fs.readFileSync(new URL('../../frontend/nginx.conf', import.meta.url), 'utf8');
    const stagingOrigin = validatedApiOrigin('https://api-staging.sailingloc.example/api/', {
      environment: 'staging',
    });
    const nginx = renderNginxConfig(template, stagingOrigin);
    const csp = nginx.split(/\r?\n/).find((line) => line.includes('Content-Security-Policy'));
    const imgSrc = csp.split(';').find((directive) => directive.trim().startsWith('img-src'));
    const connectSrc = csp
      .split(';')
      .find((directive) => directive.trim().startsWith('connect-src'));

    expect(stagingOrigin).toBe('https://api-staging.sailingloc.example');
    expect(imgSrc.split(/\s+/)).toContain(stagingOrigin);
    expect(connectSrc.split(/\s+/)).toContain(stagingOrigin);
    expect(nginx).not.toContain('https://api.sailingloc.fr');
    expect(nginx).not.toContain('/api/');
    expect(csp).not.toContain('https://*');
  });

  it('rejects unsafe API values before rendering Nginx configuration', () => {
    for (const value of [
      'http://api.sailingloc.fr/api',
      'https://localhost:4000/api',
      'https://localhost.:4000/api',
      'https://127.0.0.2:4000/api',
      'https://[::ffff:127.0.0.1]:4000/api',
      'https://[::ffff:7f00:1]:4000/api',
      'https://user:pass@api.sailingloc.fr/api',
      'https://api.sailingloc.fr/api?target=evil',
      'https://api.sailingloc.fr/api#fragment',
      'https://api.sailingloc.fr/other',
      'javascript:alert(1)',
    ]) {
      expect(() => validatedApiOrigin(value, { environment: 'production' })).toThrow();
    }
    expect(
      validatedApiOrigin('http://[::ffff:127.0.0.1]:4000/api', {
        environment: 'development',
      })
    ).toBe('http://[::ffff:7f00:1]:4000');
    expect(() => renderNginxConfig(API_ORIGIN_PLACEHOLDER.repeat(2), 'https://safe.test;')).toThrow(
      /invalide/
    );
    expect(() =>
      renderNginxConfig(API_ORIGIN_PLACEHOLDER.repeat(2), 'https://localhost:4000')
    ).toThrow(/invalide/);
  });

  it('partage la validation canonique avec le contrôle runtime du navigateur', () => {
    expect(
      validatedApiBaseUrl('https://api.sailingloc.fr/api/', { environment: 'production' })
    ).toBe('https://api.sailingloc.fr/api');
    expect(validatedApiBaseUrl('http://localhost:4000/api', { environment: 'development' })).toBe(
      'http://localhost:4000/api'
    );

    for (const value of [
      'https://localhost.:4000/api',
      'https://127.0.0.42:4000/api',
      'https://[::ffff:127.0.0.1]:4000/api',
      'https://[::ffff:7f00:2]:4000/api',
      'https://user:pass@api.sailingloc.fr/api',
      'https://api.sailingloc.fr/api?x=1',
      'https://api.sailingloc.fr/api#x',
    ]) {
      expect(() => validatedApiBaseUrl(value, { environment: 'production' })).toThrow();
    }
  });
});

describe('deployment container boundaries', () => {
  it('uses the header-enabled nginx image for Railway frontend deployments', () => {
    const railway = JSON.parse(
      fs.readFileSync(new URL('../../frontend/railway.json', import.meta.url), 'utf8')
    );
    const dockerfile = fs.readFileSync(
      new URL('../../frontend/Dockerfile', import.meta.url),
      'utf8'
    );

    expect(railway.build.builder).toBe('DOCKERFILE');
    expect(railway.build.dockerfilePath).toBe('frontend/Dockerfile');
    expect(railway.deploy.startCommand).toBeUndefined();
    expect(dockerfile).toContain('ARG VITE_API_BASE_URL');
    expect(dockerfile).toContain('VITE_API_BASE_URL=$VITE_API_BASE_URL');
    expect(dockerfile).toContain('WORKDIR /app/frontend');
    expect(dockerfile).toContain('COPY frontend/package*.json ./');
    expect(dockerfile).toContain('RUN npm run build');
    expect(dockerfile).toContain('/app/frontend/.generated/default.conf');
    expect(dockerfile).not.toContain('COPY nginx.conf /etc/nginx/conf.d/default.conf');

    for (const composePath of ['../../docker-compose.yml', '../../docker-compose.staging.yml']) {
      const compose = fs.readFileSync(new URL(composePath, import.meta.url), 'utf8');
      const lines = compose.split(/\r?\n/);
      const frontendStart = lines.indexOf('  frontend:');
      const frontendBuild = lines.slice(frontendStart, frontendStart + 10);
      expect(frontendBuild).toContain('    build:');
      expect(frontendBuild).toContain('      context: .');
      expect(frontendBuild).toContain('      dockerfile: frontend/Dockerfile');
    }
  });

  it('keeps production and staging backend ports on loopback only', () => {
    const productionCompose = fs.readFileSync(
      new URL('../../docker-compose.yml', import.meta.url),
      'utf8'
    );
    const stagingCompose = fs.readFileSync(
      new URL('../../docker-compose.staging.yml', import.meta.url),
      'utf8'
    );

    expect(productionCompose).toContain("'127.0.0.1:4000:4000'");
    expect(stagingCompose).toContain("'127.0.0.1:4100:4000'");
    expect(productionCompose).not.toContain("- '4000:4000'");
    expect(stagingCompose).not.toContain("- '4100:4000'");
  });
});
