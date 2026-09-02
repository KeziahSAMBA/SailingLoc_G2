import { describe, it, expect, vi } from 'vitest';
import { WEEKDAYS, parseCron, buildCron, describeCron } from './cronExpression.js';

describe('parseCron — fréquences assistées', () => {
  it('reconnaît une exécution horaire', () => {
    expect(parseCron('30 * * * *')).toMatchObject({
      mode: 'hourly',
      minute: 30,
    });
  });

  it('reconnaît une exécution quotidienne', () => {
    expect(parseCron('15 4 * * *')).toMatchObject({
      mode: 'daily',
      minute: 15,
      hour: 4,
    });
  });

  it('reconnaît une exécution hebdomadaire', () => {
    expect(parseCron('0 3 * * 1')).toMatchObject({
      mode: 'weekly',
      minute: 0,
      hour: 3,
      weekday: 1,
    });
  });

  it('accepte dimanche, codé zéro', () => {
    expect(parseCron('0 3 * * 0')).toMatchObject({
      mode: 'weekly',
      weekday: 0,
    });
  });

  it('tolère des espaces multiples entre les champs', () => {
    expect(parseCron('  0   3   *   *   1  ')).toMatchObject({
      mode: 'weekly',
      weekday: 1,
    });
  });
});

// Le mode « personnalisé » est le filet de sécurité : une expression valide mais
// non assistée doit rester éditable telle quelle, jamais être rejetée.
describe('parseCron — repli sur le mode personnalisé', () => {
  it.each([
    ['nombre de champs insuffisant', '0 3 * *'],
    ['nombre de champs excessif', '0 3 * * 1 2'],
    ['jour du mois précisé', '0 3 15 * *'],
    ['mois précisé', '0 3 * 6 *'],
    ['intervalle', '*/15 * * * *'],
    ['liste de jours', '0 3 * * 1,3,5'],
    ['plage horaire', '0 9-17 * * *'],
    ['chaîne vide', ''],
    ['non renseigné', undefined],
    ['nul', null],
  ])('bascule en personnalisé : %s', (_label, expression) => {
    expect(parseCron(expression).mode).toBe('custom');
  });

  it('propose des valeurs par défaut exploitables', () => {
    expect(parseCron('n’importe quoi')).toEqual({
      mode: 'custom',
      minute: 0,
      hour: 3,
      weekday: 1,
    });
  });
});

describe('buildCron', () => {
  it('compose une expression horaire', () => {
    expect(buildCron({ mode: 'hourly', minute: 30 })).toBe('30 * * * *');
  });

  it('compose une expression quotidienne', () => {
    expect(buildCron({ mode: 'daily', minute: 15, hour: 4 })).toBe('15 4 * * *');
  });

  it('compose une expression hebdomadaire', () => {
    expect(buildCron({ mode: 'weekly', minute: 0, hour: 3, weekday: 6 })).toBe('0 3 * * 6');
  });

  it('applique ses valeurs par défaut', () => {
    expect(buildCron({ mode: 'daily' })).toBe('0 3 * * *');
  });

  // Le mode personnalisé n'est pas composable : l'écran garde alors la saisie
  // libre de l'utilisateur au lieu d'une expression fabriquée.
  it('ne compose rien en mode personnalisé', () => {
    expect(buildCron({ mode: 'custom' })).toBeNull();
  });

  it('ne compose rien pour un mode inconnu', () => {
    expect(buildCron({ mode: 'mensuel' })).toBeNull();
  });
});

// Un champ numérique laisse saisir n'importe quoi : produire « 99 88 * * * »
// planterait le planificateur côté serveur.
describe('buildCron — bornes de saisie', () => {
  it.each([
    ['minute au-delà de 59', { mode: 'daily', minute: 99, hour: 4 }, '59 4 * * *'],
    ['minute négative', { mode: 'daily', minute: -5, hour: 4 }, '0 4 * * *'],
    ['heure au-delà de 23', { mode: 'daily', minute: 0, hour: 42 }, '0 23 * * *'],
    ['heure négative', { mode: 'daily', minute: 0, hour: -1 }, '0 0 * * *'],
    ['minute non numérique', { mode: 'daily', minute: 'abc', hour: 4 }, '0 4 * * *'],
  ])('borne %s', (_label, entree, attendu) => {
    expect(buildCron(entree)).toBe(attendu);
  });

  it('conserve les bornes extrêmes valides', () => {
    expect(buildCron({ mode: 'daily', minute: 59, hour: 23 })).toBe('59 23 * * *');
  });
});

describe('aller-retour entre analyse et composition', () => {
  it.each(['30 * * * *', '15 4 * * *', '0 3 * * 1', '45 23 * * 0'])(
    'reconstruit %s à l’identique',
    (expression) => {
      expect(buildCron(parseCron(expression))).toBe(expression);
    }
  );
});

describe('describeCron', () => {
  const t = vi.fn((cle, params) => `${cle}${params ? ` ${JSON.stringify(params)}` : ''}`);

  it('décrit une exécution horaire avec la minute sur deux chiffres', () => {
    expect(describeCron('5 * * * *', t)).toBe('adminCron.freq.hourlyAt {"minute":"05"}');
  });

  it('décrit une exécution quotidienne avec une heure lisible', () => {
    expect(describeCron('5 4 * * *', t)).toBe('adminCron.freq.dailyAt {"time":"04:05"}');
  });

  it('décrit une exécution hebdomadaire en traduisant le jour', () => {
    expect(describeCron('0 3 * * 1', t)).toContain('adminCron.freq.weeklyAt');
    expect(t).toHaveBeenCalledWith('adminCron.weekdays.1');
  });

  // Sans repli, une expression non assistée s'afficherait comme une clé de
  // traduction manquante au lieu du planning réellement en vigueur.
  it('affiche l’expression brute quand elle sort des cas assistés', () => {
    expect(describeCron('*/15 * * * *', t)).toBe('*/15 * * * *');
  });
});

describe('WEEKDAYS', () => {
  // L'ordre part du lundi, alors que cron code dimanche par zéro : c'est
  // l'ordre d'affichage du sélecteur, pas l'ordre numérique.
  it('commence au lundi et finit au dimanche', () => {
    expect(WEEKDAYS).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('couvre les sept jours sans doublon', () => {
    expect(new Set(WEEKDAYS).size).toBe(7);
  });
});
