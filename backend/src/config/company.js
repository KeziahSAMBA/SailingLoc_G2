import 'dotenv/config';

export const COMPANY = {
  name: process.env.INVOICE_ISSUER_NAME || 'SailingLoc SAS',
  address: process.env.INVOICE_ISSUER_ADDRESS || '12 Quai du Port, 13002 Marseille, France',
  legal:
    process.env.INVOICE_ISSUER_LEGAL || 'SAS au capital de 10 000 € — RCS Marseille 000 000 000',
  vatNumber: process.env.INVOICE_ISSUER_VAT || '',
  email: process.env.INVOICE_ISSUER_EMAIL || 'contact@sailingloc.fr',
};

export const VAT_RATE = (() => {
  const rate = Number(process.env.INVOICE_VAT_RATE);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : 20;
})();
