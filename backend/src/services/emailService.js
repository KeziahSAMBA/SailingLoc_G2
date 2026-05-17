import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { initConfig } from '../config/appConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../assets/email/logo.webp');
const LOGO_CID = 'sailingloc-logo';

function createTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = initConfig();
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: false,
    ignoreTLS: true,
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
              <td style="background:linear-gradient(135deg, #0A3172 0%, #5AB4EC 100%); padding:32px 32px 28px; text-align:center;">
                <img src="cid:${LOGO_CID}" alt="SailingLoc" width="220" style="display:block; margin:0 auto 12px; max-width:220px; height:auto; border:0; outline:none; text-decoration:none;" />
                <p style="margin:0; color:rgba(255,255,255,0.9); font-size:14px; font-style:italic;">Naviguez en toute liberté</p>
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
        filename: 'sailingloc-logo.webp',
        path: LOGO_PATH,
        cid: LOGO_CID,
        contentDisposition: 'inline',
      },
    ],
  });
}