import { NavLink, Outlet } from 'react-router-dom';

const NAV = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/spectateur', label: 'Vue locataire', end: true },
  { to: '/admin/spectateur/proprietaire', label: 'Vue propriétaire' },
  { to: '/admin/users', label: 'Utilisateurs' },
  { to: '/admin/comments', label: 'Commentaires' },
  { to: '/admin/publications', label: 'Publication' },
  { to: '/admin/documents', label: 'Documents' },
  { to: '/admin/bookings', label: 'Réservations' },
  { to: '/admin/ports', label: 'Ports' },
  { to: '/admin/transactions', label: 'Transaction' },
  { to: '/admin/messages', label: 'Messagerie' },
  { to: '/admin/contact', label: 'Demandes contact' },
  { to: '/admin/compte', label: 'Compte' },
];

function AdminLayout() {
  return (
    // Fond sombre : indispensable pour que le texte blanc du header reste lisible.
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 pt-[100px] pb-10">
        {/* Menu latéral gauche */}
        <aside className="w-60 shrink-0">
          <div className="sticky top-[96px] rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Administration
            </p>
            <nav className="space-y-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-[#0A3172] text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* Zone de contenu droite */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
