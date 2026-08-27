import {
  listConversations,
  getThread,
  sendMessage,
  countUnread,
  updateMessage,
  deleteMessage,
  contactSupport,
  contactBoatOwner,
  resolveSupport,
} from '../services/messageService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function getConversations(req, res) {
  try {
    const conversations = await listConversations(req.user.id_user);
    res.json({ conversations });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getThreadWith(req, res) {
  try {
    const thread = await getThread(req.user, req.params.id_user);
    res.json(thread);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getUnreadCount(req, res) {
  try {
    const unread = await countUnread(req.user.id_user);
    res.json({ unread });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postMessage(req, res) {
  try {
    const { id_receiver, content } = req.body || {};
    const message = await sendMessage(req.user, id_receiver, content);
    res.status(201).json({ message });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function patchMessage(req, res) {
  try {
    const message = await updateMessage(req.user, req.params.id_message, req.body?.content);
    res.json({ message });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function removeMessage(req, res) {
  try {
    const scope = req.query.scope === 'all' ? 'all' : 'me';
    await deleteMessage(req.user, req.params.id_message, scope);
    res.json({ deleted: true });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postSupport(req, res) {
  try {
    const result = await contactSupport(req.user);
    res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postBoatContact(req, res) {
  try {
    const result = await contactBoatOwner(req.user, req.params.id_boat);
    res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function postResolveSupport(req, res) {
  try {
    const message = await resolveSupport(req.user, req.params.id_user);
    res.status(201).json({ message });
  } catch (err) {
    return sendError(res, err);
  }
}
