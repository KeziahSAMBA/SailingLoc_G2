import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import AccountForm from '../account/AccountForm.jsx';

function ProprietaireAccount() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('proprietaireAccount.pageTitle');
  }, [t]);

  return (
    <section aria-labelledby="account-title" className="w-full">
      <header className="mb-6">
        <h1 id="account-title" className="text-2xl font-bold text-white">
          {t('proprietaireAccount.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {t('proprietaireAccount.subtitle', { name: user?.first_name ?? '' })}
        </p>
      </header>

      <AccountForm />
    </section>
  );
}

export default ProprietaireAccount;
