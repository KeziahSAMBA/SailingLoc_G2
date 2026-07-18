import prisma from '../config/db.js';

// Traite un événement Stripe déjà vérifié (signature). Idempotent : chaque
// branche ne modifie que si la base est encore en retard sur Stripe — les
// événements déclenchés par nos propres flux (capture, libération,
// remboursement) retombent sur des no-ops.
export async function handleStripeEvent(event) {
  switch (event.type) {
    // Empreinte annulée côté Stripe sans passer par nous : typiquement
    // l'expiration automatique au bout de 7 jours sans décision du proprio.
    case 'payment_intent.canceled': {
      const intent = event.data.object;
      const payment = await prisma.payment.findFirst({
        where: { transaction_ref: intent.id, status: 'pending' },
        select: { id_payment: true, id_booking: true },
      });
      if (!payment) return;
      const now = new Date();
      await prisma.$transaction([
        prisma.payment.update({
          where: { id_payment: payment.id_payment },
          data: { status: 'failed' },
        }),
        prisma.booking.updateMany({
          where: { id_booking: payment.id_booking, status: 'pending', deleted_at: null },
          data: {
            status: 'cancelled',
            cancellation_reason:
              'Annulation automatique : empreinte de paiement expirée ou annulée côté Stripe.',
            cancellation_date: now,
            updated_at: now,
          },
        }),
      ]);
      return;
    }

    // Filet de réconciliation : capture connue de Stripe mais pas de la base.
    case 'payment_intent.succeeded': {
      await prisma.payment.updateMany({
        where: { transaction_ref: event.data.object.id, status: 'pending' },
        data: { status: 'success' },
      });
      return;
    }

    // Remboursement fait depuis le dashboard Stripe (ou API externe).
    case 'charge.refunded': {
      const charge = event.data.object;
      await prisma.payment.updateMany({
        where: { transaction_ref: charge.payment_intent, status: 'success' },
        data: {
          status: 'refunded',
          refunded_amount: charge.amount_refunded / 100,
          refunded_at: new Date(),
          refund_reason: 'Remboursement effectué côté Stripe (dashboard ou API).',
        },
      });
      return;
    }

    case 'payment_intent.payment_failed': {
      console.warn('[stripe webhook] paiement refusé :', event.data.object.id);
      return;
    }

    default:
  }
}
