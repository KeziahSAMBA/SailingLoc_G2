import { Router } from 'express';
import { adminLogin, adminCreateUser } from '../controllers/userController.js';
import { adminStats } from '../controllers/statsController.js';
import {
  adminListUsers,
  adminUpdateUser,
  adminDeleteUser,
} from '../controllers/adminUserController.js';
import { adminListDocuments, adminSetDocumentStatus } from '../controllers/documentController.js';
import {
  adminListBoats,
  adminSetBoatPublished,
  adminListReports,
  adminSetReportStatus,
} from '../controllers/boatAdminController.js';
import {
  adminListBookings,
  adminCancelBooking,
  adminListDisputes,
  adminSetDisputeStatus,
} from '../controllers/bookingAdminController.js';
import {
  adminListReviews,
  adminUpdateReview,
  adminDeleteReview,
} from '../controllers/reviewAdminController.js';
import {
  adminListPorts,
  adminCreatePort,
  adminDeletePort,
} from '../controllers/portAdminController.js';
import { adminListPayments, adminPaymentStats } from '../controllers/paymentAdminController.js';
import { adminListLogs, adminLogFilters } from '../controllers/adminLogController.js';
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';
import { audit } from '../middlewares/auditMiddleware.js';

import {
  adminListContactRequests,
  adminPatchContactRequest,
} from '../controllers/contactRequestController.js';

const router = Router();

// Espace d'administration, monté sous /api/admin.
router.post('/login', adminLogin);
router.get('/stats', protect, requireAdmin, adminStats);

router.get('/users', protect, requireAdmin, adminListUsers);
router.post('/users', protect, requireAdmin, audit('user.create'), adminCreateUser);
router.patch('/users/:id', protect, requireAdmin, audit('user.update'), adminUpdateUser);
router.delete('/users/:id', protect, requireAdmin, audit('user.delete'), adminDeleteUser);

router.get('/documents', protect, requireAdmin, adminListDocuments);
router.patch(
  '/documents/:id',
  protect,
  requireAdmin,
  audit('document.status'),
  adminSetDocumentStatus
);

router.get('/boats', protect, requireAdmin, adminListBoats);
router.patch('/boats/:id', protect, requireAdmin, audit('boat.publish'), adminSetBoatPublished);
router.get('/reports', protect, requireAdmin, adminListReports);
router.patch(
  '/reports/:id',
  protect,
  requireAdmin,
  audit('report.status', { targetType: 'boat_report' }),
  adminSetReportStatus
);

router.get('/bookings', protect, requireAdmin, adminListBookings);
router.patch(
  '/bookings/:id/cancel',
  protect,
  requireAdmin,
  audit('booking.cancel'),
  adminCancelBooking
);
router.get('/disputes', protect, requireAdmin, adminListDisputes);
router.patch(
  '/disputes/:id',
  protect,
  requireAdmin,
  audit('dispute.status'),
  adminSetDisputeStatus
);

router.get('/reviews', protect, requireAdmin, adminListReviews);
router.patch('/reviews/:id', protect, requireAdmin, audit('review.update'), adminUpdateReview);
router.delete('/reviews/:id', protect, requireAdmin, audit('review.delete'), adminDeleteReview);

router.get('/ports', protect, requireAdmin, adminListPorts);
router.post('/ports', protect, requireAdmin, audit('port.create'), adminCreatePort);
router.delete('/ports/:id', protect, requireAdmin, audit('port.delete'), adminDeletePort);

router.get('/payments', protect, requireAdmin, adminListPayments);
router.get('/payments/stats', protect, requireAdmin, adminPaymentStats);

// Demandes du formulaire de contact public.
router.get('/contact-requests', protect, requireAdmin, adminListContactRequests);
router.patch(
  '/contact-requests/:id_request',
  protect,
  requireAdmin,
  audit('contact.status', { targetId: (req) => req.params.id_request }),
  adminPatchContactRequest
);

// Journal d'activité du back-office.
router.get('/logs', protect, requireAdmin, adminListLogs);
router.get('/logs/filters', protect, requireAdmin, adminLogFilters);

export default router;
