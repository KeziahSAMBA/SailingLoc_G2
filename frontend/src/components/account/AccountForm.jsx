import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdEdit } from 'react-icons/md';
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
import DangerZone from './DangerZone.jsx';

const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,}$/;

const inputClass =
  'w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 outline-none transition focus:border-[#5AB4EC] focus:ring-2 focus:ring-[#5AB4EC]/20';
const readonlyClass =
  'w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-white/60 cursor-not-allowed';
const labelClass = 'mb-1.5 block text-sm font-medium text-white/80';
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
function AccountForm({ compactMobile = false, restoreDesktopActions = false }) {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // --- Photo de profil ---
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef(null);
  const avatarMenuButtonRef = useRef(null);
  const avatarFileInputRef = useRef(null);
  const displayName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  useEffect(() => {
    if (!avatarMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!avatarMenuRef.current?.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setAvatarMenuOpen(false);
        avatarMenuButtonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [avatarMenuOpen]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarBusy(true);
    try {
      const res = await updateAvatar(file);
      updateUser(res.data.user);
      showToast(t('accountForm.avatar.updateSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('accountForm.avatar.updateError'), 'error');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarDelete() {
    setAvatarBusy(true);
    try {
      const res = await deleteAvatar();
      updateUser(res.data.user);
      showToast(t('accountForm.avatar.removeSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('accountForm.avatar.removeError'), 'error');
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
      <article className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-xl">
        <div
          className={
            compactMobile
              ? 'mb-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-4 sm:gap-x-4 lg:mb-0 lg:block'
              : ''
          }
        >
          <h2
            className={
              compactMobile
                ? 'col-start-2 row-start-1 min-w-0 whitespace-nowrap text-right text-[0.625rem] font-semibold tracking-tight text-white min-[350px]:text-xs min-[375px]:text-sm min-[430px]:text-base sm:text-lg sm:tracking-normal lg:mb-5 lg:whitespace-normal lg:text-left'
                : 'mb-5 text-lg font-semibold text-white'
            }
          >
            {t('accountForm.personalInfo.title')}
          </h2>

          {/* Photo de profil : visible dans le header et la messagerie. */}
          <div
            className={
              compactMobile
                ? 'contents lg:mb-6 lg:flex lg:flex-wrap lg:items-center lg:gap-4'
                : 'mb-6 flex flex-wrap items-center gap-4'
            }
          >
            {compactMobile ? (
              <div
                ref={avatarMenuRef}
                className="relative col-start-1 row-start-1 h-20 w-20 shrink-0"
              >
                <img
                  src={user?.avatar || nameToAvatarUrl(displayName || 'SailingLoc')}
                  alt={t('accountForm.avatar.alt')}
                  className="h-20 w-20 rounded-full border-2 border-white/30 object-cover"
                />
                <button
                  ref={avatarMenuButtonRef}
                  type="button"
                  aria-label={t('accountForm.avatar.manage')}
                  aria-haspopup="menu"
                  aria-expanded={avatarMenuOpen}
                  aria-controls="locataire-avatar-actions-menu"
                  onClick={() => setAvatarMenuOpen((open) => !open)}
                  disabled={avatarBusy}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-white/50 bg-sky-500 text-white shadow-lg transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"
                >
                  <MdEdit aria-hidden="true" className="h-4 w-4" />
                </button>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  disabled={avatarBusy}
                  className="sr-only"
                />
                {avatarMenuOpen && (
                  <div
                    id="locataire-avatar-actions-menu"
                    role="menu"
                    aria-label={t('accountForm.avatar.manage')}
                    className="absolute left-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-white/20 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        avatarFileInputRef.current?.click();
                      }}
                      disabled={avatarBusy}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50"
                    >
                      {avatarBusy
                        ? t('accountForm.avatar.sending')
                        : t('accountForm.avatar.change')}
                    </button>
                    {user?.avatar && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          handleAvatarDelete();
                        }}
                        disabled={avatarBusy}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
                      >
                        {t('accountForm.avatar.remove')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <img
                src={user?.avatar || nameToAvatarUrl(displayName || 'SailingLoc')}
                alt={t('accountForm.avatar.alt')}
                className="h-20 w-20 rounded-full border-2 border-white/30 object-cover"
              />
            )}
            <div
              className={
                compactMobile ? 'hidden lg:flex lg:flex-wrap lg:gap-3' : 'flex flex-wrap gap-3'
              }
            >
              <label
                className={`cursor-pointer rounded-full border border-white/40 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white ${avatarBusy ? 'pointer-events-none opacity-50' : ''}`}
              >
                {avatarBusy ? t('accountForm.avatar.sending') : t('accountForm.avatar.change')}
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
                  {t('accountForm.avatar.remove')}
                </button>
              )}
            </div>
            <p
              className={`w-full text-xs text-white/60 ${compactMobile ? 'col-span-2 row-start-2' : ''}`}
            >
              {t('accountForm.avatar.hint')}
            </p>
          </div>
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
          <div
            className={
              compactMobile ? 'grid grid-cols-2 gap-2 sm:gap-4' : 'grid gap-4 sm:grid-cols-2'
            }
          >
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
              <span className="font-normal text-white/70">
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
              <span className="font-normal text-white/70">
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

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={!dirty || saving}
              className={`w-fit rounded-full border border-white/40 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 ${compactMobile ? `px-4 py-2.5 ${restoreDesktopActions ? 'lg:px-6 lg:py-3' : ''}` : 'px-6 py-3'}`}
            >
              {t('accountForm.personalInfo.cancel')}
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              className={`rounded-full bg-sky-500 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 ${compactMobile ? `w-fit flex-none px-4 py-2.5 ${restoreDesktopActions ? 'lg:w-auto lg:flex-1 lg:px-6 lg:py-3' : ''}` : 'flex-1 px-6 py-3'}`}
            >
              {saving ? (
                t('accountForm.personalInfo.saving')
              ) : compactMobile && restoreDesktopActions ? (
                <>
                  <span className="lg:hidden">{t('accountForm.personalInfo.saveShort')}</span>
                  <span className="hidden lg:inline">{t('accountForm.personalInfo.save')}</span>
                </>
              ) : (
                t(
                  compactMobile
                    ? 'accountForm.personalInfo.saveShort'
                    : 'accountForm.personalInfo.save'
                )
              )}
            </button>
          </div>
        </form>
      </article>

      {/* Mot de passe */}
      <article className="mt-6 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-8 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-white">{t('accountForm.password.title')}</h2>
        <p className="mb-5 text-sm text-white/70">{t('accountForm.password.subtitle')}</p>

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
              variant="glass"
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
              variant="glass"
              id="newPassword"
              name="newPassword"
              value={pwdForm.newPassword}
              onChange={handlePwdChange}
              autoComplete="new-password"
              ariaInvalid={Boolean(pwdErrors.newPassword)}
              ariaDescribedBy="newPassword-hint"
            />
            <small id="newPassword-hint" className="mt-1 block text-xs text-white/60">
              {t('accountForm.password.hint')}
            </small>
            {pwdErrors.newPassword && <span className={errorClass}>{pwdErrors.newPassword}</span>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              {t('accountForm.password.confirm')}
            </label>
            <PasswordField
              variant="glass"
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
              className={`rounded-full bg-sky-500 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 ${compactMobile ? `w-fit whitespace-nowrap px-4 py-2.5 ${restoreDesktopActions ? 'lg:w-full lg:px-6 lg:py-3' : ''}` : 'w-full px-6 py-3'}`}
            >
              {pwdSaving ? t('accountForm.password.updating') : t('accountForm.password.submit')}
            </button>
          </div>
        </form>
      </article>

      {user?.role !== 'admin' && <DangerZone />}
    </>
  );
}

export default AccountForm;
