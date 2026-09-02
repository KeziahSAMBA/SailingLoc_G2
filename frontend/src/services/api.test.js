import { describe, it, expect, vi, beforeEach } from 'vitest';

// axios est remplacé par une instance dont on capture les intercepteurs : on
// peut alors les déclencher directement, sans réseau ni serveur.
const capture = { requete: [], reponse: [] };

vi.mock('axios', () => {
  const instance = vi.fn(() => Promise.resolve({ data: 'rejoué' }));
  instance.post = vi.fn();
  instance.interceptors = {
    request: { use: (fn) => capture.requete.push(fn) },
    response: { use: (ok, ko) => capture.reponse.push({ ok, ko }) },
  };
  return { default: { create: () => instance } };
});

const axios = (await import('axios')).default;
const instance = axios.create();
const api = await import('./api.js');

// Les deux paires d'intercepteurs sont posées dans l'ordre du fichier :
// d'abord le suivi d'activité, ensuite le rafraîchissement de session.
const injecterJeton = capture.requete[0];
const compterDepart = capture.requete[1];
const [activite, session] = capture.reponse;

const reponse = (config = {}) => ({ config });
const erreur = (status, config = {}) => ({
  config,
  ...(status ? { response: { status } } : {}),
});

// Le compteur de requêtes en vol vit dans le module, pas dans le test : sans
// remise à zéro, un test hériterait des requêtes laissées par le précédent et
// passerait ou échouerait selon l'ordre d'exécution.
function viderLeCompteur() {
  let restant = -1;
  const stop = api.onRequestActivity((e) => (restant = e.pendingCount));
  for (let i = 0; i < 50 && restant !== 0; i += 1) activite.ok(reponse());
  stop();
}

beforeEach(() => {
  vi.clearAllMocks();
  viderLeCompteur();
  api.setAccessToken(null);
  api.setOnAuthFailure(null);
  instance.mockImplementation(() => Promise.resolve({ data: 'rejoué' }));
});

