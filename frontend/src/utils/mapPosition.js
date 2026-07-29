// Les coordonnées GPS des ports (seed) tombent parfois côté ville plutôt que sur le
// bassin portuaire lui-même (pas de tracé terre/eau pour corriger ça automatiquement) ;
// petits décalages manuels fournis pour recentrer sur le port réel.
const PORT_POSITION_OFFSETS = {
  Bordeaux: { dLat: 0, dLng: 0.002536 }, // 150m est + 50m est
  Marseille: { dLat: -0.005718, dLng: -0.010944 }, // 900m sud-ouest + 250m ouest
  Nice: { dLat: -0.007174, dLng: 0.01053 }, // 1200m sud-est + 50m nord
  'La Rochelle': { dLat: 0, dLng: 0.000648 }, // 50m est
  Brest: { dLat: 0, dLng: -0.000677 }, // 50m ouest
};

export function correctPortPosition(city, lat, lng) {
  const offset = PORT_POSITION_OFFSETS[city];
  if (!offset) return { lat, lng };
  return { lat: lat + offset.dLat, lng: lng + offset.dLng };
}

// Dispersion artificielle des bateaux autour de leur port : les coordonnées GPS
// réelles ne sont connues qu'au niveau du port (tous les bateaux d'un même port
// partagent exactement la même position), donc pour l'affichage carte "pins bateaux"
// au fort zoom on répartit chaque bateau à un point pseudo-aléatoire mais stable
// (dérivé de son id) dans un rayon d'environ 45m autour du point corrigé du port — on
// n'a pas de tracé terre/eau donc on reste très serré sur le port lui-même plutôt que
// de risquer de déborder sur la ville ou le large.
const BOAT_SCATTER_RADIUS_DEG = 0.0004;

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function scatterBoatPosition(id, portLat, portLng) {
  const angle = pseudoRandom(id * 12.9898) * 2 * Math.PI;
  const radius = Math.sqrt(pseudoRandom(id * 78.233));
  const latRad = (portLat * Math.PI) / 180;
  return {
    lat: portLat + radius * BOAT_SCATTER_RADIUS_DEG * Math.sin(angle),
    lng: portLng + (radius * BOAT_SCATTER_RADIUS_DEG * Math.cos(angle)) / Math.cos(latRad),
  };
}
