import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import {
  updateMe,
  changePassword,
  updateAvatar,
  deleteAvatar,
} from '../../services/authService.js';
import { nameToAvatarUrl } from '../../utils/avatar.js';
import PasswordField from '../auth/PasswordField.jsx';

const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,}$/;

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition focus:border-[#5AB4EC] focus:ring-2 focus:ring-[#5AB4EC]/20';
const readonlyClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-slate-500 cursor-not-allowed';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-300';
const errorClass = 'mt-1 block text-xs text-red-400';

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

// Formulaires d'édition du compte (infos personnelles + mot de passe).
// Composant "présentation seule" du contenu : l'enveloppe (fond, en-tête de page)
// est fournie par la page hôte — réutilisé par AccountPage (plein écran) et par
// l'espace locataire (dans le dashboard).
function AccountForm() {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // --- Photo de profil ---
  const [avatarBusy, setAvatarBusy] = useState(false);
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    try {
      const res = await updateAvatar(file);
      updateUser(res.data.user);
      showToast('Photo de profil mise à jour.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec de l’envoi de la photo.', 'error');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarDelete() {
    setAvatarBusy(true);
    try {
      const res = await deleteAvatar();
      updateUser(res.data.user);
      showToast('Photo de profil supprimée.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec de la suppression.', 'error');
    } finally {
      setAvatarBusy(false);
    }
  }

  // --- Informations personnelles ---
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const dirty =
    form.first_name !== (user?.first_name || '') ||
    form.last_name !== (user?.last_name || '') ||
    form.phone !== (user?.phone || '');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const newErrors = {};
    if (!form.first_name.trim())
      newErrors.first_name = t('accountForm.personalInfo.errors.firstNameRequired');
    if (!form.last_name.trim())
      newErrors.last_name = t('accountForm.personalInfo.errors.lastNameRequired');
    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {
      newErrors.phone = t('accountForm.personalInfo.errors.phoneInvalid');
    }
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    try {
      const { user: updated } = await updateMe({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone.trim() || null,
      });
      updateUser(updated);
      setForm({
        first_name: updated.first_name || '',
        last_name: updated.last_name || '',
        phone: updated.phone || '',
      });
      showToast(t('accountForm.personalInfo.updateSuccess'), 'success');
    } catch (err) {
      setServerError(err.response?.data?.message || t('accountForm.genericError'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    });
    setErrors({});
    setServerError('');
  }

  // --- Mot de passe ---
  const [pwdForm, setPwdForm] = useState(EMPTY_PASSWORD_FORM);
  const [pwdErrors, setPwdErrors] = useState({});
  const [pwdServerError, setPwdServerError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  function handlePwdChange(e) {
    const { name, value } = e.target;
    setPwdForm((prev) => ({ ...prev, [name]: value }));
    setPwdErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validatePwd() {
    const newErrors = {};
    if (!pwdForm.currentPassword)
      newErrors.currentPassword = t('accountForm.password.errors.currentRequired');
    if (!PASSWORD_REGEX.test(pwdForm.newPassword)) {
      newErrors.newPassword = t('accountForm.password.errors.newInvalid');
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      newErrors.confirmPassword = t('accountForm.password.errors.mismatch');
    }
    return newErrors;
  }

  async function handlePwdSubmit(e) {
    e.preventDefault();
    setPwdServerError('');
    const validationErrors = validatePwd();
    if (Object.keys(validationErrors).length > 0) {
      setPwdErrors(validationErrors);
      return;
    }
    setPwdSaving(true);
    try {
      await changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
        confirmPassword: pwdForm.confirmPassword,
      });
      setPwdForm(EMPTY_PASSWORD_FORM);
      // Toutes les sessions sont révoquées côté serveur : on déconnecte et on
      // redirige vers la connexion pour que l'utilisateur entre son nouveau mot de passe.
      showToast(t('accountForm.password.updateSuccess'), 'success');
      await logout({ silent: true });
      navigate(user?.role === 'admin' ? '/admin/login' : '/');
    } catch (err) {
      setPwdServerError(err.response?.data?.message || t('accountForm.genericError'));
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <>
      {/* Informations personnelles */}
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold text-white">
          {t('accountForm.personalInfo.title')}
        </h2>

        {/* Photo de profil : visible dans le header et la messagerie. */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <img
            src={user?.avatar || nameToAvatarUrl(displayName || 'SailingLoc')}
            alt="Votre photo de profil"
            className="h-20 w-20 rounded-full border-2 border-slate-700 object-cover"
          />
          <div className="flex flex-wrap gap-3">
            <label
              className={`cursor-pointer rounded-full border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white ${avatarBusy ? 'pointer-events-none opacity-50' : ''}`}
            >
              {avatarBusy ? 'Envoi…' : 'Changer la photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                disabled={avatarBusy}
                className="sr-only"
              />
            </label>
            {user?.avatar && (
              <button
                type="button"
                onClick={handleAvatarDelete}
                disabled={avatarBusy}
                className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                Supprimer la photo
              </button>
            )}
          </div>
          <p className="w-full text-xs text-slate-500">
            JPG, PNG ou WebP — 3 Mo max. Sans photo, un avatar est généré automatiquement.
          </p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first_name" className={labelClass}>
                {t('accountForm.personalInfo.firstName')}
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                value={form.first_name}
                onChange={handleChange}
                autoComplete="given-name"
                aria-invalid={Boolean(errors.first_name)}
                className={inputClass}
              />
              {errors.first_name && <span className={errorClass}>{errors.first_name}</span>}
            </div>

            <div>
              <label htmlFor="last_name" className={labelClass}>
                {t('accountForm.personalInfo.lastName')}
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                value={form.last_name}
                onChange={handleChange}
                autoComplete="family-name"
                aria-invalid={Boolean(errors.last_name)}
                className={inputClass}
              />
              {errors.last_name && <span className={errorClass}>{errors.last_name}</span>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClass}>
              {t('accountForm.personalInfo.email')}{' '}
              <span className="font-normal text-slate-400">
                {t('accountForm.personalInfo.emailReadonly')}
              </span>
            </label>
            <input
              id="email"
              type="email"
              value={user?.email || ''}
              readOnly
              disabled
              className={readonlyClass}
            />
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              {t('accountForm.personalInfo.phone')}{' '}
              <span className="font-normal text-slate-400">
                {t('accountForm.personalInfo.phoneOptional')}
              </span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              placeholder={t('accountForm.personalInfo.phonePlaceholder')}
              aria-invalid={Boolean(errors.phone)}
              className={inputClass}
            />
            {errors.phone && <span className={errorClass}>{errors.phone}</span>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!dirty || saving}
              className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('accountForm.personalInfo.cancel')}
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              className="flex-1 rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0A3172]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t('accountForm.personalInfo.saving') : t('accountForm.personalInfo.save')}
            </button>
          </div>
        </form>
      </article>

      {/* Mot de passe */}
      <article className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-white">{t('accountForm.password.title')}</h2>
        <p className="mb-5 text-sm text-slate-400">{t('accountForm.password.subtitle')}</p>

        {pwdServerError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
          >
            {pwdServerError}
          </div>
        )}

        <form onSubmit={handlePwdSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className={labelClass}>
              {t('accountForm.password.current')}
            </label>
            <PasswordField
              variant="dark"
              id="currentPassword"
              name="currentPassword"
              value={pwdForm.currentPassword}
              onChange={handlePwdChange}
              autoComplete="current-password"
              ariaInvalid={Boolean(pwdErrors.currentPassword)}
            />
            {pwdErrors.currentPassword && (
              <span className={errorClass}>{pwdErrors.currentPassword}</span>
            )}
          </div>

          <div>
            <label htmlFor="newPassword" className={labelClass}>
              {t('accountForm.password.new')}
            </label>
            <PasswordField
              variant="dark"
              id="newPassword"
              name="newPassword"
              value={pwdForm.newPassword}
              onChange={handlePwdChange}
              autoComplete="new-password"
              ariaInvalid={Boolean(pwdErrors.newPassword)}
              ariaDescribedBy="newPassword-hint"
            />
            <small id="newPassword-hint" className="mt-1 block text-xs text-slate-500">
              {t('accountForm.password.hint')}
            </small>
            {pwdErrors.newPassword && <span className={errorClass}>{pwdErrors.newPassword}</span>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              {t('accountForm.password.confirm')}
            </label>
            <PasswordField
              variant="dark"
              id="confirmPassword"
              name="confirmPassword"
              value={pwdForm.confirmPassword}
              onChange={handlePwdChange}
              autoComplete="new-password"
              ariaInvalid={Boolean(pwdErrors.confirmPassword)}
            />
            {pwdErrors.confirmPassword && (
              <span className={errorClass}>{pwdErrors.confirmPassword}</span>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={pwdSaving}
              className="w-full rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0A3172]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pwdSaving ? t('accountForm.password.updating') : t('accountForm.password.submit')}
            </button>
          </div>
        </form>
      </article>
    </>
  );
}

export default AccountForm;
