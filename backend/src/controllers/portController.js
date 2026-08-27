import prisma from '../config/db.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function getPorts(req, res) {
  try {
    const ports = await prisma.port.findMany({ orderBy: { id_port: 'asc' } });
    res.json(ports);
  } catch (err) {
    return sendError(res, err);
  }
}
