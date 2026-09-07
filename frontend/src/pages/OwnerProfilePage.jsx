import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MdVerified, MdLocationOn, MdDirectionsBoat, MdChatBubbleOutline } from 'react-icons/md';
import { FaStar, FaRegStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import dashboardBg from '../assets/image/paysage/dashboard_bg.jpg';
import categoryBg from '../assets/image/paysage/cote_azur.jpg';
import Breadcrumb from '../components/common/FilAriane.jsx';
import SafeImage from '../components/common/SafeImage.jsx';
import { getOwnerProfile } from '../services/ownerService.js';
import { nameToAvatarUrl } from '../utils/avatar.js';
import { formatDate } from '../utils/formatDate.js';
import { usePageSlideTransition, usePageExitNavigate } from '../hooks/usePageTransition.js';
import {
  PAGE_SLIDE_CSS,
  NAV_ENTER_TOTAL,
  PHOTO_OVERLAY_BOAT,
  PHOTO_OVERLAY_DASHBOARD,
  PHOTO_OVERLAY_STATIC_PAGE,
} from '../hooks/useCategoryTransition.js';

// Même fond que les tableaux de bord (propriétaire / locataire / admin) : photo
// dashboard sous le voile PHOTO_OVERLAY_DASHBOARD — le raccord est ainsi
// invisible depuis la fiche produit, qui fait un crossfade vers ce même couple.
// L'attachement (fixed vs scroll) est piloté par .owner-photo-background : le
// fond « fixed » saccade sur mobile, on le réserve à xl (cf. ProductPage).
const PHOTO_BG_STYLE = {
  backgroundImage: `${PHOTO_OVERLAY_DASHBOARD}, url(${dashboardBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const OWNER_RESPONSIVE_CSS = `
  .owner-photo-background { background-attachment: scroll; }
  @media (min-width: 80rem) {
    .owner-photo-background { background-attachment: fixed; }
  }
`;

// Surfaces « verre » identiques aux blocs des pages catégorie/produit.
const GLASS =
  'rounded-2xl border border-glass/20 bg-surface/5 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-[5px]';

const FOCUS =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-photo-action focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

const BADGE_KEYS = ['skipper', 'license', 'insurance', 'francisation'];
const REVIEW_DATE_OPTS = { day: 'numeric', month: 'long', year: 'numeric' };

// Bateaux et avis sont paginés côté client (la réponse tient déjà tout en
// mémoire) : 6 bateaux et 4 avis par page, navigation aux flèches.
const BOATS_PER_PAGE = 6;
const REVIEWS_PER_PAGE = 4;

// Cascade d'entrée / sortie (glissade des blocs depuis / vers les marges),
// même durée que les autres pages sur fond photo — cf. AboutPage / ContactPage.
const OWNER_ENTER_TOTAL = NAV_ENTER_TOTAL;

// Raccord de fond invisible au moment de quitter la page : crossfade vers
// l'image que la page cible affiche nativement (cf. usePageSlideTransition).
const OWNER_STATIC_BG_TARGETS = { '/categorie': categoryBg };

function overlayFor(bg) {
  if (bg === categoryBg) return PHOTO_OVERLAY_BOAT;
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

function BoatCard({ boat, onNavigate }) {
  const { t } = useTranslation();
  const to = `/product/${boat.id_boat}`;
  return (
    <Link
      to={to}
      onClick={(e) => {
        // Clic gauche simple : la page joue sa sortie avant de naviguer. Les
        // ouvertures en nouvel onglet (modificateurs) gardent le comportement natif.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onNavigate(to);
      }}
      className={`${GLASS} ${FOCUS} group flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1`}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '7 / 5' }}>
        <SafeImage
          src={boat.image}
          alt={t('carrousel.boatImageAlt', { name: boat.name })}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          fallbackClassName="flex h-full w-full items-center justify-center bg-surface/20 text-3xl"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-sm font-bold text-on-dark">{boat.name}</h3>
          <span className="shrink-0 text-xs font-semibold text-on-dark">
            {boat.avg_rating != null ? (
              <>
                <span className="text-warning-bright">★</span> {boat.avg_rating}
                {boat.review_count > 0 && (
                  <span className="text-on-dark/60"> ({boat.review_count})</span>
                )}
              </>
            ) : (
              t('ownerProfile.boats.new')
            )}
          </span>
        </div>
        <span className="text-[0.625rem] font-bold uppercase tracking-widest text-photo-action">
          {t(`carrousel.boatType.${boat.type}`, { defaultValue: boat.type })}
        </span>
        {boat.city && (
          <span className="flex items-center gap-1 text-xs text-on-dark/70">
            <MdLocationOn style={{ fontSize: '13px' }} aria-hidden="true" />
            {boat.city}
          </span>
        )}
        {boat.price != null && (
          <span className="mt-auto pt-1 text-sm font-semibold text-on-dark">
            {t('ownerProfile.boats.pricePerDay', { price: boat.price })}
          </span>
        )}
      </div>
    </Link>
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
          <p className="truncate text-sm font-semibold text-on-dark">{review.name}</p>
          {review.boat_name && (
            <p className="truncate text-xs text-photo-action">{review.boat_name}</p>
          )}
        </div>
        <span className="ml-auto shrink-0 text-xs text-on-dark/70">
          {formatDate(review.created_at, REVIEW_DATE_OPTS)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Stars rating={review.rating} />
        <span className="sr-only">{review.rating}/5</span>
      </div>
      {review.text && (
        <p className="break-words text-sm leading-relaxed text-on-dark/80">{review.text}</p>
      )}
      {review.owner_reply && (
        <div className="rounded-lg border-l-2 border-photo-action bg-surface/5 px-3 py-2">
          <p className="text-xs font-semibold text-photo-action">{t('boatReviews.ownerReply')}</p>
          <p className="mt-0.5 break-words text-sm leading-relaxed text-on-dark/80">
            {review.owner_reply}
          </p>
        </div>
      )}
    </li>
  );
}

function Pager({ page, pageCount, onPrev, onNext }) {
  const { t } = useTranslation();
  if (pageCount <= 1) return null;
  const btn = `flex h-9 w-9 items-center justify-center rounded-full border border-glass/30 bg-surface/10 text-on-dark backdrop-blur-sm transition-colors hover:bg-surface/20 disabled:cursor-not-allowed disabled:opacity-30 ${FOCUS}`;
  return (
    <div className="flex items-center justify-center gap-4 pt-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 0}
        aria-label={t('ownerProfile.pager.prev')}
        className={btn}
      >
        <FaChevronLeft size={13} aria-hidden="true" />
      </button>
      <span className="text-sm font-medium text-on-dark/80">
        {t('ownerProfile.pager.position', { page: page + 1, total: pageCount })}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= pageCount - 1}
        aria-label={t('ownerProfile.pager.next')}
        className={btn}
      >
        <FaChevronRight size={13} aria-hidden="true" />
      </button>
    </div>
  );
}

function OwnerProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  // Bateau d'où l'on vient (posé par le lien « par {propriétaire} » de la fiche
  // produit) : absent en accès direct, l'étape « Bateau » du fil d'ariane est
  // alors omise.
  const fromBoat = location.state?.fromBoat ?? null;
  const [state, setState] = useState({ status: 'loading', data: null });
  const [boatPage, setBoatPage] = useState(0);
  const [reviewPage, setReviewPage] = useState(0);
  // Cascade rejouée à chaque arrivée depuis une autre page (pas au premier
  // chargement direct ni si l'utilisateur réduit les animations), et jouée à
  // rebours à la sortie — déclenchée par pageExitNavigate ci-dessous, que
  // reçoivent le fil d'ariane, les cartes bateau et le CTA « introuvable ».
  const { slide, exitBgSrc } = usePageSlideTransition(OWNER_ENTER_TOTAL, {
    ownBg: dashboardBg,
    staticBgTargets: OWNER_STATIC_BG_TARGETS,
    dashboardBg,
  });
  const pageExitNavigate = usePageExitNavigate();

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null });
    setBoatPage(0);
    setReviewPage(0);
    getOwnerProfile(id)
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

  const owner = state.data?.owner;
  const fullName = owner ? `${owner.first_name} ${owner.last_name}`.trim() : '';

  useEffect(() => {
    document.title = fullName
      ? t('ownerProfile.pageTitleNamed', { name: fullName })
      : t('ownerProfile.pageTitle');
  }, [fullName, t]);

  const activeBadges = state.data ? BADGE_KEYS.filter((key) => state.data.badges[key]) : [];
  const boats = paginate(state.data?.boats ?? [], BOATS_PER_PAGE, boatPage);
  const reviews = paginate(state.data?.reviews ?? [], REVIEWS_PER_PAGE, reviewPage);

  // « Accueil » est ajouté par le composant ; on fournit les étapes suivantes :
  // Catégorie / [Bateau, si l'on vient d'une fiche] / Propriétaire.
  const breadcrumbItems = [
    { label: t('breadcrumb.categorie'), to: '/categorie' },
    ...(fromBoat?.id
      ? [{ label: fromBoat.name || t('breadcrumb.product'), to: `/product/${fromBoat.id}` }]
      : []),
    { label: fullName || t('ownerProfile.pageTitle'), to: `/proprietaires/${id}` },
  ];

  return (
    <main
      className="owner-photo-background relative w-full min-h-[100svh] overflow-x-clip bg-surface text-on-dark"
      style={PHOTO_BG_STYLE}
    >
      <style>{`${PAGE_SLIDE_CSS}\n${OWNER_RESPONSIVE_CSS}`}</style>
      {/* Crossfade vers le fond de la page cible pendant la sortie : se pose
          derrière les blocs qui glissent hors écran par-dessus. */}
      {exitBgSrc && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `${overlayFor(exitBgSrc)}, url(${exitBgSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
            animation: `pageBgFadeIn ${OWNER_ENTER_TOTAL}ms ease forwards`,
          }}
        />
      )}
      {/* Le fond photo remonte sous le header fixe ; le contenu est décalé
          d'autant (pt) pour ne pas passer dessous. */}
      <div className="relative mx-auto flex max-w-5xl flex-col gap-5 px-4 pb-12 pt-[calc(clamp(4rem,6vw,5rem)+1.5rem)] sm:gap-6 sm:px-8 sm:pb-16">
        {/* Fil d'ariane à 4 niveaux : swipe horizontal si les noms débordent sur
            petit écran (scrollbar masquée), sur une seule ligne sinon. py-0.5
            évite de rogner l'anneau de focus des liens. */}
        <div
          className="max-w-full overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={slide(0)}
        >
          <Breadcrumb light items={breadcrumbItems} onNavigate={pageExitNavigate} />
        </div>

        {state.status === 'loading' && (
          <p
            className={`${GLASS} px-4 py-10 text-center text-sm text-on-dark/70`}
            style={slide(1, 'right')}
          >
            {t('ownerProfile.loading')}
          </p>
        )}

        {state.status === 'notFound' && (
          <div
            className={`${GLASS} flex flex-col items-center gap-3 px-4 py-12 text-center`}
            style={slide(1, 'right')}
          >
            <h1 className="text-xl font-bold text-on-dark">{t('ownerProfile.notFound.title')}</h1>
            <p className="text-sm text-on-dark/70">{t('ownerProfile.notFound.text')}</p>
            <Link
              to="/categorie"
              onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                pageExitNavigate('/categorie');
              }}
              className={`rounded-full bg-action px-4 py-1.5 text-xs font-semibold text-action-text transition hover:bg-action-hover ${FOCUS}`}
            >
              {t('ownerProfile.notFound.cta')}
            </Link>
          </div>
        )}

        {state.status === 'error' && (
          <p
            role="alert"
            className={`${GLASS} px-4 py-10 text-center text-sm text-on-dark/80`}
            style={slide(1, 'right')}
          >
            {t('ownerProfile.loadError')}
          </p>
        )}

        {state.status === 'ready' && owner && (
          <>
            {/* Identité + badges de vérification + compteurs */}
            <header
              className={`${GLASS} flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:gap-6 sm:p-6 sm:text-left lg:p-8`}
              style={slide(1, 'right')}
            >
              <SafeImage
                src={owner.avatar}
                fallbackSrc={nameToAvatarUrl(fullName)}
                fallback={null}
                width={112}
                height={112}
                className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-glass/30 sm:h-24 sm:w-24 lg:h-28 lg:w-28"
                alt={t('accessibility.profileImageAlt', { name: fullName })}
              />
              <div className="flex flex-col gap-2 sm:flex-1">
                <h1 className="text-2xl font-bold text-on-dark drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:text-3xl md:text-4xl">
                  {fullName}
                </h1>
                {owner.member_since && (
                  <p className="text-sm text-on-dark/70 sm:text-base">
                    {t('ownerProfile.memberSince', {
                      date: formatDate(owner.member_since, { month: 'long', year: 'numeric' }),
                    })}
                  </p>
                )}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-on-dark/80 sm:justify-start sm:gap-x-6 sm:text-base">
                  <span className="inline-flex items-center gap-1">
                    <MdDirectionsBoat className="text-photo-action" aria-hidden="true" />
                    {t('ownerProfile.stats.boats', { count: state.data.stats.boat_count })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MdChatBubbleOutline className="text-photo-action" aria-hidden="true" />
                    {t('ownerProfile.stats.reviews', { count: state.data.stats.review_count })}
                  </span>
                  {state.data.stats.avg_rating != null && (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-warning-bright" aria-hidden="true">
                        ★
                      </span>
                      {t('ownerProfile.stats.rating', { rating: state.data.stats.avg_rating })}
                    </span>
                  )}
                </div>
                {activeBadges.length > 0 ? (
                  <ul className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                    {activeBadges.map((key) => (
                      <li
                        key={key}
                        className="inline-flex items-center gap-1 rounded-full border border-glass/30 bg-surface/10 px-3 py-1 text-xs font-semibold text-on-dark backdrop-blur-sm"
                      >
                        <MdVerified
                          className="text-photo-action"
                          style={{ fontSize: '14px' }}
                          aria-hidden="true"
                        />
                        {t(`ownerProfile.badges.${key}`)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pt-1 text-xs text-on-dark/50">{t('ownerProfile.badges.none')}</p>
                )}
              </div>
            </header>

            {/* Bateaux mis en ligne */}
            <section
              aria-labelledby="owner-boats-title"
              className="flex flex-col gap-3 sm:gap-4"
              style={slide(2)}
            >
              <h2
                id="owner-boats-title"
                className="text-lg font-semibold text-on-dark drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:text-xl"
              >
                {t('ownerProfile.boats.title')}
              </h2>
              {state.data.boats.length === 0 ? (
                <p className={`${GLASS} px-4 py-8 text-center text-sm text-on-dark/70`}>
                  {t('ownerProfile.boats.empty')}
                </p>
              ) : (
                <>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                    {boats.slice.map((boat) => (
                      <li key={boat.id_boat} className="min-w-0">
                        <BoatCard boat={boat} onNavigate={pageExitNavigate} />
                      </li>
                    ))}
                  </ul>
                  <Pager
                    page={boats.current}
                    pageCount={boats.pageCount}
                    onPrev={() => setBoatPage(boats.current - 1)}
                    onNext={() => setBoatPage(boats.current + 1)}
                  />
                </>
              )}
            </section>

            {/* Avis reçus sur les bateaux loués */}
            <section
              aria-labelledby="owner-reviews-title"
              className="flex flex-col gap-3 sm:gap-4"
              style={slide(3, 'right')}
            >
              <h2
                id="owner-reviews-title"
                className="text-lg font-semibold text-on-dark drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:text-xl"
              >
                {t('ownerProfile.reviews.title')}
              </h2>
              {state.data.reviews.length === 0 ? (
                <p className={`${GLASS} px-4 py-8 text-center text-sm text-on-dark/70`}>
                  {t('ownerProfile.reviews.empty')}
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

export default OwnerProfilePage;
