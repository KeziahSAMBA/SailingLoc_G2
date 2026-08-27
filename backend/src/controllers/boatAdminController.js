import {
  listBoats,
  setBoatPublished,
  listReports,
  setReportStatus,
} from '../services/boatAdminService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function adminListBoats(req, res) {
  try {
    const boats = await listBoats(req.query);
    res.json({ boats });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminSetBoatPublished(req, res) {
  try {
    const boat = await setBoatPublished(req.params.id, req.body?.is_published);
    res.json({ boat });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminListReports(req, res) {
  try {
    const reports = await listReports(req.query);
    res.json({ reports });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminSetReportStatus(req, res) {
  try {
    const report = await setReportStatus(req.params.id, req.body?.status);
    res.json({ report });
  } catch (err) {
    return sendError(res, err);
  }
}
