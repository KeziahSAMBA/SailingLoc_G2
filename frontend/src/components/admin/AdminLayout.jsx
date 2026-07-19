import { NavLink, Outlet } from 'react-router-dom';
import bgImage from '../../assets/image/paysage/crique.jpg';

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
    // Même univers visuel que les espaces propriétaire et locataire : photo
    // plein écran sous un voile sombre et panneaux en verre dépoli.
    <div
      className="min-h-screen bg-cover bg-fixed bg-center text-white"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="min-h-screen w-full bg-fixed bg-gradient-to-b from-slate-950/90 via-slate-950/75 to-slate-950/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-[100px] pb-10 lg:flex-row">
          {/* Menu : barre horizontale défilable sur mobile, colonne à partir de lg. */}
          <aside className="w-full lg:w-60 lg:shrink-0">
            <nav
              aria-label="Navigation administration"
              className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-xl lg:sticky lg:top-[96px]"
            >
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                Administration
              </p>
              <div className="flex gap-1 overflow-x-auto lg:flex-col">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition lg:shrink ${
                        isActive
                          ? 'bg-sky-500 text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          </aside>

          {/* Zone de contenu droite */}
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
