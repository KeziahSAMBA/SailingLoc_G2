import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { updateMe, changePassword } from '../../services/authService.js';
import PasswordField from '../auth/PasswordField.jsx';

const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,}$/;

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-100 placeholder-slate-500 outline-none transition focus:border-[#5AB4EC] focus:ring-2 focus:ring-[#5AB4EC]/20';
const readonlyClass =
  'w-full rounded-lg border border-slate-800 bg-slate-800/60 px-4 py-2.5 text-slate-400 cursor-not-allowed';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-300';
const errorClass = 'mt-1 block text-xs text-red-300';

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

// Formulaires d'édition du compte (infos personnelles + mot de passe).
// Composant "présentation seule" du contenu : l'enveloppe (fond, en-tête de page)
// est fournie par la page hôte — utilisé par les espaces locataire et propriétaire.
function AccountForm() {
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

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
    if (!form.first_name.trim()) newErrors.first_name = 'Le prénom est requis.';
    if (!form.last_name.trim()) newErrors.last_name = 'Le nom est requis.';
    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {
      newErrors.phone = 'Le numéro de téléphone est invalide.';
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
      showToast('Vos informations ont été mises à jour.', 'success');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Une erreur est survenue.');
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
    if (!pwdForm.currentPassword) newErrors.currentPassword = 'Le mot de passe actuel est requis.';
    if (!PASSWORD_REGEX.test(pwdForm.newPassword)) {
      newErrors.newPassword =
        'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un caractère spécial.';
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
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
      showToast('Mot de passe mis à jour. Reconnectez-vous.', 'success');
      await logout({ silent: true });
      navigate(user?.role === 'admin' ? '/admin/login' : '/');
    } catch (err) {
      setPwdServerError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <>
      {/* Informations personnelles */}
      <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <h2 className="mb-5 text-lg font-semibold text-white">Informations personnelles</h2>

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
                Prénom
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
                Nom
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
              Email <span className="font-normal text-slate-500">(non modifiable)</span>
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
              Téléphone <span className="font-normal text-slate-500">(facultatif)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
              placeholder="+33 6 12 34 56 78"
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
              Annuler
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              className="flex-1 rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0d3d8c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </article>

      {/* Mot de passe */}
      <article className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <h2 className="mb-1 text-lg font-semibold text-white">Modifier mon mot de passe</h2>
        <p className="mb-5 text-sm text-slate-400">
          Pour des raisons de sécurité, votre mot de passe actuel est requis.
        </p>

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
              Mot de passe actuel
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
              Nouveau mot de passe
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
              12 caractères minimum, 1 majuscule, 1 minuscule, 1 caractère spécial.
            </small>
            {pwdErrors.newPassword && <span className={errorClass}>{pwdErrors.newPassword}</span>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirmer le nouveau mot de passe
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
              className="w-full rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0d3d8c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pwdSaving ? 'Mise à jour…' : 'Modifier le mot de passe'}
            </button>
          </div>
        </form>
      </article>
    </>
  );
}

export default AccountForm;
