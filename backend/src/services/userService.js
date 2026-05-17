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

export async function create({ first_name, last_name, email, password, confirmPassword, role }) {
  if (!first_name || !last_name || !email || !password || !confirmPassword || !role) {
    throw Object.assign(new Error('Tous les champs sont obligatoires.'), { status: 400 });
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

  const existing = await findUserByEmailAndRole(email, role);
  if (existing) {
    throw Object.assign(
      new Error(`Un compte ${role} existe déjà avec cet email.`),
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);
  const token = crypto.randomBytes(32).toString('hex');

  const user = await createUser({
    first_name,
    last_name,
    email,
    password: hashed,
    role,
    email_verified: false,
    email_verification_token: token,
  });

  try {
    await sendVerificationEmail(email, token);
  } catch (emailErr) {
    console.error('[email] Échec envoi email de confirmation :', emailErr.message);
  }

  return { id_user: user.id_user, email: user.email, role: user.role };
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