import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

const boatToSlide = (boat, descFn) => ({
  id: boat.id_boat,
  label: boat.name,
  description: descFn ? descFn(boat) : `${boat.port?.city ?? ''} · ${boat.daily_price} €/jour`,
  img: boat.images?.[0]?.url ?? '',
  available: boat.is_published,
});

// ─── Composant générique de carrousel ─────────────────────────────────────────

const PortCarousel = ({ slides, visibleCount = 5, imageSize = 'small' }) => {
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
          }}
        >
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="flex flex-col cursor-pointer group px-1.5"
              style={{ width: `${slideWidthPct}%` }}
            >
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
};

const CarouselSection = ({
  title,
  slides,
  visibleCount = 5,
  imageSize = 'small',
  linkLabel = 'Voir plus',
  linkTo = '/categorie',
  theme = 'light',
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
      <PortCarousel slides={slides} visibleCount={visibleCount} imageSize={imageSize} />
    </div>
  );
};

// ─── BoatTypeCarousel (animations 3D) ─────────────────────────────────────────

const GAP = 16;
const PADDING = 16;
const SPRING = { type: 'spring', stiffness: 40, damping: 20 };

function SlideItem({ slide, index, itemWidth, trackItemOffset, x, title }) {
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ];
  const rotateY = useTransform(x, range, [90, 0, -90], { clamp: false });

  return (
    <motion.div
      className="relative shrink-0 rounded-[8px] overflow-hidden border border-white/20"
      style={{ width: itemWidth, height: 220, rotateY }}
    >
      <div className="block w-full h-full cursor-pointer">
        <img
          src={slide.img}
          alt={slide.label}
          className="w-full h-full object-cover"
          loading="lazy"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/90" />
        <div
          className="absolute top-3 left-3 text-white font-semibold"
          style={{ fontSize: '15px' }}
        >
          {title}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="text-white font-semibold" style={{ fontSize: '14px' }}>
            {slide.label}
          </div>
          <div className="text-white/80" style={{ fontSize: '13px', lineHeight: '16px' }}>
            {slide.description}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BoatTypeCarousel({
  slides,
  title,
  initialSlide = 1,
  interval = 4000,
  isHovered,
  onHoverChange,
  theme = 'dark',
}) {
  const outerRef = useRef(null);
  const [itemWidth, setItemWidth] = useState(0);
  const trackItemOffset = itemWidth + GAP;

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => setItemWidth(el.clientWidth - PADDING * 2);
    measure();
    const ro = new window.ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const itemsForRender = useMemo(() => [slides[slides.length - 1], ...slides, slides[0]], [slides]);
  const [position, setPosition] = useState(initialSlide);
  const [isJumping, setIsJumping] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const x = useMotionValue(0);

  useEffect(() => {
    setPosition(initialSlide);
    x.set(-initialSlide * trackItemOffset);
  }, [slides.length, trackItemOffset]);

  useEffect(() => {
    if (isHovered || itemsForRender.length <= 1) return;
    const timer = setInterval(() => {
      setPosition((p) => Math.min(p + 1, itemsForRender.length - 1));
    }, interval);
    return () => clearInterval(timer);
  }, [isHovered, itemsForRender.length, interval]);

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
        className={`relative overflow-hidden rounded-[12px] p-4 flex justify-center ${theme === 'light' ? 'border border-black/10 bg-black/[0.03]' : 'border border-white/15 bg-white/5'}`}
        style={{ width: '100%', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
      >
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
                title={title}
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
}

// ─── Composant principal ──────────────────────────────────────────────────────

const Carrousel = ({ theme = 'dark' }) => {
  const [isHovered, setIsHovered] = useState(false);
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
    const toTypeSlide = (boat) => ({
      id: boat.id_boat,
      label: boat.name,
      description: boat.description ?? '',
      img: boat.images?.[0]?.url ?? '',
    });
    return [
      {
        slides: boats
          .filter((b) => b.type === 'voilier' && b.images?.length)
          .slice(0, 3)
          .map(toTypeSlide),
        title: 'Voilier',
        initialSlide: 1,
        interval: 4000,
      },
      {
        slides: boats
          .filter((b) => b.type === 'catamaran' && b.images?.length)
          .slice(0, 3)
          .map(toTypeSlide),
        title: 'Catamaran',
        initialSlide: 1,
        interval: 5000,
      },
      {
        slides: boats
          .filter((b) => b.type === 'peniche' && b.images?.length)
          .slice(0, 3)
          .map(toTypeSlide),
        title: 'Péniche',
        initialSlide: 1,
        interval: 4500,
      },
    ];
  }, [boats]);

  const carouselSections = useMemo(
    () => [
      {
        title: 'Choisissez votre port de départ',
        slides: ports.map(portToSlide),
        themed: true,
      },
      {
        title: 'Annonces consultées récemment',
        slides: boats.slice(0, 6).map((b) => boatToSlide(b)),
        linkLabel: 'Voir toutes mes annonces',
      },
      {
        title: "Destinations d'intérêt",
        slides: ports.slice(0, 7).map(portToSlide),
        linkLabel: 'Explorer les destinations',
      },
      {
        title: 'Bateaux les plus populaires',
        slides: [...boats]
          .sort((a, b) => Number(b.daily_price) - Number(a.daily_price))
          .slice(0, 5)
          .map((b) => boatToSlide(b, (boat) => `★★★★★ · ${boat.port?.city ?? ''}`)),
        linkLabel: 'Voir le classement',
      },
      {
        title: 'Locations les moins chères',
        slides: [...boats]
          .sort((a, b) => Number(a.daily_price) - Number(b.daily_price))
          .slice(0, 5)
          .map((b) => boatToSlide(b, (boat) => `À partir de ${boat.daily_price} €/jour`)),
        linkLabel: 'Voir les bons plans',
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
                title={title}
                initialSlide={initialSlide}
                interval={interval}
                isHovered={isHovered}
                onHoverChange={setIsHovered}
                theme={theme}
              />
            ))}
        </div>
      </div>

      {carouselSections
        .filter((s) => s.slides.length > 0)
        .map(({ title, slides, linkLabel, themed }) => (
          <CarouselSection
            key={title}
            title={title}
            slides={slides}
            linkLabel={linkLabel}
            theme={themed ? theme : 'light'}
          />
        ))}
    </div>
  );
};

export default Carrousel;
