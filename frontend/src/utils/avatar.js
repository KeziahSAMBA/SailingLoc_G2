// Avatar par défaut (quand l'utilisateur n'a pas déposé de photo) : un cercle
// coloré avec ses initiales, généré en data-URI SVG. Les photos « auto » de
// personnes ne concernent que les comptes de démonstration du seed.
export function nameToAvatarUrl(name) {
  const clean = (name || '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const initials =
    (words.length >= 2
      ? words[0][0] + words[words.length - 1][0]
      : (words[0] || 'SL').slice(0, 2)
    ).toUpperCase() || 'SL';

  // Couleur de fond déterministe (même nom → même couleur).
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const safeInitials = initials
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
    '<rect width="100" height="100" fill="hsl(' +
    hue +
    ',42%,45%)"/>' +
    '<text x="50" y="50" dy="0.35em" text-anchor="middle" ' +
    'font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="42" ' +
    'font-weight="600" fill="#ffffff">' +
    safeInitials +
    '</text></svg>';

  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
