import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { initConfig } from '../config/appConfig.js';
import { mailgunApiTransport } from '../utils/mailgunTransport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../assets/email/logo.png');
const LOGO_CID = 'sailingloc-logo';

function createTransporter() {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_SECURE,
    EMAIL_IGNORE_TLS,
    MAILGUN_API_KEY,
    MAILGUN_DOMAIN,
    MAILGUN_HOST,
  } = initConfig();
  if (MAILGUN_API_KEY && MAILGUN_DOMAIN) {
    return nodemailer.createTransport(
      mailgunApiTransport({ apiKey: MAILGUN_API_KEY, domain: MAILGUN_DOMAIN, host: MAILGUN_HOST })
    );
  }
  const port = Number(EMAIL_PORT);
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port,
    // TLS implicite sur le port 465, ou si EMAIL_SECURE=true.
    secure: EMAIL_SECURE || port === 465,
    // TLS conservé par défaut (STARTTLS sur 587) ; désactivé seulement pour MailDev.
    ignoreTLS: EMAIL_IGNORE_TLS,
    ...(EMAIL_USER && EMAIL_PASS ? { auth: { user: EMAIL_USER, pass: EMAIL_PASS } } : {}),
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildVerificationEmail({ link, firstName, email }) {
  const safeLink = escapeHtml(link);
  const safeFirstName = escapeHtml(firstName);
  const safeEmail = escapeHtml(email);

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirmez votre inscription</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(10,49,114,0.08);">
            <tr>
              <td style="height:6px; line-height:6px; font-size:0; background-color:#0A3172; background:linear-gradient(90deg, #0A3172 0%, #5AB4EC 100%);">&nbsp;</td>
            </tr>

            <tr>
              <td style="background-color:#ffffff; padding:28px 32px 24px; text-align:center;">
                <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0; outline:none; text-decoration:none;" />
                <p style="margin:0; color:#5A7599; font-size:14px; font-style:italic;">Naviguez en toute liberté</p>
              </td>
            </tr>

            <tr>
              <td style="padding:40px 36px 24px;">
                <h2 style="margin:0 0 12px; color:#0A3172; font-size:22px; font-weight:700;">Bonjour ${safeFirstName},</h2>
                <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">
                  Un compte SailingLoc vient d'être créé avec l'adresse
                  <strong style="color:#0A3172;">${safeEmail}</strong>.
                </p>
                <p style="margin:0 0 20px; color:#334155; font-size:15px; line-height:1.6;">
                  Pour activer votre compte et commencer à explorer nos bateaux, confirmez votre
                  adresse email en cliquant sur le bouton ci-dessous.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">
                  <tr>
                    <td align="center" style="border-radius:999px; background-color:#0A3172;">
                      <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                         style="display:inline-block; padding:14px 36px; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:999px;">
                        Confirmer mon email
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 8px; color:#64748b; font-size:13px; line-height:1.6;">
                  Le bouton ne fonctionne pas ? Copiez-collez ce lien dans votre navigateur :
                </p>
                <p style="margin:0; padding:12px 14px; background-color:#f1f5f9; border-radius:8px; word-break:break-all; font-family: 'Courier New', monospace; font-size:12px; color:#0A3172;">
                  <a href="${safeLink}" style="color:#0A3172; text-decoration:none;">${safeLink}</a>
                </p>

                <p style="margin:28px 0 0; padding:14px 16px; background-color:#fef3c7; border-left:3px solid #f59e0b; border-radius:6px; color:#78350f; font-size:13px; line-height:1.5;">
                  Ce lien expire dans <strong>24 heures</strong>. Si vous n'êtes pas à l'origine de
                  cette inscription, ignorez simplement cet email — aucun compte ne sera activé sans
                  votre confirmation.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 36px 32px; border-top:1px solid #e2e8f0; background-color:#fafbfd;">
                <p style="margin:0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
                  © ${new Date().getFullYear()} SailingLoc — Tous droits réservés.<br />
                  Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${firstName},

Un compte SailingLoc vient d'être créé avec l'adresse ${email}.

Pour activer votre compte, confirmez votre adresse email en ouvrant le lien suivant :
${link}

Ce lien expire dans 24 heures.
Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email — aucun compte ne sera activé sans votre confirmation.

— L'équipe SailingLoc`;

  return { html, text };
}

