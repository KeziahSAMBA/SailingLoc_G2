import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';
import AccountForm from '../components/account/AccountForm.jsx';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.jpg';

function AccountPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

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
      <div className="min-h-screen w-full bg-black/40 px-4 pt-[120px] pb-16">
        <section className="mx-auto w-full max-w-2xl">
          <header className="mb-8">
            <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              {t(`roleLabels.${user?.role}`, user?.role)}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">{t('accountPage.title')}</h1>
            <p className="mt-2 text-slate-200">{t('accountPage.subtitle')}</p>
          </header>

          <AccountForm />
        </section>
      </div>
    </main>
  );
}

export default AccountPage;
