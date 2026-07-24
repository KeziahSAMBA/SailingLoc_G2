import { describe, expect, it, jest } from '@jest/globals';
import { createCsrfProtection } from '../src/middlewares/csrfMiddleware.js';

const protectCsrf = createCsrfProtection(['https://app.sailingloc.fr']);

function request({ method = 'POST', headers = {}, cookies = {} } = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    method,
    cookies,
    get(name) {
      return normalized[name.toLowerCase()];
    },
  };
}

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

async function run(req) {
  const res = response();
  const next = jest.fn();
  protectCsrf(req, res, next);
  return { res, next };
}

describe('CSRF origin protection', () => {
  it.each(['GET', 'HEAD', 'OPTIONS'])('allows safe method %s', async (method) => {
    const { next } = await run(
      request({ method, headers: { Origin: 'https://evil.example' } })
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows state changes from the configured frontend origin', async () => {
    const { next, res } = await run(
      request({ headers: { Origin: 'https://app.sailingloc.fr' } })
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it.each([
    'https://evil.example',
    'https://app.sailingloc.fr.evil.example',
    'null',
    'not-an-origin',
  ])('rejects untrusted origin %s', async (origin) => {
    const { next, res } = await run(request({ headers: { Origin: origin } }));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects cross-site browser requests even without Origin', async () => {
    const { next, res } = await run(
      request({ headers: { 'Sec-Fetch-Site': 'cross-site' } })
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects an unverifiable request carrying the refresh cookie', async () => {
    const { next, res } = await run(
      request({ cookies: { sl_refresh: 'ambient-secret' } })
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('keeps non-browser API clients without ambient cookies usable', async () => {
    const { next } = await run(
      request({ headers: { Authorization: 'Bearer explicit-token' } })
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