function buildResetEmail({ link, firstName, email }) {
  const safeLink = escapeHtml(link);
  const safeFirstName = escapeHtml(firstName);
  const safeEmail = escapeHtml(email);

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Réinitialisation de votre mot de passe</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(10,49,114,0.08);">
            <tr>
              <td style="height:6px; line-height:6px; font-size:0; background-color:#0A3172; background:linear-gradient(90deg, #0A3172 0%, #5AB4EC 100%);">&nbsp;</td>
            </tr>

            <tr>
              <td style="background-color:#ffffff; padding:28px 32px 24px; text-align:center;">
                <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0; outline:none; text-decoration:none;" />
                <p style="margin:0; color:#5A7599; font-size:14px; font-style:italic;">Réinitialisation de mot de passe</p>
              </td>
            </tr>

            <tr>
              <td style="padding:40px 36px 24px;">
                <h2 style="margin:0 0 12px; color:#0A3172; font-size:22px; font-weight:700;">Bonjour ${safeFirstName},</h2>
                <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">
                  Une demande de réinitialisation du mot de passe a été reçue pour le compte
                  <strong style="color:#0A3172;">${safeEmail}</strong>.
                </p>
                <p style="margin:0 0 20px; color:#334155; font-size:15px; line-height:1.6;">
                  Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">
                  <tr>
                    <td align="center" style="border-radius:999px; background-color:#0A3172;">
                      <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                         style="display:inline-block; padding:14px 36px; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:999px;">
                        Réinitialiser mon mot de passe
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 8px; color:#64748b; font-size:13px; line-height:1.6;">
                  Le bouton ne fonctionne pas ? Copiez-collez ce lien dans votre navigateur :
                </p>
                <p style="margin:0; padding:12px 14px; background-color:#f1f5f9; border-radius:8px; word-break:break-all; font-family: 'Courier New', monospace; font-size:12px; color:#0A3172;">
                  <a href="${safeLink}" style="color:#0A3172; text-decoration:none;">${safeLink}</a>
                </p>

                <p style="margin:28px 0 0; padding:14px 16px; background-color:#fef3c7; border-left:3px solid #f59e0b; border-radius:6px; color:#78350f; font-size:13px; line-height:1.5;">
                  Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas demandé cette
                  réinitialisation, ignorez cet email — votre mot de passe actuel reste valide.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 36px 32px; border-top:1px solid #e2e8f0; background-color:#fafbfd;">
                <p style="margin:0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
                  © ${new Date().getFullYear()} SailingLoc — Tous droits réservés.<br />
                  Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${firstName},

Une demande de réinitialisation du mot de passe a été reçue pour le compte ${email}.

Cliquez sur le lien suivant pour choisir un nouveau mot de passe :
${link}

Ce lien expire dans 1 heure.
Si vous n'avez pas demandé cette réinitialisation, ignorez cet email — votre mot de passe actuel reste valide.

— L'équipe SailingLoc`;

  return { html, text };
}

