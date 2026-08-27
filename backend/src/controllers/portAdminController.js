import { listPorts, createPort, deletePort } from '../services/portAdminService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function adminListPorts(req, res) {
  try {
    const ports = await listPorts(req.query);
    res.json({ ports });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminCreatePort(req, res) {
  try {
    const port = await createPort(req.body || {});
    res.locals.auditTargetId = String(port.id_port);
    res.status(201).json({ port });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminDeletePort(req, res) {
  try {
    await deletePort(req.params.id);
    res.status(204).end();
  } catch (err) {
    return sendError(res, err);
  }
}
