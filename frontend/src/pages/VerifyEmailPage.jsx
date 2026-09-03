import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MdCheck, MdClose } from 'react-icons/md';
import { verifyEmail } from '../services/authService.js';
import bgImage from '../assets/image/paysage/crique.jpg';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0';
const buttonClass = `mt-6 inline-block w-full rounded-full bg-action px-6 py-3 text-sm font-semibold text-on-dark shadow-lg transition hover:bg-action-hover ${FOCUS_RING}`;

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
      className="min-h-screen w-full bg-cover bg-fixed bg-center text-on-dark"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen w-full bg-fixed bg-gradient-to-b from-dark-strong/90 via-dark-strong/75 to-dark-strong/60 px-4 pt-[120px] pb-12 flex items-start justify-center">
        <section aria-labelledby="verify-title" aria-live="polite" className="w-full max-w-md">
          <article className="rounded-2xl border border-glass/20 bg-surface/10 p-8 text-center shadow-2xl backdrop-blur-xl">
            {status === 'loading' && (
              <>
                <div
                  role="status"
                  aria-label="Vérification en cours"
                  className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-glass/20 border-t-sky-400"
                />
                <h1 id="verify-title" className="text-2xl font-bold text-on-dark">
                  Vérification en cours…
                </h1>
                <p className="mt-3 text-sm text-on-dark/70">
                  Nous validons votre adresse email, merci de patienter.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div
                  aria-hidden="true"
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-action/20 text-action-soft ring-2 ring-action-bright"
                >
                  <MdCheck size={30} />
                </div>
                <h1 id="verify-title" className="text-2xl font-bold text-on-dark">
                  Email confirmé !
                </h1>
                <p className="mt-3 text-sm text-on-dark/80">{message}</p>
                <a href="/login" className={buttonClass}>
                  Se connecter
                </a>
              </>
            )}

            {status === 'error' && (
              <>
                <div
                  aria-hidden="true"
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger-base/15 text-danger-soft ring-2 ring-danger-bright"
                >
                  <MdClose size={30} />
                </div>
                <h1 id="verify-title" className="text-2xl font-bold text-on-dark">
                  Vérification impossible
                </h1>
                <p className="mt-3 text-sm text-on-dark/80">{message}</p>
                <p className="mt-4 text-xs text-on-dark/60">
                  Le lien a peut-être expiré ou été déjà utilisé.
                </p>
                <a href="/register" className={buttonClass}>
                  Recommencer l&apos;inscription
                </a>
              </>
            )}
          </article>
        </section>
      </div>
    </main>
  );
}

export default VerifyEmailPage;
