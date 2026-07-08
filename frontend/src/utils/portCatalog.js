// Catalogue officiel des ports maritimes français (GeoJSON IGN, servi en
// statique). Partagé entre l'import admin et le formulaire de publication.
export const CATALOG_URL = '/geo/Port_Maritime_FRA.json';

// Le catalogue n'expose pas les mêmes clés que notre table : on ne garde que
// les ports nommés et on les déduplique par nom. CdCommune (code INSEE) sert
// au serveur à déduire le département et la région.
export function parseCatalog(features) {
  const seen = new Set();
  const out = [];
  for (const f of features || []) {
    const p = f.properties || {};
    const name = p.NomPort && String(p.NomPort).trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      city: (p.LbCommune && String(p.LbCommune).trim()) || '',
      country: 'France',
      insee: p.CdCommune || null,
      latitude: typeof p.CoordYPort === 'number' ? p.CoordYPort : null,
      longitude: typeof p.CoordXPort === 'number' ? p.CoordXPort : null,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// Charge et parse le catalogue (~4 Mo) : à n'appeler que paresseusement.
export async function loadPortCatalog() {
  const res = await fetch(CATALOG_URL);
  if (!res.ok) throw new Error('Impossible de charger le catalogue des ports.');
  const data = await res.json();
  return parseCatalog(data.features);
}
