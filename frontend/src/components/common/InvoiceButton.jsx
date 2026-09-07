import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { FaFileInvoice } from 'react-icons/fa';
import { useToast } from '../../hooks/useToast.jsx';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-0';

function fileNameFrom(headers, fallback) {
  const disposition = headers?.['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  return match ? match[1] : fallback;
}

const supportsEmbeddedPdf = () =>
  typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches;

function InvoiceButton({ fetchInvoice, label, title, className = '' }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const closeRef = useRef(null);

  const revoke = useCallback((url) => url && URL.revokeObjectURL(url), []);

  useEffect(() => () => revoke(preview?.url), [preview, revoke]);

  const closePreview = useCallback(() => {
    setPreview((current) => {
      revoke(current?.url);
      return null;
    });
  }, [revoke]);

  useEffect(() => {
    if (!preview) return undefined;
    const onKey = (e) => e.key === 'Escape' && closePreview();
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [preview, closePreview]);

  function save(url, name) {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  async function readErrorMessage(err) {
    try {
      const parsed = JSON.parse(await err.response?.data?.text());
      if (parsed?.message) return parsed.message;
    } catch {
      /* réponse illisible */
    }
    return t('invoice.error');
  }

  async function openInvoice() {
    setBusy(true);
    try {
      const res = await fetchInvoice();
      const name = fileNameFrom(res.headers, t('invoice.fallbackFileName'));
      const url = URL.createObjectURL(res.data);

      if (supportsEmbeddedPdf()) {
        setPreview({ url, name });
      } else {
        save(url, name);
        revoke(url);
      }
    } catch (err) {
      showToast(await readErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={openInvoice}
        title={title}
        className={`inline-flex items-center gap-1 rounded-full border border-glass/40 px-3 py-1 text-xs font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING} ${className}`}
      >
        <FaFileInvoice aria-hidden className="text-[0.6875rem]" />
        {busy ? t('invoice.loading') : label}
      </button>

      {preview &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay/70 p-2 sm:p-4"
            onClick={closePreview}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-glass/20 bg-slate-900/90 shadow-2xl backdrop-blur-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex items-center justify-between gap-3 border-b border-glass/15 px-5 py-3">
                <h2 className="truncate text-sm font-semibold text-on-dark">{preview.name}</h2>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => save(preview.url, preview.name)}
                    className={`rounded-full bg-brand px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-[#ABD4FF] ${FOCUS_RING}`}
                  >
                    {t('invoice.download')}
                  </button>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={closePreview}
                    className={`rounded-full border border-glass/40 px-3 py-1 text-xs font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark ${FOCUS_RING}`}
                  >
                    {t('invoice.close')}
                  </button>
                </div>
              </header>
              <iframe src={preview.url} title={title} className="h-full w-full flex-1 bg-surface" />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default InvoiceButton;
