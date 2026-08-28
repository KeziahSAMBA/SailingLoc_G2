import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'abc' });
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
jest.unstable_mockModule('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}));

const mockMailgunTransport = jest.fn(() => ({ name: 'mailgun-api' }));
jest.unstable_mockModule('../src/utils/mailgunTransport.js', () => ({
  mailgunApiTransport: mockMailgunTransport,
}));

let config = {};
jest.unstable_mockModule('../src/config/appConfig.js', () => ({
  initConfig: () => config,
}));

const emails = await import('../src/services/emailService.js');

const SMTP_CONFIG = {
  APP_URL: 'https://sailingloc.fr',
  EMAIL_HOST: 'smtp.example.com',
  EMAIL_PORT: '587',
  EMAIL_USER: '',
  EMAIL_PASS: '',
  EMAIL_SECURE: false,
  EMAIL_IGNORE_TLS: false,
  MAILGUN_API_KEY: '',
  MAILGUN_DOMAIN: '',
  MAILGUN_HOST: 'api.mailgun.net',
};

// Dernier message remis au transporteur.
const sent = () => mockSendMail.mock.calls[0][0];

const booking = (overrides = {}) => ({
  firstName: 'Lea',
  boatName: 'Pen Duick',
  startDate: '2026-07-01',
  endDate: '2026-07-08',
  totalAmount: 700,
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  config = { ...SMTP_CONFIG };
  mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
});

describe('choix du transporteur', () => {
  it('utilise le SMTP classique par défaut', async () => {
    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockMailgunTransport).not.toHaveBeenCalled();
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.example.com', port: 587, secure: false })
    );
  });

  it('bascule sur l’API Mailgun quand la clé et le domaine sont fournis', async () => {
    config = { ...SMTP_CONFIG, MAILGUN_API_KEY: 'key-123', MAILGUN_DOMAIN: 'mg.sailingloc.fr' };

    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockMailgunTransport).toHaveBeenCalledWith({
      apiKey: 'key-123',
      domain: 'mg.sailingloc.fr',
      host: 'api.mailgun.net',
    });
  });

  it('reste en SMTP si seule la clé Mailgun est renseignée', async () => {
    config = { ...SMTP_CONFIG, MAILGUN_API_KEY: 'key-123' };

    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockMailgunTransport).not.toHaveBeenCalled();
  });

  it('bascule sur un transport nul en mode test de charge', async () => {
    config = { ...SMTP_CONFIG, LOAD_TEST_MODE: true };

    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockCreateTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });

  it('ignore Mailgun même configuré quand le mode test de charge est actif', async () => {
    config = {
      ...SMTP_CONFIG,
      LOAD_TEST_MODE: true,
      MAILGUN_API_KEY: 'key-123',
      MAILGUN_DOMAIN: 'mg.sailingloc.fr',
    };

    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockMailgunTransport).not.toHaveBeenCalled();
    expect(mockCreateTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });

  it('active le TLS implicite sur le port 465', async () => {
    config = { ...SMTP_CONFIG, EMAIL_PORT: '465' };

    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
  });

  it('active le TLS quand EMAIL_SECURE est demandé sur un autre port', async () => {
    config = { ...SMTP_CONFIG, EMAIL_SECURE: true };

    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
  });

  it('n’ajoute pas d’authentification sans identifiants', async () => {
    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockCreateTransport.mock.calls[0][0]).not.toHaveProperty('auth');
  });

  it('ajoute l’authentification quand identifiant et mot de passe sont fournis', async () => {
    config = { ...SMTP_CONFIG, EMAIL_USER: 'user', EMAIL_PASS: 'pass' };

    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: 'user', pass: 'pass' } })
    );
  });
});

describe('emails porteurs d’un lien à jeton', () => {
  it('construit le lien de confirmation d’inscription', async () => {
    await emails.sendVerificationEmail('jean@example.com', 'jeton-abc', 'Jean');

    expect(sent().html).toContain('https://sailingloc.fr/verify-email?token=jeton-abc');
    expect(sent()).toMatchObject({ to: 'jean@example.com' });
  });

  it('construit le lien de réinitialisation de mot de passe', async () => {
    await emails.sendPasswordResetEmail('jean@example.com', 'jeton-abc', 'Jean');

    expect(sent().html).toContain('https://sailingloc.fr/reset-password?token=jeton-abc');
  });

  it('construit le lien de définition de mot de passe d’un compte créé par l’admin', async () => {
    await emails.sendAccountCreatedEmail('jean@example.com', 'jeton-abc', 'Jean');

    expect(sent().html).toContain('https://sailingloc.fr/reset-password?token=jeton-abc');
    expect(sent().subject).toMatch(/définissez votre mot de passe/);
  });

  it('joint le logo en pièce jointe intégrée', async () => {
    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(sent().attachments[0]).toMatchObject({
      cid: 'sailingloc-logo',
      contentDisposition: 'inline',
    });
  });

  it('envoie systématiquement une version texte à côté du HTML', async () => {
    await emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean');

    expect(typeof sent().text).toBe('string');
    expect(sent().text.length).toBeGreaterThan(0);
  });
});

