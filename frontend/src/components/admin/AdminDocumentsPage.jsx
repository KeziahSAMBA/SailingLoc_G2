import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast.jsx';
import { listDocuments, setDocumentStatus } from '../../services/adminService.js';
import { fetchDocumentFile } from '../../services/documentService.js';
import { formatDate } from '../../utils/formatDate.js';
import { IconBtn, EyeIcon, CheckIcon, XIcon } from './AdminActions.jsx';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';
import AdminScrollableFilterRow from './AdminScrollableFilterRow.jsx';

const PAGE_SIZE = 10;

const STATUS_CLS = {
  pending: 'bg-amber-500/15 text-amber-300',
  validated: 'bg-emerald-500/15 text-emerald-300',
  refused: 'bg-red-500/15 text-red-300',
};

const FILTERS = [
  { value: 'pending', labelKey: 'pending' },
  { value: '', labelKey: 'all' },
  { value: 'validated', labelKey: 'validated' },
  { value: 'refused', labelKey: 'refused' },
];

const TYPE_OPTIONS = [
  'permis_conduire',
  'piece_identite',
  'cv_nautique',
  'permis',
  'assurance',
  'cv_marin',
  'acte_francisation',
];

const DATE_OPTS = { day: '2-digit', month: '2-digit', year: 'numeric' };

const selectClass =
  'rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#5AB4EC]';

function AdminDocumentsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fmtDate = (d) => (d ? formatDate(d, DATE_OPTS) : '—');
  const roleLabel = (r) =>
    r === 'admin' ? 'Admin' : t(`messenger.roles.${r}`, { defaultValue: r });
  const typeLabel = (ty) => t(`adminDocuments.types.${ty}`, { defaultValue: ty });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [role, setRole] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (role) params.role = role;
      if (type) params.type = type;
      if (search.trim()) params.search = search.trim();
      const res = await listDocuments(params);
      setDocuments(res.data.documents);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('adminDocuments.loadError'));
    } finally {
      setLoading(false);
    }
  }, [status, role, type, search, t]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const {
    page,
    setPage,
    pageItems: pageDocuments,
  } = usePagination(documents, PAGE_SIZE, `${status}|${role}|${type}|${search}`);

  async function view(doc) {
    try {
      const res = await fetchDocumentFile(doc.id_document);
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      showToast(t('adminDocuments.viewError'), 'error');
    }
  }

  async function decide(doc, newStatus) {
    setBusyId(doc.id_document);
    try {
      const res = await setDocumentStatus(doc.id_document, newStatus);
      // Si un filtre est actif, le doc peut sortir de la liste → on retire ; sinon on met à jour.
      if (status && status !== newStatus) {
        setDocuments((prev) => prev.filter((d) => d.id_document !== doc.id_document));
      } else {
        setDocuments((prev) =>
          prev.map((d) => (d.id_document === doc.id_document ? { ...d, ...res.data.document } : d))
        );
      }
      showToast(
        newStatus === 'validated'
          ? t('adminDocuments.validatedToast')
          : t('adminDocuments.refusedToast'),
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message || t('adminDocuments.updateError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-white">{t('adminDocuments.title')}</h1>
      <p className="mt-1 text-sm text-white/70">{t('adminDocuments.subtitle')}</p>

      <AdminScrollableFilterRow
        ariaLabel={t('adminDocuments.subtitle')}
        contentKey={`${status}|${t('adminDocuments.subtitle')}`}
        className="mt-5"
      >
        {FILTERS.map(({ value, labelKey }) => (
          <button
            key={labelKey}
            type="button"
            aria-pressed={status === value}
            onClick={() => setStatus(value)}
            className={`shrink-0 snap-start rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              status === value
                ? 'bg-sky-500 text-white'
                : 'border border-white/30 text-white/80 hover:bg-white/10'
            }`}
          >
            {t(`adminDocuments.filters.${labelKey}`)}
          </button>
        ))}
      </AdminScrollableFilterRow>

      <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('adminDocuments.searchPlaceholder')}
          className={`${selectClass} w-full sm:min-w-[220px] sm:flex-1`}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={`select-glass ${selectClass} w-full sm:w-auto`}
        >
          <option value="">{t('adminDocuments.allRoles')}</option>
          <option value="locataire">{t('adminDocuments.roleRenter')}</option>
          <option value="proprietaire">{t('adminDocuments.roleOwner')}</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={`select-glass ${selectClass} w-full sm:w-auto`}
        >
          <option value="">{t('adminDocuments.allTypes')}</option>
          {TYPE_OPTIONS.map((ty) => (
            <option key={ty} value={ty}>
              {typeLabel(ty)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminDocuments.colUser')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminDocuments.colType')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminDocuments.colFile')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminDocuments.colUploaded')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminDocuments.colStatus')}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-white/80">
                {t('adminDocuments.colActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                  {t('adminDocuments.loading')}
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                  {t('adminDocuments.empty')}
                </td>
              </tr>
            ) : (
              pageDocuments.map((d) => (
                <tr key={d.id_document} className="text-white/90">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {d.user ? `${d.user.first_name} ${d.user.last_name}` : '—'}
                    </div>
                    <div className="text-xs text-white/60">
                      {d.user?.email} {d.user ? `· ${roleLabel(d.user.role)}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">{typeLabel(d.type)}</td>
                  <td className="px-4 py-3">
                    <IconBtn
                      title={t('adminDocuments.view')}
                      variant="info"
                      onClick={() => view(d)}
                    >
                      <EyeIcon />
                    </IconBtn>
                  </td>
                  <td className="px-4 py-3 text-white/70">{fmtDate(d.upload_date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS_CLS[d.status] || 'bg-slate-500/15 text-white/70'
                      }`}
                    >
                      {t(`adminDocuments.status.${d.status}`, { defaultValue: d.status })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconBtn
                        title={t('adminDocuments.actionValidate')}
                        variant="success"
                        disabled={busyId === d.id_document || d.status === 'validated'}
                        onClick={() => decide(d, 'validated')}
                      >
                        <CheckIcon />
                      </IconBtn>
                      <IconBtn
                        title={t('adminDocuments.actionRefuse')}
                        variant="danger"
                        disabled={busyId === d.id_document || d.status === 'refused'}
                        onClick={() => decide(d, 'refused')}
                      >
                        <XIcon />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile : une carte par document (le tableau ci-dessus est masqué). */}
      <ul className="mt-5 space-y-3 lg:hidden">
        {loading || documents.length === 0 ? (
          <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
            {loading ? t('adminDocuments.loading') : t('adminDocuments.empty')}
          </li>
        ) : (
          pageDocuments.map((d) => (
            <li
              key={d.id_document}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="min-w-0 break-words font-medium text-white">
                  {d.user ? `${d.user.first_name} ${d.user.last_name}` : '—'}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    STATUS_CLS[d.status] || 'bg-slate-500/15 text-white/70'
                  }`}
                >
                  {t(`adminDocuments.status.${d.status}`, { defaultValue: d.status })}
                </span>
              </div>

              <p className="mt-1 break-all text-xs text-white/60">
                {d.user?.email} {d.user ? `· ${roleLabel(d.user.role)}` : ''}
              </p>

              <p className="mt-2 break-words text-sm text-white/90">{typeLabel(d.type)}</p>
              <p className="text-xs text-white/60">{fmtDate(d.upload_date)}</p>

              <div className="mt-3 flex justify-end gap-2 border-t border-white/15 pt-3">
                <IconBtn title={t('adminDocuments.view')} variant="info" onClick={() => view(d)}>
                  <EyeIcon />
                </IconBtn>
                <IconBtn
                  title={t('adminDocuments.actionValidate')}
                  variant="success"
                  disabled={busyId === d.id_document || d.status === 'validated'}
                  onClick={() => decide(d, 'validated')}
                >
                  <CheckIcon />
                </IconBtn>
                <IconBtn
                  title={t('adminDocuments.actionRefuse')}
                  variant="danger"
                  disabled={busyId === d.id_document || d.status === 'refused'}
                  onClick={() => decide(d, 'refused')}
                >
                  <XIcon />
                </IconBtn>
              </div>
            </li>
          ))
        )}
      </ul>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={documents.length}
        onChange={setPage}
        label={t('adminDocuments.paginationLabel')}
        className="mt-4"
      />

      <p className="mt-3 text-xs text-white/60">
        {t('adminDocuments.count', { count: documents.length })}
      </p>
    </section>
  );
}

export default AdminDocumentsPage;
