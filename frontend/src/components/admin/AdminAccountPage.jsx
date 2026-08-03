import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import AccountForm from '../account/AccountForm.jsx';

function AdminAccountPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('adminAccount.pageTitle');
  }, [t]);

  return (
    <section aria-labelledby="account-title" className="w-full">
      <header className="mb-6">
        <h1 id="account-title" className="text-2xl font-bold text-white">
          {t('adminAccount.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {t('adminAccount.greeting', { name: user?.first_name ?? '' })}
        </p>
      </header>

      <AccountForm compactMobile restoreDesktopActions />
    </section>
  );
}

export default AdminAccountPage;
