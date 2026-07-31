import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast.jsx';
import { listPorts, createPort, deletePort } from '../../services/adminService.js';
import { IconBtn, TrashIcon } from './AdminActions.jsx';
import MapView from '../common/MapView.jsx';
import { loadPortCatalog } from '../../utils/portCatalog.js';
import Pagination from '../common/Pagination.jsx';
import usePagination from '../../hooks/usePagination.js';

const PAGE_SIZE = 10;

const MAX_RESULTS = 50;

// Régions administratives (mêmes libellés que ceux déduits côté serveur).
const REGIONS = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  "Provence-Alpes-Côte d'Azur",
  'Guadeloupe',
  'Martinique',
  'Guyane',
  'La Réunion',
  'Mayotte',
];

const inputClass =
  'rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white/90 outline-none focus:border-[#5AB4EC]';

function fmtCoord(v) {
  return v == null ? '—' : Number(v).toFixed(4);
}

function AdminPortsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [ports, setPorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [busyId, setBusyId] = useState(null);

  // Import depuis le catalogue
  const [showImport, setShowImport] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [importingName, setImportingName] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (region) params.region = region;
      const res = await listPorts(params);
      setPorts(res.data.ports);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || t('adminPorts.loadError'));
    } finally {
      setLoading(false);
    }
  }, [search, region, t]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const {
    page,
    setPage,
    pageItems: pagePorts,
  } = usePagination(ports, PAGE_SIZE, `${search}|${region}`);

  // Chargement paresseux du catalogue (4 Mo) : seulement à l'ouverture du panneau.
  async function openImport() {
    setShowImport(true);
    if (catalog || catalogLoading) return;
    setCatalogLoading(true);
    setCatalogError('');
    try {
      setCatalog(await loadPortCatalog());
    } catch {
      setCatalogError(t('adminPorts.catalogError'));
    } finally {
      setCatalogLoading(false);
    }
  }

  async function importPort(entry) {
    setImportingName(entry.name);
    try {
      const res = await createPort(entry);
      setPorts((prev) =>
        [...prev.filter((p) => p.id_port !== res.data.port.id_port), res.data.port].sort((a, b) =>
          a.name.localeCompare(b.name, 'fr')
        )
      );
      showToast(t('adminPorts.imported', { name: entry.name }), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('adminPorts.importError'), 'error');
    } finally {
      setImportingName(null);
    }
  }

  async function remove(port) {
    if (!window.confirm(t('adminPorts.confirmRemove', { name: port.name }))) return;
    setBusyId(port.id_port);
    try {
      await deletePort(port.id_port);
      setPorts((prev) => prev.filter((p) => p.id_port !== port.id_port));
      showToast(t('adminPorts.removeSuccess'), 'success');
    } catch (err) {
      showToast(err.response?.data?.message || t('adminPorts.removeError'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  const existingNames = new Set(ports.map((p) => p.name.toLowerCase()));
  const q = catalogSearch.trim().toLowerCase();
  const catalogResults =
    catalog && q.length >= 2
      ? catalog
          .filter((p) => p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
          .slice(0, MAX_RESULTS)
      : [];

  const mapMarkers = ports.map((p) => ({
    id: p.id_port,
    lat: p.latitude,
    lng: p.longitude,
    title: p.name,
    subtitle: [p.city, p.region].filter(Boolean).join(' · '),
    badge: p.boats_count ?? 0,
    available: (p.boats_count ?? 0) > 0,
  }));

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('adminPorts.title')}</h1>
          <p className="mt-1 text-sm text-white/70">{t('adminPorts.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openImport}
          className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500/80 sm:w-auto"
        >
          {t('adminPorts.importButton')}
        </button>
      </div>

      {showImport && (
        <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white/90">{t('adminPorts.catalogTitle')}</h2>
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="text-sm text-white/70 hover:text-white/90"
            >
              {t('adminPorts.close')}
            </button>
          </div>
          <input
            type="search"
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder={t('adminPorts.catalogSearchPlaceholder')}
            className={`${inputClass} mt-3 w-full`}
          />

          {catalogLoading && (
            <p className="mt-3 text-sm text-white/70">{t('adminPorts.catalogLoading')}</p>
          )}
          {catalogError && <p className="mt-3 text-sm text-red-300">{catalogError}</p>}

          {!catalogLoading && !catalogError && (
            <>
              {q.length < 2 ? (
                <p className="mt-3 text-sm text-white/60">{t('adminPorts.typeToSearch')}</p>
              ) : catalogResults.length === 0 ? (
                <p className="mt-3 text-sm text-white/60">{t('adminPorts.catalogEmpty')}</p>
              ) : (
                <ul className="mt-3 max-h-72 divide-y divide-white/15 overflow-y-auto rounded-lg border border-white/20">
                  {catalogResults.map((p) => {
                    const already = existingNames.has(p.name.toLowerCase());
                    return (
                      <li
                        key={p.name}
                        className="flex flex-col items-stretch justify-between gap-3 px-3 py-2 text-sm sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <div className="break-words font-medium text-white/90">{p.name}</div>
                          <div className="text-xs text-white/60">{p.city || '—'}</div>
                        </div>
                        <button
                          type="button"
                          disabled={already || importingName === p.name}
                          onClick={() => importPort(p)}
                          className="w-full shrink-0 rounded-lg border border-[#5AB4EC]/40 px-3 py-1.5 text-xs font-semibold text-[#5AB4EC] transition hover:bg-[#5AB4EC]/10 disabled:opacity-40 sm:w-auto"
                        >
                          {already
                            ? t('adminPorts.inBase')
                            : importingName === p.name
                              ? '…'
                              : t('adminPorts.import')}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <MapView
        className="mt-5 h-72 sm:h-[360px]"
        markers={mapMarkers}
        emptyLabel={t('adminPorts.mapEmpty')}
      />

      <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('adminPorts.filterPlaceholder')}
          className={`${inputClass} w-full sm:min-w-[220px] sm:flex-1`}
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={`select-glass ${inputClass} w-full sm:w-auto`}
        >
          <option value="">{t('adminPorts.allRegions')}</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-white/20 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminPorts.colPort')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminPorts.colCity')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminPorts.colRegion')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminPorts.colCoords')}
              </th>
              <th className="px-4 py-3 text-left font-semibold text-white/80">
                {t('adminPorts.colBoats')}
              </th>
              <th className="px-4 py-3 text-right font-semibold text-white/80">
                {t('adminPorts.colActions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                  {t('adminPorts.loading')}
                </td>
              </tr>
            ) : ports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/70">
                  {t('adminPorts.empty')}
                </td>
              </tr>
            ) : (
              pagePorts.map((p) => (
                <tr key={p.id_port} className="text-white/90">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.city}</td>
                  <td className="px-4 py-3 text-white/70">{p.region || '—'}</td>
                  <td className="px-4 py-3 text-white/70">
                    {fmtCoord(p.latitude)}, {fmtCoord(p.longitude)}
                  </td>
                  <td className="px-4 py-3 text-white/70">{p.boats_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <IconBtn
                        title={
                          p.boats_count > 0
                            ? t('adminPorts.removeDisabled')
                            : t('adminPorts.remove')
                        }
                        variant="danger"
                        disabled={busyId === p.id_port || p.boats_count > 0}
                        onClick={() => remove(p)}
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

      {/* Mobile : une carte par port (le tableau ci-dessus est masqué). */}
      <ul className="mt-5 space-y-3 md:hidden">
        {loading || ports.length === 0 ? (
          <li className="rounded-2xl border border-white/20 bg-white/10 px-4 py-8 text-center text-sm text-white/70 backdrop-blur-xl">
            {loading ? t('adminPorts.loading') : t('adminPorts.empty')}
          </li>
        ) : (
          pagePorts.map((p) => (
            <li
              key={p.id_port}
              className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white">{p.name}</p>
                  <p className="text-sm text-white/70">
                    {p.city}
                    {p.region ? ` · ${p.region}` : ''}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90">
                  {t('adminPorts.colBoats')} : {p.boats_count ?? 0}
                </span>
              </div>

              <p className="mt-2 font-mono text-xs text-white/60">
                {fmtCoord(p.latitude)}, {fmtCoord(p.longitude)}
              </p>

              <div className="mt-3 flex justify-end border-t border-white/15 pt-3">
                <IconBtn
                  title={
                    p.boats_count > 0 ? t('adminPorts.removeDisabled') : t('adminPorts.remove')
                  }
                  variant="danger"
                  disabled={busyId === p.id_port || p.boats_count > 0}
                  onClick={() => remove(p)}
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
        total={ports.length}
        onChange={setPage}
        label={t('adminPorts.paginationLabel')}
        className="mt-4"
      />

      <p className="mt-3 text-xs text-white/60">{t('adminPorts.count', { count: ports.length })}</p>
    </section>
  );
}

export default AdminPortsPage;
