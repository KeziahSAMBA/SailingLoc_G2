import {
  getDashboardStats,
  listBookings,
  listFavorites,
  addFavorite,
  removeFavorite,
} from '../services/locataireService.js';

export async function getDashboard(req, res) {
  try {
    const stats = await getDashboardStats(req.user.id_user);
    res.json({ stats });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getMyBookings(req, res) {
  try {
    const bookings = await listBookings(req.user.id_user);
    res.json({ bookings });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function getMyFavorites(req, res) {
  try {
    const favorites = await listFavorites(req.user.id_user);
    res.json({ favorites });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function postFavorite(req, res) {
  try {
    const id_boat = Number(req.params.id_boat);
    if (!Number.isInteger(id_boat)) {
      return res.status(400).json({ message: 'Identifiant de bateau invalide.' });
    }
    await addFavorite(req.user.id_user, id_boat);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function deleteFavorite(req, res) {
  try {
    const id_boat = Number(req.params.id_boat);
    if (!Number.isInteger(id_boat)) {
      return res.status(400).json({ message: 'Identifiant de bateau invalide.' });
    }
    await removeFavorite(req.user.id_user, id_boat);
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}
