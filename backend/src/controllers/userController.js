import {
  updateAvatar,
  removeAvatar,
  create,
  adminCreate,
  verifyEmail,
  resendVerification,
  login as loginService,
  refreshSession,
  logoutSession,
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword as resetPasswordService,
  checkResetToken,
  REFRESH_TOKEN_TTL_MS,
} from '../services/userService.js';
import {
  getClosureStatus,
  deactivateOwnAccount,
  deleteOwnAccount,
  DELETION_RETENTION_DAYS,
  PAUSE_RETENTION_DAYS,
} from '../services/accountClosureService.js';
import { logActivity } from '../services/logService.js';
import { getRuntimeEnvironment } from '../config/appConfig.js';
import { sendError, logInternalError } from '../middlewares/errorSecurityMiddleware.js';

const REFRESH_COOKIE_NAME = 'sl_refresh';
const isProductionLike = ['production', 'staging'].includes(getRuntimeEnvironment());

function refreshCookieOptions() {
  return {
    httpOnly: true,
    // En dev (http://localhost), un cookie Secure est rejeté par le navigateur.
    // On n'active Secure/SameSite=strict qu'en production (HTTPS).
    secure: isProductionLike,
    sameSite: isProductionLike ? 'strict' : 'lax',
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
    return sendError(res, err);
  }
}

export async function adminCreateUser(req, res) {
  try {
    const user = await adminCreate(req.body || {});
    res.locals.auditTargetId = String(user.id_user);
    res.status(201).json({ user });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function login(req, res) {
  try {
    // Endpoint public : refuse explicitement le rôle admin pour forcer le passage par /admin/login.
    if (req.body?.role === 'admin') {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }
    const { accessToken, refreshToken, user, reactivated } = await loginService(req.body, {
      userAgent: req.headers['user-agent'],
    });
    setRefreshCookie(res, refreshToken);
    if (reactivated) {
      logActivity({
        category: 'user',
        action: 'user.reactivate_self',
        actorId: user.id_user,
        actorEmail: user.email,
        actorRole: user.role,
        targetType: 'user',
        targetId: String(user.id_user),
        ip: req.ip,
      });
    }
    res.status(200).json({ accessToken, user, reactivated });
  } catch (err) {
    return sendError(res, err);
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
    logActivity({
      category: 'auth',
      action: 'admin.login',
      actorId: user.id_user,
      actorEmail: user.email,
      targetType: 'user',
      targetId: String(user.id_user),
      ip: req.ip,
    });
    res.status(200).json({ accessToken, user });
  } catch (err) {
    logActivity({
      level: 'warning',
      category: 'auth',
      action: 'admin.login_failed',
      actorEmail: req.body?.email,
      message: err.message,
      ip: req.ip,
    });
    return sendError(res, err);
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
    return sendError(res, err);
  }
}

export async function logout(req, res) {
  try {
    const raw = req.cookies?.[REFRESH_COOKIE_NAME];
    await logoutSession(raw);
  } catch (err) {
    logInternalError(req, err, { controller: 'userController', action: 'logout' });
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
    return sendError(res, err);
  }
}

export async function updateMe(req, res) {
  try {
    const user = await updateProfile(req.user.id_user, req.body || {});
    res.json({ user });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function changeMyPassword(req, res) {
  try {
    await changePassword(req.user.id_user, req.body || {});
    // Toutes les sessions sont révoquées : on efface aussi le cookie courant.
    clearRefreshCookie(res);
    res.json({ message: 'Mot de passe mis à jour. Veuillez vous reconnecter.' });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMyClosureStatus(req, res) {
  try {
    const status = await getClosureStatus(req.user.id_user);
    res.json(status);
  } catch (err) {
    return sendError(res, err);
  }
}

export async function deactivateMe(req, res) {
  try {
    await deactivateOwnAccount(req.user.id_user, req.body || {});
    clearRefreshCookie(res);
    res.json({
      message: `Compte désactivé. Reconnectez-vous sous ${PAUSE_RETENTION_DAYS} jours pour le réactiver.`,
    });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function deleteMe(req, res) {
  try {
    await deleteOwnAccount(req.user.id_user, req.body || {});
    clearRefreshCookie(res);
    res.json({
      message: `Compte supprimé. Vos données seront anonymisées sous ${DELETION_RETENTION_DAYS} jours.`,
    });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function resend(req, res) {
  try {
    await resendVerification(req.body);
    res.status(200).json({
      message: 'Si un compte non confirmé existe pour cet email, un nouveau lien a été envoyé.',
    });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function forgotPassword(req, res) {
  try {
    await requestPasswordReset(req.body || {});
    // Réponse identique pour bloquer l'énumération.
    res.status(200).json({
      message:
        'Si un compte correspond à ces informations, un lien de réinitialisation a été envoyé.',
    });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function resetPassword(req, res) {
  try {
    await resetPasswordService(req.body || {});
    res.status(200).json({
      message: 'Mot de passe mis à jour. Vous pouvez maintenant vous connecter.',
    });
  } catch (err) {
    return sendError(res, err);
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
    return sendError(res, err);
  }
}

export async function confirmEmail(req, res) {
  try {
    await verifyEmail(req.params.token);
    res.json({ message: 'Email confirmé. Vous pouvez maintenant vous connecter.' });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function patchMyAvatar(req, res) {
  try {
    const user = await updateAvatar(req.user.id_user, req.file);
    res.json({ user });
  } catch (err) {
    return sendError(res, err);
  }
}

export async function deleteMyAvatar(req, res) {
  try {
    const user = await removeAvatar(req.user.id_user);
    res.json({ user });
  } catch (err) {
    return sendError(res, err);
  }
}
