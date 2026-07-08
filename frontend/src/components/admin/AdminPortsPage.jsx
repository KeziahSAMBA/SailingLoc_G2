import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../hooks/useToast.jsx';
import { listPorts, createPort, deletePort } from '../../services/adminService.js';
import { IconBtn, TrashIcon } from './AdminActions.jsx';
import MapView from '../common/MapView.jsx';
import { loadPortCatalog } from '../../utils/portCatalog.js';

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
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#5AB4EC]';

function fmtCoord(v) {
  return v == null ? '—' : Number(v).toFixed(4);
}

function AdminPortsPage() {
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
      setError(err.response?.data?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [search, region]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Chargement paresseux du catalogue (4 Mo) : seulement à l'ouverture du panneau.
  async function openImport() {
    setShowImport(true);
    if (catalog || catalogLoading) return;
    setCatalogLoading(true);
    setCatalogError('');
    try {
      setCatalog(await loadPortCatalog());
    } catch {
      setCatalogError('Impossible de charger le catalogue des ports.');
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
      showToast(`« ${entry.name} » importé en base.`, 'success');
    } catch (err) {
      showToast(err.response?.data?.message || "Échec de l'import.", 'error');
    } finally {
      setImportingName(null);
    }
  }

  async function remove(port) {
    if (!window.confirm(`Retirer le port « ${port.name} » de la base ?`)) return;
    setBusyId(port.id_port);
    try {
      await deletePort(port.id_port);
      setPorts((prev) => prev.filter((p) => p.id_port !== port.id_port));
      showToast('Port supprimé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec de la suppression.', 'error');
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
          <h1 className="text-2xl font-bold text-white">Ports</h1>
          <p className="mt-1 text-sm text-slate-400">
            Gérez les ports d&apos;amarrage et visualisez où se trouvent les bateaux.
          </p>
        </div>
        <button
          type="button"
          onClick={openImport}
          className="rounded-lg bg-[#0A3172] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A3172]/80"
        >
          + Importer un port
        </button>
      </div>

      {showImport && (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-200">Catalogue maritime français</h2>
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Fermer
            </button>
          </div>
          <input
            type="search"
            value={catalogSearch}
            onChange={(e) => setCatalogSearch(e.target.value)}
            placeholder="Rechercher un port à importer (nom, commune)…"
            className={`${inputClass} mt-3 w-full`}
          />

          {catalogLoading && (
            <p className="mt-3 text-sm text-slate-400">Chargement du catalogue…</p>
          )}
          {catalogError && <p className="mt-3 text-sm text-red-300">{catalogError}</p>}

          {!catalogLoading && !catalogError && (
            <>
              {q.length < 2 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Saisissez au moins 2 caractères pour rechercher.
                </p>
              ) : catalogResults.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Aucun port trouvé dans le catalogue.</p>
              ) : (
                <ul className="mt-3 max-h-72 divide-y divide-slate-800 overflow-y-auto rounded-lg border border-slate-800">
                  {catalogResults.map((p) => {
                    const already = existingNames.has(p.name.toLowerCase());
                    return (
                      <li
                        key={p.name}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-200">{p.name}</div>
                          <div className="text-xs text-slate-500">{p.city || '—'}</div>
                        </div>
                        <button
                          type="button"
                          disabled={already || importingName === p.name}
                          onClick={() => importPort(p)}
                          className="shrink-0 rounded-lg border border-[#5AB4EC]/40 px-3 py-1.5 text-xs font-semibold text-[#5AB4EC] transition hover:bg-[#5AB4EC]/10 disabled:opacity-40"
                        >
                          {already ? 'En base' : importingName === p.name ? '…' : 'Importer'}
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
        className="mt-5 h-[360px]"
        markers={mapMarkers}
        emptyLabel="Aucun port géolocalisé."
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer (nom, ville)…"
          className={`${inputClass} min-w-[220px] flex-1`}
        />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputClass}>
          <option value="">Toutes les régions</option>
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

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Port</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Ville</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Région</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Coordonnées</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Bateaux</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Chargement…
                </td>
              </tr>
            ) : ports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Aucun port. Importez-en depuis le catalogue.
                </td>
              </tr>
            ) : (
              ports.map((p) => (
                <tr key={p.id_port} className="text-slate-200">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.city}</td>
                  <td className="px-4 py-3 text-slate-400">{p.region || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {fmtCoord(p.latitude)}, {fmtCoord(p.longitude)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{p.boats_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <IconBtn
                        title={
                          p.boats_count > 0
                            ? 'Suppression impossible : des bateaux y sont rattachés'
                            : 'Supprimer'
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

      <p className="mt-3 text-xs text-slate-500">{ports.length} port(s) en base.</p>
    </section>
  );
}

export default AdminPortsPage;
