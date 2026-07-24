import { Router } from 'express';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { registerPositiveIdParams } from '../middlewares/validateParamMiddleware.js';
import {
  getConversations,
  getThreadWith,
  postMessage,
  getUnreadCount,
  patchMessage,
  removeMessage,
  postSupport,
  postBoatContact,
  postResolveSupport,
} from '../controllers/messageController.js';

const router = Router();
registerPositiveIdParams(router, ['id_user', 'id_boat', 'id_message']);

// Messagerie interne : accessible aux trois rôles connectés. Les règles
// d'envoi (qui peut écrire à qui) sont dans le service.
router.get(
  '/conversations',
  protect,
  requireRole('locataire', 'proprietaire', 'admin'),
  getConversations
);
router.get('/unread', protect, requireRole('locataire', 'proprietaire', 'admin'), getUnreadCount);
router.get(
  '/with/:id_user',
  protect,
  requireRole('locataire', 'proprietaire', 'admin'),
  getThreadWith
);
router.post('/', protect, requireRole('locataire', 'proprietaire', 'admin'), postMessage);
// Ouvre la conversation support (admin choisi côté serveur).
router.post('/support', protect, requireRole('locataire', 'proprietaire'), postSupport);
router.post('/boat/:id_boat/contact', protect, requireRole('locataire'), postBoatContact);
// L'admin clôt la demande support d'un utilisateur.
router.post('/support/:id_user/resolve', protect, requireRole('admin'), postResolveSupport);
router.patch(
  '/:id_message',
  protect,
  requireRole('locataire', 'proprietaire', 'admin'),
  patchMessage
);
router.delete(
  '/:id_message',
  protect,
  requireRole('locataire', 'proprietaire', 'admin'),
  removeMessage
);

export default router;
