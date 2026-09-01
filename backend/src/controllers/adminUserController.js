import { listUsers, updateUserByAdmin, deleteUserByAdmin } from '../services/adminUserService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function adminListUsers(req, res) {
  try {
    const users = await listUsers(req.query);
    res.json({ users });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminUpdateUser(req, res) {
  try {
    const user = await updateUserByAdmin(req.params.id, req.user.id_user, req.body || {});
    res.json({ user });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminDeleteUser(req, res) {
  try {
    await deleteUserByAdmin(req.params.id, req.user.id_user);
    res.status(204).end();
  } catch (err) {
    return sendError(res, err);
  }
}
