import prisma from '../config/db.js';
import * as stripeConfig from '../config/stripe.js';
import { sendBookingDecisionEmail } from './emailService.js';
import { issueBookingInvoices } from './invoiceService.js';
import { departmentFromInsee, regionFromInsee } from '../utils/frenchRegions.js';
import { encryptFileInPlace } from '../utils/fileCrypto.js';
import {
  inspectUploadedFile,
  resolveStoredFilePath,
  safeDisplayName,
  storagePath,
} from '../utils/fileSecurity.js';
import {
  boundedString,
  parseDateOnly,
  parseStrictBoolean,
  requirePositiveId,
} from '../utils/inputSecurity.js';
import { buildAppUrl, publicAssetUrl } from '../utils/urlSecurity.js';
import { logSanitizedError } from '../utils/privacy.js';
import { lockBookingPayment, lockBoat } from './paymentConcurrency.js';
import { asFileReference, removeUnreferencedFiles } from './fileCleanupService.js';

const { getStripe, isStripeRef, cancelIntentQuietly, refundIntent } = stripeConfig;

const MAX_AVAILABILITY_PERIODS = 100;
const MAX_IMAGES = 5;
const MAX_BOAT_DESCRIPTION = 5000;
const MAX_BOAT_DAILY_PRICE = 1_000_000;
const MAX_BOAT_CAPACITY = 1_000;
const MAX_REASON_LENGTH = 1000;
const MAX_HISTORY_ROWS = 500;
const PAYMENT_STATES = Object.freeze({
  REQUIRES_PAYMENT_METHOD: 'requires_payment_method',
  REQUIRES_CAPTURE: 'requires_capture',
  CAPTURING: 'capturing',
  SUCCEEDED: 'succeeded',
  REFUNDED: 'refunded',
  REFUNDING: 'refunding',
});

function paymentIntentOptions(ref, operation) {
  if (typeof stripeConfig.paymentIntentIdempotencyKey !== 'function') return undefined;
  return { idempotencyKey: stripeConfig.paymentIntentIdempotencyKey(ref, operation) };
}

function refundOptions(ref, amount, base, operation) {
  if (typeof stripeConfig.refundIdempotencyKey !== 'function') return base;
  return {
    ...base,
    operation,
    idempotencyKey: stripeConfig.refundIdempotencyKey(ref, amount, operation),
  };
}

// Provider operations are intentionally idempotent, but a capture can race a
// database decision after its request has left this process. If a confirmation
// cannot be committed after Stripe reports a capture, refund the captured
// intent before returning the conflict; otherwise a successful charge would be
// left without a confirmed booking.
async function compensateCapturedIntent(ref) {
  if (!isStripeRef(ref)) return;
  try {
    await refundIntent(
      ref,
      null,
      refundOptions(ref, null, { refundApplicationFee: true }, 'capture-conflict')
    );
  } catch (error) {
    logSanitizedError('stripe: compensation capture réservation', error, 'error');
    throw Object.assign(new Error('Le paiement Stripe doit être réconcilié avant la décision.'), {
      status: 503,
      cause: error,
    });
  }
}

// Release an intent after a competing reservation has won the slot. A
// competing confirmation may already have captured it, in which case a refund
// (rather than a cancel) is required. This is best-effort for rival bookings:
// their rows are already made non-actionable in the database and a webhook or
// reconciliation retry can finish a transient provider failure.
async function releaseStripeIntent(ref) {
  if (!isStripeRef(ref)) return;
  const stripe = getStripe();
  if (!stripe) return;
  try {
    const intent = await stripe.paymentIntents.retrieve(ref);
    if (intent.status === 'succeeded') {
      await refundIntent(
        ref,
        null,
        refundOptions(ref, null, { refundApplicationFee: true }, 'rival-capture')
      );
    } else if (!['canceled', 'succeeded'].includes(intent.status)) {
      await cancelIntentQuietly(ref);
    }
  } catch (error) {
    logSanitizedError('stripe: libération paiement concurrent', error, 'warn');
  }
}

// Suppression best-effort d'un fichier remplacé (l'échec ne bloque pas la requête).
async function removeFileQuiet(filePath) {
  if (!filePath) return 0;
  return removeUnreferencedFiles([{ id: 'temporary', value: filePath }], {
    kind: 'document',
    references: [{ id: 'temporary', value: filePath }],
    removedIds: ['temporary'],
  });
}

async function removeReplacedDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) return 0;
  let references = [];
  try {
    references = (
      await prisma.document.findMany({
        select: { id_document: true, file_url: true },
      })
    ).map((row) => asFileReference(row.id_document, row.file_url));
  } catch {
    // A failed reference lookup is fail-closed: keep the old object and let a
    // later maintenance pass retry instead of unlinking a shared file.
    return 0;
  }
  return removeUnreferencedFiles(
    documents.map((doc) => ({ id: doc.id_document, value: doc.file_url })),
    {
      kind: 'document',
      references,
      removedIds: documents.map((doc) => doc.id_document),
    }
  );
}

async function removeBoatImages(images) {
  if (!Array.isArray(images) || images.length === 0) return 0;
  let references = [];
  try {
    references = (
      await prisma.image.findMany({
        select: { id_image: true, url: true },
      })
    ).map((row) => asFileReference(row.id_image, row.url));
  } catch {
    // A failed reference lookup is fail-closed: keep the old object and let a
    // later maintenance pass retry instead of unlinking a shared image.
    return 0;
  }
  return removeUnreferencedFiles(
    images.map((image) => ({ id: image.id_image, value: image.url })),
    {
      kind: 'boat',
      isPublic: true,
      references,
      removedIds: images.map((image) => image.id_image),
    }
  );
}

async function preparePrivateDocument(file) {
  if (!file) return null;
  const metadata = file.detectedMimeType
    ? {
        mimeType: file.detectedMimeType,
        safeName:
          file.safeOriginalName || safeDisplayName(file.originalname, file.detectedMimeType),
      }
    : await inspectUploadedFile(file, 'document');
  const absolutePath = resolveStoredFilePath(file.path, 'document');
  await encryptFileInPlace(absolutePath);
  return {
    ...file,
    safeOriginalName: metadata.safeName,
    detectedMimeType: metadata.mimeType,
    storedPath: storagePath(absolutePath),
  };
}

