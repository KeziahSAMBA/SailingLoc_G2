import {
  createContactRequest,
  listContactRequests,
  setContactRequestStatus,
} from '../services/contactRequestService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function postContactRequest(req, res) {
  try {
    const request = await createContactRequest(req.body || {});
    res.status(201).json({ request });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminListContactRequests(req, res) {
  try {
    const requests = await listContactRequests(req.query);
    res.json({ requests });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminPatchContactRequest(req, res) {
  try {
    const request = await setContactRequestStatus(req.params.id_request, req.body?.status);
    res.json({ request });
  } catch (err) {
    return sendError(res, err);
  }
}
