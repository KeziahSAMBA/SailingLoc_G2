import prisma from '../config/db.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ['new', 'processed'];

function publicRequest(r) {
  return {
    id_request: r.id_request,
    name: r.name,
    email: r.email,
    subject: r.subject,
    message: r.message,
    status: r.status,
    created_at: r.created_at,
    processed_at: r.processed_at,
  };
}

// Dépôt d'une demande via le formulaire public de la page Contact.
export async function createContactRequest({ name, email, subject, message }) {
  const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
  const cleanName = name && String(name).trim();
  const cleanEmail = email && String(email).trim().toLowerCase();
  const cleanSubject = subject && String(subject).trim();
  const cleanMessage = message && String(message).trim();

  if (!cleanName || cleanName.length > 150)
    throw bad('Le nom est obligatoire (150 caractères max).');
  if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 255) {
    throw bad('Adresse email invalide.');
  }
  if (!cleanSubject || cleanSubject.length > 200) {
    throw bad("L'objet est obligatoire (200 caractères max).");
  }
  if (!cleanMessage || cleanMessage.length > 5000) {
    throw bad('Le message est obligatoire (5000 caractères max).');
  }

  const created = await prisma.contactRequest.create({
    data: { name: cleanName, email: cleanEmail, subject: cleanSubject, message: cleanMessage },
  });
  return publicRequest(created);
}

// Liste des demandes pour l'admin, filtrable par statut.
export async function listContactRequests({ status } = {}) {
  const where = {};
  if (status && STATUSES.includes(status)) where.status = status;
  const requests = await prisma.contactRequest.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
  return requests.map(publicRequest);
}

// L'admin change le statut d'une demande (traitée / à retraiter).
export async function setContactRequestStatus(id_request, status) {
  if (!STATUSES.includes(status)) {
    throw Object.assign(new Error('Statut invalide.'), { status: 400 });
  }
  const id = Number(id_request);
  const existing = await prisma.contactRequest.findUnique({ where: { id_request: id } });
  if (!existing) {
    throw Object.assign(new Error('Demande introuvable.'), { status: 404 });
  }
  const updated = await prisma.contactRequest.update({
    where: { id_request: id },
    data: { status, processed_at: status === 'processed' ? new Date() : null },
  });
  return publicRequest(updated);
}
