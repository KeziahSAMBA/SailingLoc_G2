import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import AccountForm from '../account/AccountForm.jsx';

function AdminAccountPage() {
  const { user } = useAuth();

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mon compte — Admin SailingLoc';
  }, []);

  return (
    <section aria-labelledby="account-title" className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h1 id="account-title" className="text-2xl font-bold text-white">
          Mon compte
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Bonjour {user?.first_name}, gérez vos informations personnelles, votre photo et votre mot
          de passe.
        </p>
      </header>

      <AccountForm />
    </section>
  );
}

export default AdminAccountPage;
