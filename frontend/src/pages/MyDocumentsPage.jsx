import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../hooks/useToast.jsx';
import {
  getMyDocuments,
  uploadDocument,
  deleteDocument,
  fetchDocumentFile,
} from '../services/documentService.js';
import bateauBg from '../assets/image/image_bateau/bateau_searchbar.jpg';

const DOC_TYPES = [
  {
    key: 'permis_conduire',
    label: 'Permis bateau',
    desc: 'Permis bateau côtier ou fluvial.',
  },
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
];

const STATUS = {
  pending: { label: 'En attente de validation', cls: 'bg-amber-100 text-amber-800' },
  validated: { label: 'Validé', cls: 'bg-emerald-100 text-emerald-800' },
  refused: { label: 'Refusé', cls: 'bg-red-100 text-red-700' },
};

function DocumentRow({ config, doc, onChanged }) {
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

  async function handleView() {
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

  async function handleDelete() {
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

  const status = doc ? STATUS[doc.status] : null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{config.label}</h2>
          <p className="mt-1 text-sm text-slate-500">{config.desc}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            status ? status.cls : 'bg-slate-100 text-slate-500'
          }`}
        >
          {status ? status.label : 'Non fourni'}
        </span>
      </div>

      {doc && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
          <span className="truncate text-sm font-medium text-slate-700">{doc.file_name}</span>
          <button
            type="button"
            onClick={handleView}
            className="text-xs font-semibold text-[#0A3172] hover:underline"
          >
            Voir
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="ml-auto text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
          >
            Supprimer
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setError('');
          }}
          className="block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#0A3172]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#0A3172] hover:file:bg-[#0A3172]/20"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy || !file}
          className="rounded-full bg-[#0A3172] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#0A3172]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Envoi…' : doc ? 'Remplacer' : 'Envoyer'}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Formats acceptés : PDF, JPG, PNG — 5 Mo maximum.
      </p>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </article>
  );
}

function MyDocumentsPage() {
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

  const byType = Object.fromEntries(documents.map((d) => [d.type, d]));
  const providedCount = DOC_TYPES.filter((t) => byType[t.key]).length;

  return (
    <main
      className="w-full min-h-screen"
      style={{
        backgroundImage: `url(${bateauBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="min-h-screen w-full bg-black/40 px-4 pt-[120px] pb-16">
        <section className="mx-auto w-full max-w-2xl">
          <header className="mb-8">
            <p className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Locataire
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">Mes documents</h1>
            <p className="mt-2 text-slate-200">
              Déposez vos documents obligatoires (PDF, JPG ou PNG, 5 Mo max). Ils seront vérifiés
              par notre équipe.
            </p>
            <p className="mt-2 text-sm font-semibold text-white">
              {providedCount} / {DOC_TYPES.length} documents fournis
            </p>
          </header>

          {loading ? (
            <p className="text-slate-200">Chargement…</p>
          ) : (
            <div className="space-y-5">
              {DOC_TYPES.map((config) => (
                <DocumentRow
                  key={config.key}
                  config={config}
                  doc={byType[config.key] || null}
                  onChanged={load}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default MyDocumentsPage;
