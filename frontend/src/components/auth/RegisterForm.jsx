import { useEffect, useState } from 'react';
import { register, resendVerification } from '../../services/authService.js';
import PasswordField from './PasswordField.jsx';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,}$/;
const PHONE_REGEX = /^\+?[0-9\s().-]{6,20}$/;
const INITIAL_RESEND_COOLDOWN = 30;
const POST_CLICK_COOLDOWN = 60;

const inputClass =
  'w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 outline-none transition focus:border-[#5AB4EC] focus:ring-2 focus:ring-[#5AB4EC]/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-white/80';
const errorClass = 'mt-1 block text-xs text-red-300';
const requiredMark = (
  <span aria-hidden="true" className="ml-0.5 text-[#5AB4EC]">
    *
  </span>
);

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function RegisterForm({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    role: 'locataire',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState('');

  useEffect(() => {
    if (retryAfter <= 0) return undefined;
    const id = setInterval(() => {
      setRetryAfter((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const id = setInterval(() => {
      setResendCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCountdown]);

  useEffect(() => {
    if (success) {
      setResendCountdown(INITIAL_RESEND_COOLDOWN);
      setResendNotice('');
    }
  }, [success]);

  const isBlocked = retryAfter > 0;
  const canResend = resendCountdown <= 0 && !resendLoading;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const newErrors = {};
    if (!form.first_name.trim()) newErrors.first_name = 'Le prénom est requis.';
    if (!form.last_name.trim()) newErrors.last_name = 'Le nom est requis.';
    if (!form.email.trim()) newErrors.email = "L'email est requis.";
    if (form.phone.trim() && !PHONE_REGEX.test(form.phone.trim())) {
      newErrors.phone = 'Le numéro de téléphone est invalide.';
    }
    if (!PASSWORD_REGEX.test(form.password)) {
      newErrors.password =
        'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un caractère spécial.';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }
    return newErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isBlocked) return;
    setServerError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      await register({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone.trim() || undefined,
        role: form.role,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setSuccess(true);
    } catch (err) {
      if (err.response?.status === 429) {
        const headerValue =
          err.response.headers?.['retry-after'] ?? err.response.headers?.['ratelimit-reset'];
        const seconds = Number.parseInt(headerValue, 10);
        setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? seconds : 60);
        setServerError(
          err.response.data?.message || 'Trop de tentatives. Réessayez dans quelques minutes.'
        );
      } else {
        setServerError(err.response?.data?.message || 'Une erreur est survenue.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    setResendNotice('');
    setResendLoading(true);
    try {
      await resendVerification({ email: form.email, role: form.role });
      setResendCountdown(POST_CLICK_COOLDOWN);
      setResendNotice('Un nouveau lien vient d’être envoyé. Vérifiez votre boîte mail.');
    } catch (err) {
      if (err.response?.status === 429) {
        const headerValue =
          err.response.headers?.['retry-after'] ?? err.response.headers?.['ratelimit-reset'];
        const seconds = Number.parseInt(headerValue, 10);
        setResendCountdown(Number.isFinite(seconds) && seconds > 0 ? seconds : POST_CLICK_COOLDOWN);
        setResendNotice(
          err.response.data?.message || 'Trop de renvois. Réessayez dans quelques minutes.'
        );
      } else {
        setResendNotice(err.response?.data?.message || 'Échec du renvoi. Réessayez plus tard.');
      }
    } finally {
      setResendLoading(false);
    }
  }

  if (success) {
    return (
      <div role="status" aria-live="polite" className="text-center">
        <h2 className="text-2xl font-bold text-[#5AB4EC]">Inscription réussie !</h2>
        <p className="mt-3 text-white/80">
          Un email de confirmation a été envoyé à{' '}
          <span className="font-semibold text-[#5AB4EC]">{form.email}</span>. Vérifiez votre boîte
          mail pour activer votre compte.
        </p>

        <div className="mt-6 rounded-lg border border-white/20 bg-white/10 p-4 text-sm">
          <p className="text-white/70">Vous n&apos;avez pas reçu l&apos;email ?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend}
            className="mt-3 w-full rounded-full border border-[#5AB4EC] bg-transparent px-5 py-2 text-sm font-semibold text-[#5AB4EC] transition hover:bg-[#5AB4EC]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendLoading
              ? 'Envoi en cours…'
              : resendCountdown > 0
                ? `Renvoyer dans ${formatCountdown(resendCountdown)}`
                : "Renvoyer l'email"}
          </button>
          {resendNotice && (
            <p className="mt-3 text-xs text-white/80" role="status">
              {resendNotice}
            </p>
          )}
        </div>

        <p className="mt-6 text-sm text-white/70">
          Déjà confirmé ?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-[#5AB4EC] hover:underline"
          >
            Connectez-vous
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-[#5AB4EC]">Créer un compte</h2>
        <p className="mt-2 text-sm text-white/70">
          Rejoignez SailingLoc pour réserver ou proposer un bateau.
        </p>
        <p className="mt-1 text-xs text-white/60">
          Les champs marqués d&apos;un <span className="text-[#5AB4EC]">*</span> sont obligatoires.
        </p>
      </header>

      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-500/10 px-4 py-2 text-sm text-red-300"
        >
          {serverError}
          {isBlocked && (
            <span className="mt-1 block font-mono text-xs text-red-300">
              Nouvelle tentative possible dans{' '}
              <time dateTime={`PT${retryAfter}S`}>{formatCountdown(retryAfter)}</time>
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="first_name" className={labelClass}>
              Prénom{requiredMark}
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={handleChange}
              autoComplete="given-name"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.first_name)}
              aria-describedby={errors.first_name ? 'first_name-error' : undefined}
              className={inputClass}
            />
            {errors.first_name && (
              <span id="first_name-error" className={errorClass}>
                {errors.first_name}
              </span>
            )}
          </div>

          <div>
            <label htmlFor="last_name" className={labelClass}>
              Nom{requiredMark}
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={handleChange}
              autoComplete="family-name"
              required
              aria-required="true"
              aria-invalid={Boolean(errors.last_name)}
              aria-describedby={errors.last_name ? 'last_name-error' : undefined}
              className={inputClass}
            />
            {errors.last_name && (
              <span id="last_name-error" className={errorClass}>
                {errors.last_name}
              </span>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email{requiredMark}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={inputClass}
          />
          {errors.email && (
            <span id="email-error" className={errorClass}>
              {errors.email}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="phone" className={labelClass}>
            Téléphone <span className="font-normal text-white/50">(facultatif)</span>
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
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            className={inputClass}
          />
          {errors.phone && (
            <span id="phone-error" className={errorClass}>
              {errors.phone}
            </span>
          )}
        </div>

        <fieldset>
          <legend className={labelClass}>Rôle{requiredMark}</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['locataire', 'Locataire'],
              ['proprietaire', 'Propriétaire'],
            ].map(([value, label]) => {
              const checked = form.role === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                    checked
                      ? 'border-[#5AB4EC] bg-[#5AB4EC]/15 text-[#ABD4FF]'
                      : 'border-white/30 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={checked}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="password" className={labelClass}>
            Mot de passe{requiredMark}
          </label>
          <PasswordField
            variant="glass"
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
            ariaInvalid={Boolean(errors.password)}
            ariaDescribedBy="password-hint password-error"
          />
          <small id="password-hint" className="mt-1 block text-xs text-white/60">
            12 caractères minimum, 1 majuscule, 1 minuscule, 1 caractère spécial.
          </small>
          {errors.password && (
            <span id="password-error" className={errorClass}>
              {errors.password}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirmer le mot de passe{requiredMark}
          </label>
          <PasswordField
            variant="glass"
            id="confirmPassword"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
            ariaInvalid={Boolean(errors.confirmPassword)}
            ariaDescribedBy={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          />
          {errors.confirmPassword && (
            <span id="confirmPassword-error" className={errorClass}>
              {errors.confirmPassword}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || isBlocked}
          className="mt-2 w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBlocked
            ? `Réessayez dans ${formatCountdown(retryAfter)}`
            : loading
              ? 'Inscription en cours...'
              : "S'inscrire"}
        </button>
      </form>
    </>
  );
}

export default RegisterForm;
