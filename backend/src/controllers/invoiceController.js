import { getInvoiceFor } from '../services/invoiceService.js';
import { renderInvoice, invoiceFileName } from '../services/invoicePdf.js';

export async function getBookingInvoice(req, res) {
  try {
    const invoice = await getInvoiceFor(req.user, req.params.id_booking);
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${invoiceFileName(invoice)}"`);
    res.setHeader('Cache-Control', 'private, no-store');

    const pdf = renderInvoice(invoice);
    pdf.on('error', () => res.destroy());
    pdf.pipe(res);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
