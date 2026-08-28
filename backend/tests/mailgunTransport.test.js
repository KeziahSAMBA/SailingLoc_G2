import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mailgunApiTransport } from '../src/utils/mailgunTransport.js';

const CONFIG = { apiKey: 'key-123', domain: 'mg.sailingloc.fr', host: 'api.mailgun.net' };

// Objet `mail` tel que nodemailer le passe au transport : le MIME est construit
// à la demande via message.build().
function makeMail({ buildError = null, mime = 'MIME brut' } = {}) {
  return {
    message: {
      build: jest.fn((cb) => cb(buildError, mime)),
      getEnvelope: jest.fn(() => ({ from: 'noreply@x.fr', to: ['jean@x.fr', 'lea@x.fr'] })),
    },
  };
}

// Exécute le transport et résout avec (err, info) — l'API est en callback.
function send(transport, mail) {
  return new Promise((resolve) => {
    transport.send(mail, (err, info) => resolve({ err, info }));
  });
}

const okResponse = (body = '{"id":"<msg-1@mg>"}') => ({
  ok: true,
  status: 200,
  text: async () => body,
});

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue(okResponse());
});

describe('mailgunApiTransport', () => {
  it('se déclare comme un transport nodemailer nommé', () => {
    const transport = mailgunApiTransport(CONFIG);

    expect(transport).toMatchObject({ name: 'MailgunAPI', version: '1.0.0' });
    expect(typeof transport.send).toBe('function');
  });

  it('poste le MIME sur l’endpoint messages.mime du domaine', async () => {
    await send(mailgunApiTransport(CONFIG), makeMail());

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.mailgun.net/v3/mg.sailingloc.fr/messages.mime');
    expect(options.method).toBe('POST');
  });

  it('authentifie la requête en Basic avec la clé API', async () => {
    await send(mailgunApiTransport(CONFIG), makeMail());

    const { headers } = global.fetch.mock.calls[0][1];
    const expected = `Basic ${Buffer.from('api:key-123').toString('base64')}`;
    expect(headers.Authorization).toBe(expected);
  });

  it('joint les destinataires de l’enveloppe, séparés par des virgules', async () => {
    await send(mailgunApiTransport(CONFIG), makeMail());

    const { body } = global.fetch.mock.calls[0][1];
    expect(body.get('to')).toBe('jean@x.fr,lea@x.fr');
  });

  it('renvoie l’identifiant de message extrait de la réponse JSON', async () => {
    const { err, info } = await send(mailgunApiTransport(CONFIG), makeMail());

    expect(err).toBeNull();
    expect(info).toMatchObject({ messageId: '<msg-1@mg>' });
    expect(info.envelope).toMatchObject({ to: ['jean@x.fr', 'lea@x.fr'] });
  });

  it('tolère une réponse non JSON en laissant l’identifiant vide', async () => {
    global.fetch.mockResolvedValue(okResponse('Queued. Thank you.'));

    const { err, info } = await send(mailgunApiTransport(CONFIG), makeMail());

    expect(err).toBeNull();
    expect(info.messageId).toBe('');
    expect(info.response).toBe('Queued. Thank you.');
  });

  it('tolère une réponse JSON sans champ id', async () => {
    global.fetch.mockResolvedValue(okResponse('{"message":"Queued"}'));

    const { info } = await send(mailgunApiTransport(CONFIG), makeMail());

    expect(info.messageId).toBe('');
  });

  it('remonte une erreur quand Mailgun refuse l’envoi', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Forbidden',
    });

    const { err, info } = await send(mailgunApiTransport(CONFIG), makeMail());

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Mailgun 401 : Forbidden');
    expect(info).toBeUndefined();
  });

  it('tronque un corps d’erreur très long à 300 caractères', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'a'.repeat(1000),
    });

    const { err } = await send(mailgunApiTransport(CONFIG), makeMail());

    expect(err.message).toHaveLength('Mailgun 500 : '.length + 300);
  });

  it('remonte une panne réseau', async () => {
    global.fetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const { err } = await send(mailgunApiTransport(CONFIG), makeMail());

    expect(err.message).toBe('ECONNREFUSED');
  });

  it('remonte une erreur de construction du MIME sans appeler Mailgun', async () => {
    const buildError = new Error('MIME illisible');

    const { err } = await send(mailgunApiTransport(CONFIG), makeMail({ buildError }));

    expect(err).toBe(buildError);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
