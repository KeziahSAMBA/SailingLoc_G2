import { useState, useEffect } from 'react';
import SearchBarV2 from '../components/common/SearchBarV2.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import MapView from '../components/common/MapView.jsx';
import { MdPerson, MdLocationOn, MdPeople, MdCalendarToday } from 'react-icons/md';
import { FaStar } from 'react-icons/fa';
import ClientReviews from '../components/common/ClientReviews.jsx';
import Carrousel from '../components/common/Carrousel.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';
import { fetchBoats } from '../services/boatService.js';
import { fetchPorts } from '../services/portService.js';
// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const toBoatCard = (boat) => ({
  id: boat.id_boat,
  image: boat.images[0]?.url ?? '',
  badge: boat.avg_rating >= 4.8 ? 'Coup de cœur' : null,
  rating: boat.avg_rating,
  type: boat.type,
  name: boat.name,
  location: boat.port?.city ?? '',
  capacity: boat.capacity,
  skipper: boat.with_skipper,
  price: Number(boat.daily_price),
  availability: boat.availabilities
    .slice(0, 2)
    .map((a) => `${fmtDate(a.start_date)} – ${fmtDate(a.end_date)}`),
});

const GHOST_BTN_BASE = {
  border: '1px solid rgba(14,165,233,0.95)',
  boxShadow: '0 2px 8px rgba(10,49,114,0.3)',
  backgroundColor: '#fff',
  color: 'rgba(14,165,233,0.95)',
  transition: 'background-color 0.2s, color 0.2s, box-shadow 0.2s',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GhostButton({ children, className = '', onClick }) {
  return (
    <button
      onClick={onClick}
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

function BoatListingCard({
  image,
  badge,
  rating,
  type,
  name,
  location,
  capacity,
  skipper,
  price,
  availability,
}) {
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
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-2 pb-2 border-b border-gray-50">
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
        {availability?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <MdCalendarToday className="text-sky-400 flex-shrink-0" style={{ fontSize: '12px' }} />
            {availability.map((period) => (
              <span
                key={period}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(14,165,233,0.08)',
                  color: 'rgba(14,165,233,0.95)',
                  border: '1px solid rgba(14,165,233,0.2)',
                }}
              >
                {period}
              </span>
            ))}
          </div>
        )}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

function CategoryPage() {
  const [headerHeight, setHeaderHeight] = useState(80);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [boats, setBoats] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    const onScroll = () => setHeaderHeight(window.scrollY > 10 ? 60 : 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    fetchPorts()
      .then(({ data }) =>
        setMapMarkers(
          data
            .filter(
              (p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
            )
            .map((p) => ({
              id: p.id_port,
              lat: Number(p.latitude),
              lng: Number(p.longitude),
              title: p.city,
              subtitle: p.country,
              available: p.country === 'France',
            }))
        )
      )
      .catch(() => {});

    fetchBoats()
      .then(({ data }) => setBoats(data.map(toBoatCard)))
      .catch(() => {});
  }, []);

  return (
    <main className="w-full min-h-screen pt-20" style={{ backgroundColor: '#fff' }}>
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
          <div className="flex items-center gap-8 pt-8" style={{ paddingLeft: '112px' }}>
            <FilterBar />
            <SearchBarV2 />
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
        <div className="flex items-start gap-6 px-28 py-6">
          {/* ── Listings — 50% ───────────────────────────────────────────────── */}
          <div className="w-1/2 flex flex-col gap-6">
            {/* Section header */}
            <div className="flex items-end justify-between">
              <div>
                <p
                  className="text-xs font-bold tracking-widest uppercase mb-1 underline underline-offset-4"
                  style={{ color: 'rgba(14,165,233,0.95)' }}
                >
                  Selon vos recherches
                </p>
                <h2 className="text-2xl font-bold text-gray-900 pt-4 uppercase tracking-tight">
                  Liste des propositions
                </h2>
              </div>
              <span className="text-sm text-gray-400 font-medium pb-1">
                156 bateaux disponibles
              </span>
            </div>

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-4">
              {boats.slice(0, visibleCount).map((boat) => (
                <BoatListingCard key={boat.id} {...boat} />
              ))}
            </div>

            {/* Voir plus */}
            {visibleCount < boats.length && (
              <div className="flex justify-center py-2">
                <GhostButton onClick={() => setVisibleCount((n) => n + 4)}>
                  Voir plus d&apos;offres
                </GhostButton>
              </div>
            )}
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
              markers={mapMarkers}
              className="h-[660px]"
              emptyLabel="Aucun bateau à afficher."
            />
            <p className="text-[10px] text-gray-400 text-center px-2">
              Cliquez sur un marqueur pour voir les détails du bateau
            </p>
          </aside>
        </div>

        {/* ── Section — Carrousels bateaux & ports ─────────────────────────────── */}
        <section id="suggestions" className="relative w-full flex flex-col gap-8 px-28 py-10">
          <Carrousel theme="light" />
        </section>
      </div>
      {/* fin du wrapper sticky */}
      {/* ── Section — Avis clients ────────────────────────────────────────────── */}
      <ClientReviews id="avis" className="py-10" />
    </main>
  );
}

export default CategoryPage;
