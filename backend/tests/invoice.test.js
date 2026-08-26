import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const db = {
  booking: { findFirst: jest.fn(), findUnique: jest.fn() },
  invoice: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

jest.unstable_mockModule('../src/config/db.js', () => ({ default: db }));

const { issueBookingInvoices, getInvoiceFor } = await import('../src/services/invoiceService.js');
const { renderInvoice, invoiceFileName } = await import('../src/services/invoicePdf.js');

const NOW = new Date('2026-08-06T10:00:00.000Z');

const BOOKING = {
  id_booking: 42,
  start_date: new Date('2026-07-10'),
  end_date: new Date('2026-07-17'),
  total_amount: 1250,
  commission: 125,
  user: { first_name: 'Amélie', last_name: 'Fontaine', email: 'amelie@example.com' },
  boat: {
    name: 'Le Grand Bleu',
    owner: { first_name: 'Marc', last_name: 'Riva', email: 'marc@example.com' },
  },
};

function makeTx({ lastSequence = 0, existing = [], booking = null } = {}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    booking: { findUnique: jest.fn().mockResolvedValue(booking) },
    invoice: {
      findMany: jest.fn().mockResolvedValue(existing),
      aggregate: jest.fn().mockResolvedValue({ _max: { sequence: lastSequence } }),
      create: jest.fn(({ data }) => Promise.resolve(data)),
    },
  };
}

beforeEach(() => jest.clearAllMocks());

describe('émission des factures', () => {
  it('émet une pièce par partie, dans sa propre série', async () => {
    const tx = makeTx();
    const issued = await issueBookingInvoices(tx, BOOKING, NOW);

    expect(issued.map((i) => i.kind)).toEqual(['rental', 'commission']);
    expect(issued.map((i) => i.number)).toEqual(['LOC-2026-000001', 'COM-2026-000001']);
  });

  it('adresse chaque pièce à la bonne partie', async () => {
    const [rental, commission] = await issueBookingInvoices(makeTx(), BOOKING, NOW);

    expect(rental.customer_name).toBe('Amélie Fontaine');
    expect(commission.customer_name).toBe('Marc Riva');
  });

  it('facture au locataire le total, au propriétaire la seule commission', async () => {
    const [rental, commission] = await issueBookingInvoices(makeTx(), BOOKING, NOW);

    expect(rental.total_amount).toBe(1250);
    expect(rental.commission).toBe(0);
    expect(commission.commission).toBe(125);
    expect(commission.net_amount).toBe(1125);
  });

  it('reprend la numérotation après le dernier rang de la série', async () => {
    const issued = await issueBookingInvoices(makeTx({ lastSequence: 128 }), BOOKING, NOW);
    expect(issued.map((i) => i.number)).toEqual(['LOC-2026-000129', 'COM-2026-000129']);
  });

  it('sérialise la série avant de lire le dernier rang', async () => {
    const tx = makeTx();
    await issueBookingInvoices(tx, BOOKING, NOW);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('ne réémet pas une pièce déjà existante', async () => {
    const tx = makeTx({ existing: [{ kind: 'rental' }] });
    const issued = await issueBookingInvoices(tx, BOOKING, NOW);

    expect(issued.map((i) => i.kind)).toEqual(['commission']);
    expect(tx.invoice.create).toHaveBeenCalledTimes(1);
  });

  it('fige identité et montants plutôt que de les relire plus tard', async () => {
    const [rental] = await issueBookingInvoices(makeTx(), BOOKING, NOW);

    expect(rental.issuer_name).toBeTruthy();
    expect(rental.issuer_address).toBeTruthy();
    expect(rental.boat_name).toBe('Le Grand Bleu');
    expect(rental.nights).toBe(7);
  });
});

describe('accès aux factures', () => {
  const invoice = { kind: 'rental', number: 'LOC-2026-000001' };

  it('sert au locataire sa facture de location', async () => {
    db.booking.findFirst.mockResolvedValue({ id_booking: 42, status: 'confirmed' });
    db.invoice.findUnique.mockResolvedValue(invoice);

    const result = await getInvoiceFor({ id_user: 7, role: 'locataire' }, 42);

    expect(result).toBe(invoice);
    expect(db.booking.findFirst.mock.calls[0][0].where.id_user).toBe(7);
    expect(db.invoice.findUnique.mock.calls[0][0].where.id_booking_kind.kind).toBe('rental');
  });

  it('sert au propriétaire sa facture de commission, via ses bateaux', async () => {
    db.booking.findFirst.mockResolvedValue({ id_booking: 42, status: 'confirmed' });
    db.invoice.findUnique.mockResolvedValue({ kind: 'commission' });

    await getInvoiceFor({ id_user: 9, role: 'proprietaire' }, 42);

    expect(db.booking.findFirst.mock.calls[0][0].where.boat).toEqual({ id_user: 9 });
    expect(db.invoice.findUnique.mock.calls[0][0].where.id_booking_kind.kind).toBe('commission');
  });

  it('renvoie 404 sur la réservation d’autrui, sans révéler son existence', async () => {
    db.booking.findFirst.mockResolvedValue(null);
    await expect(getInvoiceFor({ id_user: 7, role: 'locataire' }, 42)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('refuse de facturer une réservation non confirmée', async () => {
    db.booking.findFirst.mockResolvedValue({ id_booking: 42, status: 'pending' });
    await expect(getInvoiceFor({ id_user: 7, role: 'locataire' }, 42)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('rejette un identifiant non numérique sans toucher la base', async () => {
    await expect(getInvoiceFor({ id_user: 7, role: 'locataire' }, 'abc')).rejects.toMatchObject({
      status: 404,
    });
    expect(db.booking.findFirst).not.toHaveBeenCalled();
  });

  it('émet la pièce manquante d’une réservation antérieure à la mise en service', async () => {
    db.booking.findFirst.mockResolvedValue({ id_booking: 42, status: 'confirmed' });
    db.invoice.findUnique.mockResolvedValue(null);
    const tx = makeTx({ booking: { ...BOOKING, payments: [{ commission: 125 }] } });
    db.$transaction.mockImplementation((fn) => fn(tx));

    const result = await getInvoiceFor({ id_user: 7, role: 'locataire' }, 42);

    expect(result.number).toBe('LOC-2026-000001');
  });
});

describe('rendu PDF', () => {
  const base = {
    issuer_name: 'SailingLoc SAS',
    issuer_address: '12 Quai du Port, 13002 Marseille',
    issuer_legal: 'SAS au capital de 10 000 €',
    issuer_vat: null,
    customer_name: 'Amélie Fontaine',
    customer_email: 'amelie@example.com',
    customer_address: null,
    boat_name: 'Le Grand Bleu',
    start_date: new Date('2026-07-10'),
    end_date: new Date('2026-07-17'),
    nights: 7,
    issued_at: NOW,
    vat_rate: 0,
    total_amount: 1250,
    commission: 125,
    net_amount: 1125,
    vat_amount: 0,
  };

  const collect = (invoice) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      const doc = renderInvoice(invoice);
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

  it('produit un PDF pour chaque type de pièce', async () => {
    for (const kind of ['rental', 'commission']) {
      const pdf = await collect({ ...base, kind, number: 'X-2026-000001' });
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pdf.length).toBeGreaterThan(1000);
    }
  });

  it('nomme le fichier d’après le numéro de facture', () => {
    expect(invoiceFileName({ number: 'LOC-2026-000042' })).toBe('facture-LOC-2026-000042.pdf');
  });
});
