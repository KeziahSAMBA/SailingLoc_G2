import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import {
  getMyDocuments,
  uploadDocument,
  deleteDocument,
  fetchDocumentFile,
} from '../../services/documentService.js';

// Documents obligatoires selon le rôle (doit correspondre au backend).
const DOC_TYPES_BY_ROLE = {
  locataire: [
    { key: 'permis_conduire', label: 'Permis bateau', desc: 'Permis bateau côtier ou fluvial.' },
    {
      key: 'piece_identite',
      label: "Pièce d'identité",
      desc: "Carte nationale d'identité ou passeport en cours de validité.",
    },
    {
      key: 'cv_nautique',
      label: 'CV nautique',
      desc: 'Document décrivant votre expérience de navigation.',
    },
  ],
  proprietaire: [
    { key: 'permis', label: 'Permis', desc: 'Permis bateau ou de conduire.' },
    { key: 'assurance', label: 'Assurance', desc: 'Attestation d’assurance du bateau.' },
    {
      key: 'cv_marin',
      label: 'CV marin',
      desc: 'Document décrivant votre expérience maritime. Optionnel — requis seulement si vous proposez vos services de skipper avec votre bateau.',
      optional: true,
    },
    {
      key: 'acte_francisation',
      label: 'Acte de francisation',
      desc: 'Certificat d’immatriculation du bateau (carte d’enregistrement). Plusieurs possibles — chacun ne peut être rattaché qu’à une seule annonce.',
      multiple: true,
    },
  ],
};

const STATUS = {
  pending: { label: 'En attente de validation', cls: 'bg-amber-500/15 text-amber-300' },
  validated: { label: 'Validé', cls: 'bg-emerald-500/15 text-emerald-300' },
  refused: { label: 'Refusé', cls: 'bg-red-500/15 text-red-300' },
};

function DocumentRow({ config, docs, onChanged }) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleUpload() {
    if (!file) {
      setError('Sélectionnez un fichier.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await uploadDocument(config.key, file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      showToast(`${config.label} envoyé.`, 'success');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Échec de l'envoi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleView(doc) {
    setError('');
    try {
      const res = await fetchDocumentFile(doc.id_document);
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("Impossible d'ouvrir le document.");
    }
  }

  async function handleDelete(doc) {
    setBusy(true);
    setError('');
    try {
      await deleteDocument(doc.id_document);
      showToast(`${config.label} supprimé.`, 'success');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la suppression.');
    } finally {
      setBusy(false);
    }
  }

  const hasDocs = docs.length > 0;
  const headerBadge = config.multiple
    ? hasDocs
      ? { label: `${docs.length} fichier(s)`, cls: 'bg-slate-500/15 text-slate-300' }
      : null
    : hasDocs
      ? STATUS[docs[0].status]
      : null;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{config.label}</h2>
          <p className="mt-1 text-sm text-slate-400">{config.desc}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            headerBadge ? headerBadge.cls : 'bg-slate-800 text-slate-400'
          }`}
        >
          {headerBadge ? headerBadge.label : config.optional ? 'Optionnel' : 'Non fourni'}
        </span>
      </div>

      {docs.map((doc) => {
        const st = STATUS[doc.status];
        return (
          <div
            key={doc.id_document}
            className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-800/60 px-4 py-3"
          >
            <span className="truncate text-sm font-medium text-slate-200">{doc.file_name}</span>
            {st && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                {st.label}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleView(doc)}
              className="text-xs font-semibold text-[#5AB4EC] hover:underline"
            >
              Voir
            </button>
            <button
              type="button"
              onClick={() => handleDelete(doc)}
              disabled={busy}
              className="ml-auto text-xs font-semibold text-red-300 hover:underline disabled:opacity-50"
            >
              Supprimer
            </button>
          </div>
        );
      })}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setError('');
          }}
          className="block w-full max-w-xs text-sm text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-[#5AB4EC]/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#5AB4EC] hover:file:bg-[#5AB4EC]/25"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy || !file}
          className="rounded-full bg-[#0A3172] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#0d3d8c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Envoi…' : config.multiple ? 'Ajouter' : hasDocs ? 'Remplacer' : 'Envoyer'}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Formats acceptés : PDF, JPG, PNG — 5 Mo maximum.
      </p>

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </article>
  );
}

// Gestion des documents obligatoires (liste + dépôt/suppression).
// Contenu seul : l'enveloppe (fond, en-tête de page) est fournie par la page hôte.
// `onCounts` remonte la progression (fournis / total) pour l'afficher où l'hôte veut.
function DocumentsManager({ onCounts }) {
  const { user } = useAuth();
  const docTypes = DOC_TYPES_BY_ROLE[user?.role] || [];
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getMyDocuments()
      .then((res) => setDocuments(res.data.documents || []))
      .catch(() => setDocuments([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const docsByType = documents.reduce((acc, d) => {
    (acc[d.type] = acc[d.type] || []).push(d);
    return acc;
  }, {});
  // Le compteur « fournis / total » ne concerne que les documents obligatoires
  // (les optionnels, comme le CV marin du propriétaire, n'y entrent pas).
  const requiredTypes = docTypes.filter((t) => !t.optional);
  const providedCount = requiredTypes.filter((t) => (docsByType[t.key] || []).length > 0).length;

  useEffect(() => {
    if (onCounts) onCounts({ provided: providedCount, total: requiredTypes.length });
  }, [onCounts, providedCount, requiredTypes.length]);

  if (loading) return <p className="text-slate-200">Chargement…</p>;

  return (
    <div className="space-y-5">
      {docTypes.map((config) => (
        <DocumentRow
          key={config.key}
          config={config}
          docs={docsByType[config.key] || []}
          onChanged={load}
        />
      ))}
    </div>
  );
}

export default DocumentsManager;
