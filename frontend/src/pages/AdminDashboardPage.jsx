import { useAuth } from '../hooks/useAuth.jsx';

function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-[120px] pb-16">
      <header className="mb-8">
        <p className="inline-block rounded-full bg-[#0A3172]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#0A3172]">
          Administration
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#0A3172]">
          Bonjour {user?.first_name}
        </h1>
        <p className="mt-2 text-slate-600">
          Vous êtes connecté en tant qu'administrateur SailingLoc.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Console admin en cours de construction</h2>
        <p className="mt-3 text-sm text-slate-600">
          Les outils de gestion (utilisateurs, bateaux, paiements, signalements) seront bientôt
          disponibles.
        </p>
      </section>
    </main>
  );
}

export default AdminDashboardPage;