import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';

function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-[120px] pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A3172]">
          {t('dashboardPage.greeting', { name: user?.first_name })}
        </h1>
        <p className="mt-2 text-slate-600">
          {t('dashboardPage.connectedAs')}{' '}
          <span className="font-semibold">{t(`roleLabels.${user?.role}`, user?.role)}</span>.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">{t('dashboardPage.wip')}</h2>
        <p className="mt-3 text-sm text-slate-600">{t('dashboardPage.wipText')}</p>
      </section>
    </main>
  );
}

export default DashboardPage;
