import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  findUserByEmailAndRole,
  findUserByVerificationToken,
  createUser,
  updateUser,
} from '../repositories/userRepository.js';
import { sendVerificationEmail } from './emailService.js';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,}$/;
const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;

export async function create({
  first_name,
  last_name,
  email,
  password,
  confirmPassword,
  role,
  phone,
}) {
  if (!first_name || !last_name || !email || !password || !confirmPassword || !role) {
    throw Object.assign(new Error('Tous les champs obligatoires doivent être renseignés.'), {
      status: 400,
    });
  }

  const trimmedFirstName = String(first_name).trim();
  const trimmedLastName = String(last_name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (trimmedFirstName.length === 0 || trimmedFirstName.length > NAME_MAX_LENGTH) {
    throw Object.assign(new Error(`Le prénom doit contenir 1 à ${NAME_MAX_LENGTH} caractères.`), {
      status: 400,
    });
  }
  if (trimmedLastName.length === 0 || trimmedLastName.length > NAME_MAX_LENGTH) {
    throw Object.assign(new Error(`Le nom doit contenir 1 à ${NAME_MAX_LENGTH} caractères.`), {
      status: 400,
    });
  }
  if (normalizedEmail.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(normalizedEmail)) {
    throw Object.assign(new Error("Le format de l'email est invalide."), { status: 400 });
  }

  if (!['proprietaire', 'locataire'].includes(role)) {
    throw Object.assign(new Error('Rôle invalide.'), { status: 400 });
  }

  if (!PASSWORD_REGEX.test(password)) {
    throw Object.assign(
      new Error(
        'Le mot de passe doit contenir au moins 12 caractères, une majuscule et un caractère spécial.'
      ),
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    throw Object.assign(new Error('Les mots de passe ne correspondent pas.'), { status: 400 });
  }

  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
    throw Object.assign(new Error('Le numéro de téléphone est invalide.'), { status: 400 });
  }

  const existing = await findUserByEmailAndRole(normalizedEmail, role);
  if (existing) {
    // Réponse générique pour empêcher l'énumération d'emails inscrits.
    return { id_user: null, email: normalizedEmail, role };
  }

  const hashed = await bcrypt.hash(password, 12);
  const token = crypto.randomBytes(32).toString('hex');

  const user = await createUser({
    first_name: trimmedFirstName,
    last_name: trimmedLastName,
    email: normalizedEmail,
    password: hashed,
    role,
    phone: normalizedPhone || null,
    email_verified: false,
    email_verification_token: token,
  });

  try {
    await sendVerificationEmail(normalizedEmail, token, trimmedFirstName);
  } catch (emailErr) {
    console.error('[email] Échec envoi email de confirmation :', emailErr.message);
  }

  return { id_user: user.id_user, email: user.email, role: user.role };
}

export async function resendVerification({ email, role }) {
  if (!email || !role) {
    throw Object.assign(new Error('Email et rôle requis.'), { status: 400 });
  }
  if (!['proprietaire', 'locataire'].includes(role)) {
    throw Object.assign(new Error('Rôle invalide.'), { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserByEmailAndRole(normalizedEmail, role);

  // Réponse identique dans tous les cas pour bloquer l'énumération.
  if (!user || user.email_verified) return;

  const token = crypto.randomBytes(32).toString('hex');
  await updateUser(user.id_user, { email_verification_token: token });

  try {
    await sendVerificationEmail(normalizedEmail, token, user.first_name);
  } catch (emailErr) {
    console.error('[email] Échec renvoi email de confirmation :', emailErr.message);
  }
}

export async function verifyEmail(token) {
  if (!token) {
    throw Object.assign(new Error('Token manquant.'), { status: 400 });
  }

  const user = await findUserByVerificationToken(token);
  if (!user) {
    throw Object.assign(new Error('Token invalide ou expiré.'), { status: 404 });
  }

  await updateUser(user.id_user, {
    email_verified: true,
    email_verification_token: null,
  });
}