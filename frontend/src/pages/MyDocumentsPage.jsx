import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';
import DocumentsManager from '../components/documents/DocumentsManager.jsx';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.jpg';

function MyDocumentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [counts, setCounts] = useState({ provided: 0, total: 0 });
  const onCounts = useCallback((c) => setCounts(c), []);

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
              {t(`roleLabels.${user?.role}`, t('myDocumentsPage.fallbackLabel'))}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">{t('myDocumentsPage.title')}</h1>
            <p className="mt-2 text-slate-200">{t('myDocumentsPage.subtitle')}</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {t('myDocumentsPage.count', { provided: counts.provided, total: counts.total })}
            </p>
          </header>

          <DocumentsManager onCounts={onCounts} />
        </section>
      </div>
    </main>
  );
}

export default MyDocumentsPage;
