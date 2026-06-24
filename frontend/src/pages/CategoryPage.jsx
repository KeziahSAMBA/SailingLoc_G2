import { useState, useEffect } from 'react';
import SearchBar from '../components/common/SearchBar.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import MapView from '../components/common/MapView.jsx';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { MdPerson, MdLocationOn, MdPeople } from 'react-icons/md';
import portMarseille from '../assets/image/ports/Marseille.webp';
import portNice from '../assets/image/ports/Nice.webp';
import portCroatie from '../assets/image/ports/Croatie.webp';
import portNaples from '../assets/image/ports/Naples.webp';
import CarrouselBoat from '../components/common/CarrouselBoat.jsx';
import CarouselBoatTypes from '../components/common/CarouselBoatTypes.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const BOATS = [
  {
    id: 1,
    image: portMarseille,
    badge: 'Coup de cœur',
    rating: 4.9,
    type: 'Voilier',
    name: "Oceanis 46.1 'Serenity'",
    location: 'Marseille, Vieux-Port',
    capacity: 10,
    skipper: true,
    price: 450,
  },
  {
    id: 2,
    image: portNice,
    badge: null,
    rating: 4.8,
    type: 'Catamaran',
    name: "Lagoon 42 'Horizon'",
    location: 'Ajaccio, Corse',
    capacity: 12,
    skipper: true,
    price: 850,
  },
  {
    id: 3,
    image: portCroatie,
    badge: null,
    rating: 4.7,
    type: 'Voilier',
    name: 'Sun Odyssey 410',
    location: 'Hyères, Port-Cros',
    capacity: 8,
    skipper: true,
    price: 390,
  },
  {
    id: 4,
    image: portNaples,
    badge: 'Coup de cœur',
    rating: 5,
    type: 'Yacht',
    name: "Azimut 60 'Luxury'",
    location: 'Saint-Tropez, Var',
    capacity: 15,
    skipper: true,
    price: 2400,
  },
];

const REVIEWS = [
  {
    id: 1,
    name: 'Julien Morel',
    rating: 5,
    date: 'Il y a 2 semaines',
    text: "Une expérience incroyable en Corse. Le Lagoon 42 était dans un état impeccable. L'équipe de SailingLoc est d'un professionnalisme rare.",
  },
  {
    id: 2,
    name: 'Sophie Durant',
    rating: 4,
    date: 'Il y a 3 mois',
    text: 'Très beau voilier pour une sortie entre amis. Le processus de réservation est fluide et transparent. Je recommande sans hésiter.',
  },
  {
    id: 3,
    name: 'Marc Lefebvre',
    rating: 5,
    date: 'Il y a 1 mois',
    text: "Navigation parfaite autour des îles d'Hyères. Le skipper était aux petits soins et très professionnel. Une semaine mémorable !",
  },
  {
    id: 4,
    name: 'Camille Rousseau',
    rating: 4,
    date: 'Il y a 2 mois',
    text: "Super yacht, très bien équipé. L'embarquement à Saint-Tropez était impeccable. Je reviendrai l'été prochain sans hésiter.",
  },
  {
    id: 5,
    name: 'Antoine Bernard',
    rating: 5,
    date: 'Il y a 5 jours',
    text: "Week-end en catamaran depuis Marseille, une réussite totale. Réservation simple, bateau conforme aux photos. Bravo à toute l'équipe.",
  },
  {
    id: 6,
    name: 'Léa Martin',
    rating: 4,
    date: 'Il y a 6 semaines',
    text: 'Magnifique voilier pour un séjour en famille. Les enfants ont adoré. La plateforme est intuitive et le service client très réactif.',
  },
];

const MAP_MARKERS = [
  { id: 1, lat: 43.3, lng: 5.37, title: 'Oceanis 46.1', subtitle: 'Marseille, Vieux-Port' },
  { id: 2, lat: 41.93, lng: 8.74, title: "Lagoon 42 'Horizon'", subtitle: 'Ajaccio, Corse' },
  { id: 3, lat: 43.12, lng: 6.13, title: 'Sun Odyssey 410', subtitle: 'Hyères, Port-Cros' },
  { id: 4, lat: 43.27, lng: 6.64, title: "Azimut 60 'Luxury'", subtitle: 'Saint-Tropez, Var' },
];

