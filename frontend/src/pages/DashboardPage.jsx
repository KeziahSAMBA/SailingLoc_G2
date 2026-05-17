import { useAuth } from '../hooks/useAuth.jsx';

function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-[120px] pb-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0A3172]">
          Bonjour {user?.first_name} !
        </h1>
        <p className="mt-2 text-slate-600">
          Vous êtes connecté en tant que <span className="font-semibold">{user?.role}</span>.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Tableau de bord en cours de construction</h2>
        <p className="mt-3 text-sm text-slate-600">
          Cette section sera bientôt disponible.
        </p>
      </section>
    </main>
  );
}

export default DashboardPage;