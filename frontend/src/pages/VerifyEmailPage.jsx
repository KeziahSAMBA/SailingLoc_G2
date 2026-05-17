import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService.js';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.jpg';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide ou incomplet.');
      return;
    }

    verifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message || 'Votre email a été confirmé avec succès.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Lien invalide ou expiré.');
      });
  }, [searchParams]);

  return (
    <main
      className="w-full min-h-screen"
      style={{
        backgroundImage: `url(${bateauBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="w-full min-h-screen bg-black/30 px-4 pt-[120px] pb-10 flex justify-center">
        <section
          aria-labelledby="verify-title"
          aria-live="polite"
          className="w-full max-w-md"
        >
          <article className="rounded-2xl bg-white/10 backdrop-blur-md p-8 text-center shadow-xl ring-1 ring-white/20">
            {status === 'loading' && (
              <>
                <div
                  role="status"
                  aria-label="Vérification en cours"
                  className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#5AB4EC]"
                />
                <h1 id="verify-title" className="text-2xl font-bold text-white">
                  Vérification en cours…
                </h1>
                <p className="mt-3 text-sm text-white/80">
                  Nous validons votre adresse email, merci de patienter.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div
                  aria-hidden="true"
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#5AB4EC]/20 ring-2 ring-[#5AB4EC]"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5AB4EC"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h1 id="verify-title" className="text-2xl font-bold text-white">
                  Email confirmé !
                </h1>
                <p className="mt-3 text-sm text-white/85">{message}</p>
                <a
                  href="/login"
                  className="mt-6 inline-block w-full rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0A3172]/90"
                >
                  Se connecter
                </a>
              </>
            )}

            {status === 'error' && (
              <>
                <div
                  aria-hidden="true"
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-400"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fca5a5"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <h1 id="verify-title" className="text-2xl font-bold text-white">
                  Vérification impossible
                </h1>
                <p className="mt-3 text-sm text-white/85">{message}</p>
                <p className="mt-4 text-xs text-white/60">
                  Le lien a peut-être expiré ou été déjà utilisé.
                </p>
                <a
                  href="/register"
                  className="mt-6 inline-block w-full rounded-full bg-[#0A3172] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#0A3172]/90"
                >
                  Recommencer l&apos;inscription
                </a>
              </>
            )}
          </article>

          {status !== 'loading' && (
            <p className="mt-4 text-center text-sm text-white/70">
              Déjà inscrit ?{' '}
              <a href="/login" className="font-semibold text-[#5AB4EC] hover:underline">
                Se connecter
              </a>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

export default VerifyEmailPage;