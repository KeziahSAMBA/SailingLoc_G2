import { listJobs, updateJob, triggerJob, listRuns } from '../services/cronAdminService.js';

export async function adminListCronJobs(req, res) {
  try {
    res.json(await listJobs());
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminUpdateCronJob(req, res) {
  try {
    res.json(await updateJob(req.params.key, req.body));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminRunCronJob(req, res) {
  try {
    const result = await triggerJob(req.params.key, {
      actorId: req.user?.id_user,
      actorEmail: req.user?.email,
    });
    // 202 : l'exécution est lancée, pas terminée.
    res.status(202).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminListCronRuns(req, res) {
  try {
    res.json(await listRuns(req.query));
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
