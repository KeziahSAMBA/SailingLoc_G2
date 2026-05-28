import { useState, useCallback } from 'react';
import portBarcelone from '../../assets/image/ports/Barcelone.jpg';
import portCroatie from '../../assets/image/ports/Croatie.jpg';
import portAthenes from '../../assets/image/ports/Athènes.jpg';
import portNaples from '../../assets/image/ports/Naples.jpg';
import portGenes from '../../assets/image/ports/Gênes.jpg';
import portValence from '../../assets/image/ports/Valence.jpg';
import portBordeaux from '../../assets/image/ports/Bordeaux.jpg';
import portNice from '../../assets/image/ports/Nice.jpg';
import portBrest from '../../assets/image/ports/Brest.jpg';
import { FaChevronLeft, FaChevronRight, FaArrowRight } from 'react-icons/fa6';

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

const BoatTypeCarousel = ({ slides, title }) => {
  const maxIndex = slides.length - 1;
  const [index, setIndex] = useState(0);
  const slideWidthPct = 100 / slides.length;

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(maxIndex, i + 1)), [maxIndex]);

  return (
    <div
      className="relative flex-1 rounded-xl overflow-hidden border border-white/30"
      style={{ height: 220 }}
    >
      <div
        className="flex h-full"
        style={{
          width: `${slides.length * 100}%`,
          transform: `translateX(${-index * slideWidthPct}%)`,
          transition: 'transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="relative h-full" style={{ width: `${slideWidthPct}%` }}>
            <img
              src={slide.img}
              alt={slide.label}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/90" />
            <div className="absolute top-3 left-3">
              <div className="text-white font-bold" style={{ fontSize: '12px' }}>
                {title}
              </div>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <div className="text-white font-semibold" style={{ fontSize: '11px' }}>
                {slide.label}
              </div>
              <div className="text-white/80" style={{ fontSize: '10px', lineHeight: '14px' }}>
                {slide.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {index > 0 && (
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-1 shadow transition-colors"
          aria-label="Précédent"
        >
          <FaChevronLeft size={12} className="text-gray-700" />
        </button>
      )}

      {index < maxIndex && (
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-1 shadow transition-colors"
          aria-label="Suivant"
        >
          <FaChevronRight size={12} className="text-gray-700" />
        </button>
      )}

      <div className="absolute bottom-2 right-3 flex gap-1">
        {slides.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: index === i ? 14 : 6,
              height: 6,
              background: index === i ? 'white' : 'rgba(255,255,255,0.45)',
            }}
          />
        ))}
      </div>
    </div>
  );
};

const CarouselBoatTypes = () => (
  <div className="relative w-full">
    <div className="flex items-baseline gap-3 mb-3">
      <h2 className="font-bold text-white" style={{ fontSize: '16px', lineHeight: '22px' }}>
        Annonces du moment
      </h2>
      <button
        className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors ml-4"
        style={{ fontSize: '11px' }}
      >
        Voir plus d'annonces <FaArrowRight size={10} />
      </button>
    </div>
    <div className="flex gap-4">
      <BoatTypeCarousel slides={voilierSlides} title="Voilier" />
      <BoatTypeCarousel slides={catamaranSlides} title="Catamaran" />
      <BoatTypeCarousel slides={penicheSlides} title="Péniche" />
    </div>
  </div>
);

export default CarouselBoatTypes;
