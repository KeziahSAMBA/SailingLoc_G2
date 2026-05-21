import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast.jsx';
import { listUsers, updateUser, deleteUser } from '../../services/adminService.js';

const ROLES = [
  ['locataire', 'Locataire'],
  ['proprietaire', 'Propriétaire'],
  ['admin', 'Admin'],
];
const ROLE_LABEL = Object.fromEntries(ROLES);

const selectClass =
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#5AB4EC]';
const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-[#5AB4EC]';
const labelClass = 'mb-1 block text-xs font-medium text-slate-400';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const EditIcon = () => (
  <svg {...iconProps}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
const BanIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const TrashIcon = () => (
  <svg {...iconProps}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

function IconBtn({ title, onClick, disabled, danger, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border p-2 transition disabled:opacity-50 ${
        danger
          ? 'border-red-500/40 text-red-300 hover:bg-red-500/10'
          : 'border-slate-600 text-slate-200 hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function change(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await updateUser(user.id_user, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone.trim() || null,
        role: form.role,
      });
      showToast('Utilisateur mis à jour.', 'success');
      onSaved(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la mise à jour.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Modifier l&apos;utilisateur</h2>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="e-first" className={labelClass}>
                Prénom
              </label>
              <input
                id="e-first"
                name="first_name"
                value={form.first_name}
                onChange={change}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="e-last" className={labelClass}>
                Nom
              </label>
              <input
                id="e-last"
                name="last_name"
                value={form.last_name}
                onChange={change}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="e-email" className={labelClass}>
              Email
            </label>
            <input
              id="e-email"
              name="email"
              type="email"
              value={form.email}
              onChange={change}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="e-phone" className={labelClass}>
              Téléphone
            </label>
            <input
              id="e-phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={change}
              placeholder="+33 6 12 34 56 78"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="e-role" className={labelClass}>
              Rôle
            </label>
            <select
              id="e-role"
              name="role"
              value={form.role}
              onChange={change}
              className={inputClass}
            >
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[#0A3172] px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#0A3172]/90 disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminUsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);

  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort, order };
      if (role) params.role = role;
      if (active) params.active = active;
      if (search.trim()) params.search = search.trim();
      const res = await listUsers(params);
      setUsers(res.data.users);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [role, active, search, sort, order]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function toggleSort(field) {
    if (sort === field) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setSort(field);
      setOrder('asc');
    }
  }

  async function toggleActive(u) {
    setBusyId(u.id_user);
    try {
      const res = await updateUser(u.id_user, { is_active: !u.is_active });
      setUsers((prev) => prev.map((x) => (x.id_user === u.id_user ? res.data.user : x)));
      showToast(u.is_active ? 'Compte désactivé.' : 'Compte activé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec de la mise à jour.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u) {
    if (!window.confirm(`Supprimer le compte de ${u.first_name} ${u.last_name} ?`)) return;
    setBusyId(u.id_user);
    try {
      await deleteUser(u.id_user);
      setUsers((prev) => prev.filter((x) => x.id_user !== u.id_user));
      showToast('Compte supprimé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec de la suppression.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const SortTh = ({ field, children }) => (
    <th
      onClick={() => toggleSort(field)}
      className="cursor-pointer select-none px-4 py-3 text-left font-semibold text-slate-300 hover:text-white"
    >
      {children} {sort === field ? (order === 'asc' ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
        <Link
          to="/admin/users/new"
          className="rounded-full bg-[#0A3172] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#0A3172]/90"
        >
          Ajouter un compte
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, email)…"
          className={`${selectClass} min-w-[220px] flex-1`}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
          <option value="">Tous les rôles</option>
          {ROLES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select value={active} onChange={(e) => setActive(e.target.value)} className={selectClass}>
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide">
            <tr>
              <SortTh field="last_name">Nom</SortTh>
              <SortTh field="email">Email</SortTh>
              <SortTh field="role">Rôle</SortTh>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Téléphone</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Statut</th>
              <SortTh field="created_at">Inscrit le</SortTh>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Aucun utilisateur.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id_user} className="text-slate-200">
                  <td className="px-4 py-3 font-medium">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-700/40 px-2.5 py-1 text-xs font-medium text-slate-200">
                      {ROLE_LABEL[u.role] || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.is_active
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-600/30 text-slate-400'
                      }`}
                    >
                      {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconBtn
                        title="Modifier"
                        disabled={busyId === u.id_user}
                        onClick={() => setEditing(u)}
                      >
                        <EditIcon />
                      </IconBtn>
                      <IconBtn
                        title={u.is_active ? 'Désactiver' : 'Activer'}
                        disabled={busyId === u.id_user}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? <BanIcon /> : <CheckIcon />}
                      </IconBtn>
                      <IconBtn
                        title="Supprimer"
                        danger
                        disabled={busyId === u.id_user}
                        onClick={() => remove(u)}
                      >
                        <TrashIcon />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {users.length} utilisateur(s) — clic sur un en-tête pour trier.
      </p>

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((x) => (x.id_user === updated.id_user ? updated : x)));
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

export default AdminUsersPage;
