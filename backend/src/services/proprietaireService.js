import fs from 'fs';
import prisma from '../config/db.js';
import { sendBookingDecisionEmail } from './emailService.js';
import { departmentFromInsee, regionFromInsee } from '../utils/frenchRegions.js';

// Suppression best-effort d'un fichier remplacé (l'échec ne bloque pas la requête).
function removeFileQuiet(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
}

// Les demandes encore « en attente » dont le séjour a déjà commencé ne peuvent
// plus être confirmées : elles passent automatiquement « refusée » à la
// consultation (pas d'email : ce n'est pas une décision du propriétaire).
async function refuseExpiredPending(id_user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.booking.updateMany({
    where: {
      deleted_at: null,
      status: 'pending',
      start_date: { lt: today },
      boat: { id_user, deleted_at: null },
    },
    data: { status: 'refused', updated_at: new Date() },
  });
}

// Vue synthétique du tableau de bord propriétaire : compteurs agrégés en une seule passe.
export async function getDashboardStats(id_user) {
  await refuseExpiredPending(id_user);
  // « Revenus du mois » : somme des réservations confirmées de mes bateaux
  // dont le séjour démarre dans le mois en cours.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

  const [publishedBoats, pendingBookings, monthRevenue, recentBookings, boatsPreview] =
    await Promise.all([
      // Bateaux publiés (non supprimés) du propriétaire.
      prisma.boat.count({
        where: { id_user, deleted_at: null, is_published: true },
      }),
      // Réservations à confirmer : demandes en attente sur mes bateaux.
      prisma.booking.count({
        where: {
          deleted_at: null,
          status: 'pending',
          boat: { id_user, deleted_at: null },
        },
      }),
      prisma.booking.aggregate({
        _sum: { total_amount: true },
        where: {
          deleted_at: null,
          status: 'confirmed',
          boat: { id_user, deleted_at: null },
          start_date: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      // Dernières réservations (tous statuts) sur mes bateaux, avec le locataire.
      prisma.booking.findMany({
        where: { deleted_at: null, boat: { id_user, deleted_at: null } },
        orderBy: { booking_date: 'desc' },
        take: 5,
        select: {
          id_booking: true,
          start_date: true,
          end_date: true,
          status: true,
          total_amount: true,
          boat: { select: { name: true } },
          user: { select: { first_name: true, last_name: true } },
        },
      }),
      // Aperçu des derniers bateaux publiés (avec l'image principale).
      prisma.boat.findMany({
        where: { id_user, deleted_at: null, is_published: true },
        orderBy: { created_at: 'desc' },
        take: 4,
        select: {
          id_boat: true,
          name: true,
          type: true,
          daily_price: true,
          port: { select: { name: true, city: true } },
          images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
        },
      }),
    ]);

  return {
    publishedBoats,
    pendingBookings,
    monthRevenue: Number(monthRevenue._sum.total_amount ?? 0),
    recentBookings: recentBookings.map((b) => ({
      ...b,
      total_amount: Number(b.total_amount),
    })),
    boatsPreview: boatsPreview.map((b) => ({
      id_boat: b.id_boat,
      name: b.name,
      type: b.type,
      daily_price: Number(b.daily_price),
      port: b.port,
      image: b.images[0]?.url ?? null,
    })),
  };
}

// Liste complète des réservations reçues sur les bateaux du propriétaire
// (plus récentes d'abord), avec le locataire demandeur.
export async function listBookings(id_user) {
  await refuseExpiredPending(id_user);
  const bookings = await prisma.booking.findMany({
    where: { deleted_at: null, boat: { id_user, deleted_at: null } },
    orderBy: { start_date: 'desc' },
    select: {
      id_booking: true,
      start_date: true,
      end_date: true,
      status: true,
      total_amount: true,
      booking_date: true,
      cancellation_reason: true,
      cancellation_date: true,
      user: { select: { first_name: true, last_name: true, email: true } },
      boat: {
        select: {
          name: true,
          type: true,
          port: { select: { name: true, city: true } },
          images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
        },
      },
    },
  });

  return bookings.map((b) => ({
    id_booking: b.id_booking,
    start_date: b.start_date,
    end_date: b.end_date,
    status: b.status,
    total_amount: Number(b.total_amount),
    booking_date: b.booking_date,
    cancellation_reason: b.cancellation_reason,
    cancellation_date: b.cancellation_date,
    locataire: b.user
      ? {
          first_name: b.user.first_name,
          last_name: b.user.last_name,
          email: b.user.email,
        }
      : null,
    boat: {
      name: b.boat?.name,
      type: b.boat?.type,
      port: b.boat?.port,
      image: b.boat?.images?.[0]?.url ?? null,
    },
  }));
}

// Liste des bateaux du propriétaire (plus récents d'abord) avec leur statut
// d'annonce (brouillon, en attente de validation, publiée, refusée).
export async function listBoats(id_user) {
  const boats = await prisma.boat.findMany({
    where: { id_user, deleted_at: null },
    orderBy: { created_at: 'desc' },
    select: {
      id_boat: true,
      name: true,
      type: true,
      daily_price: true,
      capacity: true,
      registration: true,
      status: true,
      created_at: true,
      port: { select: { name: true, city: true } },
      images: { orderBy: { order: 'asc' }, take: 1, select: { url: true } },
      _count: {
        select: {
          bookings: { where: { deleted_at: null, status: 'pending' } },
        },
      },
    },
  });

  return boats.map((b) => ({
    id_boat: b.id_boat,
    name: b.name,
    type: b.type,
    // Nullable pour les brouillons incomplets.
    daily_price: b.daily_price != null ? Number(b.daily_price) : null,
    capacity: b.capacity,
    registration: b.registration,
    status: b.status,
    created_at: b.created_at,
    port: b.port,
    image: b.images?.[0]?.url ?? null,
    pending_bookings: b._count.bookings,
  }));
}

const BOAT_TYPES = [
  'voilier',
  'catamaran',
  'moteur',
  'peniche',
  'trimaran',
  'hors_bord',
  'jet_ski',
  'gulet',
];

// Résout le port de l'annonce : un port existant est réutilisé (id direct, ou
// nom déjà en base — insensible à la casse, réactivé s'il était supprimé) ;
// sinon le port est créé, la ville est alors obligatoire. Pour les ports issus
// du catalogue IGN, le code INSEE permet de déduire département et région.
async function findOrCreatePort({ id_port, name, city, country, insee, latitude, longitude }) {
  if (id_port) {
    const port = await prisma.port.findUnique({ where: { id_port: Number(id_port) } });
    if (!port || port.deleted_at) {
      throw Object.assign(new Error('Port sélectionné introuvable.'), { status: 400 });
    }
    return port;
  }

  const cleanName = name && String(name).trim();
  if (!cleanName) {
    throw Object.assign(new Error("Le port d'attache est obligatoire."), { status: 400 });
  }

  const existing = await prisma.port.findFirst({
    where: { name: { equals: cleanName, mode: 'insensitive' } },
  });
  if (existing) {
    if (!existing.deleted_at) return existing;
    return prisma.port.update({
      where: { id_port: existing.id_port },
      data: { deleted_at: null, updated_at: new Date() },
    });
  }

  const cleanCity = city && String(city).trim();
  if (!cleanCity) {
    throw Object.assign(new Error('La ville est requise pour ajouter un nouveau port.'), {
      status: 400,
    });
  }
  return prisma.port.create({
    data: {
      name: cleanName,
      city: cleanCity,
      country: (country && String(country).trim()) || 'France',
      department: departmentFromInsee(insee),
      region: regionFromInsee(insee),
      latitude: latitude != null && latitude !== '' ? Number(latitude) : null,
      longitude: longitude != null && longitude !== '' ? Number(longitude) : null,
    },
  });
}

// Valide et normalise les périodes de disponibilité envoyées par le formulaire
// (JSON : [{ start_date, end_date, price_override?, notes? }]).
function parseAvailabilities(raw) {
  if (!raw) return [];
  let list;
  try {
    list = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw Object.assign(new Error('Disponibilités invalides.'), { status: 400 });
  }
  if (!Array.isArray(list)) {
    throw Object.assign(new Error('Disponibilités invalides.'), { status: 400 });
  }
  return list.map((a) => {
    const start = new Date(a.start_date);
    const end = new Date(a.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw Object.assign(
        new Error('Chaque période de disponibilité doit avoir une fin postérieure au début.'),
        { status: 400 }
      );
    }
    const override =
      a.price_override != null && a.price_override !== '' ? Number(a.price_override) : null;
    if (override != null && (!Number.isFinite(override) || override <= 0)) {
      throw Object.assign(new Error('Le prix spécifique d’une période doit être positif.'), {
        status: 400,
      });
    }
    return {
      start_date: start,
      end_date: end,
      is_available: true,
      price_override: override,
      notes: (a.notes && String(a.notes).trim().slice(0, 255)) || null,
    };
  });
}

// Valide et normalise les champs d'une annonce. Brouillon : seul le nom (et la
// validité des champs renseignés) est exigé. Soumission : tout est obligatoire.
function validateBoatPayload(payload, isDraft) {
  const bad = (message) => Object.assign(new Error(message), { status: 400 });

  const name = payload.name && String(payload.name).trim();
  const type = payload.type && String(payload.type).trim();
  const registration =
    (payload.registration && String(payload.registration).trim().toUpperCase()) || null;
  const size = payload.size !== '' && payload.size != null ? Number(payload.size) : null;
  const daily_price =
    payload.daily_price !== '' && payload.daily_price != null ? Number(payload.daily_price) : null;
  const capacity =
    payload.capacity !== '' && payload.capacity != null ? Number(payload.capacity) : null;
  const build_year = payload.build_year ? Number(payload.build_year) : null;

  if (!name) throw bad('Le nom du bateau est obligatoire.');
  if (!BOAT_TYPES.includes(type)) throw bad('Type de bateau invalide.');

  if (!isDraft && !registration) throw bad("L'immatriculation est obligatoire.");
  // Format des immatriculations de la flotte : pays (2 lettres) - port (3 lettres) - numéro (3 chiffres).
  if (registration && !/^[A-Z]{2}-[A-Z]{3}-[0-9]{3}$/.test(registration)) {
    throw bad('Immatriculation invalide : format attendu XX-XXX-000 (ex. FR-MRS-042).');
  }
  if (!isDraft && size == null) throw bad('La taille (en mètres) est obligatoire.');
  if (size != null && (!Number.isFinite(size) || size <= 0)) {
    throw bad('La taille (en mètres) doit être positive.');
  }
  if (!isDraft && daily_price == null) throw bad('Le prix par jour est obligatoire.');
  if (daily_price != null && (!Number.isFinite(daily_price) || daily_price <= 0)) {
    throw bad('Le prix par jour doit être positif.');
  }
  if (!isDraft && capacity == null) throw bad('La capacité est obligatoire.');
  if (capacity != null && (!Number.isInteger(capacity) || capacity < 1)) {
    throw bad('La capacité doit être d’au moins 1 personne.');
  }
  // Un bateau ne peut pas avoir été construit dans le futur.
  const currentYear = new Date().getFullYear();
  if (build_year != null && (build_year < 1900 || build_year > currentYear)) {
    throw bad('Année de construction invalide.');
  }

  return {
    name,
    type,
    registration,
    size,
    daily_price,
    capacity,
    build_year,
    engine: (payload.engine && String(payload.engine).trim()) || null,
    with_skipper: payload.with_skipper === 'true' || payload.with_skipper === true,
    description: (payload.description && String(payload.description).trim()) || null,
    license_required: !(payload.license_required === 'false' || payload.license_required === false),
  };
}

// Proposer un skipper exige un CV marin déposé (en attente ou validé) : c'est
// le document optionnel du propriétaire qui devient requis dans ce cas.
// Contrôlé à la soumission uniquement (jamais sur un brouillon).
async function ensureSkipperCv(id_user) {
  const cvCount = await prisma.document.count({
    where: { id_user, type: 'cv_marin', status: { in: ['pending', 'validated'] } },
  });
  if (cvCount === 0) {
    throw Object.assign(
      new Error('Pour proposer un skipper, déposez d’abord votre CV marin dans « Mes documents ».'),
      { status: 400 }
    );
  }
}

// Port de l'annonce : obligatoire à la soumission, optionnel en brouillon.
async function resolveBoatPort(payload, isDraft) {
  if (payload.id_port || payload.port_name) {
    return findOrCreatePort({
      id_port: payload.id_port,
      name: payload.port_name,
      city: payload.port_city,
      country: payload.port_country,
      insee: payload.port_insee,
      latitude: payload.port_latitude,
      longitude: payload.port_longitude,
    });
  }
  if (!isDraft) {
    throw Object.assign(new Error("Le port d'attache est obligatoire."), { status: 400 });
  }
  return null;
}

// Rattache au bateau un acte de francisation déjà déposé par le propriétaire
// (au lieu d'en téléverser un nouveau). Refusé s'il appartient à un
// autre utilisateur ou est déjà rattaché à un autre bateau.
async function linkExistingActeFrancisation(tx, id_user, id_boat, docId) {
  const doc = await tx.document.findUnique({
    where: { id_document: Number(docId) },
    select: { id_document: true, id_user: true, id_boat: true, type: true },
  });
  if (!doc || doc.id_user !== id_user || doc.type !== 'acte_francisation') {
    throw Object.assign(new Error('Acte de francisation introuvable.'), { status: 400 });
  }
  if (doc.id_boat && doc.id_boat !== id_boat) {
    throw Object.assign(
      new Error('Cet acte de francisation est déjà rattaché à un autre bateau.'),
      {
        status: 400,
      }
    );
  }
  await tx.document.update({
    where: { id_document: doc.id_document },
    data: { id_boat },
  });
}

// Crée l'annonce d'un bateau du propriétaire connecté : caractéristiques,
// photos (déjà stockées par multer), port (réutilisé ou créé) et périodes de
// disponibilité. L'annonce part en validation admin (ou reste en brouillon).
export async function createBoat(id_user, payload = {}, files = {}, origin = '') {
  const images = files.images || [];
  const acteFrancisation = files.acteFrancisation || null;
  const isDraft = payload.draft === 'true' || payload.draft === true;
  const fields = validateBoatPayload(payload, isDraft);
  const availabilities = parseAvailabilities(payload.availabilities);
  const port = await resolveBoatPort(payload, isDraft);
  if (!isDraft && fields.with_skipper) await ensureSkipperCv(id_user);

  try {
    const boat = await prisma.$transaction(async (tx) => {
      const created = await tx.boat.create({
        data: {
          id_user,
          id_port: port?.id_port ?? null,
          ...fields,
          is_published: false,
          status: isDraft ? 'draft' : 'pending',
        },
      });

      if (images.length > 0) {
        await tx.image.createMany({
          data: images.map((f, i) => ({
            id_boat: created.id_boat,
            url: `${origin}/uploads/boats/${f.filename}`,
            type: 'boat',
            order: i,
          })),
        });
      }

      // Acte de francisation : soit un nouveau fichier (document privé, soumis à
      // validation admin), soit un document existant du propriétaire rattaché
      // tel quel (il garde son statut de vérification).
      if (acteFrancisation) {
        await tx.document.create({
          data: {
            id_user,
            id_boat: created.id_boat,
            type: 'acte_francisation',
            file_name: acteFrancisation.originalname,
            file_url: acteFrancisation.path.replace(/\\/g, '/'),
            upload_date: new Date(),
            status: 'pending',
          },
        });
      } else if (payload.acte_francisation_id) {
        await linkExistingActeFrancisation(
          tx,
          id_user,
          created.id_boat,
          payload.acte_francisation_id
        );
      }

      if (availabilities.length > 0) {
        await tx.boatAvailability.createMany({
          data: availabilities.map((a) => ({ ...a, id_boat: created.id_boat })),
        });
      }

      return created;
    });

    return {
      id_boat: boat.id_boat,
      name: boat.name,
      status: boat.status,
      port: port ? { id_port: port.id_port, name: port.name, city: port.city } : null,
    };
  } catch (err) {
    // Immatriculation unique : conflit → message clair pour le formulaire.
    if (err.code === 'P2002') {
      throw Object.assign(new Error('Cette immatriculation est déjà utilisée.'), { status: 409 });
    }
    throw err;
  }
}

// Détail d'un bateau du propriétaire, pour pré-remplir le formulaire d'édition.
export async function getBoat(id_user, id_boat) {
  const boat = await prisma.boat.findUnique({
    where: { id_boat: Number(id_boat) },
    include: {
      port: { select: { id_port: true, name: true, city: true } },
      images: {
        where: { deleted_at: null },
        orderBy: { order: 'asc' },
        select: { id_image: true, url: true },
      },
      availabilities: {
        orderBy: { start_date: 'asc' },
        select: { start_date: true, end_date: true, price_override: true, notes: true },
      },
      documents: {
        where: { type: 'acte_francisation' },
        orderBy: { created_at: 'desc' },
        take: 1,
        select: { id_document: true, file_name: true, status: true },
      },
    },
  });
  // 404 aussi pour le bateau d'un autre propriétaire : on ne révèle rien.
  if (!boat || boat.deleted_at || boat.id_user !== id_user) {
    throw Object.assign(new Error('Bateau introuvable.'), { status: 404 });
  }

  return {
    id_boat: boat.id_boat,
    name: boat.name,
    type: boat.type,
    size: boat.size != null ? Number(boat.size) : null,
    engine: boat.engine,
    with_skipper: boat.with_skipper,
    daily_price: boat.daily_price != null ? Number(boat.daily_price) : null,
    capacity: boat.capacity,
    build_year: boat.build_year,
    registration: boat.registration,
    description: boat.description,
    license_required: boat.license_required,
    status: boat.status,
    port: boat.port,
    images: boat.images,
    acte_francisation: boat.documents[0] || null,
    availabilities: boat.availabilities.map((a) => ({
      start_date: a.start_date,
      end_date: a.end_date,
      price_override: a.price_override != null ? Number(a.price_override) : null,
      notes: a.notes,
    })),
  };
}

// Met à jour un brouillon d'annonce (seuls les brouillons sont modifiables).
// Photos : `existing_images` (JSON d'ids) liste celles à conserver, dans
// l'ordre ; les nouveaux fichiers s'ajoutent à la suite. Les disponibilités
// sont remplacées. `draft=true` → reste brouillon, sinon → soumis (pending).
export async function updateBoat(id_user, id_boat, payload = {}, files = {}, origin = '') {
  const images = files.images || [];
  const acteFrancisation = files.acteFrancisation || null;
  const id = Number(id_boat);
  const existing = await prisma.boat.findUnique({
    where: { id_boat: id },
    include: {
      images: {
        where: { deleted_at: null },
        orderBy: { order: 'asc' },
        select: { id_image: true },
      },
    },
  });
  if (!existing || existing.deleted_at || existing.id_user !== id_user) {
    throw Object.assign(new Error('Bateau introuvable.'), { status: 404 });
  }

  const isDraft =
    existing.status === 'draft' && (payload.draft === 'true' || payload.draft === true);
  const fields = validateBoatPayload(payload, isDraft);
  const availabilities = parseAvailabilities(payload.availabilities);
  const port = await resolveBoatPort(payload, isDraft);
  if (!isDraft && fields.with_skipper) await ensureSkipperCv(id_user);

  let keptImageIds = [];
  try {
    keptImageIds = payload.existing_images ? JSON.parse(payload.existing_images) : [];
  } catch {
    keptImageIds = [];
  }

  // Statut après modification :
  // - brouillon : reste brouillon ou est soumis ;
  // - refusée / en attente : (re)part en validation ;
  // - publiée : le prix, le port et les disponibilités s'appliquent sans
  //   revalidation ; toute autre modification (nom, photos, description…)
  //   renvoie l'annonce en validation admin et la dépublie en attendant.
  let nextStatus;
  if (isDraft) {
    nextStatus = 'draft';
  } else if (existing.status !== 'published') {
    nextStatus = 'pending';
  } else {
    const same = (a, b) => (a ?? null) === (b ?? null);
    const sameNum = (a, b) => (a == null ? null : Number(a)) === (b == null ? null : Number(b));
    const photosChanged =
      images.length > 0 ||
      JSON.stringify(keptImageIds.map(Number)) !==
        JSON.stringify(existing.images.map((img) => img.id_image));
    const acteFrancisationChanged = Boolean(acteFrancisation);
    const substantialChange =
      !same(fields.name, existing.name) ||
      !same(fields.type, existing.type) ||
      !sameNum(fields.size, existing.size) ||
      !same(fields.engine, existing.engine) ||
      fields.with_skipper !== existing.with_skipper ||
      !sameNum(fields.capacity, existing.capacity) ||
      !sameNum(fields.build_year, existing.build_year) ||
      !same(fields.registration, existing.registration) ||
      !same(fields.description, existing.description) ||
      fields.license_required !== existing.license_required ||
      photosChanged ||
      acteFrancisationChanged;
    nextStatus = substantialChange ? 'pending' : 'published';
  }

  try {
    const boat = await prisma.$transaction(async (tx) => {
      const updated = await tx.boat.update({
        where: { id_boat: id },
        data: {
          id_port: port?.id_port ?? null,
          ...fields,
          status: nextStatus,
          // Une annonce renvoyée en validation n'est plus visible en attendant.
          is_published: nextStatus === 'published',
          updated_at: new Date(),
        },
      });

      // Photos retirées par le propriétaire, puis ré-ordonnancement des
      // conservées et ajout des nouvelles à la suite.
      await tx.image.deleteMany({
        where: { id_boat: id, id_image: { notIn: keptImageIds.map(Number) } },
      });
      for (let i = 0; i < keptImageIds.length; i += 1) {
        await tx.image.updateMany({
          where: { id_boat: id, id_image: Number(keptImageIds[i]) },
          data: { order: i },
        });
      }
      if (images.length > 0) {
        await tx.image.createMany({
          data: images.map((f, i) => ({
            id_boat: id,
            url: `${origin}/uploads/boats/${f.filename}`,
            type: 'boat',
            order: keptImageIds.length + i,
          })),
        });
      }

      // Nouvel acte de francisation (fichier) : remplace l'ancien (ligne +
      // fichier) et repart en validation admin. Acte existant (id) : rattaché
      // tel quel, l'ancien rattaché au bateau est supprimé.
      if (acteFrancisation) {
        const oldDocs = await tx.document.findMany({
          where: { id_boat: id, type: 'acte_francisation' },
          select: { id_document: true, file_url: true },
        });
        await tx.document.deleteMany({ where: { id_boat: id, type: 'acte_francisation' } });
        oldDocs.forEach((d) => removeFileQuiet(d.file_url));
        await tx.document.create({
          data: {
            id_user,
            id_boat: id,
            type: 'acte_francisation',
            file_name: acteFrancisation.originalname,
            file_url: acteFrancisation.path.replace(/\\/g, '/'),
            upload_date: new Date(),
            status: 'pending',
          },
        });
      } else if (payload.acte_francisation_id) {
        const targetId = Number(payload.acte_francisation_id);
        const oldDocs = await tx.document.findMany({
          where: { id_boat: id, type: 'acte_francisation', id_document: { not: targetId } },
          select: { id_document: true, file_url: true },
        });
        await tx.document.deleteMany({
          where: { id_boat: id, type: 'acte_francisation', id_document: { not: targetId } },
        });
        oldDocs.forEach((d) => removeFileQuiet(d.file_url));
        await linkExistingActeFrancisation(tx, id_user, id, targetId);
      }

      // Disponibilités : remplacement complet par celles du formulaire.
      await tx.boatAvailability.deleteMany({ where: { id_boat: id } });
      if (availabilities.length > 0) {
        await tx.boatAvailability.createMany({
          data: availabilities.map((a) => ({ ...a, id_boat: id })),
        });
      }

      return updated;
    });

    return {
      id_boat: boat.id_boat,
      name: boat.name,
      status: boat.status,
      port: port ? { id_port: port.id_port, name: port.name, city: port.city } : null,
    };
  } catch (err) {
    if (err.code === 'P2002') {
      throw Object.assign(new Error('Cette immatriculation est déjà utilisée.'), { status: 409 });
    }
    throw err;
  }
}

// Supprime (soft delete) un brouillon ou une annonce du propriétaire.
// Bloquée s'il reste des réservations en cours ou à venir sur le bateau ;
// l'acte de francisation rattaché redevient réutilisable pour une autre annonce.
export async function deleteBoat(id_user, id_boat) {
  const id = Number(id_boat);
  const boat = await prisma.boat.findUnique({
    where: { id_boat: id },
    select: { id_user: true, deleted_at: true },
  });
  if (!boat || boat.deleted_at || boat.id_user !== id_user) {
    throw Object.assign(new Error('Bateau introuvable.'), { status: 404 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeBookings = await prisma.booking.count({
    where: {
      id_boat: id,
      deleted_at: null,
      status: { in: ['pending', 'confirmed'] },
      end_date: { gte: today },
    },
  });
  if (activeBookings > 0) {
    throw Object.assign(
      new Error(
        'Impossible de supprimer : des réservations en cours ou à venir existent sur ce bateau.'
      ),
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.boat.update({
      where: { id_boat: id },
      data: { deleted_at: new Date(), is_published: false, updated_at: new Date() },
    }),
    prisma.document.updateMany({
      where: { id_boat: id, type: 'acte_francisation' },
      data: { id_boat: null },
    }),
  ]);
}

// Historique des paiements reçus sur les bateaux du propriétaire (plus récents
// d'abord), avec les totaux : brut encaissé, commissions SailingLoc déduites et
// net propriétaire — calculés sur les paiements réussis uniquement (même règle
// que l'admin : pending/failed ne sont pas du chiffre d'affaires).
export async function listPayments(id_user) {
  const payments = await prisma.payment.findMany({
    where: { booking: { deleted_at: null, boat: { id_user, deleted_at: null } } },
    orderBy: { payment_date: 'desc' },
    include: {
      booking: {
        select: {
          id_booking: true,
          start_date: true,
          end_date: true,
          boat: { select: { name: true } },
          user: { select: { first_name: true, last_name: true } },
        },
      },
    },
  });

  const totals = { gross: 0, commission: 0, net: 0, success_count: 0 };
  for (const p of payments) {
    if (p.status !== 'success') continue;
    totals.gross += Number(p.amount);
    totals.commission += Number(p.commission);
    totals.success_count += 1;
  }
  totals.net = totals.gross - totals.commission;

  return {
    totals,
    payments: payments.map((p) => ({
      id_payment: p.id_payment,
      transaction_ref: p.transaction_ref,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      status: p.status,
      amount: Number(p.amount),
      commission: Number(p.commission),
      net: Number(p.amount) - Number(p.commission),
      refunded_amount: p.refunded_amount != null ? Number(p.refunded_amount) : null,
      refunded_at: p.refunded_at,
      refund_reason: p.refund_reason,
      booking: p.booking
        ? {
            id_booking: p.booking.id_booking,
            start_date: p.booking.start_date,
            end_date: p.booking.end_date,
            boat_name: p.booking.boat?.name || null,
            locataire: [p.booking.user?.first_name, p.booking.user?.last_name]
              .filter(Boolean)
              .join(' '),
          }
        : null,
    })),
  };
}

// Transitions autorisées pour le propriétaire sur une réservation de ses bateaux.
const BOOKING_ACTIONS = {
  confirm: { from: ['pending'], to: 'confirmed' },
  refuse: { from: ['pending'], to: 'refused' },
  cancel: { from: ['pending', 'confirmed'], to: 'cancelled' },
};

// Confirme, refuse ou annule une réservation — uniquement sur un bateau
// appartenant au propriétaire connecté.
export async function setBookingStatus(id_user, id_booking, action, reason) {
  const transition = BOOKING_ACTIONS[action];
  if (!transition) {
    throw Object.assign(new Error('Action invalide.'), { status: 400 });
  }

  const id = Number(id_booking);
  const booking = await prisma.booking.findUnique({
    where: { id_booking: id },
    select: {
      id_booking: true,
      status: true,
      deleted_at: true,
      start_date: true,
      end_date: true,
      total_amount: true,
      user: { select: { first_name: true, email: true } },
      boat: { select: { id_user: true, name: true } },
    },
  });
  // 404 aussi quand la réservation appartient à un autre propriétaire :
  // on ne révèle pas l'existence de réservations qui ne nous concernent pas.
  if (!booking || booking.deleted_at || booking.boat?.id_user !== id_user) {
    throw Object.assign(new Error('Réservation introuvable.'), { status: 404 });
  }
  if (!transition.from.includes(booking.status)) {
    throw Object.assign(
      new Error(`Cette action n'est pas possible sur une réservation « ${booking.status} ».`),
      { status: 400 }
    );
  }
  // Une demande dont le séjour a déjà commencé ne peut plus être confirmée.
  if (action === 'confirm') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(booking.start_date) < today) {
      throw Object.assign(
        new Error('La date de début est déjà passée : cette demande ne peut plus être confirmée.'),
        { status: 400 }
      );
    }
  }

  const updated = await prisma.booking.update({
    where: { id_booking: id },
    data: {
      status: transition.to,
      updated_at: new Date(),
      ...(action === 'cancel' && {
        cancellation_reason: (reason && String(reason).trim()) || 'Annulée par le propriétaire.',
        cancellation_date: new Date(),
      }),
    },
  });

  // Notification au locataire — non bloquante : la décision reste valide
  // même si l'envoi de l'email échoue.
  if (booking.user?.email) {
    try {
      await sendBookingDecisionEmail(booking.user.email, {
        firstName: booking.user.first_name,
        decision: updated.status,
        boatName: booking.boat?.name,
        startDate: booking.start_date,
        endDate: booking.end_date,
        totalAmount: Number(booking.total_amount),
        reason: updated.cancellation_reason,
      });
    } catch (emailErr) {
      console.error('[email] décision réservation :', emailErr.message);
    }
  }

  return {
    id_booking: updated.id_booking,
    status: updated.status,
    cancellation_reason: updated.cancellation_reason,
    cancellation_date: updated.cancellation_date,
  };
}
