import { create, verifyEmail } from '../services/userService.js';

export async function register(req, res) {
  try {
    const user = await create(req.body);
    res.status(201).json({
      message: 'Inscription réussie. Vérifiez votre email pour confirmer votre compte.',
      user,
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function confirmEmail(req, res) {
  try {
    await verifyEmail(req.params.token);
    res.json({ message: 'Email confirmé. Vous pouvez maintenant vous connecter.' });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}