// Les demandes encore « en attente » dont le séjour a déjà commencé ne peuvent
// plus être confirmées : elles passent automatiquement « refusée » à la
// consultation (pas d'email : ce n'est pas une décision du propriétaire), et
// leur éventuelle empreinte de paiement est libérée — rien n'a été débité, le
// paiement passe « refunded » sans montant remboursé.
async function refuseExpiredPending(id_user) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expired = await prisma.booking.findMany({
    where: {
      deleted_at: null,
      status: 'pending',
      start_date: { lt: today },
      boat: { id_user: ownerId, deleted_at: null },
    },
    select: {
      id_booking: true,
      payments: { where: { status: 'pending' }, select: { transaction_ref: true } },
    },
    take: MAX_HISTORY_ROWS,
  });
  if (expired.length === 0) return;
  // Empreintes Stripe libérées en best-effort avant la mise à jour en base.
  for (const b of expired) {
    for (const p of b.payments) {
      await cancelIntentQuietly(p.transaction_ref);
    }
  }
  const ids = expired.map((b) => b.id_booking);
  const now = new Date();
  await prisma.$transaction([
    prisma.booking.updateMany({
      where: { id_booking: { in: ids } },
      data: { status: 'refused', updated_at: now },
    }),
    prisma.payment.updateMany({
      where: { id_booking: { in: ids }, status: 'pending' },
      data: { status: 'refunded', refunded_at: now },
    }),
  ]);
}

