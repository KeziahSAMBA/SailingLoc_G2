import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import bgImage from '../assets/image/paysage/crique.jpg';

const inputClass =
  'w-full rounded-lg border border-glass/30 bg-surface/10 px-4 py-2.5 text-on-dark placeholder-on-dark outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-on-dark/80';
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function AdminLoginPage() {
  const { adminLogin, user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  // Redirige si déjà connecté : admin → /admin, autres rôles → home.
  useEffect(() => {
    if (loading || !user) return;
    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [loading, user, navigate]);

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
    if (isBlocked || submitting) return;
    setServerError('');

    if (!form.email.trim() || !form.password) {
      setServerError('Email et mot de passe requis.');
      return;
    }

    setSubmitting(true);
    try {
      await adminLogin({ email: form.email, password: form.password });
      navigate('/admin', { replace: true });
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
      setSubmitting(false);
    }
  }

  return (
    // Même univers visuel que les espaces propriétaire et locataire : photo
    // plein écran sous un voile sombre et panneaux en verre dépoli.
    <main
      className="min-h-screen w-full bg-cover bg-fixed bg-center text-on-dark"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen w-full bg-fixed bg-gradient-to-b from-dark-strong/90 via-dark-strong/75 to-dark-strong/60 px-4 pt-[120px] pb-12">
        <section aria-labelledby="admin-login-title" className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center">
            <div
              aria-hidden="true"
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-action text-action-text shadow-lg"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 id="admin-login-title" className="text-2xl font-bold text-on-dark">
              Espace administrateur
            </h1>
            <p className="mt-2 text-sm text-on-dark/70">
              Accès restreint. Cette page est réservée à l'équipe SailingLoc.
            </p>
          </div>

          <article className="rounded-2xl border border-glass/20 bg-surface/10 p-8 shadow-2xl backdrop-blur-xl">
            {serverError && (
              <div
                role="alert"
                className="status-indicator status-indicator--danger mb-4 rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
              >
                {serverError}
                {isBlocked && (
                  <span className="mt-1 block font-mono text-xs text-danger-pale">
                    Nouvelle tentative possible dans{' '}
                    <time dateTime={`PT${retryAfter}S`}>{formatCountdown(retryAfter)}</time>
                  </span>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="admin-email" className={labelClass}>
                  Email
                </label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="admin-password" className={labelClass}>
                  Mot de passe
                </label>
                <PasswordField
                  id="admin-password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                  variant="glass"
                />
                <div className="mt-1.5 text-right">
                  <Link
                    to="/forgot-password?role=admin"
                    className={`rounded text-xs text-brand hover:underline ${FOCUS_RING}`}
                  >
                    Mot de passe oublié&nbsp;?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || isBlocked}
                className={`mt-2 w-full rounded-full bg-action px-6 py-3 text-sm font-semibold text-action-text shadow-lg transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
              >
                {isBlocked
                  ? `Réessayez dans ${formatCountdown(retryAfter)}`
                  : submitting
                    ? 'Connexion en cours…'
                    : 'Se connecter'}
              </button>
            </form>
          </article>

          <p className="mt-6 text-center text-xs text-on-dark/60">
            Vous n'êtes pas administrateur ?{' '}
            <a
              href="/"
              className={`rounded font-semibold text-on-dark/80 hover:text-on-dark hover:underline ${FOCUS_RING}`}
            >
              Retour à l'accueil
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}

export default AdminLoginPage;
