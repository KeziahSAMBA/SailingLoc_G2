import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import {
  getMyDocuments,
  uploadDocument,
  deleteDocument,
  fetchDocumentFile,
} from '../../services/documentService.js';

// Documents obligatoires selon le rôle (doit correspondre au backend).
function getDocTypesByRole(t) {
  return {
    locataire: [
      {
        key: 'permis_conduire',
        label: t('documentsManager.docTypes.locataire.permis_conduire.label'),
        desc: t('documentsManager.docTypes.locataire.permis_conduire.desc'),
      },
      {
        key: 'piece_identite',
        label: t('documentsManager.docTypes.locataire.piece_identite.label'),
        desc: t('documentsManager.docTypes.locataire.piece_identite.desc'),
      },
      {
        key: 'cv_nautique',
        label: t('documentsManager.docTypes.locataire.cv_nautique.label'),
        desc: t('documentsManager.docTypes.locataire.cv_nautique.desc'),
      },
    ],
    proprietaire: [
      {
        key: 'permis',
        label: t('documentsManager.docTypes.proprietaire.permis.label'),
        desc: t('documentsManager.docTypes.proprietaire.permis.desc'),
      },
      {
        key: 'assurance',
        label: t('documentsManager.docTypes.proprietaire.assurance.label'),
        desc: t('documentsManager.docTypes.proprietaire.assurance.desc'),
      },
      {
        key: 'cv_marin',
        label: t('documentsManager.docTypes.proprietaire.cv_marin.label'),
        desc: t('documentsManager.docTypes.proprietaire.cv_marin.desc'),
      },
      {
        key: 'acte_francisation',
        label: t('documentsManager.docTypes.proprietaire.acte_francisation.label'),
        desc: t('documentsManager.docTypes.proprietaire.acte_francisation.desc'),
        multiple: true,
      },
    ],
  };
}

function getStatus(t) {
  return {
    pending: { label: t('documentsManager.status.pending'), cls: 'bg-amber-100 text-amber-800' },
    validated: {
      label: t('documentsManager.status.validated'),
      cls: 'bg-emerald-100 text-emerald-800',
    },
    refused: { label: t('documentsManager.status.refused'), cls: 'bg-red-100 text-red-700' },
  };
}

function DocumentRow({ config, docs, onChanged }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleUpload() {
    if (!file) {
      setError(t('documentsManager.selectFile'));
      return;
    }
    setError('');
    setBusy(true);
    try {
      await uploadDocument(config.key, file);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
      showToast(t('documentsManager.uploadSuccess', { label: config.label }), 'success');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || t('documentsManager.uploadError'));
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
      setError(t('documentsManager.viewError'));
    }
  }

  async function handleDelete(doc) {
    setBusy(true);
    setError('');
    try {
      await deleteDocument(doc.id_document);
      showToast(t('documentsManager.deleteSuccess', { label: config.label }), 'success');
      onChanged();
    } catch (err) {
      setError(err.response?.data?.message || t('documentsManager.deleteError'));
    } finally {
      setBusy(false);
    }
  }

  const status = getStatus(t);
  const hasDocs = docs.length > 0;
  const headerBadge = config.multiple
    ? hasDocs
      ? {
          label: t('documentsManager.filesCount', { count: docs.length }),
          cls: 'bg-slate-100 text-slate-600',
        }
      : null
    : hasDocs
      ? status[docs[0].status]
      : null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{config.label}</h2>
          <p className="mt-1 text-sm text-slate-500">{config.desc}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            headerBadge ? headerBadge.cls : 'bg-slate-100 text-slate-500'
          }`}
        >
          {headerBadge ? headerBadge.label : t('documentsManager.notProvided')}
        </span>
      </div>

      {docs.map((doc) => {
        const st = status[doc.status];
        return (
          <div
            key={doc.id_document}
            className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-4 py-3"
          >
            <span className="truncate text-sm font-medium text-slate-700">{doc.file_name}</span>
            {st && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                {st.label}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleView(doc)}
              className="text-xs font-semibold text-[#0A3172] hover:underline"
            >
              {t('documentsManager.view')}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(doc)}
              disabled={busy}
              className="ml-auto text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
            >
              {t('documentsManager.delete')}
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
          className="block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#0A3172]/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#0A3172] hover:file:bg-[#0A3172]/20"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy || !file}
          className="rounded-full bg-[#0A3172] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#0A3172]/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy
            ? t('documentsManager.sending')
            : config.multiple
              ? t('documentsManager.add')
              : hasDocs
                ? t('documentsManager.replace')
                : t('documentsManager.send')}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400">{t('documentsManager.acceptedFormats')}</p>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </article>
  );
}

// Gestion des documents obligatoires (liste + dépôt/suppression).
// Contenu seul : l'enveloppe (fond, en-tête de page) est fournie par la page hôte.
// `onCounts` remonte la progression (fournis / total) pour l'afficher où l'hôte veut.
function DocumentsManager({ onCounts }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const docTypes = getDocTypesByRole(t)[user?.role] || [];
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
  const providedCount = docTypes.filter((dt) => (docsByType[dt.key] || []).length > 0).length;

  useEffect(() => {
    if (onCounts) onCounts({ provided: providedCount, total: docTypes.length });
  }, [onCounts, providedCount, docTypes.length]);

  if (loading) return <p className="text-slate-200">{t('documentsManager.loading')}</p>;

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
