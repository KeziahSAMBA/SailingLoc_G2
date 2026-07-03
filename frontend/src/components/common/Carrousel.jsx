import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { FaChevronLeft, FaChevronRight, FaArrowRight } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { fetchBoats } from '../../services/boatService';
import { fetchPorts } from '../../services/portService';

// ─── Transformateurs DB → slide ───────────────────────────────────────────────

const portToSlide = (port) => ({
  id: port.id_port,
  label: port.city,
  description: [port.name, port.region, port.country].filter(Boolean).join(' · '),
  img: port.image_url ?? '',
  available: port.country === 'France',
});

const boatToSlide = (boat) => {
  const nextAvail = boat.availabilities?.[0];
  const fmt = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const dateStr =
    nextAvail?.start_date && nextAvail?.end_date
      ? `${fmt(nextAvail.start_date)} - ${fmt(nextAvail.end_date)}`
      : null;
  return {
    id: boat.id_boat,
    label: boat.name,
    city: boat.port?.city ?? null,
    dateStr,
    capacity: boat.capacity ?? null,
    price: boat.daily_price,
    rating: boat.avg_rating != null ? `★ ${boat.avg_rating}` : null,
    img: boat.images?.[0]?.url ?? '',
    available: boat.is_published,
  };
};

// ─── Composant générique de carrousel ─────────────────────────────────────────

