import { listPorts, createPort, deletePort } from '../services/portAdminService.js';

export async function adminListPorts(req, res) {
  try {
    const ports = await listPorts(req.query);
    res.json({ ports });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminCreatePort(req, res) {
  try {
    const port = await createPort(req.body || {});
    res.status(201).json({ port });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminDeletePort(req, res) {
  try {
    await deletePort(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
