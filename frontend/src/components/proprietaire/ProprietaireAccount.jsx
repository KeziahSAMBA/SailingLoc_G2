import { useEffect } from 'react';

function ProprietaireAccount() {
  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Mon compte — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="account-title">
      <h1 id="account-title" className="text-2xl font-bold text-white">
        Mon compte
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Gérez vos informations personnelles et votre mot de passe.
      </p>

      {/* Structure : le formulaire de compte sera branché ici. */}
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <p className="text-sm text-slate-400">Contenu à venir.</p>
      </div>
    </section>
  );
}

export default ProprietaireAccount;
