import prisma from '../../config/db.js';
import { cancelExpiredBookings, expiredPendingWhere } from '../../services/bookingService.js';

const HOUR_MS = 3600 * 1000;

const clampHours = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? n : 72;
};

// Reprise du balayage historique de server.js : les demandes « pending » non
// payées sont annulées, pas supprimées. Sans plafond, à l'inverse des purges :
// ce comportement tourne déjà en production et le brider le ferait taire.
export default {
  key: 'bookings.expire',
  category: 'bookings',
  defaultSchedule: '0 * * * *',
  defaultEnabled: true,
  defaultDryRun: false,
  defaultParams: { expiryHours: 72 },
  maxBatch: null,

  count: ({ params, now }) =>
    prisma.booking.count({
      where: expiredPendingWhere(now, clampHours(params.expiryHours) * HOUR_MS),
    }),

  async run({ params }) {
    const cancelled = await cancelExpiredBookings(clampHours(params.expiryHours) * HOUR_MS);
    return { affected: cancelled, detail: { bookingsCancelled: cancelled } };
  },
};
