import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DocumentsManager from '../documents/DocumentsManager.jsx';

function ProprietaireDocuments() {
  const { t } = useTranslation();
  const [counts, setCounts] = useState({ provided: 0, total: 0 });
  const onCounts = useCallback((c) => setCounts(c), []);

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = t('proprietaireDocuments.pageTitle');
  }, [t]);

  return (
    <section aria-labelledby="documents-title" className="w-full">
      <header className="mb-6">
        <h1 id="documents-title" className="text-2xl font-bold text-white">
          {t('proprietaireDocuments.title')}
        </h1>
        <p className="mt-1 text-sm text-white/70">{t('proprietaireDocuments.subtitle')}</p>
        <p className="mt-2 text-sm font-semibold text-white/90">
          {t('proprietaireDocuments.counts', {
            provided: counts.provided,
            total: counts.total,
          })}
        </p>
      </header>

      <DocumentsManager onCounts={onCounts} />
    </section>
  );
}

export default ProprietaireDocuments;
