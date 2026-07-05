import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';

// Styles de focus clavier communs aux cartes cliquables (accessibilité).
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function StatCard({ label, accent, to }) {
  return (
    <li>
      <Link
        to={to}
        aria-label={`${label} : données à venir`}
        className={`block rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition hover:border-slate-600 hover:bg-slate-900 ${FOCUS_RING}`}
      >
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {/* Placeholder : sera remplacé par la valeur réelle. */}
        <span className={`mt-2 block text-3xl font-bold ${accent}`} aria-hidden="true">
          —
        </span>
      </Link>
    </li>
  );
}

function PlaceholderSection({ id, title, to, emptyText }) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-sm font-semibold text-slate-200">
          {title}
        </h2>
        <Link
          to={to}
          className={`rounded text-xs font-medium text-[#5AB4EC] hover:underline ${FOCUS_RING}`}
        >
          Tout voir
        </Link>
      </header>
      <p className="mt-4 text-sm text-slate-400">{emptyText}</p>
    </section>
  );
}

function ProprietaireDashboard() {
  const { user } = useAuth();

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Tableau de bord — SailingLoc';
  }, []);

  return (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title" className="text-2xl font-bold text-white">
        Tableau de bord
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Bonjour {user?.first_name}, voici un aperçu de votre activité.
      </p>

      <h2 className="sr-only" id="kpis-title">
        Indicateurs clés
      </h2>
      <ul
        aria-labelledby="kpis-title"
        className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard label="Bateaux publiés" accent="text-white" to="/proprietaire/bateaux" />
        <StatCard
          label="Réservations en cours"
          accent="text-emerald-400"
          to="/proprietaire/reservations"
        />
        <StatCard label="Revenus du mois" accent="text-[#5AB4EC]" to="/proprietaire/revenus" />
        <StatCard
          label="Demandes en attente"
          accent="text-amber-400"
          to="/proprietaire/reservations"
        />
      </ul>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <PlaceholderSection
          id="recent-bookings-title"
          title="Dernières réservations"
          to="/proprietaire/reservations"
          emptyText="Vous n'avez pas encore de réservation sur vos bateaux."
        />
        <PlaceholderSection
          id="boats-preview-title"
          title="Mes bateaux"
          to="/proprietaire/bateaux"
          emptyText="Aucun bateau publié pour l'instant. Ajoutez votre premier bateau !"
        />
      </div>
    </section>
  );
}

export default ProprietaireDashboard;
