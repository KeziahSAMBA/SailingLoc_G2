import prisma from '../config/db.js';

// Avatar de l'utilisateur : image active la plus récente des types historiques
// « profil » ou actuels « avatar ».
export const AVATAR_INCLUDE = {
  images: {
    where: { type: { in: ['avatar', 'profil'] }, deleted_at: null },
    orderBy: { created_at: 'desc' },
    take: 1,
    select: { url: true },
  },
};

export async function findUserByEmail(email) {
  return prisma.user.findMany({ where: { email } });
}

export async function findUserByEmailAndRole(email, role) {
  return prisma.user.findUnique({
    where: { email_role: { email, role } },
    include: AVATAR_INCLUDE,
  });
}

export async function findUserById(id_user) {
  return prisma.user.findUnique({ where: { id_user }, include: AVATAR_INCLUDE });
}

export async function findUserByResetToken(reset_token) {
  return prisma.user.findFirst({ where: { reset_token } });
}

export async function createRefreshToken(data) {
  return prisma.refreshToken.create({ data });
}

export async function findRefreshTokenByHash(token_hash) {
  return prisma.refreshToken.findUnique({ where: { token_hash } });
}

export async function revokeRefreshToken(id_refresh) {
  return prisma.refreshToken.update({
    where: { id_refresh },
    data: { revoked_at: new Date() },
  });
}

// Rotation atomique : deux requêtes concurrentes ne peuvent pas toutes deux
// consommer le même refresh token. Le nombre de lignes mis à jour sert de
// verrou logique pour détecter le rejeu.
export async function rotateRefreshToken(id_refresh, data, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.refreshToken.updateMany({
      where: { id_refresh, revoked_at: null, expires_at: { gt: now } },
      data: { revoked_at: now },
    });
    if (claimed.count !== 1) return false;

    await tx.refreshToken.create({ data });
    return true;
  });
}

export async function revokeAllUserRefreshTokens(id_user) {
  return prisma.refreshToken.updateMany({
    where: { id_user, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

export async function findUserByVerificationToken(token) {
  return prisma.user.findFirst({
    where: {
      email_verification_token: token,
      email_verified: false,
      deleted_at: null,
    },
  });
}

export async function consumeEmailVerificationToken(id_user, token, now = new Date()) {
  return prisma.user.updateMany({
    where: {
      id_user,
      email_verification_token: token,
      email_verification_token_expires_at: { gt: now },
      email_verified: false,
      deleted_at: null,
    },
    data: {
      email_verified: true,
      email_verification_token: null,
      email_verification_token_expires_at: null,
      updated_at: now,
    },
  });
}

export async function createUser(data) {
  return prisma.user.create({ data });
}

export async function updateUser(id_user, data) {
  return prisma.user.update({ where: { id_user }, data, include: AVATAR_INCLUDE });
}
