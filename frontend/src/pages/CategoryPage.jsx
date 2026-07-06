import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bateauVideo from '../assets/video/video_bateau_3.mp4';
import bateauBg from '../assets/image/paysage/cote_azur.jpg';
import SearchBar from '../components/common/SearchBar.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import MapView from '../components/common/MapView.jsx';
import { MdPerson, MdLocationOn, MdPeople, MdCalendarToday } from 'react-icons/md';
import { FaStar } from 'react-icons/fa';
import ClientReviews from '../components/common/ClientReviews.jsx';
import Carrousel from '../components/common/Carrousel.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';
import GhostButton from '../components/common/GhostButton.jsx';
import FavoriteButton from '../components/common/FavoriteButton.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { fetchBoats } from '../services/boatService.js';
import { fetchPorts } from '../services/portService.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const toBoatCard = (boat) => ({
  id: boat.id_boat,
  image: boat.images[0]?.url ?? '',
  badge: null,
  rating: boat.avg_rating,
  type: boat.type,
  name: boat.name,
  location: boat.port?.city ?? '',
  portLat: Number(boat.port?.latitude),
  portLng: Number(boat.port?.longitude),
  capacity: boat.capacity,
  skipper: boat.with_skipper,
  licenseRequired: boat.license_required,
  bookingCount: boat.booking_count ?? 0,
  price: Number(boat.daily_price),
  availability: boat.availabilities
    .slice(0, 2)
    .map((a) => `${fmtDate(a.start_date)} – ${fmtDate(a.end_date)}`),
  rawAvailabilities: boat.availabilities,
});

// "Coup de cœur" : intersection stricte popularité + note, pas juste un seuil de
// note isolé — sinon un bateau jamais réservé mais bien noté decrocherait le badge.
// Bornes calibrées sur le seed actuel (~48 bateaux) pour retomber dans une
// fourchette de 5 à 10 bateaux ; à ajuster si le volume de données change.
const COUP_DE_COEUR_MIN_BOOKINGS = 2;
const COUP_DE_COEUR_MIN_RATING = 4;
const COUP_DE_COEUR_MAX_COUNT = 10;

