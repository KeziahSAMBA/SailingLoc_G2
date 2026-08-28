import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockLogActivity = jest.fn();
jest.unstable_mockModule('../src/services/logService.js', () => ({
  logActivity: mockLogActivity,
}));

const { audit } = await import('../src/middlewares/auditMiddleware.js');

function makeRes(statusCode = 200) {
  const res = { statusCode, locals: {}, handlers: {} };
  res.on = jest.fn((event, handler) => {
    res.handlers[event] = handler;
    return res;
  });
  res.finish = () => res.handlers.finish?.();
  return res;
}

function makeReq(overrides = {}) {
  return {
    body: {},
    params: {},
    ip: '203.0.113.7',
    user: { id_user: 1, email: 'admin@sailingloc.fr', role: 'admin' },
    ...overrides,
  };
}

// Exécute le middleware puis simule la fin de la réponse Express.
function run(middleware, req, res) {
  const next = jest.fn();
  middleware(req, res, next);
  res.finish();
  return next;
}

let next;

beforeEach(() => {
  mockLogActivity.mockClear();
  next = jest.fn();
});

describe('audit — passage de la requête', () => {
  it('appelle next() immédiatement, sans attendre la fin de la réponse', () => {
    const res = makeRes();

    audit('boat.publish')(makeReq(), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).not.toHaveBeenCalled();
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});

describe('audit — condition d’écriture du log', () => {
  it('écrit le log quand la réponse aboutit', () => {
    run(audit('boat.publish'), makeReq(), makeRes(200));

    expect(mockLogActivity).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 404, 409, 500])('n’écrit rien pour un statut %i', (statusCode) => {
    run(audit('boat.publish'), makeReq(), makeRes(statusCode));

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('écrit encore le log pour une redirection (302)', () => {
    run(audit('boat.publish'), makeReq(), makeRes(302));

    expect(mockLogActivity).toHaveBeenCalledTimes(1);
  });

  it('n’écrit rien quand le prédicat « when » est faux', () => {
    const when = jest.fn(() => false);
    const req = makeReq();

    run(audit('booking.cancel', { when }), req, makeRes(200));

    expect(when).toHaveBeenCalledWith(req);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it('écrit le log quand le prédicat « when » est vrai', () => {
    run(audit('booking.cancel', { when: () => true }), makeReq(), makeRes(200));

    expect(mockLogActivity).toHaveBeenCalledTimes(1);
  });

  it('n’évalue pas « when » si la requête a échoué', () => {
    const when = jest.fn(() => true);

    run(audit('booking.cancel', { when }), makeReq(), makeRes(500));

    expect(when).not.toHaveBeenCalled();
    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});

describe('audit — contenu du log', () => {
  it('déduit la catégorie du préfixe de l’action', () => {
    run(audit('boat.publish'), makeReq(), makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'boat', action: 'boat.publish' })
    );
  });

  it('reprend l’identité de l’acteur depuis req.user', () => {
    run(audit('user.ban'), makeReq(), makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 1,
        actorEmail: 'admin@sailingloc.fr',
        actorRole: 'admin',
        ip: '203.0.113.7',
      })
    );
  });

  it('tolère une requête sans utilisateur authentifié', () => {
    run(audit('contact.delete'), makeReq({ user: undefined }), makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: undefined, actorEmail: undefined, actorRole: undefined })
    );
  });

  it('utilise la catégorie comme targetType par défaut', () => {
    run(audit('port.update'), makeReq(), makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({ targetType: 'port' }));
  });

  it('respecte un targetType explicite', () => {
    run(audit('port.update', { targetType: 'harbour' }), makeReq(), makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: 'harbour' })
    );
  });

  it('prend l’identifiant de cible dans les paramètres d’URL', () => {
    run(audit('boat.publish'), makeReq({ params: { id: '42' } }), makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({ targetId: '42' }));
  });

  it('retombe sur res.locals.auditTargetId quand l’URL ne porte pas d’id (création)', () => {
    const res = makeRes();
    res.locals.auditTargetId = 99;

    run(audit('port.create'), makeReq(), res);

    expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({ targetId: 99 }));
  });

  it('accepte un targetId calculé par une fonction', () => {
    const req = makeReq({ params: { boatId: '17' } });

    run(audit('boat.refuse', { targetId: (r) => r.params.boatId }), req, makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({ targetId: '17' }));
  });

  it('accepte un meta calculé par une fonction, à la place du corps', () => {
    const req = makeReq({ body: { reason: 'photos non conformes' } });

    run(audit('boat.refuse', { meta: (r) => ({ motif: r.body.reason }) }), req, makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { motif: 'photos non conformes' } })
    );
  });
});

describe('audit — instantané du corps de requête', () => {
  it('conserve les valeurs scalaires', () => {
    const req = makeReq({ body: { name: 'Marseille', capacity: 120, active: true, note: null } });

    run(audit('port.update'), req, makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: { name: 'Marseille', capacity: 120, active: true, note: null },
      })
    );
  });

  it('écarte les valeurs non scalaires', () => {
    const req = makeReq({
      body: { name: 'Marseille', coords: { lat: 43.3 }, tags: ['sud'], cb: () => {} },
    });

    run(audit('port.update'), req, makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { name: 'Marseille' } })
    );
  });

  it('tronque les chaînes à 200 caractères', () => {
    const req = makeReq({ body: { description: 'a'.repeat(500) } });

    run(audit('port.update'), req, makeRes());

    const { meta } = mockLogActivity.mock.calls[0][0];
    expect(meta.description).toHaveLength(200);
  });

  it.each([
    ['un corps vide', {}],
    ['un corps absent', undefined],
    ['un tableau', [{ a: 1 }]],
    ['une chaîne', 'texte brut'],
    ['un corps sans aucune valeur scalaire', { nested: { a: 1 } }],
  ])('produit un meta nul pour %s', (_label, body) => {
    run(audit('port.update'), makeReq({ body }), makeRes());

    expect(mockLogActivity).toHaveBeenCalledWith(expect.objectContaining({ meta: null }));
  });

  it('fige le corps à la réception, pas à la fin de la réponse', () => {
    const req = makeReq({ body: { name: 'avant' } });
    const res = makeRes();

    audit('port.update')(req, res, next);
    req.body.name = 'après';
    res.finish();

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({ meta: { name: 'avant' } })
    );
  });
});
