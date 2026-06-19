import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../hooks/useToast.jsx';
import { listDocuments, setDocumentStatus } from '../../services/adminService.js';
import { fetchDocumentFile } from '../../services/documentService.js';
import { IconBtn, EyeIcon, CheckIcon, XIcon } from './AdminActions.jsx';

const TYPE_LABEL = {
  permis_conduire: 'Permis bateau',
  piece_identite: "Pièce d'identité",
  cv_nautique: 'CV nautique',
  permis: 'Permis',
  assurance: 'Assurance',
  cv_marin: 'CV marin',
  acte_francisation: 'Acte de francisation',
  identité: "Pièce d'identité",
};

const ROLE_LABEL = { locataire: 'Locataire', proprietaire: 'Propriétaire', admin: 'Admin' };

const STATUS = {
  pending: { label: 'En attente', cls: 'bg-amber-500/15 text-amber-300' },
  validated: { label: 'Validé', cls: 'bg-emerald-500/15 text-emerald-300' },
  refused: { label: 'Refusé', cls: 'bg-red-500/15 text-red-300' },
};

const FILTERS = [
  ['pending', 'En attente'],
  ['', 'Tous'],
  ['validated', 'Validés'],
  ['refused', 'Refusés'],
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

const selectClass =
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#5AB4EC]';

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
}

function AdminDocumentsPage() {
  const { showToast } = useToast();
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
      setError(err.response?.data?.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [status, role, type, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function view(doc) {
    try {
      const res = await fetchDocumentFile(doc.id_document);
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      showToast("Impossible d'ouvrir le document (fichier introuvable).", 'error');
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
      showToast(newStatus === 'validated' ? 'Document validé.' : 'Document refusé.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Échec de la mise à jour.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <h1 className="text-2xl font-bold text-white">Documents</h1>
      <p className="mt-1 text-sm text-slate-400">
        Vérifiez et validez les documents des utilisateurs.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              status === value
                ? 'bg-[#0A3172] text-white'
                : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur (nom, email)…"
          className={`${selectClass} min-w-[220px] flex-1`}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
          <option value="">Tous les rôles</option>
          <option value="locataire">Locataire</option>
          <option value="proprietaire">Propriétaire</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass}>
          <option value="">Tous les types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t] || t}
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
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Utilisateur</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Fichier</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Déposé le</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Statut</th>
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
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Aucun document.
                </td>
              </tr>
            ) : (
              documents.map((d) => (
                <tr key={d.id_document} className="text-slate-200">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {d.user ? `${d.user.first_name} ${d.user.last_name}` : '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {d.user?.email} {d.user ? `· ${ROLE_LABEL[d.user.role] || d.user.role}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">{TYPE_LABEL[d.type] || d.type}</td>
                  <td className="px-4 py-3">
                    <IconBtn title="Voir le document" variant="info" onClick={() => view(d)}>
                      <EyeIcon />
                    </IconBtn>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{fmtDate(d.upload_date)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        STATUS[d.status]?.cls || 'bg-slate-600/30 text-slate-400'
                      }`}
                    >
                      {STATUS[d.status]?.label || d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconBtn
                        title="Valider"
                        variant="success"
                        disabled={busyId === d.id_document || d.status === 'validated'}
                        onClick={() => decide(d, 'validated')}
                      >
                        <CheckIcon />
                      </IconBtn>
                      <IconBtn
                        title="Refuser"
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

      <p className="mt-3 text-xs text-slate-500">{documents.length} document(s).</p>
    </section>
  );
}

export default AdminDocumentsPage;