const reviewsCSS = `
  @keyframes scrollReviews {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .category-carousel-types > div > div:first-child > h2 {
    color: #000 !important;
  }
  .category-carousel-types > div > div:first-child > button {
    color: #4b5563 !important;
  }
  .category-carousel-types > div > div:first-child > button:hover {
    color: #000 !important;
  }
  .category-carousel-types > div > div:last-child > div > div:first-child {
    background-color: rgba(0, 0, 0, 0.05) !important;
    border-color: rgba(0, 0, 0, 0.1) !important;
  }
`;

const GHOST_BTN_BASE = {
  border: '1px solid rgba(14,165,233,0.95)',
  boxShadow: '0 2px 8px rgba(10,49,114,0.3)',
  backgroundColor: '#fff',
  color: 'rgba(14,165,233,0.95)',
  transition: 'background-color 0.2s, color 0.2s, box-shadow 0.2s',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GhostButton({ children, className = '' }) {
  return (
    <button
      className={`flex items-center gap-2 px-8 py-2.5 rounded-full text-sm font-medium whitespace-nowrap ${className}`}
      style={GHOST_BTN_BASE}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.95)';
        e.currentTarget.style.color = '#fff';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#fff';
        e.currentTarget.style.color = 'rgba(14,165,233,0.95)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(10,49,114,0.3)';
      }}
    >
      {children}
    </button>
  );
}

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) =>
        i < Math.round(rating) ? (
          <FaStar key={i} className="text-amber-400" style={{ fontSize: '10px' }} />
        ) : (
          <FaRegStar key={i} className="text-amber-400" style={{ fontSize: '10px' }} />
        )
      )}
    </div>
  );
}

function BoatListingCard({ image, badge, rating, type, name, location, capacity, skipper, price }) {
  return (
    <article
      className="rounded-2xl overflow-hidden border border-gray-100 bg-white hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(14,165,233,0.35)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.1)')}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {badge && (
          <div
            className="absolute top-3 left-3 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
            style={{
              backgroundColor: 'rgba(14,165,233,0.95)',
              boxShadow: '0 2px 8px rgba(14,165,233,0.5)',
            }}
          >
            {badge}
          </div>
        )}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-1"
          style={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}
        >
          <FaStar className="text-amber-400" style={{ fontSize: '11px' }} />
          <span className="text-xs font-semibold text-gray-700">{rating}</span>
        </div>
      </div>

      <div className="p-4">
        <p className="text-[10px] font-bold tracking-widest text-sky-500 uppercase mb-1">{type}</p>
        <h3 className="text-[15px] font-bold text-gray-900 mb-1 leading-tight">{name}</h3>
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
          <MdLocationOn className="text-sky-400 flex-shrink-0" />
          {location}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3 pb-3 border-b border-gray-50">
          <span className="flex items-center gap-1">
            <MdPeople className="text-sky-300" />
            {capacity} Pers.
          </span>
          {skipper && (
            <span className="flex items-center gap-1">
              <MdPerson className="text-sky-300" />
              Skipper inclus
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold text-gray-900">{price}€</span>
            <span className="text-xs text-gray-400">/jour</span>
          </div>
          <button
            className="text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-colors"
            style={{ backgroundColor: 'rgba(14,165,233,0.95)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(0,78,87)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(14,165,233,0.95)')}
          >
            Réserver
          </button>
        </div>
      </div>
    </article>
  );
}

