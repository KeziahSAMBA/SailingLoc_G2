import {
  listBoats,
  setBoatPublished,
  listReports,
  setReportStatus,
} from '../services/boatAdminService.js';

export async function adminListBoats(req, res) {
  try {
    const boats = await listBoats(req.query);
    res.json({ boats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminSetBoatPublished(req, res) {
  try {
    const boat = await setBoatPublished(req.params.id, req.body?.is_published);
    res.json({ boat });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminListReports(req, res) {
  try {
    const reports = await listReports(req.query);
    res.json({ reports });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminSetReportStatus(req, res) {
  try {
    const report = await setReportStatus(req.params.id, req.body?.status);
    res.json({ report });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
