import {
  listConversations,
  getThread,
  sendMessage,
  countUnread,
  updateMessage,
  deleteMessage,
} from '../services/messageService.js';

export async function getConversations(req, res) {
  try {
    const conversations = await listConversations(req.user.id_user);
    res.json({ conversations });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getThreadWith(req, res) {
  try {
    const thread = await getThread(req.user, req.params.id_user);
    res.json(thread);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getUnreadCount(req, res) {
  try {
    const unread = await countUnread(req.user.id_user);
    res.json({ unread });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function postMessage(req, res) {
  try {
    const { id_receiver, content } = req.body || {};
    const message = await sendMessage(req.user, id_receiver, content);
    res.status(201).json({ message });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function patchMessage(req, res) {
  try {
    const message = await updateMessage(req.user, req.params.id_message, req.body?.content);
    res.json({ message });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function removeMessage(req, res) {
  try {
    const scope = req.query.scope === 'all' ? 'all' : 'me';
    await deleteMessage(req.user, req.params.id_message, scope);
    res.json({ deleted: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
