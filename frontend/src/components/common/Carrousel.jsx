import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { FaChevronLeft, FaChevronRight, FaArrowRight } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { fetchBoats } from '../../services/boatService';
import { fetchPorts } from '../../services/portService';
import { useFavorites } from '../../hooks/useFavorites.js';
import { useCategoryNavigate, useProductNavigate } from '../../hooks/useCategoryTransition.js';
import FavoriteButton from './FavoriteButton.jsx';
import SafeImage from './SafeImage.jsx';

// Clic "navigation simple" : laisse le navigateur gérer les ouvertures en
// nouvel onglet (ctrl/cmd/shift/clic molette) sans intercepter le lien.
function isPlainLeftClick(e) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

// ─── Transformateurs DB → slide ───────────────────────────────────────────────

const portToSlide = (port) => ({
  id: port.id_port,
  kind: 'port',
  label: port.city,
  description: [port.name, port.region, port.country].filter(Boolean).join(' · '),
  img: port.image_url ?? '',
  available: port.country === 'France',
});

const departurePortsToSlides = (ports) =>
  ports
    .filter(
      (port) =>
        port.country !== 'France' ||
        ['Brest', 'La Rochelle', 'Bordeaux', 'Marseille', 'Nice'].includes(port.city)
    )
    .map(portToSlide);

const boatToSlide = (boat, t) => {
  const nextAvail = boat.availabilities?.[0];
  const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const dateStr =
    nextAvail?.start_date && nextAvail?.end_date
      ? `${fmt(nextAvail.start_date)} - ${fmt(nextAvail.end_date)}`
      : null;
  return {
    id: boat.id_boat,
    kind: 'boat',
    label: boat.name,
    city: boat.port?.city ?? null,
    dateStr,
    capacity: boat.capacity ?? null,
    price: boat.daily_price,
    rating:
      boat.avg_rating != null
        ? `★ ${boat.avg_rating}${boat.review_count > 0 ? ` (${boat.review_count})` : ''}`
        : t('carrousel.newRating'),
    img: boat.images?.[0]?.url ?? '',
    available: boat.is_published,
  };
};

// ─── Composant générique de carrousel ─────────────────────────────────────────

