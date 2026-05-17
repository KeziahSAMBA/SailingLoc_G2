import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  findUserByEmailAndRole,
  findUserByVerificationToken,
  findUserById,
  createUser,
  updateUser,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from '../repositories/userRepository.js';
import { sendVerificationEmail } from './emailService.js';
import { initConfig } from '../config/appConfig.js';

const { JWT_SECRET } = initConfig();
const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DUMMY_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8eVCD7vYz3uTtbpcLzqAOJBT5VnYf6';

function publicUser(user) {
  return {
    id_user: user.id_user,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id_user: user.id_user,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function issueRefreshToken(id_user, userAgent) {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const token_hash = hashToken(rawToken);
  const expires_at = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await createRefreshToken({
    id_user,
    token_hash,
    expires_at,
    user_agent: userAgent ? userAgent.slice(0, 255) : null,
  });
  return rawToken;
}

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

export async function login({ email, password, role }, { userAgent } = {}) {
  const genericInvalid = Object.assign(new Error('Identifiants invalides.'), { status: 401 });

  if (!email || !password || !role) throw genericInvalid;
  if (!['proprietaire', 'locataire', 'admin'].includes(role)) throw genericInvalid;

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserByEmailAndRole(normalizedEmail, role);

  const hashToCompare = user ? user.password : DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hashToCompare);

  if (!user || !passwordOk) throw genericInvalid;

  if (!user.is_active) {
    throw Object.assign(new Error('Compte désactivé. Contactez le support.'), { status: 403 });
  }

  if (!user.email_verified) {
    throw Object.assign(
      new Error('Email non confirmé. Vérifiez votre boîte mail pour activer votre compte.'),
      { status: 403 }
    );
  }

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id_user, userAgent);

  return { accessToken, refreshToken, user: publicUser(user) };
}

export async function refreshSession(rawRefreshToken, { userAgent } = {}) {
  const invalid = Object.assign(new Error('Session expirée. Reconnectez-vous.'), { status: 401 });
  if (!rawRefreshToken) throw invalid;

  const token_hash = hashToken(rawRefreshToken);
  const stored = await findRefreshTokenByHash(token_hash);

  if (!stored) throw invalid;

  // Détection de réutilisation : token déjà révoqué = compromission potentielle.
  if (stored.revoked_at) {
    await revokeAllUserRefreshTokens(stored.id_user);
    throw Object.assign(
      new Error('Session compromise détectée. Reconnectez-vous.'),
      { status: 401 }
    );
  }

  if (stored.expires_at < new Date()) throw invalid;

  const user = await findUserById(stored.id_user);
  if (!user || !user.is_active) throw invalid;

  // Rotation : on révoque l'ancien et on émet un nouveau couple.
  await revokeRefreshToken(stored.id_refresh);
  const accessToken = signAccessToken(user);
  const newRefreshToken = await issueRefreshToken(user.id_user, userAgent);

  return { accessToken, refreshToken: newRefreshToken, user: publicUser(user) };
}

export async function logoutSession(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const token_hash = hashToken(rawRefreshToken);
  const stored = await findRefreshTokenByHash(token_hash);
  if (stored && !stored.revoked_at) {
    await revokeRefreshToken(stored.id_refresh);
  }
}

export async function getCurrentUser(id_user) {
  const user = await findUserById(id_user);
  if (!user || !user.is_active) {
    throw Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  }
  return publicUser(user);
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