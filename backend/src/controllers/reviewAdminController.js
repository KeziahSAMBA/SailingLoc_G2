import { listReviews, updateReview, deleteReview } from '../services/reviewAdminService.js';

export async function adminListReviews(req, res) {
  try {
    const reviews = await listReviews(req.query);
    res.json({ reviews });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminUpdateReview(req, res) {
  try {
    const review = await updateReview(req.params.id, req.body || {});
    res.json({ review });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminDeleteReview(req, res) {
  try {
    await deleteReview(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
