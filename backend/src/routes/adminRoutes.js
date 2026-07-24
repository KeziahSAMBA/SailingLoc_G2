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
import { protect, requireAdmin } from '../middlewares/authMiddleware.js';
import { registerPositiveIdParams } from '../middlewares/validateParamMiddleware.js';

import {
  adminListContactRequests,
  adminPatchContactRequest,
} from '../controllers/contactRequestController.js';

const router = Router();
registerPositiveIdParams(router, ['id', 'id_request']);

// Espace d'administration, monté sous /api/admin.
router.post('/login', adminLogin);
router.get('/stats', protect, requireAdmin, adminStats);

router.get('/users', protect, requireAdmin, adminListUsers);
router.post('/users', protect, requireAdmin, adminCreateUser);
router.patch('/users/:id', protect, requireAdmin, adminUpdateUser);
router.delete('/users/:id', protect, requireAdmin, adminDeleteUser);

router.get('/documents', protect, requireAdmin, adminListDocuments);
router.patch('/documents/:id', protect, requireAdmin, adminSetDocumentStatus);

router.get('/boats', protect, requireAdmin, adminListBoats);
router.patch('/boats/:id', protect, requireAdmin, adminSetBoatPublished);
router.get('/reports', protect, requireAdmin, adminListReports);
router.patch('/reports/:id', protect, requireAdmin, adminSetReportStatus);

router.get('/bookings', protect, requireAdmin, adminListBookings);
router.patch('/bookings/:id/cancel', protect, requireAdmin, adminCancelBooking);
router.get('/disputes', protect, requireAdmin, adminListDisputes);
router.patch('/disputes/:id', protect, requireAdmin, adminSetDisputeStatus);

router.get('/reviews', protect, requireAdmin, adminListReviews);
router.patch('/reviews/:id', protect, requireAdmin, adminUpdateReview);
router.delete('/reviews/:id', protect, requireAdmin, adminDeleteReview);

router.get('/ports', protect, requireAdmin, adminListPorts);
router.post('/ports', protect, requireAdmin, adminCreatePort);
router.delete('/ports/:id', protect, requireAdmin, adminDeletePort);

router.get('/payments', protect, requireAdmin, adminListPayments);
router.get('/payments/stats', protect, requireAdmin, adminPaymentStats);

// Demandes du formulaire de contact public.
router.get('/contact-requests', protect, requireAdmin, adminListContactRequests);
router.patch('/contact-requests/:id_request', protect, requireAdmin, adminPatchContactRequest);

export default router;
