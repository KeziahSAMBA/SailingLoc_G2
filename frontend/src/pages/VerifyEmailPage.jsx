import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService.js';

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
      setMessage('Lien de vérification invalide.');
      return;
    }

    verifyEmail(token)
      .then((data) => {
        setStatus('success');
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Lien invalide ou expiré.');
      });
  }, [searchParams]);

  if (status === 'loading') return <p>Vérification en cours...</p>;

  return (
    <div>
      <h2>{status === 'success' ? 'Email confirmé !' : 'Erreur'}</h2>
      <p>{message}</p>
      {status === 'success' && <a href="/">Se connecter</a>}
    </div>
  );
}

export default VerifyEmailPage;