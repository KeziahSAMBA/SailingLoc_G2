import {
  create,
  verifyEmail,
  resendVerification,
  login as loginService,
  refreshSession,
  logoutSession,
  getCurrentUser,
  requestPasswordReset,
  resetPassword as resetPasswordService,
  checkResetToken,
  REFRESH_TOKEN_TTL_MS,
} from '../services/userService.js';

const REFRESH_COOKIE_NAME = 'sl_refresh';
const isProduction = process.env.NODE_ENV === 'production';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: isProduction ? 'strict' : 'none',
    path: '/api/users',
    maxAge: REFRESH_TOKEN_TTL_MS,
  };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: 0 });
}

export async function register(req, res) {
  try {
    await create(req.body);
    res.status(201).json({
      message: 'Inscription réussie. Vérifiez votre email pour confirmer votre compte.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function login(req, res) {
  try {
    // Endpoint public : refuse explicitement le rôle admin pour forcer le passage par /admin/login.
    if (req.body?.role === 'admin') {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }
    const { accessToken, refreshToken, user } = await loginService(req.body, {
      userAgent: req.headers['user-agent'],
    });
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken, user });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    const { accessToken, refreshToken, user } = await loginService(
      { email, password, role: 'admin' },
      { userAgent: req.headers['user-agent'] }
    );
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken, user });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function refresh(req, res) {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    const { accessToken, refreshToken, user } = await refreshSession(raw, {
      userAgent: req.headers['user-agent'],
    });
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken, user });
  } catch (err) {
    clearRefreshCookie(res);
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function logout(req, res) {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    await logoutSession(raw);
  } catch (err) {
    console.error('[logout]', err.message);
  } finally {
    clearRefreshCookie(res);
    res.status(204).end();
  }
}

export async function me(req, res) {
  try {
    const user = await getCurrentUser(req.user.id_user);
    res.json({ user });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function resend(req, res) {
  try {
    await resendVerification(req.body);
    res.status(200).json({
      message: 'Si un compte non confirmé existe pour cet email, un nouveau lien a été envoyé.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function forgotPassword(req, res) {
  try {
    await requestPasswordReset(req.body || {});
    // Réponse identique pour bloquer l'énumération.
    res.status(200).json({
      message: "Si un compte correspond à ces informations, un lien de réinitialisation a été envoyé.",
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function resetPassword(req, res) {
  try {
    await resetPasswordService(req.body || {});
    res.status(200).json({
      message: 'Mot de passe mis à jour. Vous pouvez maintenant vous connecter.',
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

export async function verifyResetToken(req, res) {
  try {
    const valid = await checkResetToken(req.params.token);
    if (!valid) {
      return res.status(400).json({ valid: false, message: 'Lien invalide ou expiré.' });
    }
    res.status(200).json({ valid: true });
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