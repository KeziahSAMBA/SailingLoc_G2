import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import Spinner from '../common/Spinner.jsx';
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
    pending: {
      label: t('documentsManager.status.pending'),
      cls: 'status-indicator status-indicator--warning bg-warning-base/15 text-warning-soft',
    },
    validated: {
      label: t('documentsManager.status.validated'),
      cls: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
    },
    refused: {
      label: t('documentsManager.status.refused'),
      cls: 'status-indicator status-indicator--danger bg-danger-base/15 text-danger-soft',
    },
  };
}

function DocumentRow({
  config,
  docs,
  onChanged,
  stackFilePickerOnMobile,
  keepDocumentActionsTogether,
  hideRepeatedValidatedStatus,
  statusBadgeTopRight,
}) {
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
          cls: 'status-indicator status-indicator--neutral bg-page/15 text-on-dark/80',
        }
      : null
    : hasDocs
      ? status[docs[0].status]
      : null;

  return (
    <article className="rounded-2xl border border-glass/20 bg-surface/10 backdrop-blur-xl p-6">
      <div
        className={
          statusBadgeTopRight
            ? 'flex flex-col items-stretch gap-3'
            : 'flex flex-wrap items-start justify-between gap-3'
        }
      >
        {statusBadgeTopRight && (
          <span
            className={`self-end shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              headerBadge
                ? headerBadge.cls
                : 'status-indicator status-indicator--neutral bg-surface/10 text-on-dark/70'
            }`}
          >
            {headerBadge ? headerBadge.label : t('documentsManager.notProvided')}
          </span>
        )}
        <div>
          <h2 className="text-base font-semibold text-on-dark">{config.label}</h2>
          <p className="mt-1 text-sm text-on-dark/70">{config.desc}</p>
        </div>
        {!statusBadgeTopRight && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              headerBadge
                ? headerBadge.cls
                : 'status-indicator status-indicator--neutral bg-surface/10 text-on-dark/70'
            }`}
          >
            {headerBadge ? headerBadge.label : t('documentsManager.notProvided')}
          </span>
        )}
      </div>

      {docs.map((doc) => {
        const st = status[doc.status];
        const actions = (
          <>
            <button
              type="button"
              onClick={() => handleView(doc)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              {t('documentsManager.view')}
            </button>
            <button
              type="button"
              onClick={() => handleDelete(doc)}
              disabled={busy}
              className={`${keepDocumentActionsTogether ? '' : 'ml-auto '}text-xs font-semibold text-danger-soft hover:underline disabled:opacity-50`}
            >
              {t('documentsManager.delete')}
            </button>
          </>
        );

        return (
          <div
            key={doc.id_document}
            className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-surface/10 px-4 py-3"
          >
            <span className="truncate text-sm font-medium text-on-dark/90">{doc.file_name}</span>
            {st && !(hideRepeatedValidatedStatus && doc.status === 'validated') && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                {st.label}
              </span>
            )}
            {keepDocumentActionsTogether ? (
              <div className="ml-auto flex shrink-0 items-center gap-3">{actions}</div>
            ) : (
              actions
            )}
          </div>
        );
      })}

      <div
        className={
          stackFilePickerOnMobile
            ? 'mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center'
            : 'mt-4 flex flex-wrap items-center gap-3'
        }
      >
        <label
          className={
            stackFilePickerOnMobile
              ? 'flex w-full min-w-0 flex-col items-start gap-2 text-sm text-on-dark/70 sm:max-w-xs sm:flex-1 sm:flex-row sm:items-center sm:gap-3'
              : 'flex min-w-0 max-w-xs flex-1 items-center gap-3 text-sm text-on-dark/70'
          }
        >
          <span
            className={`shrink-0 cursor-pointer rounded-full border-0 bg-brand/15 px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand/25 ${
              stackFilePickerOnMobile ? 'self-start whitespace-nowrap text-center sm:self-auto' : ''
            }`}
          >
            {t('documentsManager.chooseFile')}
          </span>
          <span
            className={
              stackFilePickerOnMobile ? 'min-w-0 break-words sm:truncate' : 'min-w-0 truncate'
            }
          >
            {file ? file.name : t('documentsManager.noFile')}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError('');
            }}
            className="sr-only"
          />
        </label>
        <button
          type="button"
          onClick={handleUpload}
          disabled={busy || !file}
          className={`rounded-full bg-action px-5 py-2.5 text-sm font-semibold text-on-dark shadow transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60 ${
            stackFilePickerOnMobile ? 'w-fit self-start whitespace-nowrap sm:self-auto' : ''
          }`}
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

      <p className="mt-2 text-xs text-on-dark/70">{t('documentsManager.acceptedFormats')}</p>

      {error && <p className="mt-2 text-xs text-danger-soft">{error}</p>}
    </article>
  );
}

// Gestion des documents obligatoires (liste + dépôt/suppression).
// Contenu seul : l'enveloppe (fond, en-tête de page) est fournie par la page hôte.
// `onCounts` remonte la progression (fournis / total) pour l'afficher où l'hôte veut.
function DocumentsManager({
  onCounts,
  stackFilePickerOnMobile = false,
  keepDocumentActionsTogether = false,
  hideRepeatedValidatedStatus = false,
  statusBadgeTopRight = false,
}) {
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
  // Le compteur « fournis / total » ne concerne que les documents obligatoires
  // (les optionnels, comme le CV marin du propriétaire, n'y entrent pas).
  const requiredTypes = docTypes.filter((dt) => !dt.optional);
  const providedCount = requiredTypes.filter((dt) => (docsByType[dt.key] || []).length > 0).length;

  useEffect(() => {
    if (onCounts) onCounts({ provided: providedCount, total: requiredTypes.length });
  }, [onCounts, providedCount, requiredTypes.length]);

  if (loading) return <Spinner label={t('documentsManager.loading')} />;

  return (
    <div className="space-y-5">
      {docTypes.map((config) => (
        <DocumentRow
          key={config.key}
          config={config}
          docs={docsByType[config.key] || []}
          onChanged={load}
          stackFilePickerOnMobile={stackFilePickerOnMobile}
          keepDocumentActionsTogether={keepDocumentActionsTogether}
          hideRepeatedValidatedStatus={hideRepeatedValidatedStatus}
          statusBadgeTopRight={statusBadgeTopRight}
        />
      ))}
    </div>
  );
}

export default DocumentsManager;