function ReviewCard({ name, rating, date, text }) {
  return (
    <div
      className="flex flex-col gap-3 p-5 rounded-2xl bg-white border border-gray-100 hover:-translate-y-0.5 transition-all duration-300"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 24px rgba(14,165,233,0.2)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)')}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ background: 'rgba(14,165,233,0.85)' }}
        >
          <MdPerson className="text-lg" />
        </div>
        <div>
          <span className="text-gray-800 font-semibold text-sm block leading-tight">{name}</span>
          <span className="text-gray-400 text-xs">{date}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StarRating rating={rating} />
        <span className="text-gray-500 text-xs">{rating}/5</span>
      </div>
      <p className="text-gray-600 text-xs leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CategoryPage() {
  const [headerHeight, setHeaderHeight] = useState(80);

  useEffect(() => {
    const onScroll = () => setHeaderHeight(window.scrollY > 10 ? 60 : 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="w-full min-h-screen pt-20" style={{ backgroundColor: '#fff' }}>
      <style>{reviewsCSS}</style>
      {/* Wrapper pour limiter le sticky avant la section avis */}
      <div>
        {/*section 1 - searchbar*/}
        <section
          className="z-40"
          style={{
            position: 'sticky',
            top: `${headerHeight}px`,
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            backgroundColor: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(5px)',
            transition: 'top 0.3s ease',
          }}
        >
          {/* Ligne 1 : FilterBar + SearchBar */}
          <div className="flex items-center gap-8 pt-8 pb-1" style={{ paddingLeft: '112px' }}>
            <FilterBar />
            <div>
              <SearchBar />
            </div>
          </div>

          {/* Ligne 2 : Breadcrumb aligné sous le FilterBar */}
          <div className="pb-2" style={{ paddingLeft: '112px' }}>
            <Breadcrumb />
          </div>

          {/* Blur strip — fondu sous la searchbar */}
          <div
            style={{
              position: 'absolute',
              bottom: '-28px',
              left: 0,
              right: 0,
              height: '28px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        </section>

        {/* ── Listings + Carte 50/50 ───────────────────────────────────────────── */}
        <div
          className="flex items-start gap-6 px-6 py-6"
          style={{ maxWidth: '1600px', margin: '0 auto' }}
        >
          {/* ── Listings — 50% ───────────────────────────────────────────────── */}
          <div className="w-1/2 flex flex-col gap-6">
            {/* Section header */}
            <div className="flex items-end justify-between">
              <div>
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-1 underline underline-offset-4"
                  style={{ color: 'rgba(14,165,233,0.95)' }}
                >
                  Nos recommandations
                </p>
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">
                  Liste des propositions
                </h1>
              </div>
              <span className="text-sm text-gray-400 font-medium pb-1">
                156 bateaux disponibles
              </span>
            </div>

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-4">
              {BOATS.map((boat) => (
                <BoatListingCard key={boat.id} {...boat} />
              ))}
            </div>

            {/* Voir plus */}
            <div className="flex justify-center py-2">
              <GhostButton>Voir plus d&apos;offres</GhostButton>
            </div>
          </div>

          {/* ── Carte — 50% ──────────────────────────────────────────────────── */}
          <aside className="w-1/2 sticky top-24 flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <p
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: 'rgba(14,165,233,0.95)' }}
              >
                Carte Interactive
              </p>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5"
                style={{
                  backgroundColor: 'rgba(34,197,94,0.12)',
                  color: '#16a34a',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Mise à jour Live
              </span>
            </div>
            <MapView
              markers={MAP_MARKERS}
              className="h-[660px]"
              emptyLabel="Aucun bateau à afficher."
            />
            <p className="text-[10px] text-gray-400 text-center px-2">
              Cliquez sur un marqueur pour voir les détails du bateau
            </p>
          </aside>
        </div>

        {/* ── Section — Carrousels bateaux & ports ─────────────────────────────── */}
        <section
          id="suggestions"
          className="relative w-full min-h-screen flex flex-col justify-center gap-10 px-28 py-16 bg-white"
        >
          <div className="w-full flex flex-col gap-10 py-10">
            <div className="category-carousel-types">
              <CarouselBoatTypes />
            </div>
            <CarrouselBoat />
          </div>
        </section>
      </div>
      {/* fin du wrapper sticky */}

      {/* ── Section — Avis clients ────────────────────────────────────────────── */}
      <section
        id="avis"
        className="w-full bg-white flex flex-col items-center justify-center gap-6 px-28 py-16 min-h-screen"
      >
        <div className="text-center mb-4">
          <h2 className="text-md font-semibold tracking-widest text-sky-500 uppercase mb-6 underline underline-offset-4">
            Avis clients
          </h2>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900">
            Ce que nos navigateurs disent de nous
          </h1>
        </div>

        <div className="flex flex-col gap-6 w-full">
          {[
            { reviews: REVIEWS.slice(0, 3), direction: 'normal' },
            { reviews: REVIEWS.slice(3), direction: 'reverse' },
          ].map(({ reviews, direction }, rowIdx) => {
            const duration = Math.max(reviews.length, 1) * 15;
            return (
              <div
                key={rowIdx}
                className="w-full overflow-x-hidden py-4"
                style={{
                  maskImage:
                    'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.querySelector('.reviews-track').style.animationPlayState =
                    'paused';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.querySelector('.reviews-track').style.animationPlayState =
                    'running';
                }}
              >
                <div
                  className="reviews-track flex gap-6 w-max"
                  style={{
                    animation: `scrollReviews ${duration}s linear infinite ${direction}`,
                  }}
                >
                  {[...reviews, ...reviews, ...reviews, ...reviews].map((review, i) => (
                    <ReviewCard key={i} {...review} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default CategoryPage;