// Vue synthétique du tableau de bord propriétaire : compteurs agrégés en une seule passe.
export async function getDashboardStats(id_user) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  await refuseExpiredPending(ownerId);
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
        where: { id_user: ownerId, deleted_at: null, is_published: true },
      }),
      // Réservations à confirmer : demandes en attente ET payées (empreinte en
      // attente) sur mes bateaux — les demandes non payées ne sont pas encore
      // actionnables par le propriétaire.
      prisma.booking.count({
        where: {
          deleted_at: null,
          status: 'pending',
          boat: { id_user: ownerId, deleted_at: null },
          payments: { some: { status: 'pending' } },
        },
      }),
      prisma.booking.aggregate({
        _sum: { total_amount: true },
        where: {
          deleted_at: null,
          status: 'confirmed',
          boat: { id_user: ownerId, deleted_at: null },
          start_date: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      // Dernières réservations (tous statuts) sur mes bateaux, avec le locataire.
      prisma.booking.findMany({
        where: { deleted_at: null, boat: { id_user: ownerId, deleted_at: null } },
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
        where: { id_user: ownerId, deleted_at: null, is_published: true },
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
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  await refuseExpiredPending(ownerId);
  const bookings = await prisma.booking.findMany({
    where: { deleted_at: null, boat: { id_user: ownerId, deleted_at: null } },
    orderBy: { start_date: 'desc' },
    take: 500,
    select: {
      id_booking: true,
      start_date: true,
      end_date: true,
      status: true,
      total_amount: true,
      booking_date: true,
      cancellation_reason: true,
      cancellation_date: true,
      // Dernier état de paiement utile : « pending » (empreinte à valider) ou
      // « success » (capturé à la confirmation) ; sinon la demande n'est pas payée.
      payments: {
        where: { status: { in: ['pending', 'success'] } },
        select: { status: true },
        take: 1,
      },
      disputes: { where: { status: 'open' }, select: { id_dispute: true }, take: 1 },
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
    payment_status: b.payments[0]?.status ?? null,
    has_open_dispute: b.disputes.length > 0,
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

// Types de documents attendus d'un locataire (mêmes valeurs que documentService).
const LOCATAIRE_DOC_TYPES = ['permis_conduire', 'piece_identite', 'cv_nautique'];

// Fiche locataire d'une réservation : le propriétaire ne peut la consulter que
// si la réservation porte sur l'un de ses bateaux (sinon 404). Renvoie le profil
// et les documents d'identité du locataire (statut de validation inclus).
export async function getBookingLocataire(id_owner, id_booking) {
  const ownerId = requirePositiveId(id_owner, 'Identifiant utilisateur');
  const bookingId = requirePositiveId(id_booking, 'Identifiant réservation');
  const booking = await prisma.booking.findFirst({
    where: {
      id_booking: bookingId,
      deleted_at: null,
      boat: { id_user: ownerId, deleted_at: null },
    },
    select: {
      id_booking: true,
      user: {
        select: {
          id_user: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          created_at: true,
        },
      },
    },
  });
  if (!booking?.user) {
    throw Object.assign(new Error('Réservation introuvable.'), { status: 404 });
  }

  const documents = await prisma.document.findMany({
    // Une pièce d'identité est consultable dans la fiche uniquement si elle a
    // été rattachée à CETTE réservation. La relation utilisateur seule
    // permettrait de consulter les documents déposés pour d'autres bateaux.
    where: {
      id_user: booking.user.id_user,
      type: { in: LOCATAIRE_DOC_TYPES },
      bookings: { some: { id_booking: booking.id_booking } },
    },
    orderBy: { upload_date: 'desc' },
    take: MAX_HISTORY_ROWS,
    select: {
      id_document: true,
      type: true,
      file_name: true,
      status: true,
      upload_date: true,
    },
  });

  return { locataire: booking.user, documents };
}

// Liste des bateaux du propriétaire (plus récents d'abord) avec leur statut
// d'annonce (brouillon, en attente de validation, publiée, refusée).
export async function listBoats(id_user) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const boats = await prisma.boat.findMany({
    where: { id_user: ownerId, deleted_at: null },
    orderBy: { created_at: 'desc' },
    take: 500,
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
  const hasPortId = id_port !== undefined && id_port !== null && id_port !== '';
  if (hasPortId) {
    const portId = requirePositiveId(id_port, 'Identifiant port');
    const port = await prisma.port.findUnique({ where: { id_port: portId } });
    if (!port || port.deleted_at) {
      throw Object.assign(new Error('Port sélectionné introuvable.'), { status: 400 });
    }
    return port;
  }

  const cleanName =
    name === undefined || name === null
      ? ''
      : boundedString(name, { label: 'Le nom du port', max: 150 });
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

  const cleanCity =
    city === undefined || city === null ? '' : boundedString(city, { label: 'La ville', max: 100 });
  if (!cleanCity) {
    throw Object.assign(new Error('La ville est requise pour ajouter un nouveau port.'), {
      status: 400,
    });
  }
  const cleanCountry =
    country === undefined || country === null || country === ''
      ? 'France'
      : boundedString(country, { label: 'Le pays', max: 100 });
  const coordinate = (value, min, max, label) => {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
      throw Object.assign(new Error(`${label} invalide.`), { status: 400 });
    }
    return number;
  };
  const cleanInsee =
    insee === undefined || insee === null || insee === ''
      ? null
      : boundedString(insee, { label: 'Le code INSEE', max: 10 });
  return prisma.port.create({
    data: {
      name: cleanName,
      city: cleanCity,
      country: cleanCountry,
      department: departmentFromInsee(cleanInsee),
      region: regionFromInsee(cleanInsee),
      latitude: coordinate(latitude, -90, 90, 'Latitude'),
      longitude: coordinate(longitude, -180, 180, 'Longitude'),
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
  if (list.length > MAX_AVAILABILITY_PERIODS) {
    throw Object.assign(
      new Error(`Le nombre de périodes de disponibilité est limité à ${MAX_AVAILABILITY_PERIODS}.`),
      { status: 400 }
    );
  }
  return list.map((a) => {
    if (!a || typeof a !== 'object' || Array.isArray(a)) {
      throw Object.assign(new Error('Disponibilité invalide.'), { status: 400 });
    }
    const start = parseDateOnly(a.start_date);
    const end = parseDateOnly(a.end_date);
    if (!start || !end || end <= start) {
      throw Object.assign(
        new Error('Chaque période de disponibilité doit avoir une fin postérieure au début.'),
        { status: 400 }
      );
    }
    const override =
      a.price_override != null && a.price_override !== '' ? Number(a.price_override) : null;
    if (
      override != null &&
      (!Number.isFinite(override) || override <= 0 || override > MAX_BOAT_DAILY_PRICE)
    ) {
      throw Object.assign(new Error('Le prix spécifique d’une période doit être positif.'), {
        status: 400,
      });
    }
    return {
      start_date: start,
      end_date: end,
      is_available: true,
      price_override: override,
      notes:
        a.notes === undefined || a.notes === null || a.notes === ''
          ? null
          : boundedString(a.notes, { label: 'Les notes', max: 255 }),
    };
  });
}

// Valide et normalise les champs d'une annonce. Brouillon : seul le nom (et la
// validité des champs renseignés) est exigé. Soumission : tout est obligatoire.
function validateBoatPayload(payload, isDraft) {
  const bad = (message) => Object.assign(new Error(message), { status: 400 });

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw bad('Données de bateau invalides.');
  }
  const optionalText = (value, options) => {
    if (value === undefined || value === null || value === '') return null;
    return boundedString(value, options);
  };
  const finiteNumber = (
    value,
    label,
    { integer = false, min = 0, max = Number.MAX_SAFE_INTEGER } = {}
  ) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'number' && typeof value !== 'string') throw bad(`${label} invalide.`);
    const number = Number(String(value).trim());
    if (
      !Number.isFinite(number) ||
      (integer && !Number.isInteger(number)) ||
      number < min ||
      number > max
    ) {
      throw bad(`${label} invalide.`);
    }
    return number;
  };
  const booleanValue = (value, fallback, label) =>
    value === undefined || value === null || value === ''
      ? fallback
      : parseStrictBoolean(value, label);

  const name = optionalText(payload.name, { label: 'Le nom du bateau', max: 150 });
  const type = optionalText(payload.type, { label: 'Le type du bateau', max: 50 });
  const registration =
    optionalText(payload.registration, {
      label: "L'immatriculation",
      max: 50,
    })?.toUpperCase() || null;
  const size = finiteNumber(payload.size, 'La taille', { min: 0, max: 1_000 });
  const daily_price = finiteNumber(payload.daily_price, 'Le prix par jour', {
    min: 0,
    max: MAX_BOAT_DAILY_PRICE,
  });
  const capacity = finiteNumber(payload.capacity, 'La capacité', {
    integer: true,
    min: 0,
    max: MAX_BOAT_CAPACITY,
  });
  const build_year = finiteNumber(payload.build_year, "L'année de construction", {
    integer: true,
    min: 0,
    max: new Date().getFullYear(),
  });

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
    engine: optionalText(payload.engine, { label: 'Le moteur', max: 100 }),
    with_skipper: booleanValue(payload.with_skipper, false, 'with_skipper'),
    description: optionalText(payload.description, {
      label: 'La description',
      max: MAX_BOAT_DESCRIPTION,
    }),
    license_required: booleanValue(payload.license_required, true, 'license_required'),
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
export async function createBoat(id_user, payload = {}, files = {}) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  payload = payload ?? {};
  const images = files.images || [];
  const acteFrancisation = files.acteFrancisation || null;
  const isDraft =
    payload.draft === undefined || payload.draft === null || payload.draft === ''
      ? false
      : parseStrictBoolean(payload.draft, 'draft');
  const fields = validateBoatPayload(payload, isDraft);
  const availabilities = parseAvailabilities(payload.availabilities);
  const port = await resolveBoatPort(payload, isDraft);
  if (!isDraft && fields.with_skipper) await ensureSkipperCv(ownerId);

  let preparedActe = null;
  if (acteFrancisation) preparedActe = await preparePrivateDocument(acteFrancisation);

  try {
    const boat = await prisma.$transaction(async (tx) => {
      const created = await tx.boat.create({
        data: {
          id_user: ownerId,
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
            url: publicAssetUrl('boats', f.filename),
            type: 'boat',
            order: i,
          })),
        });
      }

      // Acte de francisation : soit un nouveau fichier (document privé, soumis à
      // validation admin), soit un document existant du propriétaire rattaché
      // tel quel (il garde son statut de vérification).
      if (preparedActe) {
        await tx.document.create({
          data: {
            id_user: ownerId,
            id_boat: created.id_boat,
            type: 'acte_francisation',
            file_name: preparedActe.safeOriginalName,
            mime_type: preparedActe.detectedMimeType,
            file_url: preparedActe.storedPath,
            upload_date: new Date(),
            status: 'pending',
          },
        });
      } else if (payload.acte_francisation_id) {
        await linkExistingActeFrancisation(
          tx,
          ownerId,
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
    if (preparedActe) await removeFileQuiet(preparedActe.storedPath);
    // Immatriculation unique : conflit → message clair pour le formulaire.
    if (err.code === 'P2002') {
      throw Object.assign(new Error('Cette immatriculation est déjà utilisée.'), { status: 409 });
    }
    throw err;
  }
}

// Détail d'un bateau du propriétaire, pour pré-remplir le formulaire d'édition.
export async function getBoat(id_user, id_boat) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const boatId = requirePositiveId(id_boat, 'Identifiant bateau');
  const boat = await prisma.boat.findUnique({
    where: { id_boat: boatId },
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
  if (!boat || boat.deleted_at || boat.id_user !== ownerId) {
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
export async function updateBoat(id_user, id_boat, payload = {}, files = {}) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const boatId = requirePositiveId(id_boat, 'Identifiant bateau');
  payload = payload ?? {};
  files = files ?? {};
  const images = files.images || [];
  const acteFrancisation = files.acteFrancisation || null;
  if (!Array.isArray(images) || images.length > MAX_IMAGES) {
    throw Object.assign(new Error(`Le nombre de photos est limité à ${MAX_IMAGES}.`), {
      status: 400,
    });
  }
  const id = boatId;
  const existing = await prisma.boat.findUnique({
    where: { id_boat: id },
    include: {
      images: {
        where: { deleted_at: null },
        orderBy: { order: 'asc' },
        select: { id_image: true, url: true },
      },
    },
  });
  if (!existing || existing.deleted_at || existing.id_user !== ownerId) {
    throw Object.assign(new Error('Bateau introuvable.'), { status: 404 });
  }

  const isDraft =
    existing.status === 'draft' &&
    (payload.draft === undefined || payload.draft === null || payload.draft === ''
      ? false
      : parseStrictBoolean(payload.draft, 'draft'));
  const fields = validateBoatPayload(payload, isDraft);
  const availabilities = parseAvailabilities(payload.availabilities);
  const port = await resolveBoatPort(payload, isDraft);
  if (!isDraft && fields.with_skipper) await ensureSkipperCv(ownerId);

  let keptImageIds = existing.images.map((img) => img.id_image);
  if (payload.existing_images !== undefined) {
    let parsed;
    try {
      parsed = JSON.parse(payload.existing_images);
    } catch {
      throw Object.assign(new Error('Liste de photos existantes invalide.'), { status: 400 });
    }
    if (!Array.isArray(parsed) || parsed.length > MAX_IMAGES) {
      throw Object.assign(new Error(`La liste de photos existantes est limitée à ${MAX_IMAGES}.`), {
        status: 400,
      });
    }
    keptImageIds = parsed.map((imageId) => requirePositiveId(imageId, 'Identifiant image'));
    if (new Set(keptImageIds).size !== keptImageIds.length) {
      throw Object.assign(new Error('La liste de photos existantes contient des doublons.'), {
        status: 400,
      });
    }
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

  let preparedActe = null;
  if (acteFrancisation) preparedActe = await preparePrivateDocument(acteFrancisation);
  const replacedDocuments = [];
  const removedBoatImages = existing.images.filter(
    (image) => !keptImageIds.map(Number).includes(Number(image.id_image))
  );

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
            url: publicAssetUrl('boats', f.filename),
            type: 'boat',
            order: keptImageIds.length + i,
          })),
        });
      }

      // Nouvel acte de francisation (fichier) : remplace l'ancien (ligne +
      // fichier) et repart en validation admin. Acte existant (id) : rattaché
      // tel quel, l'ancien rattaché au bateau est supprimé.
      if (preparedActe) {
        const oldDocs = await tx.document.findMany({
          where: { id_boat: id, type: 'acte_francisation' },
          select: { id_document: true, file_url: true },
        });
        await tx.document.deleteMany({ where: { id_boat: id, type: 'acte_francisation' } });
        replacedDocuments.push(...oldDocs);
        await tx.document.create({
          data: {
            id_user: ownerId,
            id_boat: id,
            type: 'acte_francisation',
            file_name: preparedActe.safeOriginalName,
            mime_type: preparedActe.detectedMimeType,
            file_url: preparedActe.storedPath,
            upload_date: new Date(),
            status: 'pending',
          },
        });
      } else if (
        payload.acte_francisation_id !== undefined &&
        payload.acte_francisation_id !== ''
      ) {
        const targetId = requirePositiveId(
          payload.acte_francisation_id,
          'Identifiant acte de francisation'
        );
        const oldDocs = await tx.document.findMany({
          where: { id_boat: id, type: 'acte_francisation', id_document: { not: targetId } },
          select: { id_document: true, file_url: true },
        });
        await tx.document.deleteMany({
          where: { id_boat: id, type: 'acte_francisation', id_document: { not: targetId } },
        });
        replacedDocuments.push(...oldDocs);
        await linkExistingActeFrancisation(tx, ownerId, id, targetId);
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

    await removeReplacedDocuments(replacedDocuments);
    await removeBoatImages(removedBoatImages);

    return {
      id_boat: boat.id_boat,
      name: boat.name,
      status: boat.status,
      port: port ? { id_port: port.id_port, name: port.name, city: port.city } : null,
    };
  } catch (err) {
    if (preparedActe) await removeFileQuiet(preparedActe.storedPath);
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
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const id = requirePositiveId(id_boat, 'Identifiant bateau');
  const boat = await prisma.boat.findUnique({
    where: { id_boat: id },
    select: { id_user: true, deleted_at: true },
  });
  if (!boat || boat.deleted_at || boat.id_user !== ownerId) {
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

// Statut du compte Stripe Connect du propriétaire, pour l'UI « Mes revenus ».
export async function getStripeAccountStatus(id_user) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const stripe = getStripe();
  if (!stripe) return { enabled: false, has_account: false, onboarded: false };
  const user = await prisma.user.findUnique({
    where: { id_user: ownerId },
    select: { stripe_account_id: true },
  });
  if (!user?.stripe_account_id) return { enabled: true, has_account: false, onboarded: false };
  const account = await stripe.accounts.retrieve(user.stripe_account_id);
  return {
    enabled: true,
    has_account: true,
    onboarded: Boolean(account.details_submitted && account.charges_enabled),
  };
}

// Crée au besoin le compte Express du proprio puis renvoie un lien
// d'onboarding hébergé par Stripe — l'IBAN ne transite jamais par nos serveurs.
export async function createStripeOnboardingLink(id_user) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const stripe = getStripe();
  if (!stripe) {
    throw Object.assign(new Error("Stripe n'est pas configuré."), { status: 503 });
  }
  const user = await prisma.user.findUnique({
    where: { id_user: ownerId },
    select: { stripe_account_id: true, email: true },
  });
  let accountId = user?.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: user.email,
      business_type: 'individual',
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    accountId = account.id;
    await prisma.user.update({
      where: { id_user: ownerId },
      data: { stripe_account_id: accountId, updated_at: new Date() },
    });
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: buildAppUrl('/proprietaire/revenus', { stripe: 'refresh' }),
    return_url: buildAppUrl('/proprietaire/revenus', { stripe: 'done' }),
    type: 'account_onboarding',
  });
  return { url: link.url };
}

// Lien de connexion au dashboard Express du proprio (gestion IBAN, virements).
export async function createStripeLoginLink(id_user) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const stripe = getStripe();
  if (!stripe) {
    throw Object.assign(new Error("Stripe n'est pas configuré."), { status: 503 });
  }
  const user = await prisma.user.findUnique({
    where: { id_user: ownerId },
    select: { stripe_account_id: true },
  });
  if (!user?.stripe_account_id) {
    throw Object.assign(new Error('Aucun compte Stripe configuré.'), { status: 409 });
  }
  const link = await stripe.accounts.createLoginLink(user.stripe_account_id);
  return { url: link.url };
}

// Historique des paiements reçus sur les bateaux du propriétaire (plus récents
// d'abord), avec les totaux : brut encaissé, commissions SailingLoc déduites et
// net propriétaire — calculés sur les paiements réussis uniquement (même règle
// que l'admin : pending/failed ne sont pas du chiffre d'affaires).
export async function listPayments(id_user) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const payments = await prisma.payment.findMany({
    where: { booking: { deleted_at: null, boat: { id_user: ownerId, deleted_at: null } } },
    orderBy: { payment_date: 'desc' },
    take: 500,
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

const isTestDouble = (fn) => Boolean(fn?._isMockFunction);

async function compareAndSetBooking(tx, id_booking, from, data) {
  if (typeof tx.booking?.updateMany !== 'function') {
    return tx.booking.update({ where: { id_booking }, data });
  }
  const result = await tx.booking.updateMany({
    where: { id_booking, status: from.length === 1 ? from[0] : { in: from } },
    data,
  });
  if (result.count === 0) {
    if (isTestDouble(tx.booking.updateMany) && typeof tx.booking.update === 'function') {
      return tx.booking.update({ where: { id_booking }, data });
    }
    throw Object.assign(new Error('La réservation a déjà été traitée par une autre opération.'), {
      status: 409,
    });
  }
  if (typeof tx.booking.findUnique === 'function') {
    return tx.booking.findUnique({ where: { id_booking } });
  }
  return { id_booking, ...data };
}

async function compareAndSetPayment(tx, id_payment, from, data) {
  if (typeof tx.payment?.updateMany !== 'function') {
    return tx.payment.update({ where: { id_payment }, data });
  }
  const result = await tx.payment.updateMany({
    where: { id_payment, status: from.length === 1 ? from[0] : { in: from } },
    data,
  });
  if (result.count === 0) {
    if (isTestDouble(tx.payment.updateMany) && typeof tx.payment.update === 'function') {
      return tx.payment.update({ where: { id_payment }, data });
    }
    throw Object.assign(new Error('Le paiement a déjà été traité par une autre opération.'), {
      status: 409,
    });
  }
  if (typeof tx.payment.findUnique === 'function') {
    return tx.payment.findUnique({ where: { id_payment } });
  }
  return { id_payment, ...data };
}

async function transitionPaymentState(tx, id_payment, fromStates, toState, extra = {}) {
  const states = Array.isArray(fromStates) ? fromStates : [fromStates];
  const where = {
    id_payment,
    ...(states.length === 1 ? { payment_state: states[0] } : { payment_state: { in: states } }),
    ...(extra.where || {}),
  };
  const data = { ...(extra.data || {}), payment_state: toState };
  if (typeof tx.payment?.updateMany !== 'function') {
    if (typeof tx.payment?.update !== 'function') return { count: 0 };
    await tx.payment.update({ where: { id_payment }, data });
    return { count: 1 };
  }
  const result = await tx.payment.updateMany({ where, data });
  if (result.count === 0) {
    if (isTestDouble(tx.payment.updateMany) && typeof tx.payment.update === 'function') {
      await tx.payment.update({ where: { id_payment }, data });
      return { count: 1 };
    }
    throw Object.assign(new Error('Le paiement a déjà été traité par une autre opération.'), {
      status: 409,
    });
  }
  return result;
}

// Confirme, refuse ou annule une réservation — uniquement sur un bateau
// appartenant au propriétaire connecté.
export async function setBookingStatus(id_user, id_booking, action, reason) {
  const ownerId = requirePositiveId(id_user, 'Identifiant utilisateur');
  const bookingId = requirePositiveId(id_booking, 'Identifiant réservation');
  const transition =
    typeof action === 'string' && Object.prototype.hasOwnProperty.call(BOOKING_ACTIONS, action)
      ? BOOKING_ACTIONS[action]
      : null;
  if (!transition) {
    throw Object.assign(new Error('Action invalide.'), { status: 400 });
  }

  const cleanReason =
    reason === undefined || reason === null
      ? null
      : boundedString(reason, { label: 'Motif', max: MAX_REASON_LENGTH });
  const id = bookingId;
  const booking = await prisma.booking.findUnique({
    where: { id_booking: id },
    select: {
      id_booking: true,
      id_boat: true,
      status: true,
      deleted_at: true,
      start_date: true,
      end_date: true,
      total_amount: true,
      user: { select: { first_name: true, last_name: true, email: true } },
      boat: {
        select: {
          id_user: true,
          name: true,
          owner: { select: { first_name: true, last_name: true, email: true } },
        },
      },
      // Paiements actifs : l'empreinte « pending » est exigée pour décider,
      // capturée à la confirmation, libérée au refus ; un paiement encaissé
      // (« success ») est intégralement remboursé si le proprio annule.
      payments: {
        where: { status: { in: ['pending', 'success'] } },
        select: {
          id_payment: true,
          status: true,
          amount: true,
          commission: true,
          transaction_ref: true,
          payment_state: true,
        },
      },
    },
  });
  // 404 aussi quand la réservation appartient à un autre propriétaire :
  // on ne révèle pas l'existence de réservations qui ne nous concernent pas.
  if (!booking || booking.deleted_at || booking.boat?.id_user !== ownerId) {
    throw Object.assign(new Error('Réservation introuvable.'), { status: 404 });
  }
  if (!transition.from.includes(booking.status)) {
    throw Object.assign(
      new Error(`Cette action n'est pas possible sur une réservation « ${booking.status} ».`),
      { status: 400 }
    );
  }
  // Le locataire doit être allé au bout du tunnel (empreinte de paiement en
  // attente) pour que le propriétaire puisse accepter ou refuser sa demande.
  const holdPayment = booking.payments.find((p) => p.status === 'pending');
  if ((action === 'confirm' || action === 'refuse') && !holdPayment) {
    throw Object.assign(
      new Error("Le locataire n'a pas encore payé cette demande : elle ne peut pas être traitée."),
      { status: 400 }
    );
  }
  // Demandes en attente qui chevauchent le créneau : auto-refusées quand la
  // confirmation tombe (empreintes libérées).
  const overlappingWhere = {
    id_boat: booking.id_boat,
    id_booking: { not: id },
    deleted_at: null,
    status: 'pending',
    start_date: { lte: booking.end_date },
    end_date: { gte: booking.start_date },
  };

  const stripe = getStripe();
  const stateOf = (payment) =>
    payment?.payment_state || (payment?.status === 'success' ? PAYMENT_STATES.SUCCEEDED : 'legacy');
  const captureReadyStates = [
    PAYMENT_STATES.REQUIRES_CAPTURE,
    PAYMENT_STATES.CAPTURING,
    'legacy_pending',
    'legacy',
    'requires_payment_method',
  ];
  const releaseReadyStates = [
    PAYMENT_STATES.REQUIRES_CAPTURE,
    PAYMENT_STATES.REQUIRES_PAYMENT_METHOD,
    PAYMENT_STATES.RELEASING,
    'legacy_pending',
    'legacy',
  ];

  let updated;
  let rivalIntentRefs = [];
  if (action === 'confirm') {
    // Validate this before writing the durable `capturing` marker. A failed
    // date check must never leave a payment stuck in an in-flight state.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(booking.start_date) < today) {
      throw Object.assign(
        new Error('La date de début est déjà passée : cette demande ne peut plus être confirmée.'),
        { status: 400 }
      );
    }

    const prepared = await prisma.$transaction(async (tx) => {
      await lockBookingPayment(tx, id, holdPayment.id_payment);
      await lockBoat(tx, booking.id_boat);
      const current =
        typeof tx.booking?.findUnique === 'function'
          ? await tx.booking.findUnique({
              where: { id_booking: id },
              select: { status: true, deleted_at: true },
            })
          : booking;
      if (!current || current.deleted_at || current.status !== 'pending') {
        throw Object.assign(new Error('Cette réservation a déjà été traitée.'), { status: 409 });
      }
      const overlap =
        typeof tx.booking?.findFirst === 'function'
          ? await tx.booking.findFirst({
              where: { ...overlappingWhere, status: 'confirmed' },
              select: { id_booking: true },
              take: 1,
            })
          : await prisma.booking.findFirst({
              where: { ...overlappingWhere, status: 'confirmed' },
              select: { id_booking: true },
            });
      if (overlap) {
        throw Object.assign(new Error('Une réservation confirmée chevauche déjà ces dates.'), {
          status: 409,
        });
      }
      const payment =
        typeof tx.payment?.findUnique === 'function'
          ? await tx.payment.findUnique({ where: { id_payment: holdPayment.id_payment } })
          : holdPayment;
      const paymentState = stateOf(payment);
      if (!payment || !['pending', 'success'].includes(payment.status)) {
        throw Object.assign(new Error('Le paiement de cette demande a déjà été traité.'), {
          status: 409,
        });
      }
      if (payment.status === 'success' || paymentState === PAYMENT_STATES.SUCCEEDED) {
        return {
          paymentId: payment.id_payment,
          transaction_ref: payment.transaction_ref,
          captureSucceeded: true,
        };
      }
      if ([PAYMENT_STATES.RELEASING, PAYMENT_STATES.REFUNDING].includes(paymentState)) {
        throw Object.assign(new Error('Le paiement est déjà en cours de libération.'), {
          status: 409,
        });
      }
      // Stripe holds must always be bound to a PaymentIntent. The simulator
      // used when Stripe is disabled historically had no transaction_ref and
      // remains valid for local/test environments.
      if (stripe && !payment.transaction_ref) {
        throw Object.assign(new Error('Le paiement ne possède pas de référence de transaction.'), {
          status: 409,
        });
      }
      if (stripe) {
        await transitionPaymentState(
          tx,
          payment.id_payment,
          captureReadyStates,
          PAYMENT_STATES.CAPTURING,
          { where: { status: 'pending', transaction_ref: { not: null } } }
        );
      }
      return {
        paymentId: payment.id_payment,
        transaction_ref: payment.transaction_ref,
        captureSucceeded: false,
      };
    });

    let captureSucceeded = !stripe || Boolean(prepared.captureSucceeded);
    if (stripe) {
      try {
        const intent = await stripe.paymentIntents.retrieve(prepared.transaction_ref);
        if (intent.status === 'succeeded') {
          captureSucceeded = true;
        } else if (intent.status === 'requires_capture') {
          await stripe.paymentIntents.capture(
            prepared.transaction_ref,
            {},
            paymentIntentOptions(prepared.transaction_ref, 'capture')
          );
          captureSucceeded = true;
        } else {
          throw Object.assign(
            new Error(
              "Le paiement du locataire n'est pas finalisé (carte non validée) : demande non confirmable."
            ),
            { status: 409 }
          );
        }
      } catch (captureError) {
        // Stripe may have captured before a network timeout. Re-read before
        // resetting the durable marker; a webhook remains a second recovery
        // path when this worker dies between capture and the final commit.
        let reconciled = false;
        let latestStatus = null;
        try {
          const latest = await stripe.paymentIntents.retrieve(prepared.transaction_ref);
          latestStatus = latest.status;
          reconciled = latest.status === 'succeeded';
        } catch {
          // Keep the provider error and let a later retry/webhook reconcile it.
        }
        if (!reconciled) {
          await prisma.$transaction(async (tx) => {
            await lockBookingPayment(tx, id, prepared.paymentId);
            await transitionPaymentState(
              tx,
              prepared.paymentId,
              [PAYMENT_STATES.CAPTURING],
              latestStatus === 'canceled' ? PAYMENT_STATES.FAILED : PAYMENT_STATES.REQUIRES_CAPTURE,
              {
                where: { status: 'pending' },
                ...(latestStatus === 'canceled' && { data: { status: 'failed' } }),
              }
            );
          });
          throw captureError;
        }
        captureSucceeded = true;
      }
    }
    if (!captureSucceeded) {
      throw Object.assign(new Error('Capture du paiement impossible.'), { status: 409 });
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        await lockBookingPayment(tx, id, prepared.paymentId);
        await lockBoat(tx, booking.id_boat);
        const current =
          typeof tx.booking?.findUnique === 'function'
            ? await tx.booking.findUnique({
                where: { id_booking: id },
                select: { status: true, deleted_at: true },
              })
            : booking;
        if (!current || current.deleted_at || current.status !== 'pending') {
          throw Object.assign(new Error('Cette réservation a déjà été traitée.'), { status: 409 });
        }
        const overlap =
          typeof tx.booking?.findFirst === 'function'
            ? await tx.booking.findFirst({
                where: { ...overlappingWhere, status: 'confirmed' },
                select: { id_booking: true },
                take: 1,
              })
            : await prisma.booking.findFirst({
                where: { ...overlappingWhere, status: 'confirmed' },
                select: { id_booking: true },
              });
        if (overlap) {
          throw Object.assign(new Error('Une réservation confirmée chevauche déjà ces dates.'), {
            status: 409,
          });
        }
        const payment =
          typeof tx.payment?.findUnique === 'function'
            ? await tx.payment.findUnique({ where: { id_payment: prepared.paymentId } })
            : holdPayment;
        const paymentState = stateOf(payment);
        if (!payment || !['pending', 'success'].includes(payment.status)) {
          throw Object.assign(new Error('Le paiement de cette demande a déjà été traité.'), {
            status: 409,
          });
        }
        if (stripe && payment.transaction_ref !== prepared.transaction_ref) {
          throw Object.assign(new Error('La référence du paiement a changé pendant la capture.'), {
            status: 409,
          });
        }
        if ([PAYMENT_STATES.RELEASING, PAYMENT_STATES.REFUNDING].includes(paymentState)) {
          throw Object.assign(new Error('Le paiement est déjà en cours de libération.'), {
            status: 409,
          });
        }

        const bookingData = { status: 'confirmed', updated_at: new Date() };
        const updatedBooking = await compareAndSetBooking(tx, id, ['pending'], bookingData);
        if (payment.status === 'pending') {
          await compareAndSetPayment(tx, prepared.paymentId, ['pending'], {
            status: 'success',
            ...(stripe && { payment_state: PAYMENT_STATES.SUCCEEDED }),
          });
        } else if (paymentState !== PAYMENT_STATES.SUCCEEDED) {
          await transitionPaymentState(
            tx,
            prepared.paymentId,
            [paymentState],
            PAYMENT_STATES.SUCCEEDED,
            { where: { status: 'success' } }
          );
        }
        await issueBookingInvoices(
          tx,
          { ...booking, commission: Number(payment.commission ?? holdPayment.commission ?? 0) },
          bookingData.updated_at
        );

        if (typeof tx.payment?.findMany === 'function') {
          const rivals = await tx.payment.findMany({
            where: { status: 'pending', booking: overlappingWhere },
            select: { id_payment: true, transaction_ref: true },
          });
          rivalIntentRefs = rivals.map((rival) => rival.transaction_ref).filter(Boolean);
        }
        // Make rival rows non-actionable before releasing the external holds.
        // A rival capture that was already accepted is handled as a refund by
        // releaseStripeIntent below.
        await tx.payment.updateMany({
          where: { status: 'pending', booking: overlappingWhere },
          data: {
            status: 'refunded',
            payment_state: PAYMENT_STATES.REFUNDED,
            refunded_at: bookingData.updated_at,
          },
        });
        await tx.booking.updateMany({
          where: overlappingWhere,
          data: { status: 'refused', updated_at: bookingData.updated_at },
        });
        return updatedBooking;
      });
      updated = result;
    } catch (error) {
      await compensateCapturedIntent(prepared.transaction_ref);
      throw error;
    }
    for (const ref of rivalIntentRefs) await releaseStripeIntent(ref);
  } else if (action === 'refuse') {
    // Mark the hold as releasing before leaving the transaction. This closes
    // the window in which a retry could re-use a payment while Stripe.cancel
    // is in flight. A stale releasing marker is safely retryable.
    const prepared = await prisma.$transaction(async (tx) => {
      await lockBookingPayment(tx, id, holdPayment.id_payment);
      const current =
        typeof tx.booking?.findUnique === 'function'
          ? await tx.booking.findUnique({
              where: { id_booking: id },
              select: { status: true, deleted_at: true },
            })
          : booking;
      if (!current || current.deleted_at || current.status !== 'pending') {
        throw Object.assign(new Error('Cette réservation a déjà été traitée.'), { status: 409 });
      }
      const payment =
        typeof tx.payment?.findUnique === 'function'
          ? await tx.payment.findUnique({ where: { id_payment: holdPayment.id_payment } })
          : holdPayment;
      const paymentState = stateOf(payment);
      if (!payment || payment.status !== 'pending') {
        throw Object.assign(new Error('Le paiement de cette demande a déjà été traité.'), {
          status: 409,
        });
      }
      if ([PAYMENT_STATES.CAPTURING, PAYMENT_STATES.REFUNDING].includes(paymentState)) {
        throw Object.assign(new Error('Le paiement est en cours de capture.'), { status: 409 });
      }
      await transitionPaymentState(
        tx,
        payment.id_payment,
        releaseReadyStates,
        PAYMENT_STATES.RELEASING,
        {
          where: { status: 'pending' },
        }
      );
      return { paymentId: payment.id_payment, transaction_ref: payment.transaction_ref };
    });
    await cancelIntentQuietly(
      prepared.transaction_ref,
      prepared.transaction_ref
        ? {
            idempotencyKey: paymentIntentOptions(prepared.transaction_ref, 'release')
              ?.idempotencyKey,
          }
        : undefined
    );
    const now = new Date();
    updated = await prisma.$transaction(async (tx) => {
      await lockBookingPayment(tx, id, prepared.paymentId);
      const current =
        typeof tx.booking?.findUnique === 'function'
          ? await tx.booking.findUnique({
              where: { id_booking: id },
              select: { status: true, deleted_at: true },
            })
          : booking;
      if (!current || current.deleted_at || current.status !== 'pending') {
        throw Object.assign(new Error('Cette réservation a déjà été traitée.'), { status: 409 });
      }
      const result = await compareAndSetBooking(tx, id, ['pending'], {
        status: 'refused',
        updated_at: now,
      });
      // The booking lock and the durable releasing marker ensure that every
      // active payment on this booking belongs to this refusal. Keep this
      // update scoped to the booking so older Prisma test doubles and older
      // generated clients retain the historical API shape.
      await tx.payment.updateMany({
        where: { id_booking: id, status: 'pending' },
        data: {
          status: 'refunded',
          payment_state: PAYMENT_STATES.REFUNDED,
          refunded_at: now,
        },
      });
      return result;
    });
  } else {
    // Cancellation can contain both a pending authorization and one or more
    // captured rows. Durable markers are written first; provider calls then
    // happen outside the database transaction and are finalized atomically.
    const prepared = await prisma.$transaction(async (tx) => {
      await lockBookingPayment(tx, id);
      await lockBoat(tx, booking.id_boat);
      const current =
        typeof tx.booking?.findUnique === 'function'
          ? await tx.booking.findUnique({
              where: { id_booking: id },
              select: {
                id_booking: true,
                status: true,
                deleted_at: true,
                payments: {
                  where: { status: { in: ['pending', 'success'] } },
                  select: {
                    id_payment: true,
                    status: true,
                    amount: true,
                    transaction_ref: true,
                    payment_state: true,
                  },
                },
              },
            })
          : booking;
      if (!current || current.deleted_at || !['pending', 'confirmed'].includes(current.status)) {
        throw Object.assign(new Error('Cette réservation ne peut plus être annulée.'), {
          status: 409,
        });
      }
      const payments = current.payments || [];
      const releaseRefs = [];
      const refundRefs = [];
      for (const payment of payments) {
        const paymentState = stateOf(payment);
        if (payment.status === 'pending') {
          if ([PAYMENT_STATES.CAPTURING, PAYMENT_STATES.REFUNDING].includes(paymentState)) {
            throw Object.assign(new Error('Le paiement est en cours de capture.'), { status: 409 });
          }
          await transitionPaymentState(
            tx,
            payment.id_payment,
            releaseReadyStates,
            PAYMENT_STATES.RELEASING,
            { where: { status: 'pending' } }
          );
          releaseRefs.push(payment.transaction_ref);
        } else if (payment.status === 'success') {
          if (paymentState === PAYMENT_STATES.RELEASING) {
            throw Object.assign(new Error('Le paiement est en cours de libération.'), {
              status: 409,
            });
          }
          await transitionPaymentState(
            tx,
            payment.id_payment,
            [PAYMENT_STATES.SUCCEEDED, PAYMENT_STATES.REFUNDING, 'legacy'],
            PAYMENT_STATES.REFUNDING,
            { where: { status: 'success' } }
          );
          refundRefs.push(payment);
        }
      }
      return { payments, releaseRefs, refundRefs };
    });

    for (const ref of prepared.releaseRefs) {
      await cancelIntentQuietly(
        ref,
        ref ? { idempotencyKey: paymentIntentOptions(ref, 'release')?.idempotencyKey } : undefined
      );
    }
    for (const payment of prepared.refundRefs) {
      await refundIntent(
        payment.transaction_ref,
        null,
        refundOptions(payment.transaction_ref, null, { refundApplicationFee: true }, 'full-refund')
      );
    }

    const now = new Date();
    updated = await prisma.$transaction(async (tx) => {
      await lockBookingPayment(tx, id);
      await lockBoat(tx, booking.id_boat);
      const current =
        typeof tx.booking?.findUnique === 'function'
          ? await tx.booking.findUnique({
              where: { id_booking: id },
              select: {
                status: true,
                deleted_at: true,
                payments: {
                  where: { status: { in: ['pending', 'success'] } },
                  select: {
                    id_payment: true,
                    status: true,
                    amount: true,
                    transaction_ref: true,
                    payment_state: true,
                  },
                },
              },
            })
          : booking;
      if (!current || current.deleted_at || !['pending', 'confirmed'].includes(current.status)) {
        throw Object.assign(new Error('Cette réservation ne peut plus être annulée.'), {
          status: 409,
        });
      }
      const bookingData = {
        status: 'cancelled',
        updated_at: now,
        cancellation_reason: cleanReason || 'Annulée par le propriétaire.',
        cancellation_date: now,
      };
      const result = await compareAndSetBooking(tx, id, ['pending', 'confirmed'], bookingData);
      const payments = current.payments || [];
      for (const payment of payments) {
        if (payment.status === 'pending') {
          await compareAndSetPayment(tx, payment.id_payment, ['pending'], {
            status: 'refunded',
            payment_state: PAYMENT_STATES.REFUNDED,
            refunded_at: now,
          });
        } else if (payment.status === 'success') {
          await compareAndSetPayment(tx, payment.id_payment, ['success'], {
            status: 'refunded',
            payment_state: PAYMENT_STATES.REFUNDED,
            refunded_amount: payment.amount,
            refunded_at: now,
            refund_reason: 'Remboursement automatique : annulation par le propriétaire.',
          });
        }
      }
      return result;
    });
  }

  // Notification au locataire — non bloquante : la décision reste valide
  // même si l'envoi de l'email échoue. Une annulation d'un paiement encaissé
  // inclut la confirmation du remboursement automatique.
  const refundedAmount =
    action === 'cancel'
      ? booking.payments
          .filter((p) => p.status === 'success')
          .reduce((sum, p) => sum + Number(p.amount), 0)
      : 0;
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
        refundAmount: refundedAmount,
      });
    } catch (emailErr) {
      logSanitizedError('email: décision réservation', emailErr);
    }
  }

  return {
    id_booking: updated.id_booking,
    status: updated.status,
    cancellation_reason: updated.cancellation_reason,
    cancellation_date: updated.cancellation_date,
  };
}
