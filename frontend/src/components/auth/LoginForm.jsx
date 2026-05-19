import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import PasswordField from './PasswordField.jsx';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0A3172] focus:ring-2 focus:ring-[#0A3172]/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function LoginForm({ onSwitchToRegister }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', role: 'locataire' });
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (retryAfter <= 0) return undefined;
    const id = setInterval(() => {
      setRetryAfter((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [retryAfter]);

  const isBlocked = retryAfter > 0;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isBlocked || loading) return;
    setServerError('');

    if (!form.email.trim() || !form.password) {
      setServerError('Email et mot de passe requis.');
      return;
    }

    setLoading(true);
    try {
      await login({
        email: form.email,
        password: form.password,
        role: form.role,
      });
      navigate('/', { replace: true });
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

  return (
    <>
      <header className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-[#0A3172]">Bon retour parmi nous</h2>
        <p className="mt-2 text-sm text-slate-600">
          Connectez-vous pour accéder à votre compte SailingLoc.
        </p>
      </header>

      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {serverError}
          {isBlocked && (
            <span className="mt-1 block font-mono text-xs text-red-600">
              Nouvelle tentative possible dans{' '}
              <time dateTime={`PT${retryAfter}S`}>{formatCountdown(retryAfter)}</time>
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
            className={inputClass}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="login-password" className={labelClass}>
              Mot de passe
            </label>
            <Link to="/forgot-password" className="text-xs text-[#0A3172] hover:underline">
              Mot de passe oublié&nbsp;?
            </Link>
          </div>
          <PasswordField
            id="login-password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Type de compte</legend>
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
                      ? 'border-[#0A3172] bg-[#0A3172]/10 text-[#0A3172]'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
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

        <button
          type="submit"
          disabled={loading || isBlocked}
          className="mt-2 w-full rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0A3172]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBlocked
            ? `Réessayez dans ${formatCountdown(retryAfter)}`
            : loading
              ? 'Connexion en cours…'
              : 'Se connecter'}
        </button>
      </form>

      <footer className="mt-6 text-center text-sm text-slate-600">
        Pas encore de compte&nbsp;?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-semibold text-[#0A3172] hover:underline"
        >
          Inscrivez-vous
        </button>
      </footer>
    </>
  );
}

export default LoginForm;