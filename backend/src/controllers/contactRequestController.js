import {
  createContactRequest,
  listContactRequests,
  setContactRequestStatus,
} from '../services/contactRequestService.js';

export async function postContactRequest(req, res) {
  try {
    const request = await createContactRequest(req.body || {});
    res.status(201).json({ request });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminListContactRequests(req, res) {
  try {
    const requests = await listContactRequests(req.query);
    res.json({ requests });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminPatchContactRequest(req, res) {
  try {
    const request = await setContactRequestStatus(req.params.id_request, req.body?.status);
    res.json({ request });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
