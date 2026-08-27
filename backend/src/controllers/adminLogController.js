import { listLogs, listLogFilters } from '../services/logService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function adminListLogs(req, res) {
  try {
    const result = await listLogs(req.query);
    res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminLogFilters(req, res) {
  try {
    const filters = await listLogFilters();
    res.json(filters);
  } catch (err) {
    return sendError(res, err);
  }
}
