import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MdMarkEmailRead } from 'react-icons/md';
import { requestPasswordReset } from '../services/authService.js';
import bgImage from '../assets/image/paysage/crique.jpg';

const inputClass =
  'w-full rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-white placeholder-white/40 outline-none transition focus:border-[#5AB4EC] focus:ring-2 focus:ring-[#5AB4EC]/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-white/80';
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

function formatCountdown(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const isAdmin = searchParams.get('role') === 'admin';
  const [form, setForm] = useState({ email: '', role: isAdmin ? 'admin' : 'locataire' });
  const [submitted, setSubmitted] = useState(false);
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

    if (!form.email.trim()) {
      setServerError("L'email est requis.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(form);
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status === 429) {
        const headerValue =
          err.response.headers?.['retry-after'] ?? err.response.headers?.['ratelimit-reset'];
        const seconds = Number.parseInt(headerValue, 10);
        setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? seconds : 60);
        setServerError(
          err.response.data?.message || 'Trop de demandes. Réessayez dans quelques minutes.'
        );
      } else {
        setServerError(err.response?.data?.message || 'Une erreur est survenue.');
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
        <section aria-labelledby="forgot-title" className="w-full max-w-md">
          <article className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            {submitted ? (
              <div role="status" aria-live="polite" className="text-center">
                <div
                  aria-hidden="true"
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 ring-2 ring-sky-400"
                >
                  <MdMarkEmailRead size={28} />
                </div>
                <h1 className="text-2xl font-bold text-white">Vérifiez votre boîte mail</h1>
                <p className="mt-3 text-sm text-white/80">
                  Si un compte correspond à cette adresse, un lien de réinitialisation vient d'être
                  envoyé. Le lien est valable <strong>1 heure</strong>.
                </p>
                <Link
                  to="/"
                  className={`mt-6 inline-block w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 ${FOCUS_RING}`}
                >
                  Retour à l'accueil
                </Link>
              </div>
            ) : (
              <>
                <header className="mb-6 text-center">
                  <h1 id="forgot-title" className="text-2xl font-bold text-white">
                    Mot de passe oublié
                  </h1>
                  <p className="mt-2 text-sm text-white/70">
                    Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot
                    de passe.
                  </p>
                </header>

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
                    <label htmlFor="forgot-email" className={labelClass}>
                      Email
                    </label>
                    <input
                      id="forgot-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                      required
                      className={inputClass}
                    />
                  </div>

                  {!isAdmin && (
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
                                  ? 'border-[#5AB4EC] bg-sky-500/25 text-white'
                                  : 'border-white/30 bg-white/10 text-white/70 hover:bg-white/20'
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
                  )}

                  <button
                    type="submit"
                    disabled={loading || isBlocked}
                    className={`mt-2 w-full rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                  >
                    {isBlocked
                      ? `Réessayez dans ${formatCountdown(retryAfter)}`
                      : loading
                        ? 'Envoi en cours…'
                        : 'Envoyer le lien'}
                  </button>
                </form>

                <footer className="mt-6 text-center text-sm text-white/70">
                  <Link
                    to={isAdmin ? '/admin/login' : '/login'}
                    className={`rounded font-semibold text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
                  >
                    Retour à la connexion
                  </Link>
                </footer>
              </>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

export default ForgotPasswordPage;
