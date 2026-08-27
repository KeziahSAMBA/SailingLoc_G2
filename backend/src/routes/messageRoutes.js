import { Router } from 'express';
import { protect, requireRole } from '../middlewares/authMiddleware.js';
import { audit } from '../middlewares/auditMiddleware.js';
import { messageLimiter } from '../middlewares/abuseProtection.js';
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

const byAdmin = (req) => req.user?.role === 'admin';

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
router.post(
  '/',
  protect,
  requireRole('locataire', 'proprietaire', 'admin'),
  messageLimiter,
  postMessage
);
// Ouvre la conversation support (admin choisi côté serveur).
router.post(
  '/support',
  protect,
  requireRole('locataire', 'proprietaire'),
  messageLimiter,
  postSupport
);
router.post(
  '/boat/:id_boat/contact',
  protect,
  requireRole('locataire'),
  messageLimiter,
  postBoatContact
);
// L'admin clôt la demande support d'un utilisateur.
router.post(
  '/support/:id_user/resolve',
  protect,
  requireRole('admin'),
  messageLimiter,
  audit('support.resolve', { targetType: 'user', targetId: (req) => req.params.id_user }),
  postResolveSupport
);
// Ces deux routes servent aussi aux locataires/propriétaires sur leurs propres
// messages : seules les interventions d'un admin sont journalisées.
router.patch(
  '/:id_message',
  protect,
  requireRole('locataire', 'proprietaire', 'admin'),
  messageLimiter,
  audit('message.update', {
    targetType: 'message',
    targetId: (req) => req.params.id_message,
    when: byAdmin,
  }),
  patchMessage
);
router.delete(
  '/:id_message',
  protect,
  requireRole('locataire', 'proprietaire', 'admin'),
  messageLimiter,
  audit('message.delete', {
    targetType: 'message',
    targetId: (req) => req.params.id_message,
    when: byAdmin,
  }),
  removeMessage
);

export default router;
