import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useToast } from '../../hooks/useToast.jsx';
import { getClosureStatus, deactivateAccount, deleteAccount } from '../../services/authService.js';
import PasswordField from '../auth/PasswordField.jsx';

const inputClass =
  'w-full rounded-lg border border-glass/30 bg-surface/10 px-4 py-2.5 text-on-dark placeholder-on-dark outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';
const labelClass = 'mb-1.5 block text-sm font-medium text-on-dark/80';
const errorClass = 'mt-1 block text-xs text-danger-bright';

function DangerZone() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const openerRef = useRef(null);

  const isOwner = user?.role === 'proprietaire';
  const deleteWord = t('accountForm.dangerZone.delete.word');

  useEffect(() => {
    let cancelled = false;
    getClosureStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mode) return undefined;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') closeDialog();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [mode]);

  function openDialog(nextMode, event) {
    openerRef.current = event.currentTarget;
    setPassword('');
    setConfirmation('');
    setError('');
    setMode(nextMode);
  }

  function closeDialog() {
    setMode(null);
    openerRef.current?.focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!password) {
      setError(t('accountForm.dangerZone.errors.passwordRequired'));
      return;
    }
    if (mode === 'delete' && confirmation.trim().toUpperCase() !== deleteWord) {
      setError(t('accountForm.dangerZone.errors.confirmationInvalid', { word: deleteWord }));
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'delete') {
        await deleteAccount({ password, confirmation: deleteWord });
        showToast(t('accountForm.dangerZone.delete.success'), 'success');
      } else {
        await deactivateAccount({ password });
        showToast(
          t('accountForm.dangerZone.deactivate.success', { days: status.pauseDays }),
          'success'
        );
      }
      setMode(null);
      await logout({ silent: true });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('accountForm.genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !status) return null;

  const { activeBookings, openDisputes } = status.blockers;
  const blocked = !status.canClose;

  return (
    <>
      <article className="mt-6 rounded-2xl border border-danger-base/30 bg-danger-base/5 backdrop-blur-xl p-8 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-on-dark">
          {t('accountForm.dangerZone.title')}
        </h2>
        <p className="mb-5 text-sm text-on-dark/70">{t('accountForm.dangerZone.subtitle')}</p>

        {blocked && (
          <div
            role="alert"
            className="status-indicator status-indicator--warning mb-5 rounded-lg border border-warning-bright/40 bg-warning-bright/10 px-4 py-3 text-sm text-warning-pale"
          >
            <p className="font-semibold">{t('accountForm.dangerZone.blocked.title')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {activeBookings > 0 && (
                <li>
                  {t(
                    isOwner
                      ? 'accountForm.dangerZone.blocked.ownerBookings'
                      : 'accountForm.dangerZone.blocked.guestBookings',
                    { count: activeBookings }
                  )}
                </li>
              )}
              {openDisputes > 0 && (
                <li>{t('accountForm.dangerZone.blocked.disputes', { count: openDisputes })}</li>
              )}
            </ul>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <section className="flex flex-col rounded-xl border border-glass/15 bg-surface/5 p-5">
            <h3 className="mb-2 text-base font-semibold text-on-dark">
              {t('accountForm.dangerZone.deactivate.title')}
            </h3>
            <p className="mb-4 text-sm text-on-dark/70">
              {t(
                isOwner
                  ? 'accountForm.dangerZone.deactivate.ownerDescription'
                  : 'accountForm.dangerZone.deactivate.guestDescription',
                { days: status.pauseDays }
              )}
            </p>
            <button
              type="button"
              onClick={(event) => openDialog('deactivate', event)}
              disabled={blocked}
              className="mt-auto w-full rounded-full border border-warning-soft/50 px-5 py-2.5 text-sm font-semibold text-warning-pale transition hover:bg-warning-soft/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('accountForm.dangerZone.deactivate.action')}
            </button>
          </section>

          <section className="flex flex-col rounded-xl border border-glass/15 bg-surface/5 p-5">
            <h3 className="mb-2 text-base font-semibold text-on-dark">
              {t('accountForm.dangerZone.delete.title')}
            </h3>
            <p className="mb-4 text-sm text-on-dark/70">
              {t('accountForm.dangerZone.delete.description', { days: status.retentionDays })}
            </p>
            <button
              type="button"
              onClick={(event) => openDialog('delete', event)}
              disabled={blocked}
              className="mt-auto w-full rounded-full border border-transparent bg-danger px-5 py-2.5 text-sm font-semibold text-on-dark shadow-lg transition hover:bg-danger-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-bright disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('accountForm.dangerZone.delete.action')}
            </button>
          </section>
        </div>
      </article>

      {mode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="danger-zone-dialog-title"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-overlay/60 px-3 py-6 backdrop-blur-sm sm:px-4 sm:py-12"
          onClick={closeDialog}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-glass/20 bg-dark-surface/90 p-6 shadow-2xl backdrop-blur-2xl outline-none sm:p-8"
          >
            <h2 id="danger-zone-dialog-title" className="text-lg font-semibold text-on-dark">
              {t(
                mode === 'delete'
                  ? 'accountForm.dangerZone.delete.dialogTitle'
                  : 'accountForm.dangerZone.deactivate.dialogTitle'
              )}
            </h2>

            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-on-dark/75">
              {(mode === 'delete'
                ? [
                    t('accountForm.dangerZone.delete.consequences.access'),
                    t('accountForm.dangerZone.delete.consequences.data', {
                      days: status.retentionDays,
                    }),
                    t('accountForm.dangerZone.delete.consequences.invoices'),
                  ]
                : [
                    t('accountForm.dangerZone.deactivate.consequences.profile'),
                    t('accountForm.dangerZone.deactivate.consequences.sessions'),
                    t('accountForm.dangerZone.deactivate.consequences.reactivation', {
                      days: status.pauseDays,
                    }),
                  ]
              ).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            {error && (
              <div
                role="alert"
                className="status-indicator status-indicator--danger mt-4 rounded-lg border border-danger-base/40 bg-danger-base/10 px-4 py-2 text-sm text-danger-soft"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
              <div>
                <label htmlFor="closure-password" className={labelClass}>
                  {t('accountForm.dangerZone.passwordLabel')}
                </label>
                <PasswordField
                  variant="glass"
                  id="closure-password"
                  name="closure-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  ariaInvalid={Boolean(error)}
                />
              </div>

              {mode === 'delete' && (
                <div>
                  <label htmlFor="closure-confirmation" className={labelClass}>
                    {t('accountForm.dangerZone.delete.confirmationLabel', { word: deleteWord })}
                  </label>
                  <input
                    id="closure-confirmation"
                    name="closure-confirmation"
                    type="text"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    autoComplete="off"
                    placeholder={deleteWord}
                    className={inputClass}
                  />
                  {confirmation && confirmation.trim().toUpperCase() !== deleteWord && (
                    <span className={errorClass}>
                      {t('accountForm.dangerZone.errors.confirmationInvalid', { word: deleteWord })}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={submitting}
                  className="rounded-full border border-glass/40 px-5 py-2.5 text-sm font-semibold text-on-dark/80 transition hover:bg-surface/10 hover:text-on-dark disabled:opacity-50"
                >
                  {t('accountForm.dangerZone.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 rounded-full px-5 py-2.5 text-sm font-semibold text-on-dark shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    mode === 'delete'
                      ? 'bg-danger hover:bg-danger-base'
                      : 'bg-warning-base hover:bg-warning-bright'
                  }`}
                >
                  {submitting
                    ? t('accountForm.dangerZone.submitting')
                    : t(
                        mode === 'delete'
                          ? 'accountForm.dangerZone.delete.confirm'
                          : 'accountForm.dangerZone.deactivate.confirm'
                      )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default DangerZone;
