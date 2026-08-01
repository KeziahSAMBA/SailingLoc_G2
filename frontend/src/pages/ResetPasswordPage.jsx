import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MdLockReset } from 'react-icons/md';
import { resetPassword, verifyResetToken } from '../services/authService.js';
import { useToast } from '../hooks/useToast.jsx';
import PasswordField from '../components/auth/PasswordField.jsx';
import bgImage from '../assets/image/paysage/crique.jpg';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{12,}$/;
const labelClass = 'mb-1.5 block text-sm font-medium text-white/80';
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [tokenStatus, setTokenStatus] = useState('checking'); // 'checking' | 'valid' | 'invalid'
  // Verrou basé sur la valeur du token : évite la double vérification en StrictMode
  // tout en re-vérifiant si le token change (sans démontage du composant).
  const lastToken = useRef(null);

  useEffect(() => {
    if (lastToken.current === token) return;
    lastToken.current = token;
    if (!token) {
      setTokenStatus('invalid');
      return;
    }
    setTokenStatus('checking');
    verifyResetToken(token)
      .then(() => setTokenStatus('valid'))
      .catch(() => setTokenStatus('invalid'));
  }, [token]);

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
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function validate() {
    const next = {};
    if (!PASSWORD_REGEX.test(form.password)) {
      next.password =
        'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule et un caractère spécial.';
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }
    return next;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isBlocked || loading || tokenStatus !== 'valid') return;
    setServerError('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        token,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      showToast('Mot de passe mis à jour. Connectez-vous.', 'success');
      navigate('/login', { replace: true });
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
        setServerError(err.response?.data?.message || 'Lien invalide ou expiré.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen w-full bg-cover bg-fixed bg-center text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen w-full bg-fixed bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/60 px-4 pt-[120px] pb-12 flex items-start justify-center">
        <section aria-labelledby="reset-title" className="w-full max-w-md">
          <article className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            <header className="mb-6 text-center">
              <div
                aria-hidden="true"
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg"
              >
                <MdLockReset size={30} />
              </div>
              <h1 id="reset-title" className="text-2xl font-bold text-white">
                Nouveau mot de passe
              </h1>
              <p className="mt-2 text-sm text-white/70">
                Choisissez un mot de passe sécurisé pour votre compte.
              </p>
            </header>

            {tokenStatus === 'checking' ? (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center gap-3 py-4 text-sm text-white/70"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-sky-400" />
                Vérification du lien…
              </div>
            ) : tokenStatus === 'invalid' ? (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                Ce lien de réinitialisation est invalide, expiré ou déjà utilisé. Demandez un
                nouveau lien depuis la page{' '}
                <Link
                  to="/forgot-password"
                  className={`rounded font-semibold text-[#5AB4EC] underline ${FOCUS_RING}`}
                >
                  mot de passe oublié
                </Link>
                .
              </div>
            ) : (
              <>
                {serverError && (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300"
                  >
                    {serverError}
                    {isBlocked && (
                      <span className="mt-1 block font-mono text-xs text-red-200">
                        Nouvelle tentative possible dans{' '}
                        <time dateTime={`PT${retryAfter}S`}>{formatCountdown(retryAfter)}</time>
                      </span>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="reset-password" className={labelClass}>
                      Nouveau mot de passe
                    </label>
                    <PasswordField
                      id="reset-password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                      variant="glass"
                      ariaInvalid={Boolean(errors.password)}
                      ariaDescribedBy="reset-hint reset-error"
                    />
                    <small id="reset-hint" className="mt-1 block text-xs text-white/60">
                      12 caractères minimum, 1 majuscule, 1 minuscule, 1 caractère spécial.
                    </small>
                    {errors.password && (
                      <span id="reset-error" className="mt-1 block text-xs text-red-300">
                        {errors.password}
                      </span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="reset-confirm" className={labelClass}>
                      Confirmer le mot de passe
                    </label>
                    <PasswordField
                      id="reset-confirm"
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                      variant="glass"
                      ariaInvalid={Boolean(errors.confirmPassword)}
                    />
                    {errors.confirmPassword && (
                      <span className="mt-1 block text-xs text-red-300">
                        {errors.confirmPassword}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isBlocked}
                    className={`mt-2 w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                  >
                    {isBlocked
                      ? `Réessayez dans ${formatCountdown(retryAfter)}`
                      : loading
                        ? 'Mise à jour…'
                        : 'Mettre à jour'}
                  </button>
                </form>
              </>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

export default ResetPasswordPage;