function buildAccountCreatedEmail({ link, firstName, email }) {
  const safeLink = escapeHtml(link);
  const safeFirstName = escapeHtml(firstName);
  const safeEmail = escapeHtml(email);

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Votre compte SailingLoc a été créé</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(10,49,114,0.08);">
            <tr>
              <td style="height:6px; line-height:6px; font-size:0; background-color:#0A3172; background:linear-gradient(90deg, #0A3172 0%, #5AB4EC 100%);">&nbsp;</td>
            </tr>

            <tr>
              <td style="background-color:#ffffff; padding:28px 32px 24px; text-align:center;">
                <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0; outline:none; text-decoration:none;" />
                <p style="margin:0; color:#5A7599; font-size:14px; font-style:italic;">Bienvenue à bord</p>
              </td>
            </tr>

            <tr>
              <td style="padding:40px 36px 24px;">
                <h2 style="margin:0 0 12px; color:#0A3172; font-size:22px; font-weight:700;">Bonjour ${safeFirstName},</h2>
                <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">
                  Un compte SailingLoc vient d'être créé pour vous avec l'adresse
                  <strong style="color:#0A3172;">${safeEmail}</strong> par notre équipe.
                </p>
                <p style="margin:0 0 20px; color:#334155; font-size:15px; line-height:1.6;">
                  Pour des raisons de sécurité, aucun mot de passe n'a été défini. Cliquez sur le
                  bouton ci-dessous pour choisir votre mot de passe et accéder à votre compte.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">
                  <tr>
                    <td align="center" style="border-radius:999px; background-color:#0A3172;">
                      <a href="${safeLink}" target="_blank" rel="noopener noreferrer"
                         style="display:inline-block; padding:14px 36px; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:999px;">
                        Définir mon mot de passe
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 8px; color:#64748b; font-size:13px; line-height:1.6;">
                  Le bouton ne fonctionne pas ? Copiez-collez ce lien dans votre navigateur :
                </p>
                <p style="margin:0; padding:12px 14px; background-color:#f1f5f9; border-radius:8px; word-break:break-all; font-family: 'Courier New', monospace; font-size:12px; color:#0A3172;">
                  <a href="${safeLink}" style="color:#0A3172; text-decoration:none;">${safeLink}</a>
                </p>

                <p style="margin:28px 0 0; padding:14px 16px; background-color:#fef3c7; border-left:3px solid #f59e0b; border-radius:6px; color:#78350f; font-size:13px; line-height:1.5;">
                  Ce lien expire dans <strong>24 heures</strong>. Si vous n'attendiez pas la création
                  de ce compte, ignorez simplement cet email.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 36px 32px; border-top:1px solid #e2e8f0; background-color:#fafbfd;">
                <p style="margin:0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
                  © ${new Date().getFullYear()} SailingLoc — Tous droits réservés.<br />
                  Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${firstName},

Un compte SailingLoc vient d'être créé pour vous avec l'adresse ${email} par notre équipe.

Pour des raisons de sécurité, aucun mot de passe n'a été défini. Ouvrez le lien suivant pour choisir votre mot de passe et accéder à votre compte :
${link}

Ce lien expire dans 24 heures.
Si vous n'attendiez pas la création de ce compte, ignorez simplement cet email.

— L'équipe SailingLoc`;

  return { html, text };
}

