import { listLogs, listLogFilters } from '../services/logService.js';

export async function adminListLogs(req, res) {
  try {
    const result = await listLogs(req.query);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminLogFilters(req, res) {
  try {
    const filters = await listLogFilters();
    res.json(filters);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
