import i18n from '../i18n/index.js';

// Formatage de date suivant la langue active (fr/en) : les formatteurs Intl
// sont mis en cache par couple langue + options.
const cache = new Map();

function getFormatter(options) {
  const key = `${i18n.language}|${JSON.stringify(options ?? {})}`;
  let fmt = cache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(i18n.language, options);
    cache.set(key, fmt);
  }
  return fmt;
}

export function formatDate(value, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
  if (value == null || value === '') return '';
  return getFormatter(options).format(new Date(value));
}
