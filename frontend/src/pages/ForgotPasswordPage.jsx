import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService.js';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.jpg';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#0A3172] focus:ring-2 focus:ring-[#0A3172]/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

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
      className="min-h-screen w-full"
      style={{
        backgroundImage: `url(${bateauBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="min-h-screen w-full bg-black/40 px-4 pt-[120px] pb-12 flex justify-center">
        <section aria-labelledby="forgot-title" className="w-full max-w-md">
          <article className="rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-slate-200">
            {submitted ? (
              <div role="status" aria-live="polite" className="text-center">
                <div
                  aria-hidden="true"
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A3172]/10 ring-2 ring-[#0A3172]"
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0A3172"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-[#0A3172]">Vérifiez votre boîte mail</h1>
                <p className="mt-3 text-sm text-slate-700">
                  Si un compte correspond à cette adresse, un lien de réinitialisation vient d'être
                  envoyé. Le lien est valable <strong>1 heure</strong>.
                </p>
                <Link
                  to="/"
                  className="mt-6 inline-block w-full rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0A3172]/90"
                >
                  Retour à l'accueil
                </Link>
              </div>
            ) : (
              <>
                <header className="mb-6 text-center">
                  <h1 id="forgot-title" className="text-2xl font-bold text-[#0A3172]">
                    Mot de passe oublié
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot
                    de passe.
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
                  )}

                  <button
                    type="submit"
                    disabled={loading || isBlocked}
                    className="mt-2 w-full rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0A3172]/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isBlocked
                      ? `Réessayez dans ${formatCountdown(retryAfter)}`
                      : loading
                        ? 'Envoi en cours…'
                        : 'Envoyer le lien'}
                  </button>
                </form>

                <footer className="mt-6 text-center text-sm text-slate-600">
                  <Link
                    to={isAdmin ? '/admin/login' : '/login'}
                    className="font-semibold text-[#0A3172] hover:underline"
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
