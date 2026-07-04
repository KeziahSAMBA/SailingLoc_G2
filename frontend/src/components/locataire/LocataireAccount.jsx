import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import AccountForm from '../account/AccountForm.jsx';

function LocataireAccount() {
  const { user } = useAuth();

  // SEO / onglet navigateur : titre dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mon compte — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="account-title" className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h1 id="account-title" className="text-2xl font-bold text-white">
          Mon compte
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Bonjour {user?.first_name}, consultez et modifiez vos informations personnelles.
        </p>
      </header>

      <AccountForm />
    </section>
  );
}

export default LocataireAccount;
