import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DocumentsManager from '../documents/DocumentsManager.jsx';

function LocataireDocuments() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState({ provided: 0, total: 0 });
  const onCounts = useCallback((c) => setCounts(c), []);

  // SEO / onglet navigateur : titre dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('locataireDocuments.pageTitle');
  }, [t]);

  return (
    <section aria-labelledby="documents-title" className="w-full">
      <header className="mb-6">
        <h1 id="documents-title" className="text-2xl font-bold text-on-dark">
          {t('locataireDocuments.title')}
        </h1>
        <p className="mt-1 text-sm text-on-dark/70">{t('locataireDocuments.subtitle')}</p>
        <p className="mt-2 text-sm font-semibold text-on-dark/90">
          {t('locataireDocuments.count', { provided: counts.provided, total: counts.total })}
        </p>
      </header>

      <DocumentsManager onCounts={onCounts} stackFilePickerOnMobile />
    </section>
  );
}

export default LocataireDocuments;
