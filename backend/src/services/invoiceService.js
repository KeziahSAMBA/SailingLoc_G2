import prisma from '../config/db.js';
import { COMPANY, VAT_RATE } from '../config/company.js';

const SERIES = { rental: 'LOC', commission: 'COM' };
const DAY_MS = 86400000;

const round2 = (value) => Math.round(value * 100) / 100;

const vatFromGross = (gross, rate) => (rate > 0 ? round2((gross * rate) / (100 + rate)) : 0);

function nightsBetween(start, end) {
  const from = new Date(start).setHours(0, 0, 0, 0);
  const to = new Date(end).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((to - from) / DAY_MS));
}

async function nextSequence(tx, series, year) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`invoice:${series}:${year}`}))`;
  const last = await tx.invoice.aggregate({ where: { series, year }, _max: { sequence: true } });
  return (last._max.sequence ?? 0) + 1;
}

const formatNumber = (series, year, sequence) =>
  `${series}-${year}-${String(sequence).padStart(6, '0')}`;

function amountsFor(kind, { total, commission }) {
  if (kind === 'rental') {
    return {
      total_amount: total,
      commission: 0,
      net_amount: total,
      vat_amount: vatFromGross(total, VAT_RATE),
    };
  }
  return {
    total_amount: total,
    commission,
    net_amount: round2(total - commission),
    vat_amount: vatFromGross(commission, VAT_RATE),
  };
}

function snapshotFor(kind, booking) {
  const party = kind === 'rental' ? booking.user : booking.boat?.owner;
  return {
    issuer_name: COMPANY.name,
    issuer_address: COMPANY.address,
    issuer_legal: COMPANY.legal,
    issuer_vat: COMPANY.vatNumber || null,
    customer_name: [party?.first_name, party?.last_name].filter(Boolean).join(' ') || 'Client',
    customer_email: party?.email || '',
    customer_address: null,
    boat_name: booking.boat?.name || 'Bateau',
    start_date: booking.start_date,
    end_date: booking.end_date,
    nights: nightsBetween(booking.start_date, booking.end_date),
  };
}

export async function issueBookingInvoices(tx, booking, now = new Date()) {
  const total = Number(booking.total_amount);
  const commission = Number(booking.commission ?? 0);
  const year = now.getFullYear();

  const existing = await tx.invoice.findMany({
    where: { id_booking: booking.id_booking },
    select: { kind: true },
  });
  const alreadyIssued = new Set(existing.map((row) => row.kind));

  const issued = [];
  for (const kind of ['rental', 'commission']) {
    if (alreadyIssued.has(kind)) continue;

    const series = SERIES[kind];
    const sequence = await nextSequence(tx, series, year);

    issued.push(
      await tx.invoice.create({
        data: {
          id_booking: booking.id_booking,
          kind,
          series,
          year,
          sequence,
          number: formatNumber(series, year, sequence),
          issued_at: now,
          vat_rate: VAT_RATE,
          ...amountsFor(kind, { total, commission }),
          ...snapshotFor(kind, booking),
        },
      })
    );
  }
  return issued;
}

const BOOKING_FOR_INVOICE = {
  id_booking: true,
  start_date: true,
  end_date: true,
  total_amount: true,
  status: true,
  user: { select: { first_name: true, last_name: true, email: true } },
  boat: {
    select: {
      name: true,
      owner: { select: { first_name: true, last_name: true, email: true } },
    },
  },
  payments: {
    where: { status: { in: ['success', 'refunded'] } },
    orderBy: { payment_date: 'asc' },
    take: 1,
    select: { commission: true },
  },
};

async function issueMissingInvoices(id_booking) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id_booking },
      select: BOOKING_FOR_INVOICE,
    });
    if (!booking) return [];
    return issueBookingInvoices(
      tx,
      { ...booking, commission: Number(booking.payments[0]?.commission ?? 0) },
      new Date()
    );
  });
}

const notFound = () => Object.assign(new Error('Facture introuvable.'), { status: 404 });

export async function getInvoiceFor(user, id_booking) {
  const id = Number(id_booking);
  if (!Number.isInteger(id) || id <= 0) throw notFound();

  const kind = user.role === 'proprietaire' ? 'commission' : 'rental';
  const ownership =
    user.role === 'proprietaire' ? { boat: { id_user: user.id_user } } : { id_user: user.id_user };

  const booking = await prisma.booking.findFirst({
    where: { id_booking: id, deleted_at: null, ...ownership },
    select: { id_booking: true, status: true },
  });
  if (!booking || booking.status !== 'confirmed') throw notFound();

  const invoice =
    (await prisma.invoice.findUnique({
      where: { id_booking_kind: { id_booking: id, kind } },
    })) || (await issueMissingInvoices(id)).find((row) => row.kind === kind);

  if (!invoice) throw notFound();
  return invoice;
}
