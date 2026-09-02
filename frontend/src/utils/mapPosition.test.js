import { describe, it, expect } from 'vitest';
import { correctPortPosition, scatterBoatPosition } from './mapPosition.js';

describe('correctPortPosition', () => {
  it('applique le décalage connu d’un port', () => {
    const { lat, lng } = correctPortPosition('Bordeaux', 44.84, -0.58);
    expect(lat).toBeCloseTo(44.84, 6);
    expect(lng).toBeCloseTo(-0.577464, 6);
  });

  it('décale Marseille vers le sud-ouest', () => {
    const { lat, lng } = correctPortPosition('Marseille', 43.3, 5.37);
    expect(lat).toBeLessThan(43.3);
    expect(lng).toBeLessThan(5.37);
  });

  it('gère un nom de port composé', () => {
    const { lng } = correctPortPosition('La Rochelle', 46.16, -1.15);
    expect(lng).toBeCloseTo(-1.149352, 6);
  });

  // Un port ajouté par un propriétaire n'a pas de correction manuelle : ses
  // coordonnées doivent ressortir intactes, pas décalées au hasard.
  it('rend les coordonnées inchangées pour un port inconnu', () => {
    expect(correctPortPosition('Sète', 43.4, 3.69)).toEqual({
      lat: 43.4,
      lng: 3.69,
    });
  });

  it('ne corrige pas sur une casse différente', () => {
    expect(correctPortPosition('bordeaux', 44.84, -0.58)).toEqual({
      lat: 44.84,
      lng: -0.58,
    });
  });

  it('tolère un nom de ville absent', () => {
    expect(correctPortPosition(undefined, 44.84, -0.58)).toEqual({
      lat: 44.84,
      lng: -0.58,
    });
  });
});

describe('scatterBoatPosition', () => {
  const PORT = { lat: 43.3, lng: 5.37 };

  // Les bateaux d'un même port partagent la position du port : sans dispersion,
  // leurs pastilles se superposeraient exactement sur la carte.
  it('éloigne le bateau du point exact du port', () => {
    const p = scatterBoatPosition(42, PORT.lat, PORT.lng);
    expect(p).not.toEqual(PORT);
  });

  // Un bateau ne doit pas sauter d'un rendu à l'autre : la position dérive de
  // son identifiant, pas d'un tirage à chaque affichage.
  it('rend toujours la même position pour un même bateau', () => {
    expect(scatterBoatPosition(42, PORT.lat, PORT.lng)).toEqual(
      scatterBoatPosition(42, PORT.lat, PORT.lng)
    );
  });

  it('sépare deux bateaux différents', () => {
    expect(scatterBoatPosition(42, PORT.lat, PORT.lng)).not.toEqual(
      scatterBoatPosition(43, PORT.lat, PORT.lng)
    );
  });

  // Le rayon est volontairement serré — environ 45 m — faute de tracé
  // terre/eau : déborder mettrait des bateaux en ville ou au large.
  it('reste dans un rayon d’environ 45 mètres', () => {
    for (let id = 1; id <= 60; id += 1) {
      const p = scatterBoatPosition(id, PORT.lat, PORT.lng);
      expect(Math.abs(p.lat - PORT.lat)).toBeLessThanOrEqual(0.0004);
      // La longitude est élargie par le cosinus de la latitude pour que la
      // distance au sol reste la même qu'en latitude.
      const dLngSol = (p.lng - PORT.lng) * Math.cos((PORT.lat * Math.PI) / 180);
      expect(Math.abs(dLngSol)).toBeLessThanOrEqual(0.00041);
    }
  });

  it('disperse réellement dans plusieurs directions', () => {
    const points = Array.from({ length: 30 }, (_, i) => scatterBoatPosition(i + 1, 43.3, 5.37));
    expect(points.some((p) => p.lat > 43.3)).toBe(true);
    expect(points.some((p) => p.lat < 43.3)).toBe(true);
    expect(points.some((p) => p.lng > 5.37)).toBe(true);
    expect(points.some((p) => p.lng < 5.37)).toBe(true);
  });
});
