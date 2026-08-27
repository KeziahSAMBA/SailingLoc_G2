const PRODUCTION_LIKE_ENVIRONMENTS = new Set(['production', 'staging']);

// The API never serves executable HTML. A deny-by-default policy protects
// accidental HTML/error responses while the frontend has its own resource
// policy in nginx.conf.
export const API_CONTENT_SECURITY_POLICY =
  "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

export const PERMISSIONS_POLICY =
  'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=()';

/**
 * Security headers for API responses. HSTS is emitted only for a request that
 * is known to be HTTPS; this keeps local HTTP staging smoke tests usable while
 * still enabling HSTS behind a TLS-terminating proxy.
 */
export function securityHeaders({ environment = process.env.NODE_ENV } = {}) {
  const env = String(environment || '')
    .trim()
    .toLowerCase();
  const productionLike = PRODUCTION_LIKE_ENVIRONMENTS.has(env);

  return (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);
    res.setHeader('Content-Security-Policy', API_CONTENT_SECURITY_POLICY);
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cache-Control', 'no-store');

    const forwardedProto = String(req?.get?.('x-forwarded-proto') || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const isHttps = req?.secure === true || forwardedProto === 'https';
    if (productionLike && isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}