export async function sendAccountCreatedEmail(to, token, firstName) {
  const { APP_URL } = initConfig();
  const link = `${APP_URL}/reset-password?token=${token}`;
  const { html, text } = buildAccountCreatedEmail({ link, firstName, email: to });

  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject: 'Votre compte SailingLoc a été créé — définissez votre mot de passe',
    html,
    text,
    attachments: [
      {
        filename: 'sailingloc-logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}

function buildBoatUnpublishedEmail({ firstName, boatName }) {
  const safeFirstName = escapeHtml(firstName);
  const safeBoat = escapeHtml(boatName);

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Annonce retirée</title></head>
  <body style="margin:0; padding:0; background-color:#f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(10,49,114,0.08);">
          <tr><td style="height:6px; line-height:6px; font-size:0; background-color:#0A3172; background:linear-gradient(90deg, #0A3172 0%, #5AB4EC 100%);">&nbsp;</td></tr>
          <tr><td style="background-color:#ffffff; padding:28px 32px 24px; text-align:center;">
            <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0;" />
            <p style="margin:0; color:#5A7599; font-size:14px; font-style:italic;">Modération des annonces</p>
          </td></tr>
          <tr><td style="padding:40px 36px 24px;">
            <h2 style="margin:0 0 12px; color:#0A3172; font-size:22px; font-weight:700;">Bonjour ${safeFirstName},</h2>
            <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">
              Votre annonce <strong style="color:#0A3172;">${safeBoat}</strong> a été <strong>retirée</strong> de SailingLoc
              par notre équipe de modération pour <strong>non-respect des règles</strong> de la plateforme.
            </p>
            <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">
              L'annonce n'est plus visible par les locataires. Pour comprendre la raison ou contester cette décision,
              répondez aux exigences de nos conditions d'utilisation puis contactez notre support afin de demander une nouvelle vérification.
            </p>
            <p style="margin:28px 0 0; padding:14px 16px; background-color:#fef3c7; border-left:3px solid #f59e0b; border-radius:6px; color:#78350f; font-size:13px; line-height:1.5;">
              Toute récidive peut entraîner la suspension de votre compte propriétaire.
            </p>
          </td></tr>
          <tr><td style="padding:24px 36px 32px; border-top:1px solid #e2e8f0; background-color:#fafbfd;">
            <p style="margin:0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
              © ${new Date().getFullYear()} SailingLoc — Tous droits réservés.<br />Cet email a été envoyé automatiquement.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${firstName},

Votre annonce "${boatName}" a été retirée de SailingLoc par notre équipe de modération pour non-respect des règles de la plateforme.

L'annonce n'est plus visible par les locataires. Pour comprendre la raison ou contester, contactez notre support.

Toute récidive peut entraîner la suspension de votre compte propriétaire.

— L'équipe SailingLoc`;

  return { html, text };
}

function buildBoatRepublishedEmail({ firstName, boatName }) {
  const safeFirstName = escapeHtml(firstName);
  const safeBoat = escapeHtml(boatName);

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Annonce de nouveau en ligne</title></head>
  <body style="margin:0; padding:0; background-color:#f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(10,49,114,0.08);">
          <tr><td style="height:6px; line-height:6px; font-size:0; background-color:#0A3172; background:linear-gradient(90deg, #0A3172 0%, #5AB4EC 100%);">&nbsp;</td></tr>
          <tr><td style="background-color:#ffffff; padding:28px 32px 24px; text-align:center;">
            <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0;" />
            <p style="margin:0; color:#5A7599; font-size:14px; font-style:italic;">Votre annonce est en ligne</p>
          </td></tr>
          <tr><td style="padding:40px 36px 24px;">
            <h2 style="margin:0 0 12px; color:#0A3172; font-size:22px; font-weight:700;">Bonjour ${safeFirstName},</h2>
            <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">
              Bonne nouvelle : votre annonce <strong style="color:#0A3172;">${safeBoat}</strong> est de nouveau
              <strong>publiée et visible</strong> par les locataires sur SailingLoc.
            </p>
            <p style="margin:0; color:#334155; font-size:15px; line-height:1.6;">
              Aucune action de votre part n'est nécessaire. Merci de votre confiance.
            </p>
          </td></tr>
          <tr><td style="padding:24px 36px 32px; border-top:1px solid #e2e8f0; background-color:#fafbfd;">
            <p style="margin:0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
              © ${new Date().getFullYear()} SailingLoc — Tous droits réservés.<br />Cet email a été envoyé automatiquement.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${firstName},

Bonne nouvelle : votre annonce "${boatName}" est de nouveau publiée et visible par les locataires sur SailingLoc.

Aucune action de votre part n'est nécessaire.

— L'équipe SailingLoc`;

  return { html, text };
}

export async function sendBoatRepublishedEmail(to, { firstName, boatName }) {
  const { html, text } = buildBoatRepublishedEmail({ firstName, boatName });
  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject: `Votre annonce "${boatName}" est de nouveau en ligne — SailingLoc`,
    html,
    text,
    attachments: [
      {
        filename: 'sailingloc-logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}

export async function sendBoatUnpublishedEmail(to, { firstName, boatName }) {
  const { html, text } = buildBoatUnpublishedEmail({ firstName, boatName });
  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject: `Votre annonce "${boatName}" a été retirée — SailingLoc`,
    html,
    text,
    attachments: [
      {
        filename: 'sailingloc-logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}

const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

function buildDisputeDecisionEmail({
  firstName,
  audience,
  resolved,
  boatName,
  resolution,
  refund,
}) {
  const safeFirstName = escapeHtml(firstName);
  const safeBoat = escapeHtml(boatName || '');
  const safeResolution = escapeHtml(resolution || '');
  const verdict = resolved ? 'résolu' : 'rejeté';
  const accent = resolved ? '#10b981' : '#ef4444';

  // Bloc remboursement : présent seulement si un montant a été remboursé.
  // Phrase différente pour le locataire (qui reçoit) et le propriétaire (qui est informé).
  let refundHtml = '';
  let refundText = '';
  if (refund && refund.amount > 0) {
    const amountFmt = EUR.format(refund.amount);
    const pct = Number(refund.percent);
    const commissionNote = refund.includesCommission
      ? ' (commission incluse)'
      : ' (commission SailingLoc conservée)';
    const refundIntro =
      audience === 'proprietaire'
        ? `Un remboursement de <strong style="color:#10b981;">${amountFmt}</strong> (soit <strong>${pct}%</strong> du montant payé${commissionNote}) a été accordé au locataire.`
        : `Un remboursement de <strong style="color:#10b981;">${amountFmt}</strong> (soit <strong>${pct}%</strong> du montant payé${commissionNote}) sera crédité sur votre moyen de paiement initial sous quelques jours.`;
    refundHtml = `
            <div style="margin:20px 0 0; padding:16px 18px; background-color:#ecfdf5; border-left:4px solid #10b981; border-radius:8px;">
              <p style="margin:0 0 6px; color:#065f46; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Remboursement</p>
              <p style="margin:0; color:#064e3b; font-size:14px; line-height:1.6;">${refundIntro}</p>
            </div>`;
    refundText =
      audience === 'proprietaire'
        ? `\nRemboursement : ${amountFmt} (${pct}% du montant payé${commissionNote}) accordé au locataire.\n`
        : `\nRemboursement : ${amountFmt} (${pct}% du montant payé${commissionNote}) sera crédité sur votre moyen de paiement initial sous quelques jours.\n`;
  }

  // Message distinct selon le destinataire.
  const introHtml =
    audience === 'proprietaire'
      ? `Le litige concernant la réservation de votre bateau${safeBoat ? ` <strong style="color:#0A3172;">${safeBoat}</strong>` : ''} a été <strong style="color:${accent};">${verdict}</strong> par notre équipe.`
      : `Le litige concernant votre réservation${safeBoat ? ` du bateau <strong style="color:#0A3172;">${safeBoat}</strong>` : ''} a été <strong style="color:${accent};">${verdict}</strong> par notre équipe.`;
  const introText =
    audience === 'proprietaire'
      ? `Le litige concernant la réservation de votre bateau${boatName ? ` "${boatName}"` : ''} a été ${verdict} par notre équipe.`
      : `Le litige concernant votre réservation${boatName ? ` du bateau "${boatName}"` : ''} a été ${verdict} par notre équipe.`;

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Litige traité</title></head>
  <body style="margin:0; padding:0; background-color:#f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(10,49,114,0.08);">
          <tr><td style="height:6px; line-height:6px; font-size:0; background-color:#0A3172; background:linear-gradient(90deg, #0A3172 0%, #5AB4EC 100%);">&nbsp;</td></tr>
          <tr><td style="background-color:#ffffff; padding:28px 32px 24px; text-align:center;">
            <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0;" />
            <p style="margin:0; color:#5A7599; font-size:14px; font-style:italic;">Gestion des litiges</p>
          </td></tr>
          <tr><td style="padding:40px 36px 24px;">
            <h2 style="margin:0 0 12px; color:#0A3172; font-size:22px; font-weight:700;">Bonjour ${safeFirstName},</h2>
            <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">${introHtml}</p>
            ${
              safeResolution
                ? `<p style="margin:0 0 8px; color:#64748b; font-size:13px;">Décision / motif :</p>
            <p style="margin:0; padding:14px 16px; background-color:#f1f5f9; border-radius:8px; color:#334155; font-size:14px; line-height:1.6;">${safeResolution}</p>`
                : ''
            }${refundHtml}
            <p style="margin:24px 0 0; color:#334155; font-size:14px; line-height:1.6;">
              Pour toute question, contactez notre support.
            </p>
          </td></tr>
          <tr><td style="padding:24px 36px 32px; border-top:1px solid #e2e8f0; background-color:#fafbfd;">
            <p style="margin:0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
              © ${new Date().getFullYear()} SailingLoc — Tous droits réservés.<br />Cet email a été envoyé automatiquement.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${firstName},

${introText}
${resolution ? `\nDécision / motif : ${resolution}\n` : ''}${refundText}
Pour toute question, contactez notre support.

— L'équipe SailingLoc`;

  return { html, text };
}

export async function sendDisputeDecisionEmail(
  to,
  { firstName, audience, resolved, boatName, resolution, refund }
) {
  const { html, text } = buildDisputeDecisionEmail({
    firstName,
    audience,
    resolved,
    boatName,
    resolution,
    refund,
  });
  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject: `Votre litige a été ${resolved ? 'résolu' : 'rejeté'} — SailingLoc`,
    html,
    text,
    attachments: [
      {
        filename: 'sailingloc-logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}

const EMAIL_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

// Libellés par décision du propriétaire sur une réservation.
const BOOKING_DECISIONS = {
  confirmed: {
    tagline: 'Réservation confirmée',
    verdict: 'confirmée',
    accent: '#10b981',
    outro: 'Préparez votre navigation — le propriétaire vous attend. Bon vent !',
  },
  refused: {
    tagline: 'Demande refusée',
    verdict: 'refusée',
    accent: '#ef4444',
    outro:
      'Aucun montant ne vous sera prélevé. Découvrez d’autres bateaux disponibles sur SailingLoc.',
  },
  cancelled: {
    tagline: 'Réservation annulée',
    verdict: 'annulée',
    accent: '#f59e0b',
    outro:
      'Si un paiement a déjà été effectué, notre équipe reviendra vers vous concernant son remboursement.',
  },
};

// Bloc « Remboursement » (vert) inséré quand un paiement encaissé vient d'être
// remboursé automatiquement, avec sa déclinaison texte brut.
function refundBlocks(refundAmount) {
  if (!(Number(refundAmount) > 0)) return { html: '', text: '' };
  const amountFmt = EUR.format(Number(refundAmount));
  return {
    html: `
            <div style="margin:20px 0 0; padding:16px 18px; background-color:#ecfdf5; border-left:4px solid #10b981; border-radius:8px;">
              <p style="margin:0 0 6px; color:#065f46; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Remboursement</p>
              <p style="margin:0; color:#064e3b; font-size:14px; line-height:1.6;">Votre paiement de <strong>${amountFmt}</strong> vous est intégralement remboursé : le montant sera recrédité sur votre moyen de paiement initial sous quelques jours.</p>
            </div>`,
    text: `\nRemboursement : votre paiement de ${amountFmt} vous est intégralement remboursé (recrédité sur votre moyen de paiement initial sous quelques jours).\n`,
  };
}

function buildBookingDecisionEmail({
  firstName,
  decision,
  boatName,
  startDate,
  endDate,
  totalAmount,
  reason,
  refundAmount,
}) {
  const meta = BOOKING_DECISIONS[decision];
  const safeFirstName = escapeHtml(firstName);
  const safeBoat = escapeHtml(boatName || '');
  const safeReason = escapeHtml(reason || '');
  const period = `du ${EMAIL_DATE.format(new Date(startDate))} au ${EMAIL_DATE.format(new Date(endDate))}`;
  const amountFmt = EUR.format(Number(totalAmount) || 0);
  const refund = refundBlocks(refundAmount);
  // Le bloc remboursement rend l'outro « notre équipe reviendra vers vous »
  // obsolète pour une annulation déjà remboursée.
  const outro =
    decision === 'cancelled' && refund.html
      ? 'Nous espérons vous revoir bientôt sur SailingLoc !'
      : meta.outro;

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${meta.tagline}</title></head>
  <body style="margin:0; padding:0; background-color:#f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(10,49,114,0.08);">
          <tr><td style="height:6px; line-height:6px; font-size:0; background-color:#0A3172; background:linear-gradient(90deg, #0A3172 0%, #5AB4EC 100%);">&nbsp;</td></tr>
          <tr><td style="background-color:#ffffff; padding:28px 32px 24px; text-align:center;">
            <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0;" />
            <p style="margin:0; color:#5A7599; font-size:14px; font-style:italic;">${meta.tagline}</p>
          </td></tr>
          <tr><td style="padding:40px 36px 24px;">
            <h2 style="margin:0 0 12px; color:#0A3172; font-size:22px; font-weight:700;">Bonjour ${safeFirstName},</h2>
            <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">
              Votre réservation du bateau <strong style="color:#0A3172;">${safeBoat}</strong> ${period}
              a été <strong style="color:${meta.accent};">${meta.verdict}</strong> par le propriétaire.
            </p>
            <div style="margin:20px 0 0; padding:16px 18px; background-color:#f1f5f9; border-radius:8px;">
              <p style="margin:0 0 6px; color:#64748b; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Récapitulatif</p>
              <p style="margin:0; color:#334155; font-size:14px; line-height:1.8;">
                Bateau : <strong>${safeBoat}</strong><br />
                Dates : ${period}<br />
                Montant : <strong>${amountFmt}</strong>
              </p>
            </div>
            ${refund.html}
            ${
              safeReason
                ? `<p style="margin:20px 0 8px; color:#64748b; font-size:13px;">Motif :</p>
            <p style="margin:0; padding:14px 16px; background-color:#fef3c7; border-left:3px solid #f59e0b; border-radius:6px; color:#78350f; font-size:14px; line-height:1.6;">${safeReason}</p>`
                : ''
            }
            <p style="margin:24px 0 0; color:#334155; font-size:14px; line-height:1.6;">${outro}</p>
          </td></tr>
          <tr><td style="padding:24px 36px 32px; border-top:1px solid #e2e8f0; background-color:#fafbfd;">
            <p style="margin:0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
              © ${new Date().getFullYear()} SailingLoc — Tous droits réservés.<br />Cet email a été envoyé automatiquement.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${firstName},

Votre réservation du bateau "${boatName}" ${period} a été ${meta.verdict} par le propriétaire.

Récapitulatif :
- Bateau : ${boatName}
- Dates : ${period}
- Montant : ${amountFmt}
${refund.text}${reason ? `\nMotif : ${reason}\n` : ''}
${outro}

— L'équipe SailingLoc`;

  return { html, text };
}

// Informe le locataire de la décision du propriétaire sur sa réservation
// (decision : 'confirmed' | 'refused' | 'cancelled'). `refundAmount` ajoute la
// confirmation du remboursement automatique quand un paiement était encaissé.
export async function sendBookingDecisionEmail(
  to,
  { firstName, decision, boatName, startDate, endDate, totalAmount, reason, refundAmount }
) {
  const meta = BOOKING_DECISIONS[decision];
  if (!meta) throw new Error(`Décision de réservation inconnue : ${decision}`);
  const { html, text } = buildBookingDecisionEmail({
    firstName,
    decision,
    boatName,
    startDate,
    endDate,
    totalAmount,
    reason,
    refundAmount,
  });
  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject: `Votre réservation du bateau "${boatName}" a été ${meta.verdict} — SailingLoc`,
    html,
    text,
    attachments: [
      {
        filename: 'sailingloc-logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}

function buildBookingCancelledByLocataireEmail({
  firstName,
  audience,
  boatName,
  startDate,
  endDate,
  totalAmount,
  reason,
  refundAmount,
}) {
  const safeFirstName = escapeHtml(firstName);
  const safeBoat = escapeHtml(boatName || '');
  const safeReason = escapeHtml(reason || '');
  const period = `du ${EMAIL_DATE.format(new Date(startDate))} au ${EMAIL_DATE.format(new Date(endDate))}`;
  const amountFmt = EUR.format(Number(totalAmount) || 0);
  const isOwner = audience === 'proprietaire';
  const refund = isOwner ? { html: '', text: '' } : refundBlocks(refundAmount);

  const introHtml = isOwner
    ? `La réservation de votre bateau <strong style="color:#0A3172;">${safeBoat}</strong> ${period} a été <strong style="color:#f59e0b;">annulée</strong> par le locataire.`
    : `Votre annulation de la réservation du bateau <strong style="color:#0A3172;">${safeBoat}</strong> ${period} est bien prise en compte.`;
  const introText = isOwner
    ? `La réservation de votre bateau "${boatName}" ${period} a été annulée par le locataire.`
    : `Votre annulation de la réservation du bateau "${boatName}" ${period} est bien prise en compte.`;
  const outro = isOwner
    ? 'Les dates concernées sont à nouveau ouvertes à la réservation' +
      (Number(refundAmount) > 0
        ? ' ; le paiement du locataire lui a été intégralement remboursé automatiquement.'
        : '.')
    : Number(refundAmount) > 0
      ? 'Nous espérons vous revoir bientôt sur SailingLoc !'
      : 'Aucun montant ne vous a été débité. Nous espérons vous revoir bientôt sur SailingLoc !';

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Réservation annulée</title></head>
  <body style="margin:0; padding:0; background-color:#f4f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fa; padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 20px rgba(10,49,114,0.08);">
          <tr><td style="height:6px; line-height:6px; font-size:0; background-color:#0A3172; background:linear-gradient(90deg, #0A3172 0%, #5AB4EC 100%);">&nbsp;</td></tr>
          <tr><td style="background-color:#ffffff; padding:28px 32px 24px; text-align:center;">
            <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0;" />
            <p style="margin:0; color:#5A7599; font-size:14px; font-style:italic;">Réservation annulée</p>
          </td></tr>
          <tr><td style="padding:40px 36px 24px;">
            <h2 style="margin:0 0 12px; color:#0A3172; font-size:22px; font-weight:700;">Bonjour ${safeFirstName},</h2>
            <p style="margin:0 0 16px; color:#334155; font-size:15px; line-height:1.6;">${introHtml}</p>
            <div style="margin:20px 0 0; padding:16px 18px; background-color:#f1f5f9; border-radius:8px;">
              <p style="margin:0 0 6px; color:#64748b; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Récapitulatif</p>
              <p style="margin:0; color:#334155; font-size:14px; line-height:1.8;">
                Bateau : <strong>${safeBoat}</strong><br />
                Dates : ${period}<br />
                Montant : <strong>${amountFmt}</strong>
              </p>
            </div>
            ${refund.html}
            ${
              safeReason
                ? `<p style="margin:20px 0 8px; color:#64748b; font-size:13px;">Motif :</p>
            <p style="margin:0; padding:14px 16px; background-color:#fef3c7; border-left:3px solid #f59e0b; border-radius:6px; color:#78350f; font-size:14px; line-height:1.6;">${safeReason}</p>`
                : ''
            }
            <p style="margin:24px 0 0; color:#334155; font-size:14px; line-height:1.6;">${outro}</p>
          </td></tr>
          <tr><td style="padding:24px 36px 32px; border-top:1px solid #e2e8f0; background-color:#fafbfd;">
            <p style="margin:0; text-align:center; color:#94a3b8; font-size:12px; line-height:1.5;">
              © ${new Date().getFullYear()} SailingLoc — Tous droits réservés.<br />Cet email a été envoyé automatiquement.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${firstName},

${introText}

Récapitulatif :
- Bateau : ${boatName}
- Dates : ${period}
- Montant : ${amountFmt}
${refund.text}${reason ? `\nMotif : ${reason}\n` : ''}
${outro}

— L'équipe SailingLoc`;

  return { html, text };
}

// Annulation par le locataire : prévient le propriétaire (audience
// 'proprietaire') que le créneau se libère, et confirme au locataire
// (audience 'locataire') son annulation et son éventuel remboursement.
export async function sendBookingCancelledByLocataireEmail(
  to,
  { audience, firstName, boatName, startDate, endDate, totalAmount, reason, refundAmount }
) {
  const { html, text } = buildBookingCancelledByLocataireEmail({
    audience,
    firstName,
    boatName,
    startDate,
    endDate,
    totalAmount,
    reason,
    refundAmount,
  });
  const subject =
    audience === 'proprietaire'
      ? `Réservation annulée sur votre bateau "${boatName}" — SailingLoc`
      : `Annulation de votre réservation "${boatName}"${Number(refundAmount) > 0 ? ' et remboursement' : ''} — SailingLoc`;
  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject,
    html,
    text,
    attachments: [
      {
        filename: 'sailingloc-logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}

export async function sendPasswordResetEmail(to, token, firstName) {
  const { APP_URL } = initConfig();
  const link = `${APP_URL}/reset-password?token=${token}`;
  const { html, text } = buildResetEmail({ link, firstName, email: to });

  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject: 'Réinitialisation de votre mot de passe — SailingLoc',
    html,
    text,
    attachments: [
      {
        filename: 'sailingloc-logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}

export async function sendVerificationEmail(to, token, firstName) {
  const { APP_URL } = initConfig();
  const link = `${APP_URL}/verify-email?token=${token}`;
  const { html, text } = buildVerificationEmail({ link, firstName, email: to });

  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject: 'Confirmez votre inscription — SailingLoc',
    html,
    text,
    attachments: [
      {
        filename: 'sailingloc-logo.png',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}
