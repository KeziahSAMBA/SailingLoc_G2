import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import AccountForm from '../account/AccountForm.jsx';

function LocataireAccount() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // SEO / onglet navigateur : titre dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('locataireAccount.pageTitle');
  }, [t]);

  return (
    <section aria-labelledby="account-title" className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h1 id="account-title" className="text-2xl font-bold text-white">
          {t('locataireAccount.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {t('locataireAccount.subtitle', { name: user?.first_name })}
        </p>
      </header>

      <AccountForm />
    </section>
  );
}

export default LocataireAccount;
