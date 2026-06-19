import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import portBarcelone from '../../assets/image/ports/Barcelone.webp';
import portCroatie from '../../assets/image/ports/Croatie.webp';
import portAthenes from '../../assets/image/ports/Athènes.webp';
import portNaples from '../../assets/image/ports/Naples.webp';
import portGenes from '../../assets/image/ports/Gênes.webp';
import portValence from '../../assets/image/ports/Valence.webp';
import portBordeaux from '../../assets/image/ports/Bordeaux.webp';
import portNice from '../../assets/image/ports/Nice.webp';
import portBrest from '../../assets/image/ports/Brest.webp';
import { FaArrowRight } from 'react-icons/fa6';

const voilierSlides = [
  {
    id: 1,
    label: 'Voilier classique',
    description: 'Idéal pour les balades en mer en toute simplicité.',
    img: portBarcelone,
  },
  {
    id: 2,
    label: 'Voilier de croisière',
    description: 'Confortable et spacieux pour les longues traversées.',
    img: portCroatie,
  },
  {
    id: 3,
    label: 'Voilier de régate',
    description: 'Rapide et nerveux, taillé pour la compétition.',
    img: portAthenes,
  },
];

const catamaranSlides = [
  {
    id: 1,
    label: 'Catamaran habitable',
    description: 'Stabilité et confort pour toute la famille.',
    img: portNaples,
  },
  {
    id: 2,
    label: 'Catamaran de sport',
    description: "Sensations fortes et grande vitesse sur l'eau.",
    img: portGenes,
  },
  {
    id: 3,
    label: 'Catamaran de luxe',
    description: "Prestations haut de gamme pour une croisière d'exception.",
    img: portValence,
  },
];

const penicheSlides = [
  {
    id: 1,
    label: 'Péniche fluviale',
    description: 'Découvrez les canaux et rivières à votre rythme.',
    img: portBordeaux,
  },
  {
    id: 2,
    label: 'Péniche aménagée',
    description: "Tout le confort d'un logement sur l'eau.",
    img: portNice,
  },
  {
    id: 3,
    label: 'Péniche de croisière',
    description: 'Explorez la France par ses voies navigables.',
    img: portBrest,
  },
];

const GAP = 16;
const PADDING = 16;
const SPRING = { type: 'spring', stiffness: 40, damping: 20 };
const VELOCITY_THRESHOLD = 500;

function SlideItem({ slide, index, itemWidth, trackItemOffset, x, title }) {
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ];
  const rotateY = useTransform(x, range, [90, 0, -90], { clamp: false });

  return (
    <motion.div
      className="relative shrink-0 rounded-[8px] overflow-hidden border border-white/20 cursor-grab active:cursor-grabbing"
      style={{ width: itemWidth, height: 220, rotateY }}
    >
      <img
        src={slide.img}
        alt={slide.label}
        className="w-full h-full object-cover"
        loading="lazy"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/90" />
      <div className="absolute top-3 left-3 text-white font-semibold" style={{ fontSize: '15px' }}>
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
}) {
  const outerRef = useRef(null);
  const [itemWidth, setItemWidth] = useState(0);
  const trackItemOffset = itemWidth + GAP;

  // Mesure synchrone à la première peinture
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
    const startingPosition = initialSlide;
    setPosition(startingPosition);
    x.set(-startingPosition * trackItemOffset);
  }, [slides.length, trackItemOffset]);

  // Autoplay
  useEffect(() => {
    if (isHovered || itemsForRender.length <= 1) return;
    const timer = setInterval(() => {
      setPosition((p) => Math.min(p + 1, itemsForRender.length - 1));
    }, interval);
    return () => clearInterval(timer);
  }, [isHovered, itemsForRender.length, interval]);

  const transition = isJumping ? { duration: 0 } : SPRING;

  const handleAnimationComplete = () => {
    const lastClone = itemsForRender.length - 1;
    if (position === lastClone) {
      setIsJumping(true);
      setPosition(1);
      x.set(-1 * trackItemOffset);
      window.requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
    } else if (position === 0) {
      setIsJumping(true);
      setPosition(slides.length);
      x.set(-slides.length * trackItemOffset);
      window.requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
    } else {
      setIsAnimating(false);
    }
  };

  const handleDragEnd = (_, info) => {
    const { offset, velocity } = info;
    const dir =
      offset.x < 0 || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > 0 || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;
    if (dir !== 0) setPosition((p) => Math.max(0, Math.min(p + dir, itemsForRender.length - 1)));
  };

  const activeIndex = (position - 1 + slides.length) % slides.length;

  return (
    <div className="relative flex-1 flex flex-col items-center">
      <div
        ref={outerRef}
        className="relative overflow-hidden rounded-[12px] border border-white/15 p-4 flex justify-center bg-white/5"
        style={{ width: '100%', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
      >
        {itemWidth > 0 && (
          <motion.div
            className="flex"
            drag={isAnimating ? false : 'x'}
            dragConstraints={{}}
            style={{
              width: itemWidth,
              gap: `${GAP}px`,
              perspective: 800,
              perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
              x,
            }}
            onDragEnd={handleDragEnd}
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

const CarouselBoatTypes = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative w-full">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="font-semibold text-white" style={{ fontSize: '20px', lineHeight: '22px' }}>
          Annonces du moment
        </h2>
        <button
          className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors ml-4"
          style={{ fontSize: '16px' }}
        >
          Voir plus d'annonces <FaArrowRight size={10} />
        </button>
      </div>
      <div className="flex gap-4">
        <BoatTypeCarousel
          slides={voilierSlides}
          title="Voilier"
          initialSlide={1}
          interval={4000}
          isHovered={isHovered}
          onHoverChange={setIsHovered}
        />
        <BoatTypeCarousel
          slides={catamaranSlides}
          title="Catamaran"
          initialSlide={3}
          interval={5000}
          isHovered={isHovered}
          onHoverChange={setIsHovered}
        />
        <BoatTypeCarousel
          slides={penicheSlides}
          title="Péniche"
          initialSlide={2}
          interval={4500}
          isHovered={isHovered}
          onHoverChange={setIsHovered}
        />
      </div>
    </div>
  );
};

export default CarouselBoatTypes;
// TODO: Faire effet vitre sur les carrousels
