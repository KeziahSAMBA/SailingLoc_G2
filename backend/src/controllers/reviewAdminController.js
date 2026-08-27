import { listReviews, updateReview, deleteReview } from '../services/reviewAdminService.js';
import { sendError } from '../middlewares/errorSecurityMiddleware.js';

export async function adminListReviews(req, res) {
  try {
    const reviews = await listReviews(req.query);
    res.json({ reviews });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminUpdateReview(req, res) {
  try {
    const review = await updateReview(req.params.id, req.body || {});
    res.json({ review });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function adminDeleteReview(req, res) {
  try {
    await deleteReview(req.params.id);
    res.status(204).end();
  } catch (err) {
    return sendError(res, err);
  }
}
