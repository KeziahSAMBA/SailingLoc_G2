import prisma from '../config/db.js';

export async function findUserByEmail(email) {
  return prisma.user.findMany({ where: { email } });
}

export async function findUserByEmailAndRole(email, role) {
  return prisma.user.findUnique({ where: { email_role: { email, role } } });
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