describe('échappement HTML — les données utilisateur ne peuvent pas injecter de balises', () => {
  it('neutralise une balise script dans le prénom', async () => {
    await emails.sendVerificationEmail('jean@example.com', 'jeton', '<script>alert(1)</script>');

    expect(sent().html).not.toContain('<script>');
    expect(sent().html).toContain('&lt;script&gt;');
  });

  it('neutralise les guillemets dans un nom de bateau', async () => {
    await emails.sendBoatUnpublishedEmail('proprio@example.com', {
      firstName: 'Marie',
      boatName: '"><img src=x onerror=alert(1)>',
    });

    expect(sent().html).not.toContain('<img src=x');
    expect(sent().html).toContain('&quot;&gt;&lt;img');
  });

  it('neutralise une apostrophe dans un motif de refus', async () => {
    await emails.sendBookingDecisionEmail('lea@example.com', {
      ...booking(),
      decision: 'refused',
      reason: "l'apostrophe & <b>gras</b>",
    });

    expect(sent().html).toContain('&#39;');
    expect(sent().html).toContain('&amp;');
    expect(sent().html).not.toContain('<b>gras</b>');
  });
});

describe('emails d’annonce', () => {
  it('annonce le retrait d’une annonce', async () => {
    await emails.sendBoatUnpublishedEmail('proprio@example.com', {
      firstName: 'Marie',
      boatName: 'Pen Duick',
    });

    expect(sent().subject).toBe('Votre annonce "Pen Duick" a été retirée — SailingLoc');
  });

  it('annonce la remise en ligne d’une annonce', async () => {
    await emails.sendBoatRepublishedEmail('proprio@example.com', {
      firstName: 'Marie',
      boatName: 'Pen Duick',
    });

    expect(sent().subject).toBe('Votre annonce "Pen Duick" est de nouveau en ligne — SailingLoc');
  });
});

