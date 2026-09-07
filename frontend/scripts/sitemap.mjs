export const DEFAULT_SITE_ORIGIN = 'https://dsp-dev-o24a-g2.com';

export function validatedSiteOrigin(value) {
  const trimmed = String(value || '')
    .trim()
    .replace(/\/+$/, '');
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('VITE_SITE_ORIGIN doit être une URL absolue.');
  }
  if (url.protocol !== 'https:' || url.origin !== trimmed || url.username || url.password) {
    throw new Error('VITE_SITE_ORIGIN doit être une origine HTTPS, sans chemin ni identifiants.');
  }
  return url.origin;
}

export function renderSitemap(siteOrigin, routePaths) {
  const origin = validatedSiteOrigin(siteOrigin);
  const entries = [...routePaths]
    .map(
      (routePath) => `  <url>\n    <loc>${new URL(routePath, origin).toString()}</loc>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}
