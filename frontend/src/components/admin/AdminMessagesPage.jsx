import { useState, useEffect, useRef } from 'react';
import { listUsers } from '../../services/adminService.js';
import Messenger from '../messages/Messenger.jsx';

const ROLE_LABEL = { locataire: 'Locataire', proprietaire: 'Propriétaire', admin: 'Admin' };

// Messagerie admin : comme les autres rôles, avec en plus un annuaire pour
// écrire à n'importe quel utilisateur de la plateforme.
function AdminMessagesPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(null); // conversation ouverte via l'annuaire
  const boxRef = useRef(null);

  // SEO / onglet navigateur : titre de page dédié (page privée, derrière auth).
  useEffect(() => {
    document.title = 'Messagerie — Admin SailingLoc';
  }, []);

  // Recherche d'utilisateurs, avec un léger debounce.
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(() => {
      listUsers({ search: search.trim() })
        .then((res) => setResults((res.data.users || []).slice(0, 8)))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  // Ferme la liste de résultats au clic en dehors.
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <section aria-labelledby="admin-messages-title">
      <header className="mb-6">
        <h1 id="admin-messages-title" className="text-2xl font-bold text-white">
          Messagerie
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Écrivez à n’importe quel utilisateur de la plateforme.
        </p>
      </header>

      {/* Annuaire : réservé à l'admin */}
      <div ref={boxRef} className="relative mb-5 max-w-md">
        <label htmlFor="user-search" className="mb-1 block text-xs font-medium text-slate-400">
          Nouveau message à…
        </label>
        <input
          id="user-search"
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-autocomplete="list"
          autoComplete="off"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Nom, prénom ou email…"
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-[#5AB4EC]"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
            {results.map((u) => (
              <li key={u.id_user}>
                <button
                  type="button"
                  onClick={() => {
                    setTarget({
                      id_user: u.id_user,
                      first_name: u.first_name,
                      last_name: u.last_name,
                      role: u.role,
                    });
                    setSearch('');
                    setOpen(false);
                  }}
                  className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-slate-700"
                >
                  <span className="min-w-0 truncate">
                    {u.first_name} {u.last_name}
                    {u.email && <span className="text-slate-400"> — {u.email}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
                    {ROLE_LABEL[u.role] || u.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Messenger externalUser={target} />
    </section>
  );
}

export default AdminMessagesPage;
