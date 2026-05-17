import nodemailer from 'nodemailer';
import { initConfig } from '../config/appConfig.js';

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

export async function sendVerificationEmail(to, token) {
  const { APP_URL, EMAIL_USER } = initConfig();
  const link = `${APP_URL}/verify-email?token=${token}`;

  await createTransporter().sendMail({
    from: '"SailingLoc" <noreply@sailingloc.fr>',
    to,
    subject: 'Confirmez votre inscription — SailingLoc',
    html: `
      <h2>Bienvenue sur SailingLoc !</h2>
      <p>Cliquez sur le lien ci-dessous pour valider votre adresse email :</p>
      <a href="${link}">${link}</a>
      <p>Ce lien est valable 24h.</p>
    `,
  });
}