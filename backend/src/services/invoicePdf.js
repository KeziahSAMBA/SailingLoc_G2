import PDFDocument from 'pdfkit';

const EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const toWinAnsiSpaces = (value) => String(value).replace(/[\u202f\u00a0\u2007\u2009]/g, ' ');

const money = (value) => toWinAnsiSpaces(EURO.format(Number(value)));
const day = (value) => DATE.format(new Date(value));

const INK = '#0f172a';
const MUTED = '#64748b';
const RULE = '#cbd5e1';
const ACCENT = '#5AB4EC';

const LABELS = {
  rental: {
    title: 'Facture de location',
    recipient: 'Facturé à',
    lineLabel: (invoice) => `Location — ${invoice.boat_name}`,
    note: 'Montant réglé par carte bancaire lors de la confirmation de la réservation.',
  },
  commission: {
    title: 'Facture de commission',
    recipient: 'Facturé à',
    lineLabel: () => 'Commission de service SailingLoc',
    note: 'Commission retenue sur le montant de la location. Le net vous est reversé par Stripe.',
  },
};

function header(doc, invoice, labels) {
  doc.fillColor(INK).fontSize(18).font('Helvetica-Bold').text(invoice.issuer_name, 50, 50);
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor(MUTED)
    .text(invoice.issuer_address, { width: 260 })
    .text(invoice.issuer_legal, { width: 260 });
  if (invoice.issuer_vat) doc.text(`N° TVA : ${invoice.issuer_vat}`);

  doc
    .fillColor(ACCENT)
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(labels.title, 320, 50, { width: 225, align: 'right' });
  doc
    .fillColor(INK)
    .fontSize(11)
    .text(`N° ${invoice.number}`, 320, 72, { width: 225, align: 'right' });
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font('Helvetica')
    .text(`Émise le ${day(invoice.issued_at)}`, 320, 88, { width: 225, align: 'right' });
}

function recipient(doc, invoice, labels) {
  doc.moveTo(50, 140).lineTo(545, 140).strokeColor(RULE).stroke();

  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(labels.recipient.toUpperCase(), 50, 158);
  doc.fillColor(INK).fontSize(11).font('Helvetica').text(invoice.customer_name, 50, 174);
  doc.fillColor(MUTED).fontSize(9).text(invoice.customer_email);
  if (invoice.customer_address) doc.text(invoice.customer_address, { width: 240 });

  doc
    .fillColor(MUTED)
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('SÉJOUR', 320, 158, { width: 225, align: 'right' });
  doc
    .fillColor(INK)
    .fontSize(10)
    .font('Helvetica')
    .text(`du ${day(invoice.start_date)} au ${day(invoice.end_date)}`, 320, 174, {
      width: 225,
      align: 'right',
    });
  doc
    .fillColor(MUTED)
    .fontSize(9)
    .text(
      `${invoice.nights} nuit${invoice.nights > 1 ? 's' : ''} — ${invoice.boat_name}`,
      320,
      189,
      {
        width: 225,
        align: 'right',
      }
    );
}

function detailRows(invoice) {
  const labels = LABELS[invoice.kind];
  if (invoice.kind === 'rental') {
    return [[labels.lineLabel(invoice), `${invoice.nights}`, money(invoice.total_amount)]];
  }
  return [
    ['Montant de la location', '1', money(invoice.total_amount)],
    [labels.lineLabel(invoice), '1', `- ${money(invoice.commission)}`],
  ];
}

function table(doc, invoice) {
  const top = 240;
  doc.rect(50, top, 495, 24).fill('#f1f5f9');
  doc.fillColor(MUTED).fontSize(9).font('Helvetica-Bold');
  doc.text('DÉSIGNATION', 60, top + 8);
  doc.text('QTÉ', 380, top + 8, { width: 40, align: 'right' });
  doc.text('MONTANT', 440, top + 8, { width: 95, align: 'right' });

  let y = top + 34;
  doc.font('Helvetica').fontSize(10).fillColor(INK);
  for (const [label, qty, amount] of detailRows(invoice)) {
    doc.text(label, 60, y, { width: 310 });
    doc.text(qty, 380, y, { width: 40, align: 'right' });
    doc.text(amount, 440, y, { width: 95, align: 'right' });
    y += 22;
  }
  return y;
}

function totals(doc, invoice, y) {
  const rate = Number(invoice.vat_rate);
  const due = invoice.kind === 'rental' ? Number(invoice.total_amount) : Number(invoice.commission);
  const vat = Number(invoice.vat_amount);

  doc
    .moveTo(320, y + 6)
    .lineTo(545, y + 6)
    .strokeColor(RULE)
    .stroke();
  let line = y + 18;

  const row = (label, value, bold = false) => {
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(bold ? 12 : 10)
      .fillColor(bold ? INK : MUTED)
      .text(label, 320, line, { width: 130, align: 'right' })
      .fillColor(INK)
      .text(value, 455, line, { width: 90, align: 'right' });
    line += bold ? 22 : 17;
  };

  row('Total HT', money(due - vat));
  row(`TVA (${rate} %)`, money(vat));
  row(invoice.kind === 'rental' ? 'Total TTC payé' : 'Commission TTC', money(due), true);

  if (invoice.kind === 'commission') {
    doc.moveTo(320, line).lineTo(545, line).strokeColor(RULE).stroke();
    line += 12;
    row('Net reversé', money(invoice.net_amount), true);
  }
  return line;
}

function footer(doc, invoice, labels, y) {
  doc.fillColor(MUTED).fontSize(9).font('Helvetica').text(labels.note, 50, Math.max(y, 420), {
    width: 340,
  });

  if (Number(invoice.vat_rate) === 0) {
    doc.text('TVA non applicable — article 293 B du CGI.', 50, doc.y + 6, { width: 340 });
  }

  doc
    .fontSize(8)
    .text(
      `${invoice.issuer_name} — ${invoice.issuer_legal}. Document généré par SailingLoc, à conserver.`,
      50,
      760,
      { width: 495, align: 'center' }
    );
}

export const invoiceFileName = (invoice) => `facture-${invoice.number}.pdf`;

export function renderInvoice(invoice) {
  const labels = LABELS[invoice.kind];
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: invoice.number } });

  header(doc, invoice, labels);
  recipient(doc, invoice, labels);
  const afterTable = table(doc, invoice);
  const afterTotals = totals(doc, invoice, afterTable);
  footer(doc, invoice, labels, afterTotals + 30);

  doc.end();
  return doc;
}