describe('jeton d’accès', () => {
  it('se conserve et se relit', () => {
    api.setAccessToken('jeton-123');
    expect(api.getAccessToken()).toBe('jeton-123');
  });

  it('accompagne la requête quand il est posé', () => {
    api.setAccessToken('jeton-123');
    const config = injecterJeton({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer jeton-123');
  });

  it('reste absent pour un visiteur non connecté', () => {
    expect(injecterJeton({ headers: {} }).headers.Authorization).toBeUndefined();
  });
});

describe('suivi des requêtes en vol', () => {
  const dernierEtat = () => {
    let etat;
    const stop = api.onRequestActivity((e) => (etat = e));
    compterDepart({ headers: {} });
    activite.ok(reponse());
    stop();
    return etat;
  };

  it('notifie les abonnés', () => {
    expect(dernierEtat()).toMatchObject({ pendingCount: 0 });
  });

  it('compte les requêtes parties et revenues', () => {
    const etats = [];
    const stop = api.onRequestActivity((e) => etats.push(e.pendingCount));

    compterDepart({ headers: {} });
    compterDepart({ headers: {} });
    activite.ok(reponse());
    stop();

    expect(etats).toEqual([1, 2, 1]);
  });

  it('horodate la plus ancienne requête en cours, puis l’oublie', () => {
    const etats = [];
    const stop = api.onRequestActivity((e) => etats.push(e.oldestPendingAt));

    compterDepart({ headers: {} });
    activite.ok(reponse());
    stop();

    expect(etats[0]).toBeTypeOf('number');
    expect(etats.at(-1)).toBeNull();
  });

  it('cesse de notifier après désabonnement', () => {
    const espion = vi.fn();
    api.onRequestActivity(espion)();

    compterDepart({ headers: {} });
    activite.ok(reponse());

    expect(espion).not.toHaveBeenCalled();
  });

  it('ne descend jamais sous zéro', () => {
    const etats = [];
    const stop = api.onRequestActivity((e) => etats.push(e.pendingCount));

    activite.ok(reponse());
    activite.ok(reponse());
    stop();

    expect(etats.every((n) => n >= 0)).toBe(true);
  });
});

// Une panne réseau et un 500 ne se soignent pas pareil : seule l'absence de
// réponse HTTP signale que le serveur n'a jamais été joint.
describe('détection de panne réseau', () => {
  const echouer = (err) => {
    let etat;
    const stop = api.onRequestActivity((e) => (etat = e));
    activite.ko(err).catch(() => {});
    stop();
    return etat;
  };

  it('retient une requête restée sans réponse', () => {
    const config = { headers: {} };
    compterDepart(config);
    expect(echouer(erreur(null, config)).lastNetworkFailureAt).toBeTypeOf('number');
  });

  it('ne retient pas une erreur venue du serveur', () => {
    const config = { headers: {} };
    compterDepart(config);
    const avant = echouer(erreur(null, config)).lastNetworkFailureAt;

    const config2 = { headers: {} };
    compterDepart(config2);
    expect(echouer(erreur(500, config2)).lastNetworkFailureAt).toBe(avant);
  });

  // Une requête orpheline d'un montage précédent peut échouer après que la
  // nouvelle tentative a réussi : son échec ne doit pas rouvrir l'écran.
  it('ignore l’échec tardif d’une requête d’une génération périmée', () => {
    const config = { headers: {} };
    compterDepart(config);
    const avant = echouer(erreur(null, config)).lastNetworkFailureAt;

    const orpheline = { headers: {} };
    compterDepart(orpheline);
    api.bumpGeneration();

    expect(echouer(erreur(null, orpheline)).lastNetworkFailureAt).toBe(avant);
  });

  it('propage l’erreur malgré le suivi', async () => {
    await expect(activite.ko(erreur(500, { headers: {} }))).rejects.toBeDefined();
  });
});

describe('session expirée — rejeu après rafraîchissement', () => {
  it('rafraîchit puis rejoue la requête', async () => {
    instance.post.mockResolvedValue({ data: { accessToken: 'nouveau' } });
    const original = { headers: {}, url: '/users/me' };

    await session.ko(erreur(401, original));

    expect(instance.post).toHaveBeenCalledWith('/users/refresh');
    expect(original.headers.Authorization).toBe('Bearer nouveau');
    expect(instance).toHaveBeenCalledWith(original);
  });

  it('adopte le nouveau jeton', async () => {
    instance.post.mockResolvedValue({ data: { accessToken: 'nouveau' } });
    await session.ko(erreur(401, { headers: {}, url: '/users/me' }));

    expect(api.getAccessToken()).toBe('nouveau');
  });

  // Plusieurs requêtes peuvent se heurter au même 401 : sans mutualisation, on
  // déclencherait autant de rafraîchissements que d'appels en vol.
  it('ne rafraîchit qu’une fois pour plusieurs échecs simultanés', async () => {
    let resoudre;
    instance.post.mockReturnValue(
      new Promise((r) => (resoudre = () => r({ data: { accessToken: 'nouveau' } })))
    );

    const a = session.ko(erreur(401, { headers: {}, url: '/users/me' }));
    const b = session.ko(erreur(401, { headers: {}, url: '/users/me/bookings' }));
    resoudre();
    await Promise.all([a, b]);

    expect(instance.post).toHaveBeenCalledTimes(1);
  });
});

// Un 401 n'est pas toujours une session expirée : sur un formulaire de
// connexion, c'est la réponse métier à un mauvais mot de passe.
describe('cas où il ne faut pas rafraîchir', () => {
  it.each([
    ['connexion locataire', { headers: {}, url: '/users/login' }],
    ['connexion administrateur', { headers: {}, url: '/admin/login' }],
    ['appel de rafraîchissement lui-même', { headers: {}, url: '/users/refresh' }],
    ['requête déjà rejouée', { headers: {}, url: '/users/me', _retry: true }],
  ])('laisse passer l’erreur : %s', async (_label, config) => {
    await expect(session.ko(erreur(401, config))).rejects.toBeDefined();
    expect(instance.post).not.toHaveBeenCalled();
  });

  it.each([
    ['403', 403],
    ['500', 500],
    ['404', 404],
  ])('ne rafraîchit pas sur un %s', async (_label, status) => {
    await expect(
      session.ko(erreur(status, { headers: {}, url: '/users/me' }))
    ).rejects.toBeDefined();
    expect(instance.post).not.toHaveBeenCalled();
  });

  it('laisse passer une erreur sans configuration', async () => {
    await expect(session.ko({ response: { status: 401 } })).rejects.toBeDefined();
    expect(instance.post).not.toHaveBeenCalled();
  });

  it('transmet les réponses réussies sans y toucher', () => {
    const r = reponse();
    expect(session.ok(r)).toBe(r);
  });
});

describe('rafraîchissement impossible', () => {
  it('oublie le jeton', async () => {
    api.setAccessToken('périmé');
    instance.post.mockRejectedValue(new Error('refresh refusé'));

    await expect(session.ko(erreur(401, { headers: {}, url: '/users/me' }))).rejects.toThrow();
    expect(api.getAccessToken()).toBeNull();
  });

  it('prévient l’application pour qu’elle déconnecte', async () => {
    const surEchec = vi.fn();
    api.setOnAuthFailure(surEchec);
    instance.post.mockRejectedValue(new Error('refresh refusé'));

    await expect(session.ko(erreur(401, { headers: {}, url: '/users/me' }))).rejects.toThrow();
    expect(surEchec).toHaveBeenCalledTimes(1);
  });

  it('n’exige pas qu’un gestionnaire soit posé', async () => {
    instance.post.mockRejectedValue(new Error('refresh refusé'));
    await expect(session.ko(erreur(401, { headers: {}, url: '/users/me' }))).rejects.toThrow(
      'refresh refusé'
    );
  });
});

describe('délai des envois de fichiers', () => {
  // Le délai global de 15 s suffit à une requête JSON mais couperait un envoi
  // de photos sur une connexion lente.
  it('est plus large que le délai global', () => {
    expect(api.UPLOAD_TIMEOUT_MS).toBe(60000);
  });
});
