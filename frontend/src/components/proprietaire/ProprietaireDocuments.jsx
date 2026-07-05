import { useEffect } from 'react';

function ProprietaireDocuments() {
  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mes documents — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="documents-title">
      <h1 id="documents-title" className="text-2xl font-bold text-white">
        Mes documents
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Déposez et suivez la validation de vos documents.
      </p>

      {/* Structure : le gestionnaire de documents sera branché ici. */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-sm text-slate-400">Contenu à venir.</p>
      </div>
    </section>
  );
}

export default ProprietaireDocuments;