function computeCoupDeCoeurIds(boats) {
  return new Set(
    boats
      .filter(
        (b) =>
          b.bookingCount >= COUP_DE_COEUR_MIN_BOOKINGS &&
          (b.rating ?? 0) >= COUP_DE_COEUR_MIN_RATING
      )
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.bookingCount - a.bookingCount)
      .slice(0, COUP_DE_COEUR_MAX_COUNT)
      .map((b) => b.id)
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BoatListingCard({
  id,
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
  isFavorite,
  onToggleFavorite,
}) {
  const { t } = useTranslation();
  return (
    <article className="relative rounded-3xl overflow-hidden border border-white/50 bg-white/20 backdrop-blur-2xl backdrop-saturate-150 hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(14,165,233,0.35)] hover:border-white/70 transition-all duration-300 group cursor-pointer shadow-[0_8px_32px_rgba(14,165,233,0.15),inset_0_1px_0_rgba(255,255,255,0.5)]">
      <div className="relative overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
        {badge && (
          <div
            className="absolute top-3 left-3 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/30"
            style={{
              backgroundColor: 'rgba(14,165,233,0.8)',
              boxShadow: '0 2px 8px rgba(14,165,233,0.5)',
            }}
          >
            {badge === 'coup_de_coeur' ? t('category.badge.topPick') : badge}
          </div>
        )}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-lg backdrop-saturate-150 border border-white/50"
          style={{
            backgroundColor: 'rgba(255,255,255,0.3)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <FaStar className="text-amber-400" style={{ fontSize: '11px' }} />
          <span className="text-xs font-semibold text-gray-800">{rating}</span>
        </div>
      </div>

      <div
        className="relative p-4 bg-white/15 backdrop-blur-xl backdrop-saturate-150 border-t border-white/30"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35)' }}
      >
        <p className="text-[10px] font-bold tracking-widest text-sky-600 uppercase mb-1">{type}</p>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight">{name}</h3>
          <FavoriteButton isFavorite={isFavorite} onToggle={() => onToggleFavorite(id)} size={18} />
        </div>
        <p className="text-xs text-gray-600 flex items-center gap-1 mb-2">
          <MdLocationOn className="text-sky-400 flex-shrink-0" />
          {location}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 pb-2 border-b border-white/40">
          <span className="flex items-center gap-1">
            <MdPeople className="text-sky-400" />
            {t('category.card.persons', { count: capacity })}
          </span>
          {skipper && (
            <span className="flex items-center gap-1">
              <MdPerson className="text-sky-400" />
              {t('category.card.skipperIncluded')}
            </span>
          )}
        </div>
        {availability?.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <MdCalendarToday className="text-sky-400 flex-shrink-0" style={{ fontSize: '12px' }} />
            {availability.map((period) => (
              <span
                key={period}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(14,165,233,0.15)',
                  color: 'rgba(3,105,161,0.95)',
                  border: '1px solid rgba(14,165,233,0.3)',
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
            <span className="text-xs text-gray-500">{t('category.card.perDay')}</span>
          </div>
          <button
            type="button"
            className="text-white text-xs font-semibold px-4 py-1.5 rounded-full transition-all backdrop-blur-md border border-white/40 bg-[rgba(14,165,233,0.55)] shadow-[0_4px_16px_rgba(14,165,233,0.35)] hover:bg-[rgba(0,78,87,0.85)] hover:border-white/20"
          >
            {t('category.card.book')}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const EMPTY_BOAT_TYPE_FILTERS = {
  voilier: false,
  catamaran: false,
  trimaran: false,
  moteur: false,
  peniche: false,
  jet_ski: false,
  hors_bord: false,
  gulet: false,
};

function CategoryPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [scrolled, setScrolled] = useState(false);
  const [ports, setPorts] = useState([]);
  const [boats, setBoats] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [mapBounds, setMapBounds] = useState(null);
  const { favoriteIds, toggleFavorite } = useFavorites();

  const [boatTypeFilters, setBoatTypeFilters] = useState(EMPTY_BOAT_TYPE_FILTERS);
  const [licenseFilter, setLicenseFilter] = useState('any');
  const [skipperFilter, setSkipperFilter] = useState('any');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('relevance');
  const [coupDeCoeurFilter, setCoupDeCoeurFilter] = useState(false);

  function resetFilters() {
    setBoatTypeFilters(EMPTY_BOAT_TYPE_FILTERS);
    setLicenseFilter('any');
    setSkipperFilter('any');
    setPriceRange({ min: '', max: '' });
    setSortBy('relevance');
    setCoupDeCoeurFilter(false);
  }

  const destinationQuery = (searchParams.get('destination') ?? '').trim().toLowerCase();
  const startQuery = searchParams.get('start');
  const endQuery = searchParams.get('end');
  const travelersQuery = Number(searchParams.get('travelers')) || null;
  const activeBoatTypes = Object.keys(boatTypeFilters).filter((key) => boatTypeFilters[key]);
  const minPrice = Number(priceRange.min) || null;
  const maxPrice = Number(priceRange.max) || null;

  const filteredBoats = boats
    .filter((boat) => {
      if (destinationQuery && !boat.location.toLowerCase().includes(destinationQuery)) return false;
      if (travelersQuery && boat.capacity < travelersQuery) return false;
      if (startQuery && endQuery) {
        const reqStart = new Date(startQuery);
        const reqEnd = new Date(endQuery);
        const hasOverlap = boat.rawAvailabilities.some((a) => {
          const availStart = new Date(a.start_date);
          const availEnd = new Date(a.end_date);
          return availStart <= reqEnd && availEnd >= reqStart;
        });
        if (!hasOverlap) return false;
      }
      if (activeBoatTypes.length > 0 && !activeBoatTypes.includes(boat.type)) return false;
      if (coupDeCoeurFilter && boat.badge !== 'coup_de_coeur') return false;
      if (skipperFilter === 'included' && !boat.skipper) return false;
      if (skipperFilter === 'excluded' && boat.skipper) return false;
      if (licenseFilter === 'not_required' && boat.licenseRequired) return false;
      if (licenseFilter === 'required' && !boat.licenseRequired) return false;
      if (minPrice && boat.price < minPrice) return false;
      if (maxPrice && boat.price > maxPrice) return false;
      if (
        mapBounds &&
        (boat.portLat < mapBounds.south ||
          boat.portLat > mapBounds.north ||
          boat.portLng < mapBounds.west ||
          boat.portLng > mapBounds.east)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'popularity') return b.bookingCount - a.bookingCount;
      return travelersQuery ? a.capacity - b.capacity : 0;
    });

  // Un port est "lancé" (marqueur coloré) dès qu'il a au moins un bateau publié ;
  // sinon il reste grisé "Bientôt disponible", quels que soient les filtres actifs.
  const launchedCities = new Set(boats.map((b) => b.location));
  const matchCountByCity = filteredBoats.reduce((acc, b) => {
    acc[b.location] = (acc[b.location] ?? 0) + 1;
    return acc;
  }, {});

  const mapMarkers = ports
    .filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)))
    .map((p) => {
      const launched = launchedCities.has(p.city);
      return {
        id: p.id_port,
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        title: p.city,
        subtitle: p.country,
        available: launched,
        badge: launched ? (matchCountByCity[p.city] ?? 0) : null,
      };
    });

  // Recadre la carte sur les ports correspondant à la destination recherchée ;
  // sans destination, on garde la vue d'ensemble (tous les marqueurs).
  const focusMapMarkers = destinationQuery
    ? mapMarkers.filter((m) => m.title.toLowerCase().includes(destinationQuery))
    : mapMarkers;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setVisibleCount(8);
  }, [searchParams.toString()]);

  useEffect(() => {
    fetchPorts()
      .then(({ data }) => setPorts(data))
      .catch(() => {});

    fetchBoats()
      .then(({ data }) => {
        const mapped = data.map(toBoatCard);
        const coupDeCoeurIds = computeCoupDeCoeurIds(mapped);
        setBoats(
          mapped.map((b) => ({
            ...b,
            badge: coupDeCoeurIds.has(b.id) ? 'coup_de_coeur' : null,
          }))
        );
      })
      .catch(() => {});
  }, []);

  return (
    <main className="w-full min-h-screen pt-20 bg-white">
      <div>
        {/* Section 0 — Vidéo derrière le header uniquement */}
        <section className="relative w-full -mt-20 overflow-hidden" style={{ height: '80px' }}>
          <video
            src={bateauVideo}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-[center_70%]"
          />
          <div className="absolute inset-0 bg-black/35" />
        </section>

        {/* Section 1 — Searchbar sticky */}
        <section
          className="z-40"
          style={{
            position: 'sticky',
            top: scrolled ? '60px' : '80px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            backgroundColor: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            transition: 'top 0.3s ease',
          }}
        >
          <div className="flex items-center gap-8 pt-8 pl-28">
            <FilterBar
              boatTypeFilters={boatTypeFilters}
              onBoatTypeChange={setBoatTypeFilters}
              licenseFilter={licenseFilter}
              onLicenseFilterChange={setLicenseFilter}
              skipperFilter={skipperFilter}
              onSkipperFilterChange={setSkipperFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              coupDeCoeurFilter={coupDeCoeurFilter}
              onCoupDeCoeurFilterChange={setCoupDeCoeurFilter}
              onReset={resetFilters}
            />
            <SearchBar />
          </div>
          <div className="pb-2 pl-28">
            <Breadcrumb />
          </div>
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

        {/* Fond photo bateau — démarre sous la searchbar, couvre listings + carrousels */}
        <div
          className="relative"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(2,44,74,0.55), rgba(2,44,74,0.35) 40%, rgba(2,44,74,0.6)), url(${bateauBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          {/* Section 2 — Listings + Carte 50/50 */}
          <div id="resultats" className="flex items-start gap-6 px-28 py-6 scroll-mt-[120px]">
            {/* Listings — 50% */}
            <div className="w-1/2 flex flex-col gap-6 relative">
              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase mb-1 underline underline-offset-4 text-sky-300">
                      {t('category.results.kicker')}
                    </p>
                    <h2 className="text-2xl font-bold text-white pt-4 uppercase tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                      {t('category.results.title')}
                    </h2>
                  </div>
                  <span className="text-sm text-white/80 font-medium pb-1">
                    {t('category.results.count', { count: filteredBoats.length })}
                  </span>
                </div>

                {filteredBoats.length === 0 ? (
                  <p className="text-sm text-white/80 py-6">{t('category.results.empty')}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredBoats.slice(0, visibleCount).map((boat) => (
                      <BoatListingCard
                        key={boat.id}
                        {...boat}
                        isFavorite={favoriteIds.has(boat.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                )}

                {visibleCount < filteredBoats.length && (
                  <div className="flex justify-center py-2">
                    <GhostButton onClick={() => setVisibleCount((n) => n + 4)}>
                      {t('category.results.loadMore')}
                    </GhostButton>
                  </div>
                )}
              </div>
            </div>

            {/* Carte — 50% */}
            <aside className="w-1/2 sticky top-24 flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-bold tracking-widest uppercase text-[rgba(14,165,233,0.95)]">
                  {t('category.map.title')}
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
                  {t('category.map.live')}
                </span>
              </div>
              <MapView
                markers={mapMarkers}
                focusMarkers={focusMapMarkers}
                className="h-[660px]"
                emptyLabel={t('category.map.empty')}
                onBoundsChange={(bounds) =>
                  setMapBounds({
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                  })
                }
              />
              <p className="text-[10px] text-gray-400 text-center px-2">{t('category.map.hint')}</p>
            </aside>
          </div>
        </div>

        {/* Section 3 — Carrousels */}
        <section
          id="suggestions"
          className="relative w-full flex flex-col gap-8 px-28 py-10 scroll-mt-[140px]"
        >
          <Carrousel theme="light" />
        </section>
      </div>

      {/* Section 4 — Avis clients */}
      <ClientReviews id="avis" className="py-10 scroll-mt-[60px]" />
    </main>
  );
}

export default CategoryPage;

//TODO : Refonte affichage produit
