import { useEffect } from 'react';

// Styles de focus clavier communs aux éléments cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function ProprietaireBoats() {
  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mes bateaux — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="boats-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="boats-title" className="text-2xl font-bold text-white">
            Mes bateaux
          </h1>
          <p className="mt-1 text-sm text-slate-400">Gérez vos annonces et leur disponibilité.</p>
        </div>
        {/* Structure : ouvrira le formulaire d'ajout de bateau. */}
        <button
          type="button"
          className={`shrink-0 rounded-full bg-[#0A3172] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#0d3d8c] ${FOCUS_RING}`}
        >
          + Ajouter un bateau
        </button>
      </header>

      {/* Structure : la liste des bateaux sera branchée ici. */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-sm text-slate-400">
          Aucun bateau publié pour l&apos;instant. Cliquez sur « Ajouter un bateau » pour créer
          votre première annonce.
        </p>
      </div>
    </section>
  );
}

export default ProprietaireBoats;
