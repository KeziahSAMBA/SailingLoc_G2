import { useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import DocumentsManager from '../components/documents/DocumentsManager.jsx';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.jpg';

const ROLE_LABEL = { locataire: 'Locataire', proprietaire: 'Propriétaire' };

function MyDocumentsPage() {
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
              {ROLE_LABEL[user?.role] || 'Compte'}
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">Mes documents</h1>
            <p className="mt-2 text-slate-200">
              Déposez vos documents obligatoires (PDF, JPG ou PNG, 5 Mo max). Ils seront vérifiés
              par notre équipe.
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {counts.provided} / {counts.total} types fournis
            </p>
          </header>

          <DocumentsManager onCounts={onCounts} />
        </section>
      </div>
    </main>
  );
}

export default MyDocumentsPage;
