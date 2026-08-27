import prisma from '../config/db.js';
import { sendBoatUnpublishedEmail, sendBoatRepublishedEmail } from './emailService.js';
import { logSanitizedError } from '../utils/privacy.js';
import { parseStrictBoolean, requirePositiveId } from '../utils/inputSecurity.js';

const REPORT_STATUSES = ['pending', 'resolved', 'dismissed'];

function publicBoat(b) {
  return {
    id_boat: b.id_boat,
    name: b.name,
    type: b.type,
    daily_price: b.daily_price != null ? Number(b.daily_price) : null,
    is_published: b.is_published,
    registration: b.registration,
    created_at: b.created_at,
    owner: b.owner
      ? {
          id_user: b.owner.id_user,
          first_name: b.owner.first_name,
          last_name: b.owner.last_name,
          email: b.owner.email,
        }
      : null,
    pending_reports: b._count ? b._count.reports : undefined,
  };
}

export async function listBoats({ published } = {}) {
  const where = { deleted_at: null };
  if (published !== undefined && published !== null && published !== '') {
    where.is_published = parseStrictBoolean(published, 'Le filtre publié');
  }

  const boats = await prisma.boat.findMany({
    where,
    include: {
      owner: { select: { id_user: true, first_name: true, last_name: true, email: true } },
      _count: { select: { reports: { where: { status: 'pending' } } } },
    },
    orderBy: { created_at: 'desc' },
  });
  return boats.map(publicBoat);
}

export async function setBoatPublished(id_boat, is_published) {
  const id = requirePositiveId(id_boat, 'Identifiant bateau');
  const publishing = parseStrictBoolean(is_published, 'Le statut publié');
  const boat = await prisma.boat.findUnique({ where: { id_boat: id }, include: { owner: true } });
  if (!boat || boat.deleted_at) {
    throw Object.assign(new Error('Bateau introuvable.'), { status: 404 });
  }

  const updated = await prisma.boat.update({
    where: { id_boat: id },
    // Le statut d'annonce suit la décision : validée → publiée, retirée → refusée.
    data: {
      is_published: publishing,
      status: publishing ? 'published' : 'refused',
      updated_at: new Date(),
    },
  });

  // Dépublication = sanction : on clôt les signalements en attente du bateau
  // et on notifie le propriétaire (non-respect des règles).
  if (!publishing) {
    await prisma.boatReport.updateMany({
      where: { id_boat: id, status: 'pending' },
      data: { status: 'resolved', resolved_at: new Date() },
    });
    if (boat.owner?.email) {
      try {
        await sendBoatUnpublishedEmail(boat.owner.email, {
          firstName: boat.owner.first_name,
          boatName: boat.name,
        });
      } catch (emailErr) {
        logSanitizedError('email: dépublication bateau', emailErr);
      }
    }
  } else if (!boat.is_published) {
    // Remise en ligne (le bateau était dépublié) : on informe le propriétaire.
    if (boat.owner?.email) {
      try {
        await sendBoatRepublishedEmail(boat.owner.email, {
          firstName: boat.owner.first_name,
          boatName: boat.name,
        });
      } catch (emailErr) {
        logSanitizedError('email: republication bateau', emailErr);
      }
    }
  }

  const pending_reports = await prisma.boatReport.count({
    where: { id_boat: id, status: 'pending' },
  });

  return {
    id_boat: updated.id_boat,
    name: updated.name,
    type: updated.type,
    daily_price: updated.daily_price != null ? Number(updated.daily_price) : null,
    is_published: updated.is_published,
    registration: updated.registration,
    created_at: updated.created_at,
    owner: boat.owner
      ? {
          id_user: boat.owner.id_user,
          first_name: boat.owner.first_name,
          last_name: boat.owner.last_name,
          email: boat.owner.email,
        }
      : null,
    pending_reports,
  };
}

export async function listReports({ status } = {}) {
  const where = {};
  if (status && REPORT_STATUSES.includes(status)) where.status = status;

  const reports = await prisma.boatReport.findMany({
    where,
    include: {
      boat: { select: { id_boat: true, name: true, is_published: true } },
      reporter: { select: { id_user: true, first_name: true, last_name: true, email: true } },
    },
    orderBy: { created_at: 'desc' },
  });
  return reports.map((r) => ({
    id_report: r.id_report,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
    resolved_at: r.resolved_at,
    boat: r.boat,
    reporter: r.reporter,
  }));
}

export async function setReportStatus(id_report, status) {
  if (!REPORT_STATUSES.includes(status)) {
    throw Object.assign(new Error('Statut invalide.'), { status: 400 });
  }
  const id = Number(id_report);
  const report = await prisma.boatReport.findUnique({ where: { id_report: id } });
  if (!report) {
    throw Object.assign(new Error('Signalement introuvable.'), { status: 404 });
  }
  const updated = await prisma.boatReport.update({
    where: { id_report: id },
    data: { status, resolved_at: status === 'pending' ? null : new Date() },
  });
  return {
    id_report: updated.id_report,
    status: updated.status,
    resolved_at: updated.resolved_at,
  };
}