const PortCarousel = memo(
  ({
    slides,
    visibleCount = 5,
    imageSize = 'small',
    variant = 'default',
    theme = 'light',
    favoriteIds,
    onToggleFavorite,
    onSlideClick,
  }) => {
    const { t } = useTranslation();
    const carouselRef = useRef(null);
    const [responsiveVisibleCount, setResponsiveVisibleCount] = useState(visibleCount);
    const [index, setIndex] = useState(0);
    const effectiveVisibleCount = Math.min(responsiveVisibleCount, slides.length || 1);
    const maxIndex = Math.max(0, slides.length - effectiveVisibleCount);
    const slideWidthPct = 100 / slides.length;
    const trackWidthPct = (slides.length / effectiveVisibleCount) * 100;
    const aspectRatio = imageSize === 'small' ? '4 / 3' : '1 / 1';
    const imgBorder = theme === 'dark' ? 'border-white/20' : 'border-black/40';
    const arrowBtn =
      theme === 'dark'
        ? 'bg-white/10 hover:bg-white/25 text-white'
        : 'bg-black/10 hover:bg-gray-300 text-gray-700';
    const captionTitle = theme === 'dark' ? 'text-white' : 'text-black';
    const captionMeta = theme === 'dark' ? 'text-white/70' : 'text-gray-600';
    const captionSubtle = theme === 'dark' ? 'text-white/60' : 'text-gray-500';
    const getImageAlt = (slide) =>
      slide.kind === 'port'
        ? t('carrousel.portImageAlt', { city: slide.label })
        : slide.kind === 'boat'
          ? t('carrousel.boatImageAlt', { name: slide.label })
          : slide.label || '';

    const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
    const next = useCallback(() => setIndex((i) => Math.min(maxIndex, i + 1)), [maxIndex]);

    // Swipe tactile : suit le doigt sans re-render (juste des refs), ne
    // déclenche prev/next qu'au relâché si le geste dépasse le seuil.
    const touchStartX = useRef(null);
    const touchDeltaX = useRef(0);
    const handleTouchStart = useCallback((e) => {
      touchStartX.current = e.touches[0].clientX;
      touchDeltaX.current = 0;
    }, []);
    const handleTouchMove = useCallback((e) => {
      if (touchStartX.current === null) return;
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    }, []);
    const handleTouchEnd = useCallback(() => {
      if (touchDeltaX.current < -40) next();
      else if (touchDeltaX.current > 40) prev();
      touchStartX.current = null;
      touchDeltaX.current = 0;
    }, [next, prev]);

    useLayoutEffect(() => {
      const element = carouselRef.current;
      if (!element) return undefined;
      const updateVisibleCount = () => {
        const width = element.clientWidth;
        const nextCount =
          width < 340 ? 1 : width < 560 ? 2 : width < 820 ? 3 : width < 1120 ? 4 : visibleCount;
        setResponsiveVisibleCount(Math.min(nextCount, visibleCount));
      };
      updateVisibleCount();
      const observer = new window.ResizeObserver(updateVisibleCount);
      observer.observe(element);
      return () => observer.disconnect();
    }, [visibleCount]);

    useEffect(() => {
      setIndex((current) => Math.min(current, maxIndex));
    }, [maxIndex]);

    return (
      <div ref={carouselRef} className="relative p-2 sm:p-4">
        {index > 0 && (
          <button
            onClick={prev}
            className={`absolute left-0 z-20 rounded-full p-2.5 shadow-lg transition-colors ${arrowBtn}`}
            style={{ transform: 'translate(-50%, 0)', top: '40%' }}
            aria-label={t('carrousel.prev')}
          >
            <FaChevronLeft size={16} />
          </button>
        )}

        <div
          className="overflow-hidden rounded-xl"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex"
            style={{
              width: `${trackWidthPct}%`,
              transform: `translateX(${-index * slideWidthPct}%)`,
              transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              willChange: 'transform',
            }}
          >
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="flex flex-col cursor-pointer group px-1.5"
                style={{ width: `${slideWidthPct}%` }}
                onClick={() => onSlideClick?.(slide)}
              >
                {variant === 'overlay' ? (
                  <>
                    <div
                      className={`relative rounded-[8px] overflow-hidden w-full border ${imgBorder}`}
                      style={{ aspectRatio }}
                    >
                      <SafeImage
                        src={slide.img}
                        alt={getImageAlt(slide)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        fallbackClassName="flex h-full w-full items-center justify-center bg-slate-800 text-4xl"
                        loading="lazy"
                      />
                      {slide.available ? (
                        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/30" />
                      ) : (
                        <>
                          <div className="absolute inset-0 bg-black/60" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className="text-white font-semibold text-center px-2"
                              style={{
                                fontSize: '13px',
                                lineHeight: '14px',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {t('carrousel.soon')}
                            </span>
                          </div>
                        </>
                      )}
                      <FavoriteButton
                        isFavorite={favoriteIds.has(slide.id)}
                        onToggle={() => onToggleFavorite(slide.id)}
                        size={26}
                        className="absolute top-2 right-2 z-10"
                      />
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      <span
                        className={`font-semibold truncate ${captionTitle}`}
                        style={{ lineHeight: '15px' }}
                      >
                        <span style={{ fontSize: '14px' }}>{slide.label}</span>
                        {slide.city && (
                          <span className={captionSubtle} style={{ fontSize: '12px' }}>
                            {' '}
                            · {slide.city}
                          </span>
                        )}
                      </span>
                      {(slide.dateStr || slide.capacity) && (
                        <span
                          className={captionMeta}
                          style={{ fontSize: '12px', lineHeight: '15px' }}
                        >
                          {[
                            slide.dateStr,
                            slide.capacity
                              ? t('carrousel.persons', { count: slide.capacity })
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                      <span
                        className={captionMeta}
                        style={{ fontSize: '12px', lineHeight: '15px' }}
                      >
                        {[`${slide.price} ${t('carrousel.perDay')}`, slide.rating]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                  </>
                ) : variant === 'port' ? (
                  <div
                    className={`relative rounded-[8px] overflow-hidden w-full border ${imgBorder}`}
                    style={{ aspectRatio }}
                  >
                    <SafeImage
                      src={slide.img}
                      alt={getImageAlt(slide)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      fallback={null}
                      loading="lazy"
                    />
                    {slide.available ? (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/80" />
                        <div className="absolute inset-0 flex items-center justify-center px-3">
                          <span
                            className="text-white font-semibold text-center"
                            style={{ fontSize: '15px', lineHeight: '19px' }}
                          >
                            {slide.label}
                          </span>
                        </div>
                        {slide.description && (
                          <div
                            className="absolute bottom-3 left-3 right-3 text-white/75 text-center"
                            style={{ fontSize: '11px', lineHeight: '14px' }}
                          >
                            {slide.description}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-black/60" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
                          <span
                            className="text-white font-semibold text-center"
                            style={{ fontSize: '15px', lineHeight: '19px' }}
                          >
                            {slide.label}
                          </span>
                          <span
                            className="text-white/70 text-center"
                            style={{
                              fontSize: '11px',
                              lineHeight: '14px',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {t('carrousel.soon')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      className={`relative rounded-[8px] overflow-hidden w-full border ${imgBorder}`}
                      style={{ aspectRatio }}
                    >
                      <SafeImage
                        src={slide.img}
                        alt={getImageAlt(slide)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        fallbackClassName="flex h-full w-full items-center justify-center bg-slate-800 text-4xl"
                        loading="lazy"
                      />
                      {!slide.available && (
                        <>
                          <div className="absolute inset-0 bg-black/60" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className="text-white font-semibold text-center px-2"
                              style={{
                                fontSize: '13px',
                                lineHeight: '14px',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase',
                              }}
                            >
                              {t('carrousel.soon')}
                            </span>
                          </div>
                        </>
                      )}
                      <FavoriteButton
                        isFavorite={favoriteIds.has(slide.id)}
                        onToggle={() => onToggleFavorite(slide.id)}
                        size={26}
                        className="absolute top-2 right-2 z-10"
                      />
                    </div>
                    <span
                      className={`mt-1 text-center font-semibold ${captionTitle}`}
                      style={{ fontSize: '15px', lineHeight: '18px' }}
                    >
                      {slide.label}
                    </span>
                    {slide.description && (
                      <span
                        className={`text-center ${captionMeta}`}
                        style={{ fontSize: '13px', lineHeight: '16px' }}
                      >
                        {slide.description}
                      </span>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {index < maxIndex && (
          <button
            onClick={next}
            className={`absolute right-0 z-20 rounded-full p-2.5 shadow-lg transition-colors ${arrowBtn}`}
            style={{ transform: 'translate(50%, 0)', top: '40%' }}
            aria-label={t('carrousel.next')}
          >
            <FaChevronRight size={16} />
          </button>
        )}
      </div>
    );
  }
);

const CarouselSection = ({
  title,
  slides,
  visibleCount = 5,
  imageSize = 'small',
  linkLabel,
  linkTo = '/categorie',
  theme = 'light',
  variant = 'default',
  favoriteIds,
  onToggleFavorite,
  onSlideClick,
  darkHeaderAtAllBreakpoints = false,
}) => {
  const { t } = useTranslation();
  const goToCategory = useCategoryNavigate();
  const isResponsivePortHeader =
    theme === 'dark' && variant === 'port' && !darkHeaderAtAllBreakpoints;
  const titleColor =
    theme === 'dark'
      ? isResponsivePortHeader
        ? 'text-gray-900 lg:text-white'
        : 'text-white'
      : 'text-black';
  const linkColor =
    theme === 'dark'
      ? isResponsivePortHeader
        ? 'text-gray-600 hover:text-black lg:text-white/70 lg:hover:text-white'
        : 'text-white/70 hover:text-white'
      : 'text-gray-600 hover:text-black';
  return (
    <div className="relative w-full">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          className={`font-semibold ${titleColor}`}
          style={{ fontSize: '20px', lineHeight: '22px' }}
        >
          {title}
        </h2>
        <Link
          to={linkTo}
          onClick={(e) => {
            if (!isPlainLeftClick(e)) return;
            e.preventDefault();
            goToCategory(linkTo);
          }}
          className={`flex items-center gap-1.5 transition-colors sm:ml-4 ${linkColor}`}
          style={{ fontSize: 'clamp(13px, 2.5vw, 16px)' }}
        >
          {linkLabel ?? t('carrousel.seeMore')} <FaArrowRight size={10} />
        </Link>
      </div>
      <PortCarousel
        slides={slides}
        visibleCount={visibleCount}
        imageSize={imageSize}
        variant={variant}
        theme={theme}
        favoriteIds={favoriteIds}
        onToggleFavorite={onToggleFavorite}
        onSlideClick={onSlideClick}
      />
    </div>
  );
};

// ─── BoatTypeCarousel (animations 3D) ─────────────────────────────────────────

const GAP = 16;
const PADDING = 16;
// Même ratio d'amortissement que { stiffness: 40, damping: 20 } (~1.58), juste ~1.8x plus rapide :
// moins de frames à composer pour un rendu visuel identique (pas de rebond ajouté).
const SPRING = { type: 'spring', stiffness: 130, damping: 36 };

const SlideItem = memo(function SlideItem({
  slide,
  index,
  itemWidth,
  trackItemOffset,
  x,
  priority,
  isFavorite,
  onToggleFavorite,
  onSlideClick,
}) {
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ];
  const rotateY = useTransform(x, range, [90, 0, -90], { clamp: false });

  return (
    <motion.div
      className="relative shrink-0 rounded-[8px] overflow-hidden border border-white/20 cursor-pointer"
      style={{ width: itemWidth, height: 220, rotateY, willChange: 'transform' }}
      onClick={() => onSlideClick?.(slide)}
    >
      <div className="block w-full h-full">
        <SafeImage
          src={slide.img}
          alt={slide.alt || slide.label || ''}
          className="w-full h-full object-cover"
          fallbackClassName="flex h-full w-full items-center justify-center bg-slate-800 text-4xl"
          loading={priority ? 'eager' : 'lazy'}
          fetchpriority={priority ? 'high' : 'low'}
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/90" />
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(slide.id)}
          size={26}
          className="absolute top-3 right-3 z-10"
        />
        <div
          className="absolute top-3 left-3 text-white font-semibold"
          style={{ fontSize: '15px' }}
        >
          {slide.label}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          {slide.subtitle && (
            <div
              className="text-white/70 font-semibold"
              style={{ fontSize: '11px', lineHeight: '14px' }}
            >
              {slide.subtitle}
            </div>
          )}
          {slide.description && (
            <div
              className="text-white/80"
              style={{ fontSize: '11px', lineHeight: '14px', marginTop: '2px' }}
            >
              {slide.description}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

const BoatTypeCarousel = memo(function BoatTypeCarousel({
  slides,
  initialSlide = 1,
  interval = 8000,
  theme = 'dark',
  favoriteIds,
  onToggleFavorite,
  onSlideClick,
}) {
  const { t } = useTranslation();
  const outerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [itemWidth, setItemWidth] = useState(0);
  const trackItemOffset = itemWidth + GAP;

  const itemsForRender = useMemo(() => [slides[slides.length - 1], ...slides, slides[0]], [slides]);
  const [position, setPosition] = useState(initialSlide);
  const [isJumping, setIsJumping] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const x = useMotionValue(-initialSlide * GAP);

  // Mesure + positionnement initial dans le même effet de layout (avant le premier paint)
  // pour éviter un slide-in animé parasite au chargement de la page.
  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth - PADDING * 2;
      setItemWidth(width);
      setIsJumping(true);
      x.set(-initialSlide * (width + GAP));
      window.requestAnimationFrame(() => setIsJumping(false));
    };
    measure();
    const ro = new window.ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [initialSlide, x]);

  useEffect(() => {
    setPosition(initialSlide);
  }, [slides.length, initialSlide]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isHovered || !isVisible || itemsForRender.length <= 1) return;
    const timer = setInterval(() => {
      setPosition((p) => Math.min(p + 1, itemsForRender.length - 1));
    }, interval);
    return () => clearInterval(timer);
  }, [isHovered, isVisible, itemsForRender.length, interval]);

  const jumpTo = useCallback(
    (pos) => {
      setIsJumping(true);
      setPosition(pos);
      x.set(-pos * trackItemOffset);
      window.requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
    },
    [x, trackItemOffset]
  );

  const handleAnimationComplete = useCallback(() => {
    const lastClone = itemsForRender.length - 1;
    if (position === lastClone) {
      jumpTo(1);
    } else if (position === 0) {
      jumpTo(slides.length);
    } else {
      setIsAnimating(false);
    }
  }, [position, itemsForRender.length, slides.length, jumpTo]);

  const goPrev = useCallback(() => {
    if (isAnimating) return;
    setPosition((p) => Math.max(0, p - 1));
  }, [isAnimating]);

  const goNext = useCallback(() => {
    if (isAnimating) return;
    setPosition((p) => Math.min(itemsForRender.length - 1, p + 1));
  }, [isAnimating, itemsForRender.length]);

  // Swipe tactile : même logique de seuil que PortCarousel, sur goPrev/goNext.
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);
  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (touchDeltaX.current < -40) goNext();
    else if (touchDeltaX.current > 40) goPrev();
    touchStartX.current = null;
    touchDeltaX.current = 0;
  }, [goNext, goPrev]);

  const activeIndex = (position - 1 + slides.length) % slides.length;
  const transition = isJumping ? { duration: 0 } : SPRING;

  if (!slides.length) return null;

  return (
    <div className="relative flex-1 flex flex-col items-center">
      <div
        ref={outerRef}
        className={`relative overflow-hidden rounded-[12px] p-4 flex justify-center ${theme === 'light' ? 'border border-black/10 bg-black/[0.03]' : 'border border-white/15 bg-white/5'}`}
        style={{
          width: '100%',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <button
          onClick={goPrev}
          className="absolute left-0 z-20 bg-black/20 hover:bg-black/40 rounded-full p-2.5 shadow-lg transition-colors"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label={t('carrousel.prev')}
        >
          <FaChevronLeft size={16} className="text-white" />
        </button>
        {itemWidth > 0 && (
          <motion.div
            className="flex"
            style={{
              width: itemWidth,
              gap: `${GAP}px`,
              perspective: 800,
              perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
              willChange: 'transform',
              x,
            }}
            animate={{ x: -(position * trackItemOffset) }}
            transition={transition}
            onAnimationStart={() => setIsAnimating(true)}
            onAnimationComplete={handleAnimationComplete}
          >
            {itemsForRender.map((slide, index) => (
              <SlideItem
                key={`${slide.id}-${index}`}
                slide={slide}
                index={index}
                itemWidth={itemWidth}
                trackItemOffset={trackItemOffset}
                x={x}
                priority={index === initialSlide}
                isFavorite={favoriteIds.has(slide.id)}
                onToggleFavorite={onToggleFavorite}
                onSlideClick={onSlideClick}
              />
            ))}
          </motion.div>
        )}
        <button
          onClick={goNext}
          className="absolute right-0 z-20 bg-black/20 hover:bg-black/40 rounded-full p-2.5 shadow-lg transition-colors"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label={t('carrousel.next')}
        >
          <FaChevronRight size={16} className="text-white" />
        </button>
      </div>

      <div className="flex gap-2 mt-3">
        {slides.map((_, i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full cursor-pointer"
            style={{ background: activeIndex === i ? '#333' : 'rgba(51,51,51,0.4)' }}
            animate={{ scale: activeIndex === i ? 1.2 : 1 }}
            transition={{ duration: 0.15 }}
            onClick={() => setPosition(i + 1)}
          />
        ))}
      </div>
    </div>
  );
});

// ─── Composant principal ──────────────────────────────────────────────────────

// `glass` : sur la HomePage, seule la section "ports" (dégradé encore sombre
// à cet endroit) respecte `theme` — les autres sections (recent, destinations,
// popular, cheapest) restent forcées en 'light' car elles tombent sur la
// portion blanche du dégradé. Une page entièrement sur fond photo (ex.
// CategoryPage) a besoin que TOUTES les sections respectent `theme` : `glass`
// lève ce forçage sans toucher au rendu de la HomePage (par défaut à false).
const Carrousel = ({ theme = 'dark', similarTo = null, glass = false, portsOnly = false }) => {
  const { t } = useTranslation();
  const goToCategory = useCategoryNavigate();
  const goToProduct = useProductNavigate();
  const [boats, setBoats] = useState([]);
  const [ports, setPorts] = useState([]);
  const { favoriteIds, toggleFavorite } = useFavorites(!portsOnly);

  const handleBoatClick = useCallback(
    (slide) => {
      if (!slide.available) return;
      // Nom transmis d'avance : sans lui, le passage « … » → nom une fois
      // l'API répondue élargit la breadcrumb et repousse la SearchBar en
      // plein FLIP (effet de rebond) — cf. ProductPage.jsx.
      goToProduct(`/product/${slide.id}`, { boatName: slide.label });
    },
    [goToProduct]
  );

  // Un port "bientôt disponible" n'a aucun bateau : cliquer dessus n'amènerait
  // qu'une page catégorie vide, donc on ignore le clic dans ce cas.
  function handlePortClick(slide) {
    if (!slide.available) return;
    goToCategory(`/categorie?destination=${encodeURIComponent(slide.label)}`);
  }

  // startTransition : le rendu des sections de carrousels (useMemo lourds +
  // beaucoup d'images) passe en priorité basse pour ne pas bloquer les
  // animations de transition en cours.
  useEffect(() => {
    if (!portsOnly) {
      fetchBoats()
        .then(({ data }) => startTransition(() => setBoats(data)))
        .catch(console.error);
    }
    fetchPorts()
      .then(({ data }) => startTransition(() => setPorts(data)))
      .catch(console.error);
  }, [portsOnly]);

  const boatTypeSections = useMemo(() => {
    const toTypeSlide = (boat) => {
      const nextAvail = boat.availabilities?.[0];
      const fmt = (d) =>
        new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const dateStr =
        nextAvail?.start_date && nextAvail?.end_date
          ? `${fmt(nextAvail.start_date)} - ${fmt(nextAvail.end_date)}`
          : null;
      const shortDesc = boat.description
        ? boat.description.length > 55
          ? boat.description.slice(0, 55) + '…'
          : boat.description
        : null;
      const ratingStr =
        boat.avg_rating != null
          ? `★ ${boat.avg_rating}${boat.review_count > 0 ? ` (${boat.review_count})` : ''}`
          : t('carrousel.newRating');

      return {
        id: boat.id_boat,
        kind: 'boat',
        label: boat.name,
        subtitle: [
          boat.port?.city,
          dateStr,
          boat.capacity ? t('carrousel.persons', { count: boat.capacity }) : null,
          `${boat.daily_price} ${t('carrousel.perDay')}`,
        ]
          .filter(Boolean)
          .join(' · '),
        description: [shortDesc, ratingStr].filter(Boolean).join(' · '),
        img: boat.images?.[0]?.url ?? '',
        alt: t('carrousel.boatImageAlt', { name: boat.name }),
        available: boat.is_published !== false,
      };
    };

    const TYPE_LABELS = {
      voilier: t('carrousel.boatType.voilier'),
      catamaran: t('carrousel.boatType.catamaran'),
      peniche: t('carrousel.boatType.peniche'),
      moteur: t('carrousel.boatType.moteur'),
      trimaran: t('carrousel.boatType.trimaran'),
      hors_bord: t('carrousel.boatType.hors_bord'),
      jet_ski: t('carrousel.boatType.jet_ski'),
      gulet: t('carrousel.boatType.gulet'),
      sans_permis: t('carrousel.boatType.sans_permis'),
    };

    const groups = {};
    const sansPermis = [];
    for (const boat of boats) {
      if (!groups[boat.type]) groups[boat.type] = [];
      if (groups[boat.type].length < 3) groups[boat.type].push(boat);
      // "sans permis" n'est pas un type de coque : c'est license_required === false
      // (voir backend/prisma/seed.js), donc ce groupe se construit à part.
      if (boat.license_required === false && sansPermis.length < 3) sansPermis.push(boat);
    }
    groups.sans_permis = sansPermis;

    const FEATURED = ['voilier', 'jet_ski', 'sans_permis'];

    return FEATURED.filter((type) => groups[type]?.length > 0).map((type, i) => ({
      slides: groups[type].map(toTypeSlide),
      title: TYPE_LABELS[type] ?? type,
      initialSlide: 1,
      interval: 8000 + i * 500,
    }));
  }, [boats, t]);

  const carouselSections = useMemo(
    () => [
      {
        title: t('carrousel.sections.ports'),
        slides: departurePortsToSlides(ports),
        themed: true,
        variant: 'port',
      },
      {
        title: t('carrousel.sections.recent'),
        slides: boats.slice(0, 6).map((boat) => boatToSlide(boat, t)),
        linkLabel: t('carrousel.sections.recentLink'),
        variant: 'overlay',
      },
      {
        title: t('carrousel.sections.destinations'),
        slides: ports.slice(0, 7).map(portToSlide),
        linkLabel: t('carrousel.sections.destinationsLink'),
        variant: 'port',
      },
      {
        title: t('carrousel.sections.popular'),
        slides: [...boats]
          .sort((a, b) => Number(b.booking_count) - Number(a.booking_count))
          .slice(0, 5)
          .map((boat) => boatToSlide(boat, t)),
        linkLabel: t('carrousel.sections.popularLink'),
        variant: 'overlay',
      },
      {
        title: t('carrousel.sections.cheapest'),
        slides: [...boats]
          .sort((a, b) => Number(a.daily_price) - Number(b.daily_price))
          .slice(0, 5)
          .map((boat) => boatToSlide(boat, t)),
        linkLabel: t('carrousel.sections.cheapestLink'),
        variant: 'overlay',
      },
    ],
    [boats, ports, t]
  );

  // Mode « embarcations similaires » (page produit) : une seule rangée de
  // bateaux du même type ET du même port que le bateau consulté, complétée
  // par les plus populaires (si pas assez de correspondances strictes),
  // plutôt que toutes les sections d'accueil.
  const similarSlides = useMemo(() => {
    if (!similarTo) return [];
    const others = boats.filter((b) => b.id_boat !== similarTo.id);
    const related = others.filter(
      (b) => b.type === similarTo.type && similarTo.portCity && b.port?.city === similarTo.portCity
    );
    const fillers = others
      .filter((b) => !related.includes(b))
      .sort((a, b) => Number(b.booking_count) - Number(a.booking_count));
    return [...related, ...fillers].slice(0, 6).map((boat) => boatToSlide(boat, t));
  }, [boats, similarTo, t]);

  const headerTitle = theme === 'light' ? 'text-black' : 'text-white';
  const headerLink =
    theme === 'light' ? 'text-gray-600 hover:text-black' : 'text-white/70 hover:text-white';

  if (portsOnly) {
    const section = carouselSections[0];
    if (section.slides.length === 0) return null;
    return (
      <CarouselSection
        title={section.title}
        slides={section.slides}
        theme={theme}
        variant={section.variant}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
        onSlideClick={handlePortClick}
        darkHeaderAtAllBreakpoints={theme === 'dark'}
      />
    );
  }

  if (similarTo) {
    if (similarSlides.length === 0) return null;
    return (
      <CarouselSection
        title={t('carrousel.sections.similar')}
        slides={similarSlides}
        linkLabel={t('carrousel.sections.similarLink')}
        theme={theme}
        variant="overlay"
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
        onSlideClick={handleBoatClick}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Annonces du moment — carrousels 3D animés */}
      <div className="relative w-full">
        <div className="mb-3 flex flex-wrap items-baseline gap-2 sm:gap-3">
          <h2
            className={`font-semibold ${headerTitle}`}
            style={{ fontSize: '20px', lineHeight: '22px' }}
          >
            {t('carrousel.sections.current')}
          </h2>
          <Link
            to="/categorie"
            onClick={(e) => {
              if (!isPlainLeftClick(e)) return;
              e.preventDefault();
              goToCategory();
            }}
            className={`flex items-center gap-1.5 transition-colors sm:ml-4 ${headerLink}`}
            style={{ fontSize: '16px' }}
          >
            {t('carrousel.sections.currentLink')} <FaArrowRight size={10} />
          </Link>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row">
          {boatTypeSections
            .filter((s) => s.slides.length > 0)
            .map(({ slides, title, initialSlide, interval }, i) => (
              <div
                key={title}
                className={i === 0 ? 'w-full lg:flex-1' : 'hidden w-full lg:block lg:flex-1'}
              >
                <BoatTypeCarousel
                  slides={slides}
                  initialSlide={initialSlide}
                  interval={interval}
                  theme={theme}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={toggleFavorite}
                  onSlideClick={handleBoatClick}
                />
              </div>
            ))}
        </div>
      </div>

      {carouselSections
        .filter((s) => s.slides.length > 0)
        .map(({ title, slides, linkLabel, themed, variant }) => (
          <CarouselSection
            key={title}
            title={title}
            slides={slides}
            linkLabel={linkLabel}
            theme={themed || glass ? theme : 'light'}
            variant={variant}
            favoriteIds={favoriteIds}
            onToggleFavorite={toggleFavorite}
            onSlideClick={variant === 'port' ? handlePortClick : handleBoatClick}
          />
        ))}
    </div>
  );
};

export default Carrousel;
