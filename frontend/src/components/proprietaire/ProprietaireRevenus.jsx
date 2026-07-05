import { useEffect } from 'react';

function ProprietaireRevenus() {
  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mes revenus — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="revenus-title">
      <h1 id="revenus-title" className="text-2xl font-bold text-white">
        Mes revenus
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Consultez le détail de vos revenus et versements.
      </p>

      {/* Structure : le récapitulatif des revenus sera branché ici. */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-sm text-slate-400">Contenu à venir.</p>
      </div>
    </section>
  );
}

export default ProprietaireRevenus;
