import prisma from '../config/db.js';

const ROLES = ['admin', 'proprietaire', 'locataire'];
const SORTABLE = ['created_at', 'last_name', 'first_name', 'email', 'role'];
const NAME_MAX = 100;
const EMAIL_MAX = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;

function publicUser(u) {
  return {
    id_user: u.id_user,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    is_active: u.is_active,
    created_at: u.created_at,
  };
}

export async function listUsers({ role, active, search, sort, order } = {}) {
  const where = { deleted_at: null };
  if (role && ROLES.includes(role)) where.role = role;
  if (active === 'true') where.is_active = true;
  if (active === 'false') where.is_active = false;
  if (search && String(search).trim()) {
    const s = String(search).trim();
    where.OR = [
      { first_name: { contains: s, mode: 'insensitive' } },
      { last_name: { contains: s, mode: 'insensitive' } },
      { email: { contains: s, mode: 'insensitive' } },
    ];
  }

  const sortField = SORTABLE.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  const users = await prisma.user.findMany({ where, orderBy: { [sortField]: sortOrder } });
  return users.map(publicUser);
}

export async function updateUserByAdmin(id_user, requesterId, payload = {}) {
  const { first_name, last_name, email, phone, role, is_active } = payload;
  const id = Number(id_user);
  const user = await prisma.user.findUnique({ where: { id_user: id } });
  if (!user || user.deleted_at) {
    throw Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  }

  const data = {};

  if (first_name !== undefined) {
    const v = String(first_name).trim();
    if (v.length === 0 || v.length > NAME_MAX) {
      throw Object.assign(new Error(`Le prénom doit contenir 1 à ${NAME_MAX} caractères.`), {
        status: 400,
      });
    }
    data.first_name = v;
  }

  if (last_name !== undefined) {
    const v = String(last_name).trim();
    if (v.length === 0 || v.length > NAME_MAX) {
      throw Object.assign(new Error(`Le nom doit contenir 1 à ${NAME_MAX} caractères.`), {
        status: 400,
      });
    }
    data.last_name = v;
  }

  if (phone !== undefined) {
    const v = typeof phone === 'string' ? phone.trim() : '';
    if (v && !PHONE_REGEX.test(v)) {
      throw Object.assign(new Error('Le numéro de téléphone est invalide.'), { status: 400 });
    }
    data.phone = v || null;
  }

  if (role !== undefined && !ROLES.includes(role)) {
    throw Object.assign(new Error('Rôle invalide.'), { status: 400 });
  }

  // Email et/ou rôle : l'unicité est sur (email, role) → on vérifie la combinaison cible.
  let targetEmail = user.email;
  let targetRole = user.role;
  if (email !== undefined) {
    const v = String(email).trim().toLowerCase();
    if (v.length > EMAIL_MAX || !EMAIL_REGEX.test(v)) {
      throw Object.assign(new Error("Le format de l'email est invalide."), { status: 400 });
    }
    targetEmail = v;
    data.email = v;
  }
  if (role !== undefined) {
    targetRole = role;
    data.role = role;
  }
  if (targetEmail !== user.email || targetRole !== user.role) {
    const clash = await prisma.user.findUnique({
      where: { email_role: { email: targetEmail, role: targetRole } },
    });
    if (clash && clash.id_user !== id) {
      throw Object.assign(new Error('Un compte avec cet email et ce rôle existe déjà.'), {
        status: 409,
      });
    }
  }

  if (is_active !== undefined) {
    if (id === requesterId && is_active === false) {
      throw Object.assign(new Error('Vous ne pouvez pas désactiver votre propre compte.'), {
        status: 400,
      });
    }
    data.is_active = Boolean(is_active);
  }

  if (Object.keys(data).length === 0) {
    throw Object.assign(new Error('Aucune modification à appliquer.'), { status: 400 });
  }

  data.updated_at = new Date();
  const updated = await prisma.user.update({ where: { id_user: id }, data });
  return publicUser(updated);
}

export async function deleteUserByAdmin(id_user, requesterId) {
  const id = Number(id_user);
  if (id === requesterId) {
    throw Object.assign(new Error('Vous ne pouvez pas supprimer votre propre compte.'), {
      status: 400,
    });
  }
  const user = await prisma.user.findUnique({ where: { id_user: id } });
  if (!user || user.deleted_at) {
    throw Object.assign(new Error('Utilisateur introuvable.'), { status: 404 });
  }
  // Soft delete : préserve l'intégrité (réservations, paiements, avis…).
  await prisma.user.update({
    where: { id_user: id },
    data: { is_active: false, deleted_at: new Date() },
  });
}
