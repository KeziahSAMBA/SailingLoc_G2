import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast.jsx';
import { listUsers, updateUser, deleteUser } from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';
import { IconBtn, EditIcon, BanIcon, CheckIcon, TrashIcon } from './AdminActions.jsx';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';

const PAGE_SIZE = 10;

const ROLE_VALUES = ['locataire', 'proprietaire', 'admin'];

const DATE_OPTS = { day: '2-digit', month: '2-digit', year: 'numeric' };

const selectClass =
  'rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#5AB4EC]';
const inputClass =
  'w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#5AB4EC]';
const labelClass = 'mb-1 block text-xs font-medium text-white/70';

function EditUserModal({ user, onClose, onSaved }) {
  const { t } = useTranslation();
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
      showToast(t('adminUsers.updatedToast'), 'success');
      onSaved(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || t('adminUsers.updateError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="my-auto max-h-[calc(100svh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">{t('adminUsers.editTitle')}</h2>

        {error && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={submit} noValidate className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="e-first" className={labelClass}>
                {t('adminUsers.firstName')}
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
                {t('adminUsers.lastName')}
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
              {t('adminUsers.email')}
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
              {t('adminUsers.phone')}
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
              {t('adminUsers.roleLabel')}
            </label>
            <select
              id="e-role"
              name="role"
              value={form.role}
              onChange={change}
              className={`select-glass ${inputClass}`}
            >
              {ROLE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {t(`adminUsers.roles.${v}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              {t('adminUsers.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-500/90 disabled:opacity-60"
            >
              {saving ? t('adminUsers.saving') : t('adminUsers.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminUsersPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fmtDate = (d) => (d ? formatDate(d, DATE_OPTS) : '—');
  const roleLabel = (r) => t(`adminUsers.roles.${r}`, { defaultValue: r });
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
      setError(err.response?.data?.message || t('adminUsers.loadError'));
    } finally {
      setLoading(false);
    }
  }, [role, active, search, sort, order, t]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const {
    page,
    setPage,
    pageItems: pageUsers,
  } = usePagination(users, PAGE_SIZE, `${role}|${active}|${search}|${sort}|${order}`);

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
      showToast(
        u.is_active ? t('adminUsers.deactivatedToast') : t('adminUsers.activatedToast'),
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message || t('adminUsers.updateError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u) {
    if (!window.confirm(t('adminUsers.confirmDelete', { name: `${u.first_name} ${u.last_name}` })))
      return;
    setBusyId(u.id_user);
    try {
      await deleteUser(u.id_user);
      setUsers((prev) => prev.filter((x) => x.id_user !== u.id_user));
      showToast(t('adminUsers.deletedToast'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('adminUsers.deleteError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  const SortTh = ({ field, children }) => (
    <th
      onClick={() => toggleSort(field)}
      className="cursor-pointer select-none px-4 py-3 text-left font-semibold text-white/80 hover:text-white"
    >
      {children} {sort === field ? (order === 'asc' ? '▲' : '▼') : ''}
    </th>
  );

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">{t('adminUsers.title')}</h1>
        <Link
          to="/admin/users/new"
          className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-500/90"
        >
          {t('adminUsers.addAccount')}
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('adminUsers.searchPlaceholder')}
          className={`${selectClass} min-w-[220px] flex-1`}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={`select-glass ${selectClass}`}
        >
          <option value="">{t('adminUsers.allRoles')}</option>
          {ROLE_VALUES.map((v) => (
            <option key={v} value={v}>
              {roleLabel(v)}
            </option>
          ))}
        </select>
        <select
          value={active}
          onChange={(e) => setActive(e.target.value)}
          className={`select-glass ${selectClass}`}
        >
          <option value="">{t('adminUsers.allStatuses')}</option>
          <option value="true">{t('adminUsers.activeFilter')}</option>
          <option value="false">{t('adminUsers.inactiveFilter')}</option>
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Tri en pastilles : remplace les en-têtes cliquables, masqués avec le tableau. */}
      <div className="mt-5 flex flex-wrap items-center gap-2 lg:hidden">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
          {t('adminUsers.sortLabel')}
        </span>
        {[
          { field: 'last_name', label: t('adminUsers.colName') },
          { field: 'email', label: t('adminUsers.colEmail') },
          { field: 'role', label: t('adminUsers.colRole') },
          { field: 'created_at', label: t('adminUsers.colRegistered') },
        ].map(({ field, label }) => (
          <button
            key={field}
            type="button"
            onClick={() => toggleSort(field)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              sort === field
                ? 'bg-sky-500 text-white'
                : 'border border-white/30 text-white/80 hover:bg-white/10'
            }`}
          >
            {label}
            {sort === field ? (order === 'asc' ? ' ▲' : ' ▼') : ''}
          </button>
        ))}
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
            <tr>
              <SortTh field="last_name">{t('adminUsers.colName')}</SortTh>
              <SortTh field="email">{t('adminUsers.colEmail')}</SortTh>
              <SortTh field="role">{t('adminUsers.colRole')}</SortTh>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminUsers.colPhone')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminUsers.colStatus')}
              </th>
              <SortTh field="created_at">{t('adminUsers.colRegistered')}</SortTh>
              <th className="px-4 py-3 text-right font-semibold text-white/80">
                {t('adminUsers.colActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/70">
                  {t('adminUsers.loading')}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/70">
                  {t('adminUsers.empty')}
                </td>
              </tr>
            ) : (
              pageUsers.map((u) => (
                <tr key={u.id_user} className="text-white/90">
                  <td className="px-4 py-3 font-medium">
                    {u.first_name} {u.last_name}
                  </td>
                  <td className="px-4 py-3 text-white/70">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90">
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{u.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.is_active
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-500/15 text-white/70'
                      }`}
                    >
                      {u.is_active ? t('adminUsers.statusActive') : t('adminUsers.statusInactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconBtn
                        title={t('adminUsers.edit')}
                        disabled={busyId === u.id_user}
                        onClick={() => setEditing(u)}
                      >
                        <EditIcon />
                      </IconBtn>
                      <IconBtn
                        title={u.is_active ? t('adminUsers.deactivate') : t('adminUsers.activate')}
                        variant={u.is_active ? 'warn' : 'success'}
                        disabled={busyId === u.id_user}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? <BanIcon /> : <CheckIcon />}
                      </IconBtn>
                      <IconBtn
                        title={t('adminUsers.delete')}
                        variant="danger"
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

      {/* Mobile : une carte par utilisateur (le tableau ci-dessus est masqué). */}
      <ul className="mt-5 space-y-3 lg:hidden">
        {loading || users.length === 0 ? (
          <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
            {loading ? t('adminUsers.loading') : t('adminUsers.empty')}
          </li>
        ) : (
          pageUsers.map((u) => (
            <li
              key={u.id_user}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-medium text-white">
                  {u.first_name} {u.last_name}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    u.is_active
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-500/15 text-white/70'
                  }`}
                >
                  {u.is_active ? t('adminUsers.statusActive') : t('adminUsers.statusInactive')}
                </span>
              </div>

              <p className="mt-1 break-all text-sm text-white/70">{u.email}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/70">
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium text-white/90">
                  {roleLabel(u.role)}
                </span>
                <span>{u.phone || '—'}</span>
                <span className="text-white/60">{fmtDate(u.created_at)}</span>
              </div>

              <div className="mt-3 flex justify-end gap-2 border-t border-white/15 pt-3">
                <IconBtn
                  title={t('adminUsers.edit')}
                  disabled={busyId === u.id_user}
                  onClick={() => setEditing(u)}
                >
                  <EditIcon />
                </IconBtn>
                <IconBtn
                  title={u.is_active ? t('adminUsers.deactivate') : t('adminUsers.activate')}
                  variant={u.is_active ? 'warn' : 'success'}
                  disabled={busyId === u.id_user}
                  onClick={() => toggleActive(u)}
                >
                  {u.is_active ? <BanIcon /> : <CheckIcon />}
                </IconBtn>
                <IconBtn
                  title={t('adminUsers.delete')}
                  variant="danger"
                  disabled={busyId === u.id_user}
                  onClick={() => remove(u)}
                >
                  <TrashIcon />
                </IconBtn>
              </div>
            </li>
          ))
        )}
      </ul>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={users.length}
        onChange={setPage}
        label={t('adminUsers.paginationLabel')}
        className="mt-4"
      />

      <p className="mt-3 text-xs text-white/60">
        {t('adminUsers.countHint', { count: users.length })}
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
