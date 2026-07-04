import { useState, useEffect, useCallback } from 'react';
import DocumentsManager from '../documents/DocumentsManager.jsx';

function LocataireDocuments() {
  const [counts, setCounts] = useState({ provided: 0, total: 0 });
  const onCounts = useCallback((c) => setCounts(c), []);

  // SEO / onglet navigateur : titre dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mes documents — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="documents-title" className="mx-auto w-full max-w-2xl">
      <header className="mb-6">
        <h1 id="documents-title" className="text-2xl font-bold text-white">
          Mes documents
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Déposez vos documents obligatoires (PDF, JPG ou PNG, 5 Mo max). Ils seront vérifiés par
          notre équipe.
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-200">
          {counts.provided} / {counts.total} types fournis
        </p>
      </header>

      <DocumentsManager onCounts={onCounts} />
    </section>
  );
}

export default LocataireDocuments;
