import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  findUserByEmailAndRole,
  findUserByVerificationToken,
  findUserByResetToken,
  findUserById,
  createUser,
  updateUser,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from '../repositories/userRepository.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAccountCreatedEmail,
} from './emailService.js';
import { initConfig } from '../config/appConfig.js';

const { JWT_SECRET } = initConfig();
const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SET_PASSWORD_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h pour définir son mdp après création
const DUMMY_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8eVCD7vYz3uTtbpcLzqAOJBT5VnYf6';

function publicUser(user) {
  return {
    id_user: user.id_user,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    // Photo de profil déposée par l'utilisateur (null → avatar généré côté front).
    avatar: user.images?.[0]?.url ?? null,
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

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,}$/;
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
        'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un caractère spécial.'
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

export async function adminCreate({ first_name, last_name, email, role, phone }) {
  if (!first_name || !last_name || !email || !role) {
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

  if (!['admin', 'proprietaire', 'locataire'].includes(role)) {
    throw Object.assign(new Error('Rôle invalide.'), { status: 400 });
  }

  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
    throw Object.assign(new Error('Le numéro de téléphone est invalide.'), { status: 400 });
  }

  // Côté admin, on remonte le vrai conflit : pas de risque d'énumération depuis une session admin.
  const existing = await findUserByEmailAndRole(normalizedEmail, role);
  if (existing) {
    throw Object.assign(new Error('Un utilisateur avec cet email et ce rôle existe déjà.'), {
      status: 409,
    });
  }

  // L'admin ne saisit aucun mot de passe : on pose un hash aléatoire inutilisable.
  // L'utilisateur définit le sien via un lien sécurisé (jeton à usage unique, 24h).
  const placeholderPassword = crypto.randomBytes(32).toString('hex');
  const hashed = await bcrypt.hash(placeholderPassword, 12);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SET_PASSWORD_TOKEN_TTL_MS);

  const user = await createUser({
    first_name: trimmedFirstName,
    last_name: trimmedLastName,
    email: normalizedEmail,
    password: hashed,
    role,
    phone: normalizedPhone || null,
    email_verified: true,
    email_verification_token: null,
    reset_token: tokenHash,
    reset_token_expires_at: expiresAt,
  });

  try {
    await sendAccountCreatedEmail(normalizedEmail, rawToken, trimmedFirstName);
  } catch (emailErr) {
    console.error('[email] Échec envoi email création de compte :', emailErr.message);
  }

  return publicUser(user);
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
    throw Object.assign(new Error('Session compromise détectée. Reconnectez-vous.'), {
      status: 401,
    });
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

// Mise à jour des informations personnelles de l'utilisateur connecté.
// Email et rôle ne sont volontairement pas modifiables ici (re-vérification / unicité).
export async function updateProfile(id_user, { first_name, last_name, phone }) {
  const data = {};

  if (first_name !== undefined) {
    const trimmed = String(first_name).trim();
    if (trimmed.length === 0 || trimmed.length > NAME_MAX_LENGTH) {
      throw Object.assign(new Error(`Le prénom doit contenir 1 à ${NAME_MAX_LENGTH} caractères.`), {
        status: 400,
      });
    }
    data.first_name = trimmed;
  }

  if (last_name !== undefined) {
    const trimmed = String(last_name).trim();
    if (trimmed.length === 0 || trimmed.length > NAME_MAX_LENGTH) {
      throw Object.assign(new Error(`Le nom doit contenir 1 à ${NAME_MAX_LENGTH} caractères.`), {
        status: 400,
      });
    }
    data.last_name = trimmed;
  }

  if (phone !== undefined) {
    const trimmed = typeof phone === 'string' ? phone.trim() : '';
    if (trimmed && !PHONE_REGEX.test(trimmed)) {
      throw Object.assign(new Error('Le numéro de téléphone est invalide.'), { status: 400 });
    }
    data.phone = trimmed || null;
  }

  if (Object.keys(data).length === 0) {
    throw Object.assign(new Error('Aucune donnée à mettre à jour.'), { status: 400 });
  }

  data.updated_at = new Date();
  const user = await updateUser(id_user, data);
  return publicUser(user);
}

// Changement de mot de passe par l'utilisateur connecté : exige le mot de passe actuel.
export async function changePassword(id_user, { currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw Object.assign(new Error('Tous les champs sont requis.'), { status: 400 });
  }

  const user = await findUserById(id_user);
  if (!user || !user.is_active) {
    throw Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  }

  const currentOk = await bcrypt.compare(currentPassword, user.password);
  if (!currentOk) {
    throw Object.assign(new Error('Mot de passe actuel incorrect.'), { status: 400 });
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    throw Object.assign(
      new Error(
        'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un caractère spécial.'
      ),
      { status: 400 }
    );
  }
  if (newPassword !== confirmPassword) {
    throw Object.assign(new Error('Les mots de passe ne correspondent pas.'), { status: 400 });
  }
  if (currentPassword === newPassword) {
    throw Object.assign(new Error("Le nouveau mot de passe doit être différent de l'ancien."), {
      status: 400,
    });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await updateUser(id_user, { password: hashed, updated_at: new Date() });

  // Sécurité : invalide TOUTES les sessions actives (tous les appareils, y compris
  // celui-ci). L'utilisateur devra se reconnecter avec son nouveau mot de passe.
  await revokeAllUserRefreshTokens(id_user);
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

export async function requestPasswordReset({ email, role }) {
  // Toujours retourner sans erreur pour empêcher l'énumération.
  if (!email || !role) return;
  if (!['proprietaire', 'locataire', 'admin'].includes(role)) return;

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await findUserByEmailAndRole(normalizedEmail, role);
  if (!user || !user.is_active) return;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await updateUser(user.id_user, {
    reset_token: tokenHash,
    reset_token_expires_at: expiresAt,
  });

  try {
    await sendPasswordResetEmail(normalizedEmail, rawToken, user.first_name);
  } catch (emailErr) {
    console.error('[email] Échec envoi reset password :', emailErr.message);
  }
}

export async function checkResetToken(token) {
  if (!token) return false;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await findUserByResetToken(tokenHash);
  if (!user || !user.reset_token_expires_at) return false;
  return user.reset_token_expires_at > new Date();
}

export async function resetPassword({ token, password, confirmPassword }) {
  if (!token || !password || !confirmPassword) {
    throw Object.assign(new Error('Lien invalide ou expiré.'), { status: 400 });
  }
  if (!PASSWORD_REGEX.test(password)) {
    throw Object.assign(
      new Error(
        'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un caractère spécial.'
      ),
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    throw Object.assign(new Error('Les mots de passe ne correspondent pas.'), { status: 400 });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await findUserByResetToken(tokenHash);

  if (!user || !user.reset_token_expires_at || user.reset_token_expires_at < new Date()) {
    throw Object.assign(new Error('Lien invalide ou expiré.'), { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 12);
  await updateUser(user.id_user, {
    password: hashed,
    reset_token: null,
    reset_token_expires_at: null,
  });

  // Force la déconnexion de toutes les sessions actives sur ce compte.
  await revokeAllUserRefreshTokens(user.id_user);
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

// Remplace la photo de profil : l'ancienne (ligne + fichier local) est
// supprimée, la nouvelle enregistrée comme image de type 'avatar'.
export async function updateAvatar(id_user, file, origin) {
  if (!file) {
    throw Object.assign(new Error('Aucune image fournie.'), { status: 400 });
  }

  const previous = await prisma.image.findMany({
    where: { id_user, type: 'avatar' },
    select: { id_image: true, url: true },
  });
  await prisma.image.deleteMany({ where: { id_user, type: 'avatar' } });
  for (const img of previous) {
    const idx = img.url.indexOf('/uploads/avatars/');
    if (idx !== -1) {
      // Chemin disque réel (UPLOADS_DIR configurable), pas le chemin de l'URL.
      const diskPath = path.join(
        process.env.UPLOADS_DIR || 'uploads',
        'avatars',
        path.basename(img.url)
      );
      fs.unlink(diskPath, () => {});
    }
  }

  await prisma.image.create({
    data: { id_user, type: 'avatar', url: `${origin}/uploads/avatars/${file.filename}` },
  });
  return getCurrentUser(id_user);
}

// Supprime la photo de profil (retour à l'avatar généré).
export async function removeAvatar(id_user) {
  const previous = await prisma.image.findMany({
    where: { id_user, type: 'avatar' },
    select: { url: true },
  });
  await prisma.image.deleteMany({ where: { id_user, type: 'avatar' } });
  for (const img of previous) {
    const idx = img.url.indexOf('/uploads/avatars/');
    if (idx !== -1) {
      // Chemin disque réel (UPLOADS_DIR configurable), pas le chemin de l'URL.
      const diskPath = path.join(
        process.env.UPLOADS_DIR || 'uploads',
        'avatars',
        path.basename(img.url)
      );
      fs.unlink(diskPath, () => {});
    }
  }
  return getCurrentUser(id_user);
}
