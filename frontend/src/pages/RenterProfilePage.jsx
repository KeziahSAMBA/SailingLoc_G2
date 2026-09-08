import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MdVerified,
  MdLocationOn,
  MdDirectionsBoat,
  MdChatBubbleOutline,
  MdMailOutline,
  MdPhone,
} from 'react-icons/md';
import { FaStar, FaRegStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import dashboardBg from '../assets/image/paysage/dashboard_bg.jpg';
import Breadcrumb from '../components/common/FilAriane.jsx';
import SafeImage from '../components/common/SafeImage.jsx';
import StarRatingInput from '../components/common/StarRatingInput.jsx';
import { useToast } from '../hooks/useToast.jsx';
import {
  getRenterProfile,
  saveRenterReview,
  deleteRenterReview,
} from '../services/proprietaireService.js';
import { fetchDocumentFile } from '../services/documentService.js';
import { nameToAvatarUrl } from '../utils/avatar.js';
import { formatDate } from '../utils/formatDate.js';
import { usePageSlideTransition, usePageExitNavigate } from '../hooks/usePageTransition.js';
import {
  PAGE_SLIDE_CSS,
  NAV_ENTER_TOTAL,
  PHOTO_OVERLAY_DASHBOARD,
  PHOTO_OVERLAY_STATIC_PAGE,
} from '../hooks/useCategoryTransition.js';

// Même fond que les tableaux de bord : le raccord est invisible depuis
// « Mes réservations » (cf. OwnerProfilePage).
const PHOTO_BG_STYLE = {
  backgroundImage: `${PHOTO_OVERLAY_DASHBOARD}, url(${dashboardBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const RENTER_RESPONSIVE_CSS = `
  .renter-photo-background { background-attachment: scroll; }
  @media (min-width: 80rem) {
    .renter-photo-background { background-attachment: fixed; }
  }
`;

const GLASS =
  'rounded-2xl border border-glass/20 bg-glass-fill/5 sailingloc-glass-shadow backdrop-blur-[5px]';

const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-photo-action focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

const BADGE_KEYS = ['license', 'identity', 'nautical_cv'];
const DATE_OPTS = { day: 'numeric', month: 'long', year: 'numeric' };
const BOOKINGS_PER_PAGE = 6;
const REVIEWS_PER_PAGE = 4;
const RENTER_ENTER_TOTAL = NAV_ENTER_TOTAL;
const MIN_COMMENT = 10;

const EURO = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const REVIEW_STATUS_CLS = {
  pending: 'status-indicator status-indicator--warning bg-warning-base/15 text-warning-soft',
  validated: 'status-indicator status-indicator--success bg-success-base/15 text-success-soft',
  refused: 'status-indicator status-indicator--danger bg-danger-base/15 text-danger-soft',
};

const NEUTRAL_STATUS_CLS =
  'status-indicator status-indicator--neutral bg-neutral/15 text-photo-text/70';

const TITLE_SHADOW = 'drop-shadow-[0_2px_6px_rgb(var(--sl-glass-shadow)/0.4)]';

function overlayFor(bg) {
  if (bg === dashboardBg) return PHOTO_OVERLAY_DASHBOARD;
  return PHOTO_OVERLAY_STATIC_PAGE;
}

function paginate(items, perPage, page) {
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(page, 0), pageCount - 1);
  return {
    pageCount,
    current,
    slice: items.slice(current * perPage, current * perPage + perPage),
  };
}

function Stars({ rating }) {
  const rounded = Math.round(rating || 0);
  return (
    <span className="inline-flex gap-0.5 align-middle" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) =>
        i < rounded ? (
          <FaStar key={i} className="text-photo-action" style={{ fontSize: '13px' }} />
        ) : (
          <FaRegStar key={i} className="text-photo-action" style={{ fontSize: '13px' }} />
        )
      )}
    </span>
  );
}

function Pager({ page, pageCount, onPrev, onNext }) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;
  const btn = `flex h-9 w-9 items-center justify-center rounded-full border border-glass/30 bg-glass-fill/10 text-photo-text backdrop-blur-sm transition-colors hover:bg-glass-fill/20 disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS}`;
  return (
    <div className="flex items-center justify-center gap-4 pt-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 0}
        aria-label={t('renterProfile.pager.prev')}
        className={btn}
      >
        <FaChevronLeft size={13} aria-hidden="true" />
      </button>
      <span className="text-sm font-medium text-photo-text/80">
        {t('renterProfile.pager.position', { page: page + 1, total: pageCount })}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= pageCount - 1}
        aria-label={t('renterProfile.pager.next')}
        className={btn}
      >
        <FaChevronRight size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

// Carte d'une location : bateau, dates, montant, statut — sans avis
// (l'évaluation du locataire vit dans la section « Avis reçus »).
function BookingCard({ booking, onNavigate }) {
  const { t } = useTranslation();
  const productHref = booking.boat?.id_boat ? `/product/${booking.boat.id_boat}` : null;
  return (
    <li className={`${GLASS} flex gap-3 p-3 sm:p-4`}>
      <SafeImage
        src={booking.boat?.image}
        alt={t('carrousel.boatImageAlt', { name: booking.boat?.name })}
        loading="lazy"
        decoding="async"
        className="h-16 w-20 shrink-0 rounded-xl object-cover sm:h-20 sm:w-28"
        fallbackClassName="flex h-16 w-20 shrink-0 items-center justify-center rounded-xl bg-photo-surface/20 text-2xl sm:h-20 sm:w-28"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          {productHref ? (
            <Link
              to={productHref}
              onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                onNavigate(productHref);
              }}
              className={`truncate text-sm font-bold text-photo-text hover:text-photo-action ${FOCUS}`}
            >
              {booking.boat?.name}
            </Link>
          ) : (
            <span className="truncate text-sm font-bold text-photo-text">{booking.boat?.name}</span>
          )}
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
              REVIEW_STATUS_CLS[booking.status] || NEUTRAL_STATUS_CLS
            }`}
          >
            {t(`bookingStatus.${booking.status}`, { defaultValue: booking.status })}
          </span>
        </div>
        {booking.boat?.city && (
          <span className="flex items-center gap-1 text-xs text-photo-text/70">
            <MdLocationOn style={{ fontSize: '13px' }} aria-hidden="true" />
            {booking.boat.city}
          </span>
        )}
        <p className="text-xs text-photo-text/80">
          <time dateTime={booking.start_date}>{formatDate(booking.start_date, DATE_OPTS)}</time>
          {' → '}
          <time dateTime={booking.end_date}>{formatDate(booking.end_date, DATE_OPTS)}</time>
          {booking.total_amount != null && (
            <>
              <span className="text-photo-text/40"> • </span>
              <span className="font-semibold text-photo-text">
                {EURO.format(booking.total_amount)}
              </span>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

// Une ligne d'évaluation du locataire par le propriétaire, pour une location
// terminée : affiche l'avis déjà déposé (avec édition/suppression) ou invite à
// en laisser un. Placée dans la section « Avis reçus ».
function OwnerReviewRow({ booking, onReload }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const review = booking.my_review;
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [comment, setComment] = useState(review?.comment ?? '');
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setRating(review?.rating ?? 0);
    setComment(review?.comment ?? '');
    setEditing(true);
  }

  async function submit(e) {
    e.preventDefault();
    if (rating < 1 || comment.trim().length < MIN_COMMENT) {
      showToast(t('renterProfile.reviewForm.commentTooShort'), 'error');
      return;
    }
    setBusy(true);
    try {
      await saveRenterReview(booking.id_booking, rating, comment.trim());
      showToast(t('renterProfile.reviewForm.saved'), 'success');
      setEditing(false);
      await onReload();
    } catch (err) {
      showToast(err.response?.data?.message || t('renterProfile.reviewForm.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(t('renterProfile.reviewForm.removeConfirm'))) return;
    setBusy(true);
    try {
      await deleteRenterReview(booking.id_booking);
      showToast(t('renterProfile.reviewForm.removed'), 'success');
      await onReload();
    } catch (err) {
      showToast(err.response?.data?.message || t('renterProfile.reviewForm.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <p className="text-xs text-photo-text/70">
        {t('renterProfile.reviewForm.forBoat', { boat: booking.boat?.name })}
        <span className="text-photo-text/40"> · </span>
        {formatDate(booking.start_date, DATE_OPTS)}
      </p>

      {editing ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <span className="text-xs font-medium text-photo-text/80">
            {t('renterProfile.reviewForm.ratingLabel')}
          </span>
          <StarRatingInput value={rating} onChange={setRating} />
          <label
            htmlFor={`rr-${booking.id_booking}`}
            className="mt-1 text-xs font-medium text-photo-text/80"
          >
            {t('renterProfile.reviewForm.commentLabel')}
          </label>
          <textarea
            id={`rr-${booking.id_booking}`}
            rows={3}
            value={comment}
            maxLength={1000}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('renterProfile.reviewForm.commentPlaceholder')}
            className="w-full rounded-lg border border-glass/30 bg-glass-fill/10 px-3 py-2 text-sm text-photo-text outline-none focus:border-photo-action"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className={`rounded-full border border-glass/40 px-3 py-1 text-xs font-semibold text-photo-text/80 transition hover:bg-glass-fill/10 disabled:opacity-50 ${FOCUS}`}
            >
              {t('renterProfile.reviewForm.cancel')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className={`rounded-full bg-action px-4 py-1 text-xs font-semibold text-action-text transition hover:bg-action-hover disabled:opacity-50 ${FOCUS}`}
            >
              {busy ? t('renterProfile.reviewForm.saving') : t('renterProfile.reviewForm.save')}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-photo-action">
              {t('renterProfile.reviewForm.yourReview')}
            </span>
            <Stars rating={review.rating} />
            <span
              className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                REVIEW_STATUS_CLS[review.status] || NEUTRAL_STATUS_CLS
              }`}
            >
              {t(`renterProfile.reviewForm.status.${review.status}`, {
                defaultValue: review.status,
              })}
            </span>
          </div>
          {review.comment && (
            <p className="break-words text-sm leading-relaxed text-photo-text/80">
              {review.comment}
            </p>
          )}
          <div className="flex gap-3 pt-0.5">
            <button
              type="button"
              onClick={startEdit}
              disabled={busy}
              className={`rounded text-xs font-semibold text-photo-text/80 hover:text-photo-text hover:underline disabled:opacity-50 ${FOCUS}`}
            >
              {t('renterProfile.reviewForm.edit')}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className={`rounded text-xs font-semibold text-danger hover:underline disabled:opacity-50 ${FOCUS}`}
            >
              {t('renterProfile.reviewForm.remove')}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function ReviewItem({ review }) {
  const { t } = useTranslation();
  return (
    <li className={`${GLASS} flex flex-col gap-2 p-4`}>
      <div className="flex items-center gap-2">
        <SafeImage
          src={review.avatar}
          fallbackSrc={nameToAvatarUrl(review.name)}
          fallback={null}
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          className="h-9 w-9 shrink-0 rounded-full object-cover"
          alt={t('accessibility.profileImageAlt', { name: review.name })}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-photo-text">{review.name}</p>
          {review.boat_name && (
            <p className="truncate text-xs text-photo-action">{review.boat_name}</p>
          )}
        </div>
        <span className="ml-auto shrink-0 text-xs text-photo-text/70">
          {formatDate(review.created_at, DATE_OPTS)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Stars rating={review.rating} />
        <span className="sr-only">{review.rating}/5</span>
      </div>
      {review.text && (
        <p className="break-words text-sm leading-relaxed text-photo-text/80">{review.text}</p>
      )}
    </li>
  );
}

function RenterProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { showToast } = useToast();
  const [state, setState] = useState({ status: 'loading', data: null });
  const [bookingPage, setBookingPage] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  const [viewingDocId, setViewingDocId] = useState(null);
  const { slide, exitBgSrc } = usePageSlideTransition(RENTER_ENTER_TOTAL, {
    ownBg: dashboardBg,
    dashboardBg,
  });
  const pageExitNavigate = usePageExitNavigate();

  const load = useCallback(() => {
    return getRenterProfile(id)
      .then(({ data }) => setState({ status: 'ready', data }))
      .catch((err) => {
        setState({ status: err.response?.status === 404 ? 'notFound' : 'error', data: null });
      });
  }, [id]);

  useEffect(() => {
    setState({ status: 'loading', data: null });
    setBookingPage(0);
    setReviewPage(0);
    let cancelled = false;
    getRenterProfile(id)
      .then(({ data }) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: err.response?.status === 404 ? 'notFound' : 'error', data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const renter = state.data?.renter;
  const fullName = renter ? `${renter.first_name} ${renter.last_name}`.trim() : '';

  useEffect(() => {
    document.title = fullName
      ? t('renterProfile.pageTitleNamed', { name: fullName })
      : t('renterProfile.pageTitle');
  }, [fullName, t]);

  const activeBadges = state.data ? BADGE_KEYS.filter((key) => state.data.badges[key]) : [];
  const bookings = paginate(state.data?.bookings ?? [], BOOKINGS_PER_PAGE, bookingPage);
  const reviews = paginate(state.data?.reviews ?? [], REVIEWS_PER_PAGE, reviewPage);
  // Locations pour lesquelles le propriétaire a déjà déposé un avis (modifiable
  // ici). Le dépôt d'un nouvel avis se fait depuis « Mes réservations ».
  const reviewedBookings = (state.data?.bookings ?? []).filter((b) => b.my_review);

  const breadcrumbItems = useMemo(
    () => [
      { label: t('renterProfile.breadcrumb.reservations'), to: '/proprietaire/reservations' },
      { label: fullName || t('renterProfile.pageTitle'), to: `/locataires/${id}` },
    ],
    [t, fullName, id]
  );

  function messageRenter() {
    pageExitNavigate('/proprietaire/messages', {
      state: {
        openUser: {
          id_user: renter.id_user,
          first_name: renter.first_name,
          last_name: renter.last_name,
          role: 'locataire',
        },
      },
    });
  }

  async function viewDocument(doc) {
    if (doc.status !== 'validated') return;
    setViewingDocId(doc.id_document);
    try {
      const res = await fetchDocumentFile(doc.id_document);
      window.open(URL.createObjectURL(res.data), '_blank', 'noopener');
    } catch {
      showToast(t('renterProfile.documents.fileError'), 'error');
    } finally {
      setViewingDocId(null);
    }
  }

  return (
    <main
      className="renter-photo-background relative w-full min-h-[100svh] overflow-x-clip bg-photo-surface text-photo-text"
      style={PHOTO_BG_STYLE}
    >
      <style>{`${PAGE_SLIDE_CSS}\n${RENTER_RESPONSIVE_CSS}`}</style>
      {exitBgSrc && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `${overlayFor(exitBgSrc)}, url(${exitBgSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            animation: `pageBgFadeIn ${RENTER_ENTER_TOTAL}ms ease forwards`,
          }}
        />
      )}
      <div className="relative mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-12 pt-[calc(clamp(4rem,6vw,5rem)+1.5rem)] sm:gap-6 sm:px-8 sm:pb-16">
        <div
          className="max-w-full overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={slide(0)}
        >
          <Breadcrumb light items={breadcrumbItems} onNavigate={pageExitNavigate} />
        </div>

        {state.status === 'loading' && (
          <p
            className={`${GLASS} px-4 py-10 text-center text-sm text-photo-text/80`}
            style={slide(1, 'right')}
          >
            {t('renterProfile.loading')}
          </p>
        )}

        {state.status === 'notFound' && (
          <div
            className={`${GLASS} flex flex-col items-center gap-3 px-4 py-12 text-center`}
            style={slide(1, 'right')}
          >
            <h1 className="text-xl font-bold text-photo-text">
              {t('renterProfile.notFound.title')}
            </h1>
            <p className="text-sm text-photo-text/80">{t('renterProfile.notFound.text')}</p>
            <Link
              to="/proprietaire/reservations"
              onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                pageExitNavigate('/proprietaire/reservations');
              }}
              className={`rounded-full bg-action px-4 py-1.5 text-xs font-semibold text-action-text transition hover:bg-action-hover ${FOCUS}`}
            >
              {t('renterProfile.notFound.cta')}
            </Link>
          </div>
        )}

        {state.status === 'error' && (
          <p
            role="alert"
            className={`${GLASS} px-4 py-10 text-center text-sm text-photo-text/80`}
            style={slide(1, 'right')}
          >
            {t('renterProfile.loadError')}
          </p>
        )}

        {state.status === 'ready' && renter && (
          <>
            <header
              className={`${GLASS} flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:gap-6 sm:p-6 sm:text-left lg:p-8`}
              style={slide(1, 'right')}
            >
              <SafeImage
                src={renter.avatar}
                fallbackSrc={nameToAvatarUrl(fullName)}
                fallback={null}
                width={112}
                height={112}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-glass/30 sm:h-24 sm:w-24 lg:h-28 lg:w-28"
                alt={t('accessibility.profileImageAlt', { name: fullName })}
              />
              <div className="flex flex-col gap-2 sm:flex-1">
                <h1
                  className={`text-2xl font-bold text-photo-text ${TITLE_SHADOW} sm:text-3xl md:text-4xl`}
                >
                  {fullName}
                </h1>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-photo-text/85 sm:justify-start">
                  {renter.email && (
                    <a
                      href={`mailto:${renter.email}`}
                      className={`inline-flex items-center gap-1 hover:text-photo-text hover:underline ${FOCUS}`}
                    >
                      <MdMailOutline className="text-photo-action" aria-hidden="true" />
                      {renter.email}
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <MdPhone className="text-photo-action" aria-hidden="true" />
                    {renter.phone || t('renterProfile.phone.none')}
                  </span>
                </div>
                {renter.member_since && (
                  <p className="text-sm text-photo-text/80 sm:text-base">
                    {t('renterProfile.memberSince', {
                      date: formatDate(renter.member_since, { month: 'long', year: 'numeric' }),
                    })}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-photo-text/85 sm:justify-start sm:gap-x-6 sm:text-base">
                  <span className="inline-flex items-center gap-1">
                    <MdDirectionsBoat className="text-photo-action" aria-hidden="true" />
                    {t('renterProfile.stats.bookings', {
                      count: state.data.stats.booking_count,
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MdChatBubbleOutline className="text-photo-action" aria-hidden="true" />
                    {t('renterProfile.stats.reviews', { count: state.data.stats.review_count })}
                  </span>
                  {state.data.stats.avg_rating != null && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-warning-bright" aria-hidden="true">
                        ★
                      </span>
                      {t('renterProfile.stats.rating', { rating: state.data.stats.avg_rating })}
                    </span>
                  )}
                </div>
                {activeBadges.length > 0 ? (
                  <ul className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                    {activeBadges.map((key) => (
                      <li
                        key={key}
                        className="inline-flex items-center gap-1 rounded-full border border-glass/30 bg-glass-fill/10 px-3 py-1 text-xs font-semibold text-photo-text backdrop-blur-sm"
                      >
                        <MdVerified
                          className="text-photo-action"
                          style={{ fontSize: '14px' }}
                          aria-hidden="true"
                        />
                        {t(`renterProfile.badges.${key}`)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pt-1 text-xs text-photo-text/75">
                    {t('renterProfile.badges.none')}
                  </p>
                )}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={messageRenter}
                    className={`rounded-full bg-action px-4 py-1.5 text-xs font-semibold text-action-text transition hover:bg-action-hover ${FOCUS}`}
                  >
                    {t('renterProfile.contact.message')}
                  </button>
                </div>
              </div>
            </header>

            {/* Documents d'identité */}
            <section
              aria-labelledby="renter-docs-title"
              className="flex flex-col gap-3 sm:gap-4"
              style={slide(2)}
            >
              <h2
                id="renter-docs-title"
                className={`text-lg font-semibold text-photo-text ${TITLE_SHADOW} sm:text-xl`}
              >
                {t('renterProfile.documents.title')}
              </h2>
              {state.data.documents.length === 0 ? (
                <p className={`${GLASS} px-4 py-8 text-center text-sm text-photo-text/80`}>
                  {t('renterProfile.documents.empty')}
                </p>
              ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {state.data.documents.map((doc) => (
                    <li
                      key={doc.id_document}
                      className={`${GLASS} flex items-center justify-between gap-3 px-3 py-2.5`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-photo-text">
                          {t(`documentsManager.docTypes.locataire.${doc.type}.label`, {
                            defaultValue: doc.type,
                          })}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${
                            REVIEW_STATUS_CLS[doc.status] || NEUTRAL_STATUS_CLS
                          }`}
                        >
                          {t(`documentsManager.status.${doc.status}`, { defaultValue: doc.status })}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={doc.status !== 'validated' || viewingDocId === doc.id_document}
                        onClick={() => viewDocument(doc)}
                        className={`shrink-0 rounded-full border border-glass/40 px-3 py-1 text-xs font-semibold text-photo-text/90 transition hover:bg-glass-fill/10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
                      >
                        {t('renterProfile.documents.view')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Locations chez ce propriétaire */}
            <section
              aria-labelledby="renter-bookings-title"
              className="flex flex-col gap-3 sm:gap-4"
              style={slide(3, 'right')}
            >
              <h2
                id="renter-bookings-title"
                className={`text-lg font-semibold text-photo-text ${TITLE_SHADOW} sm:text-xl`}
              >
                {t('renterProfile.bookings.title')}
              </h2>
              {state.data.bookings.length === 0 ? (
                <p className={`${GLASS} px-4 py-8 text-center text-sm text-photo-text/80`}>
                  {t('renterProfile.bookings.empty')}
                </p>
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    {bookings.slice.map((b) => (
                      <BookingCard key={b.id_booking} booking={b} onNavigate={pageExitNavigate} />
                    ))}
                  </ul>
                  <Pager
                    page={bookings.current}
                    pageCount={bookings.pageCount}
                    onPrev={() => setBookingPage(bookings.current - 1)}
                    onNext={() => setBookingPage(bookings.current + 1)}
                  />
                </>
              )}
            </section>

            {/* Avis reçus (laissés par des propriétaires) */}
            <section
              aria-labelledby="renter-reviews-title"
              className="flex flex-col gap-3 sm:gap-4"
              style={slide(4)}
            >
              <h2
                id="renter-reviews-title"
                className={`text-lg font-semibold text-photo-text ${TITLE_SHADOW} sm:text-xl`}
              >
                {t('renterProfile.reviews.title')}
              </h2>

              {/* Vos avis déjà déposés sur ce locataire (modifiables). Le dépôt
                  d'un nouvel avis se fait depuis « Mes réservations ». */}
              {reviewedBookings.length > 0 && (
                <div className={`${GLASS} flex flex-col gap-1 p-4`}>
                  <p className="text-sm font-semibold text-photo-action">
                    {t('renterProfile.reviewForm.sectionTitle')}
                  </p>
                  <ul className="flex flex-col divide-y divide-glass/15">
                    {reviewedBookings.map((b) => (
                      <OwnerReviewRow key={b.id_booking} booking={b} onReload={load} />
                    ))}
                  </ul>
                </div>
              )}

              {state.data.reviews.length === 0 ? (
                <p className={`${GLASS} px-4 py-8 text-center text-sm text-photo-text/80`}>
                  {t('renterProfile.reviews.empty')}
                </p>
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    {reviews.slice.map((review) => (
                      <ReviewItem key={review.id} review={review} />
                    ))}
                  </ul>
                  <Pager
                    page={reviews.current}
                    pageCount={reviews.pageCount}
                    onPrev={() => setReviewPage(reviews.current - 1)}
                    onNext={() => setReviewPage(reviews.current + 1)}
                  />
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default RenterProfilePage;
