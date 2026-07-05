import { useEffect } from 'react';

function ProprietaireReservations() {
  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mes réservations — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="reservations-title">
      <h1 id="reservations-title" className="text-2xl font-bold text-white">
        Mes réservations
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Suivez les demandes et réservations sur vos bateaux.
      </p>

      {/* Structure : la liste des réservations sera branchée ici. */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-sm text-slate-400">Contenu à venir.</p>
      </div>
    </section>
  );
}

export default ProprietaireReservations;
