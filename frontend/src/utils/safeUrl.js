export function isAllowedHttpsUrl(value, allowedDomains = []) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:') return false;

    const hostname = url.hostname.toLowerCase();
    return allowedDomains.some((domain) => {
      const allowed = String(domain).toLowerCase();
      return hostname === allowed || hostname.endsWith(`.${allowed}`);
    });
  } catch {
    return false;
  }
}

export function requireStripeUrl(value) {
  if (!isAllowedHttpsUrl(value, ['stripe.com'])) {
    throw new Error('URL Stripe non autorisée.');
  }
  return String(value);
}
