import { getInvoiceFor } from '../services/invoiceService.js';
import { renderInvoice, invoiceFileName } from '../services/invoicePdf.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

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
    return sendError(res, err);
  }
}
