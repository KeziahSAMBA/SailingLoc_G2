import { useState, useCallback } from 'react';
import portBrest from '../../assets/image/ports/Brest.webp';
import portLaRochelle from '../../assets/image/ports/La_Rochelle.webp';
import portBordeaux from '../../assets/image/ports/Bordeaux.webp';
import portNice from '../../assets/image/ports/Nice.webp';
import portMarseille from '../../assets/image/ports/Marseille.webp';
import portBarcelone from '../../assets/image/ports/Barcelone.webp';
import portValence from '../../assets/image/ports/Valence.webp';
import portGenes from '../../assets/image/ports/Gênes.webp';
import portNaples from '../../assets/image/ports/Naples.webp';
import portCroatie from '../../assets/image/ports/Croatie.webp';
import portAthenes from '../../assets/image/ports/Athènes.webp';
import { FaChevronLeft, FaChevronRight, FaArrowRight } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

const portSlides = [
  {
    id: 1,
    label: 'Marseille',
    description: 'Porte de la Méditerranée. Soleil, calanques et mer turquoise à portée de voile.',
    img: portMarseille,
    available: true,
  },
  {
    id: 2,
    label: 'Nice',
    description:
      "Côte d'Azur & baie des Anges. Naviguez entre mer cristalline et panoramas à couper le souffle.",
    img: portNice,
    available: true,
  },
  {
    id: 3,
    label: 'La Rochelle',
    description:
      "Perle de l'Atlantique. Un port historique idéal pour explorer les îles de Ré et d'Oléron.",
    img: portLaRochelle,
    available: true,
  },
  {
    id: 4,
    label: 'Brest',
    description:
      "Cap sur le Finistère. Entre rades sauvages et horizons bretons, l'aventure commence ici.",
    img: portBrest,
    available: true,
  },
  {
    id: 5,
    label: 'Bordeaux',
    description:
      'Escale sur la Garonne. Partez à la découverte du littoral atlantique depuis ce port emblématique.',
    img: portBordeaux,
    available: true,
  },
  {
    id: 6,
    label: 'Barcelone',
    description:
      'Joyau de la Méditerranée espagnole. Architecture, soleil et mer à portée de voile.',
    img: portBarcelone,
    available: false,
  },
  {
    id: 7,
    label: 'Valence',
    description: 'Sur la côte valencienne, entre plages infinies et lumière méditerranéenne.',
    img: portValence,
    available: false,
  },
  {
    id: 8,
    label: 'Gênes',
    description: "Premier port d'Italie. Porte d'entrée idéale pour longer la Riviera italienne.",
    img: portGenes,
    available: false,
  },
  {
    id: 9,
    label: 'Naples',
    description: 'Au pied du Vésuve, face au golfe le plus spectaculaire de Méditerranée.',
    img: portNaples,
    available: false,
  },
  {
    id: 10,
    label: 'Croatie',
    description: 'Des îles à perte de vue, une mer translucide. La Dalmatie vous attend.',
    img: portCroatie,
    available: false,
  },
  {
    id: 11,
    label: 'Athènes',
    description:
      'Cap sur les Cyclades. Partez depuis le Pirée vers les îles grecques les plus emblématiques.',
    img: portAthenes,
    available: false,
  },
];

const PortCarousel = ({ slides, visibleCount, imageSize = 'normal' }) => {
  const maxIndex = slides.length - visibleCount;
  const [index, setIndex] = useState(0);
  const slideWidthPct = 100 / slides.length;
  const trackWidthPct = (slides.length / visibleCount) * 100;

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
                style={{ aspectRatio: imageSize === 'small' ? '4 / 3' : '1 / 1' }}
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
                className="mt-1 text-center text-black font-semibold"
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

const CarrouselBoat = () => (
  <div className="relative w-full">
    <div className="flex items-baseline gap-3">
      <h2 className="font-semibold text-black" style={{ fontSize: '20px', lineHeight: '22px' }}>
        Choisissez votre port de départ
      </h2>
      <Link
        to="/categorie"
        className="flex items-center gap-1.5 text-gray-600 hover:text-black transition-colors ml-4"
        style={{ fontSize: '16px' }}
      >
        Voir plus <FaArrowRight size={10} />
      </Link>
    </div>
    <PortCarousel slides={portSlides} visibleCount={5} imageSize="small" />
  </div>
);

export default CarrouselBoat;