describe('décision de réservation', () => {
  it.each(['confirmed', 'refused', 'cancelled'])('accepte la décision « %s »', async (decision) => {
    await emails.sendBookingDecisionEmail('lea@example.com', { ...booking(), decision });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(sent().subject).toContain('Pen Duick');
  });

  it('refuse une décision inconnue avant tout envoi', async () => {
    await expect(
      emails.sendBookingDecisionEmail('lea@example.com', { ...booking(), decision: 'peut_etre' })
    ).rejects.toThrow(/Décision de réservation inconnue/);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('affiche la période et le montant formatés en euros', async () => {
    await emails.sendBookingDecisionEmail('lea@example.com', {
      ...booking(),
      decision: 'confirmed',
    });

    expect(sent().html).toMatch(/700/);
    expect(sent().text).toMatch(/2026/);
  });

  it('ajoute un bloc remboursement quand un montant est remboursé', async () => {
    await emails.sendBookingDecisionEmail('lea@example.com', {
      ...booking(),
      decision: 'cancelled',
      refundAmount: 700,
    });

    expect(sent().html).toContain('Remboursement');
    expect(sent().text).toMatch(/intégralement remboursé/);
  });

  it.each([
    ['montant nul', 0],
    ['montant absent', undefined],
    ['montant négatif', -50],
  ])('n’ajoute pas de bloc remboursement pour un %s', async (_label, refundAmount) => {
    await emails.sendBookingDecisionEmail('lea@example.com', {
      ...booking(),
      decision: 'refused',
      refundAmount,
    });

    expect(sent().text).not.toMatch(/intégralement remboursé/);
  });

  it('tolère un montant total absent', async () => {
    await emails.sendBookingDecisionEmail('lea@example.com', {
      ...booking({ totalAmount: undefined }),
      decision: 'confirmed',
    });

    expect(mockSendMail).toHaveBeenCalled();
  });
});

describe('annulation par le locataire', () => {
  it('adresse un sujet spécifique au propriétaire', async () => {
    await emails.sendBookingCancelledByLocataireEmail('proprio@example.com', {
      ...booking(),
      audience: 'proprietaire',
    });

    expect(sent().subject).toBe('Réservation annulée sur votre bateau "Pen Duick" — SailingLoc');
  });

  it('adresse un autre sujet au locataire', async () => {
    await emails.sendBookingCancelledByLocataireEmail('lea@example.com', {
      ...booking(),
      audience: 'locataire',
    });

    expect(sent().subject).not.toContain('votre bateau');
  });

  it('mentionne le remboursement quand il y en a un', async () => {
    await emails.sendBookingCancelledByLocataireEmail('lea@example.com', {
      ...booking(),
      audience: 'locataire',
      refundAmount: 700,
    });

    expect(sent().text).toMatch(/remboursé/);
  });
});

describe('décision de litige', () => {
  it.each([
    ['résolu', true, /résolu/],
    ['rejeté', false, /rejeté/],
  ])('annonce un litige %s', async (_label, resolved, subjectPattern) => {
    await emails.sendDisputeDecisionEmail('lea@example.com', {
      firstName: 'Lea',
      audience: 'locataire',
      resolved,
      boatName: 'Pen Duick',
      resolution: 'Dossier instruit.',
    });

    expect(sent().subject).toMatch(subjectPattern);
  });

  it('mentionne le remboursement accordé', async () => {
    await emails.sendDisputeDecisionEmail('lea@example.com', {
      firstName: 'Lea',
      audience: 'locataire',
      resolved: true,
      boatName: 'Pen Duick',
      resolution: 'Dossier instruit.',
      refund: { amount: 350, percent: 50, includesCommission: false },
    });

    expect(sent().html).toMatch(/350/);
  });

  it('signale un remboursement incluant la commission', async () => {
    await emails.sendDisputeDecisionEmail('lea@example.com', {
      firstName: 'Lea',
      audience: 'locataire',
      resolved: true,
      boatName: 'Pen Duick',
      resolution: 'Dossier instruit.',
      refund: { amount: 700, percent: 100, includesCommission: true },
    });

    expect(sent().html).toMatch(/700/);
  });

  it.each([
    ['remboursement nul', { amount: 0, percent: 0 }],
    ['remboursement absent', undefined],
  ])('n’affiche pas de bloc pour un %s', async (_label, refund) => {
    await emails.sendDisputeDecisionEmail('lea@example.com', {
      firstName: 'Lea',
      audience: 'locataire',
      resolved: false,
      boatName: 'Pen Duick',
      resolution: 'Dossier rejeté.',
      refund,
    });

    expect(sent().text).not.toMatch(/Remboursement :/);
  });

  it('s’adresse aussi au propriétaire', async () => {
    await emails.sendDisputeDecisionEmail('proprio@example.com', {
      firstName: 'Marie',
      audience: 'proprietaire',
      resolved: true,
      boatName: 'Pen Duick',
      resolution: 'Dossier instruit.',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});

describe('emails du cycle de vie du compte', () => {
  it('prévient de la suppression pour inactivité et pointe vers la connexion', async () => {
    await emails.sendInactivityNoticeEmail('jean@example.com', { firstName: 'Jean', days: 30 });

    expect(sent().subject).toBe('Votre compte SailingLoc sera supprimé dans 30 jours');
    expect(sent().html).toContain('https://sailingloc.fr/login');
  });

  it.each([
    ['sendAccountDeactivatedEmail', 'sendAccountDeactivatedEmail'],
    ['sendPauseNoticeEmail', 'sendPauseNoticeEmail'],
    ['sendAccountDeletionEmail', 'sendAccountDeletionEmail'],
  ])('%s envoie un message au destinataire', async (_label, fn) => {
    await emails[fn]('jean@example.com', { firstName: 'Jean', days: 30 });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(sent()).toMatchObject({
      to: 'jean@example.com',
      from: '"SailingLoc" <noreply@sailingloc.fr>',
    });
  });
});

describe('propagation des pannes SMTP', () => {
  it('laisse remonter une erreur d’envoi à l’appelant', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP indisponible'));

    await expect(emails.sendVerificationEmail('jean@example.com', 'jeton', 'Jean')).rejects.toThrow(
      'SMTP indisponible'
    );
  });
});
