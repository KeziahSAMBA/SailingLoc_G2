import prisma from '../config/db.js';

export async function findUserByEmail(email) {
  return prisma.user.findMany({ where: { email } });
}

export async function findUserByEmailAndRole(email, role) {
  return prisma.user.findUnique({ where: { email_role: { email, role } } });
}

export async function findUserById(id_user) {
  return prisma.user.findUnique({ where: { id_user } });
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

export async function revokeAllUserRefreshTokens(id_user) {
  return prisma.refreshToken.updateMany({
    where: { id_user, revoked_at: null },
    data: { revoked_at: new Date() },
  });
}

export async function findUserByVerificationToken(token) {
  return prisma.user.findFirst({ where: { email_verification_token: token } });
}

export async function createUser(data) {
  return prisma.user.create({ data });
}

export async function updateUser(id_user, data) {
  return prisma.user.update({ where: { id_user }, data });
}