const PortCarousel = memo(
  ({ slides, visibleCount = 5, imageSize = 'small', variant = 'default' }) => {
    const maxIndex = slides.length - visibleCount;
    const [index, setIndex] = useState(0);
    const slideWidthPct = 100 / slides.length;
    const trackWidthPct = (slides.length / visibleCount) * 100;
    const aspectRatio = imageSize === 'small' ? '4 / 3' : '1 / 1';

    const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
    const next = useCallback(() => setIndex((i) => Math.min(maxIndex, i + 1)), [maxIndex]);

    return (
      <div className="relative p-4">
        {index > 0 && (
          <button
            onClick={prev}
            className="absolute left-0 z-20 bg-black/10 hover:bg-gray-300 rounded-full p-1 shadow-lg transition-colors"
            style={{ transform: 'translate(-50%, 0)', top: '40%' }}
            aria-label="Précédent"
          >
            <FaChevronLeft size={12} className="text-gray-700" />
          </button>
        )}

        <div className="overflow-hidden rounded-xl">
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
              >
                {variant === 'overlay' ? (
                  <>
                    <div
                      className="relative rounded-[8px] overflow-hidden w-full border border-black/40"
                      style={{ aspectRatio }}
                    >
                      <img
                        src={slide.img}
                        alt={slide.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                              Bientôt disponible
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5">
                      <span
                        className="font-semibold text-black truncate"
                        style={{ lineHeight: '15px' }}
                      >
                        <span style={{ fontSize: '14px' }}>{slide.label}</span>
                        {slide.city && (
                          <span className="text-gray-500" style={{ fontSize: '12px' }}>
                            {' '}
                            · {slide.city}
                          </span>
                        )}
                      </span>
                      {(slide.dateStr || slide.capacity) && (
                        <span
                          className="text-gray-600"
                          style={{ fontSize: '12px', lineHeight: '15px' }}
                        >
                          {[slide.dateStr, slide.capacity ? `${slide.capacity} pers.` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      )}
                      <span
                        className="text-gray-600"
                        style={{ fontSize: '12px', lineHeight: '15px' }}
                      >
                        {[`${slide.price} €/j`, slide.rating].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                  </>
                ) : variant === 'port' ? (
                  <div
                    className="relative rounded-[8px] overflow-hidden w-full border border-black/40"
                    style={{ aspectRatio }}
                  >
                    <img
                      src={slide.img}
                      alt={slide.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                            Bientôt disponible
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      className="relative rounded-[8px] overflow-hidden w-full border border-black/40"
                      style={{ aspectRatio }}
                    >
                      <img
                        src={slide.img}
                        alt={slide.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                              Bientôt disponible
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                    <span
                      className="mt-1 text-center font-semibold text-black"
                      style={{ fontSize: '15px', lineHeight: '18px' }}
                    >
                      {slide.label}
                    </span>
                    {slide.description && (
                      <span
                        className="text-center text-gray-600"
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
            className="absolute right-0 z-20 bg-black/10 hover:bg-gray-300 rounded-full p-1 shadow-lg transition-colors"
            style={{ transform: 'translate(50%, 0)', top: '40%' }}
            aria-label="Suivant"
          >
            <FaChevronRight size={12} className="text-gray-700" />
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
  linkLabel = 'Voir plus',
  linkTo = '/categorie',
  theme = 'light',
  variant = 'default',
}) => {
  const titleColor = theme === 'dark' ? 'text-white' : 'text-black';
  const linkColor =
    theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-black';
  return (
    <div className="relative w-full">
      <div className="flex items-baseline gap-3">
        <h2
          className={`font-semibold ${titleColor}`}
          style={{ fontSize: '20px', lineHeight: '22px' }}
        >
          {title}
        </h2>
        <Link
          to={linkTo}
          className={`flex items-center gap-1.5 transition-colors ml-4 ${linkColor}`}
          style={{ fontSize: '16px' }}
        >
          {linkLabel} <FaArrowRight size={10} />
        </Link>
      </div>
      <PortCarousel
        slides={slides}
        visibleCount={visibleCount}
        imageSize={imageSize}
        variant={variant}
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
}) {
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ];
  const rotateY = useTransform(x, range, [90, 0, -90], { clamp: false });

  return (
    <motion.div
      className="relative shrink-0 rounded-[8px] overflow-hidden border border-white/20"
      style={{ width: itemWidth, height: 220, rotateY, willChange: 'transform' }}
    >
      <div className="block w-full h-full cursor-pointer">
        <img
          src={slide.img}
          alt={slide.label}
          className="w-full h-full object-cover"
          loading={priority ? 'eager' : 'lazy'}
          fetchpriority={priority ? 'high' : 'low'}
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/90" />
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
}) {
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

  const activeIndex = (position - 1 + slides.length) % slides.length;
  const transition = isJumping ? { duration: 0 } : SPRING;

  if (!slides.length) return null;

  return (
    <div className="relative flex-1 flex flex-col items-center">
      <div
        ref={outerRef}
        className={`relative overflow-hidden rounded-[12px] p-4 flex justify-center ${theme === 'light' ? 'border border-black/10' : 'border border-white/15'}`}
        style={{ width: '100%' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Fond flouté isolé des enfants animés en 3D : évite de recomposer le blur à chaque frame de la transition. */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 ${theme === 'light' ? 'bg-black/[0.03]' : 'bg-white/5'}`}
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        />
        <button
          onClick={goPrev}
          className="absolute left-0 z-20 bg-black/20 hover:bg-black/40 rounded-full p-1 shadow-lg transition-colors"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label="Précédent"
        >
          <FaChevronLeft size={12} className="text-white" />
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
              />
            ))}
          </motion.div>
        )}
        <button
          onClick={goNext}
          className="absolute right-0 z-20 bg-black/20 hover:bg-black/40 rounded-full p-1 shadow-lg transition-colors"
          style={{ top: '50%', transform: 'translateY(-50%)' }}
          aria-label="Suivant"
        >
          <FaChevronRight size={12} className="text-white" />
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

const Carrousel = ({ theme = 'dark' }) => {
  const [boats, setBoats] = useState([]);
  const [ports, setPorts] = useState([]);

  useEffect(() => {
    fetchBoats()
      .then(({ data }) => setBoats(data))
      .catch(console.error);
    fetchPorts()
      .then(({ data }) => setPorts(data))
      .catch(console.error);
  }, []);

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
      const ratingStr = boat.avg_rating != null ? `★ ${boat.avg_rating}` : null;

      return {
        id: boat.id_boat,
        label: boat.name,
        subtitle: [
          boat.port?.city,
          dateStr,
          boat.capacity ? `${boat.capacity} pers.` : null,
          `${boat.daily_price} €/j`,
        ]
          .filter(Boolean)
          .join(' · '),
        description: [shortDesc, ratingStr].filter(Boolean).join(' · '),
        img: boat.images?.[0]?.url ?? '',
      };
    };

    const TYPE_LABELS = {
      voilier: 'Voilier',
      catamaran: 'Catamaran',
      peniche: 'Péniche',
      moteur: 'Bateau à moteur',
      trimaran: 'Trimaran',
      hors_bord: 'Hors-bord',
      jet_ski: 'Jet-ski',
      gulet: 'Gulet',
      sans_permis: 'Sans permis',
    };

    const groups = {};
    for (const boat of boats) {
      if (!groups[boat.type]) groups[boat.type] = [];
      if (groups[boat.type].length < 3) groups[boat.type].push(boat);
    }

    const FEATURED = ['voilier', 'jet_ski', 'sans_permis'];

    return FEATURED.filter((type) => groups[type]?.length > 0).map((type, i) => ({
      slides: groups[type].map(toTypeSlide),
      title: TYPE_LABELS[type] ?? type,
      initialSlide: 1,
      interval: 8000 + i * 500,
    }));
  }, [boats]);

  const carouselSections = useMemo(
    () => [
      {
        title: 'Choisissez votre port de départ',
        slides: ports
          .filter(
            (p) =>
              p.country !== 'France' ||
              ['Brest', 'La Rochelle', 'Bordeaux', 'Marseille', 'Nice'].includes(p.city)
          )
          .map(portToSlide),
        themed: true,
        variant: 'port',
      },
      {
        title: 'Annonces consultées récemment',
        slides: boats.slice(0, 6).map(boatToSlide),
        linkLabel: 'Voir toutes mes annonces',
        variant: 'overlay',
      },
      {
        title: "Destinations d'intérêt",
        slides: ports.slice(0, 7).map(portToSlide),
        linkLabel: 'Explorer les destinations',
        variant: 'port',
      },
      {
        title: 'Bateaux les plus populaires',
        slides: [...boats]
          .sort((a, b) => Number(b.daily_price) - Number(a.daily_price))
          .slice(0, 5)
          .map(boatToSlide),
        linkLabel: 'Voir le classement',
        variant: 'overlay',
      },
      {
        title: 'Locations les moins chères',
        slides: [...boats]
          .sort((a, b) => Number(a.daily_price) - Number(b.daily_price))
          .slice(0, 5)
          .map(boatToSlide),
        linkLabel: 'Voir les bons plans',
        variant: 'overlay',
      },
    ],
    [boats, ports]
  );

  const headerTitle = theme === 'light' ? 'text-black' : 'text-white';
  const headerLink =
    theme === 'light' ? 'text-gray-600 hover:text-black' : 'text-white/70 hover:text-white';

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Annonces du moment — carrousels 3D animés */}
      <div className="relative w-full">
        <div className="flex items-baseline gap-3 mb-3">
          <h2
            className={`font-semibold ${headerTitle}`}
            style={{ fontSize: '20px', lineHeight: '22px' }}
          >
            Annonces du moment
          </h2>
          <Link
            to="/categorie"
            className={`flex items-center gap-1.5 transition-colors ml-4 ${headerLink}`}
            style={{ fontSize: '16px' }}
          >
            Voir plus d'annonces <FaArrowRight size={10} />
          </Link>
        </div>
        <div className="flex gap-4">
          {boatTypeSections
            .filter((s) => s.slides.length > 0)
            .map(({ slides, title, initialSlide, interval }) => (
              <BoatTypeCarousel
                key={title}
                slides={slides}
                initialSlide={initialSlide}
                interval={interval}
                theme={theme}
              />
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
            theme={themed ? theme : 'light'}
            variant={variant}
          />
        ))}
    </div>
  );
};

export default Carrousel;
