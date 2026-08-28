import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { getBoatDetail } from '../../services/adminService.js';
import { formatDate } from '../../utils/formatDate.js';

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const DATE_OPTS = { day: '2-digit', month: '2-digit', year: 'numeric' };

const STATUS_CLS = {
  draft: 'bg-slate-500/15 text-white/70',
  pending: 'bg-amber-500/15 text-amber-300',
  published: 'bg-emerald-500/15 text-emerald-300',
  refused: 'bg-red-500/15 text-red-300',
};

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5AB4EC] focus-visible:ring-offset-0';

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-white/50">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm text-white">{value ?? '—'}</dd>
    </div>
  );
}

function Gallery({ images, alt, emptyLabel }) {
  const [active, setActive] = useState(0);

  useEffect(() => setActive(0), [images]);

  if (!images.length) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-white/25 text-sm text-white/50">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div>
      <img
        src={images[active].url}
        alt={alt}
        className="aspect-video w-full rounded-xl border border-white/15 object-cover"
      />
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id_image}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`${alt} ${i + 1}`}
              aria-current={i === active}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border transition ${
                i === active ? 'border-[#5AB4EC]' : 'border-white/20 hover:border-white/40'
              } ${FOCUS_RING}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminBoatReviewModal({ idBoat, onClose, onDecide, busy }) {
  const { t } = useTranslation();
  const [boat, setBoat] = useState(null);
  const [error, setError] = useState('');
  const closeRef = useRef(null);

  const fmtDate = (d) => (d ? formatDate(d, DATE_OPTS) : '—');

  useEffect(() => {
    let alive = true;
    setBoat(null);
    setError('');
    getBoatDetail(idBoat)
      .then((res) => alive && setBoat(res.data.boat))
      .catch((err) => alive && setError(err.response?.data?.message || t('adminBoatReview.error')));
    return () => {
      alive = false;
    };
  }, [idBoat, t]);

  const close = useCallback(() => !busy && onClose(), [busy, onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  const statusLabel = (status) => t(`adminBoatReview.status.${status}`, { defaultValue: status });

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-2 sm:p-4"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-boat-review-title"
        className="flex h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/15 px-5 py-4">
          <div className="min-w-0">
            <h2 id="admin-boat-review-title" className="truncate text-lg font-bold text-white">
              {boat ? boat.name : t('adminBoatReview.loading')}
            </h2>
            {boat && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                    STATUS_CLS[boat.status] || 'bg-slate-500/15 text-white/70'
                  }`}
                >
                  {statusLabel(boat.status)}
                </span>
                <span className="text-xs text-white/60">
                  {t('adminBoatReview.submittedOn', { date: fmtDate(boat.created_at) })}
                </span>
              </div>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className={`shrink-0 rounded-full border border-white/40 px-3 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
          >
            {t('adminBoatReview.close')}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {!boat && !error && (
            <p className="py-10 text-center text-sm text-white/70">
              {t('adminBoatReview.loading')}
            </p>
          )}

          {boat && (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <Gallery
                  images={boat.images}
                  alt={boat.name}
                  emptyLabel={t('adminBoatReview.noImages')}
                />

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                    {t('adminBoatReview.description')}
                  </h3>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/85">
                    {boat.description || t('adminBoatReview.noDescription')}
                  </p>
                </div>

                {boat.equipment.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      {t('adminBoatReview.equipment')}
                    </h3>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {boat.equipment.map((e) => (
                        <li
                          key={`${e.category}-${e.name}`}
                          className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80"
                        >
                          {e.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-3 rounded-xl border border-white/15 bg-white/5 p-4">
                  <Field label={t('adminBoatReview.type')} value={boat.type} />
                  <Field
                    label={t('adminBoatReview.price')}
                    value={boat.daily_price != null ? EURO.format(boat.daily_price) : null}
                  />
                  <Field
                    label={t('adminBoatReview.port')}
                    value={boat.port ? `${boat.port.name} · ${boat.port.city}` : null}
                  />
                  <Field label={t('adminBoatReview.registration')} value={boat.registration} />
                  <Field
                    label={t('adminBoatReview.size')}
                    value={boat.size != null ? `${boat.size} m` : null}
                  />
                  <Field label={t('adminBoatReview.capacity')} value={boat.capacity} />
                  <Field label={t('adminBoatReview.buildYear')} value={boat.build_year} />
                  <Field label={t('adminBoatReview.engine')} value={boat.engine} />
                  <Field
                    label={t('adminBoatReview.skipper')}
                    value={t(boat.with_skipper ? 'adminBoatReview.yes' : 'adminBoatReview.no')}
                  />
                  <Field
                    label={t('adminBoatReview.license')}
                    value={t(boat.license_required ? 'adminBoatReview.yes' : 'adminBoatReview.no')}
                  />
                </dl>

                {boat.owner && (
                  <div className="rounded-xl border border-white/15 bg-white/5 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      {t('adminBoatReview.owner')}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {boat.owner.first_name} {boat.owner.last_name}
                    </p>
                    <p className="truncate text-xs text-white/70">{boat.owner.email}</p>
                    {boat.owner.phone && (
                      <p className="text-xs text-white/70">{boat.owner.phone}</p>
                    )}
                    <p className="mt-1.5 text-xs text-white/50">
                      {t('adminBoatReview.memberSince', { date: fmtDate(boat.owner.created_at) })}
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                        boat.owner.stripe_ready
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {t(
                        boat.owner.stripe_ready
                          ? 'adminBoatReview.stripeReady'
                          : 'adminBoatReview.stripeMissing'
                      )}
                    </span>
                  </div>
                )}

                <dl className="grid grid-cols-3 gap-3 rounded-xl border border-white/15 bg-white/5 p-4">
                  <Field label={t('adminBoatReview.bookings')} value={boat.counts.bookings} />
                  <Field label={t('adminBoatReview.reviews')} value={boat.counts.reviews} />
                  <Field label={t('adminBoatReview.favorites')} value={boat.counts.favorites} />
                </dl>

                {boat.reports.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      {t('adminBoatReview.reports', { count: boat.reports.length })}
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {boat.reports.slice(0, 5).map((r) => (
                        <li key={r.id_report} className="text-xs text-white/80">
                          <span className="text-white/50">{fmtDate(r.created_at)}</span>
                          {r.reporter && <span className="text-white/50"> · {r.reporter}</span>}
                          <p className="mt-0.5 text-white/90">{r.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {boat && (
          <footer className="flex shrink-0 flex-col gap-2 border-t border-white/15 px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              disabled={busy || boat.status === 'refused'}
              onClick={() => onDecide(boat, false)}
              className={`rounded-full border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            >
              {t('adminBoatReview.refuse')}
            </button>
            <button
              type="button"
              disabled={busy || boat.is_published}
              onClick={() => onDecide(boat, true)}
              className={`rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
            >
              {t('adminBoatReview.approve')}
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

export default AdminBoatReviewModal;
