import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bateauBg from '../assets/image/paysage/cote_azur.jpg';
import SearchBar from '../components/common/SearchBar.jsx';
import FilterBar from '../components/common/FilterBar.jsx';
import MapView from '../components/common/MapView.jsx';
import { MdLocationOn, MdPeople, MdCalendarToday } from 'react-icons/md';
import { FaCrown } from 'react-icons/fa';
import ClientReviews from '../components/common/ClientReviews.jsx';
import Carrousel from '../components/common/Carrousel.jsx';
import Breadcrumb from '../components/common/FilAriane.jsx';
import GhostButton from '../components/common/GhostButton.jsx';
import FavoriteButton from '../components/common/FavoriteButton.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { fetchBoats } from '../services/boatService.js';
import { fetchPorts } from '../services/portService.js';
import { trackSiteSearch } from '../utils/matomo.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const toBoatCard = (boat) => ({
  id: boat.id_boat,
  image: boat.images[0]?.url ?? '',
  badge: null,
  rating: boat.avg_rating,
  reviewCount: boat.review_count ?? 0,
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

// Les coordonnées GPS des ports (seed) tombent parfois côté ville plutôt que sur le
// bassin portuaire lui-même (pas de tracé terre/eau pour corriger ça automatiquement) ;
// petits décalages manuels fournis pour recentrer sur le port réel.
const PORT_POSITION_OFFSETS = {
  Bordeaux: { dLat: 0, dLng: 0.002536 }, // 150m est + 50m est
  Marseille: { dLat: -0.005718, dLng: -0.010944 }, // 900m sud-ouest + 250m ouest
  Nice: { dLat: -0.007174, dLng: 0.01053 }, // 1200m sud-est + 50m nord
  'La Rochelle': { dLat: 0, dLng: 0.000648 }, // 50m est
  Brest: { dLat: 0, dLng: -0.000677 }, // 50m ouest
};

function correctPortPosition(city, lat, lng) {
  const offset = PORT_POSITION_OFFSETS[city];
  if (!offset) return { lat, lng };
  return { lat: lat + offset.dLat, lng: lng + offset.dLng };
}

// Dispersion artificielle des bateaux autour de leur port : les coordonnées GPS
// réelles ne sont connues qu'au niveau du port (tous les bateaux d'un même port
// partagent exactement la même position), donc pour l'affichage carte "pins bateaux"
// au fort zoom on répartit chaque bateau à un point pseudo-aléatoire mais stable
// (dérivé de son id) dans un rayon d'environ 45m autour du point corrigé du port — on
// n'a pas de tracé terre/eau donc on reste très serré sur le port lui-même plutôt que
// de risquer de déborder sur la ville ou le large.
const BOAT_SCATTER_RADIUS_DEG = 0.0004;

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function scatterBoatPosition(id, portLat, portLng) {
  const angle = pseudoRandom(id * 12.9898) * 2 * Math.PI;
  const radius = Math.sqrt(pseudoRandom(id * 78.233));
  const latRad = (portLat * Math.PI) / 180;
  return {
    lat: portLat + radius * BOAT_SCATTER_RADIUS_DEG * Math.sin(angle),
    lng: portLng + (radius * BOAT_SCATTER_RADIUS_DEG * Math.cos(angle)) / Math.cos(latRad),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BoatListingCard({
  id,
  image,
  badge,
  rating,
  reviewCount,
  type,
  name,
  location,
  capacity,
  skipper,
  licenseRequired,
  price,
  availability,
  isFavorite,
  onToggleFavorite,
  highlighted,
  onSelect,
}) {
  const { t } = useTranslation();
  return (
    <article
      id={`boat-${id}`}
      onClick={() => onSelect?.(id)}
      className={`relative rounded-3xl overflow-hidden border hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(14,165,233,0.35)] hover:border-white/70 transition-all duration-300 group cursor-pointer shadow-[0_8px_32px_rgba(14,165,233,0.15),inset_0_1px_0_rgba(255,255,255,0.5)] ${highlighted ? 'border-sky-400 ring-4 ring-sky-400/60' : 'border-white/50'}`}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '7/5' }}>
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
        {badge && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1 text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/30"
            style={{
              backgroundColor: 'rgba(14,165,233,0.8)',
              boxShadow: '0 2px 8px rgba(14,165,233,0.5)',
            }}
          >
            <FaCrown style={{ fontSize: '9px' }} />
            {badge === 'coup_de_coeur' ? t('category.badge.topPick') : badge}
          </div>
        )}
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(id)}
          size={26}
          className="absolute top-3 right-3 z-10"
        />
      </div>

      <div
        className="relative p-3 border-t"
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderColor: 'rgba(255,255,255,0.3)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Nom + type */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-baseline gap-1 min-w-0">
            <h3 className="text-[15px] font-bold text-white leading-tight truncate">{name}</h3>
            <span className="text-white/50 flex-shrink-0">-</span>
            <span className="text-[10px] font-bold tracking-widest text-sky-500 uppercase flex-shrink-0">
              {type}
            </span>
          </div>
          <span className="text-xs font-semibold text-white flex-shrink-0">
            {rating != null ? (
              <>
                <span className="text-amber-400">★</span> {rating}
                {reviewCount > 0 && <span className="text-white/70"> ({reviewCount})</span>}
              </>
            ) : (
              t('category.card.new')
            )}
          </span>
        </div>

        {/* Lieu + dates */}
        <div className="flex items-center justify-between gap-1 mb-2 pb-2 border-b border-white/40">
          <span className="text-xs text-white/80 flex items-center gap-1 min-w-0">
            <MdLocationOn className="text-sky-500 flex-shrink-0" style={{ fontSize: '13px' }} />
            <span className="truncate">{location}</span>
          </span>
          {availability?.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap justify-end flex-shrink-0">
              <MdCalendarToday
                className="text-sky-500 flex-shrink-0"
                style={{ fontSize: '12px' }}
              />
              {availability.map((period) => (
                <span
                  key={period}
                  className="text-[10px] font-medium px-1 py-0.5 rounded-full backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(14,165,233,0.15)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {period}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Personnes + badges skipper/permis */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="flex items-center gap-1 text-xs text-white/70 flex-shrink-0">
            <MdPeople className="text-sky-500" style={{ fontSize: '14px' }} />
            {t('category.card.persons', { count: capacity })}
          </span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <span
              className="text-[9px] font-medium px-1 py-0.5 rounded-full backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(14,165,233,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {skipper ? t('category.card.skipperIncluded') : t('category.card.skipperExcluded')}
            </span>
            <span
              className="text-[9px] font-medium px-1 py-0.5 rounded-full backdrop-blur-md"
              style={{
                backgroundColor: 'rgba(14,165,233,0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {licenseRequired
                ? t('category.card.licenseRequired')
                : t('category.card.noLicenseRequired')}
            </span>
          </div>
        </div>

        {/* Prix + Réserver */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[15px] font-bold text-white">{price} €</span>
            <span className="text-xs text-white/70">{t('category.card.perDay')}</span>
          </div>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="text-white text-[11px] font-semibold px-2 py-1 rounded-full transition-all backdrop-blur-md border border-white/40 bg-[rgba(14,165,233,0.55)] shadow-[0_4px_16px_rgba(14,165,233,0.35)] hover:bg-[rgba(10,49,114,0.95)] hover:border-white/20"
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
  // Header fixe (60/80px) + barre filtre/recherche/fil d'ariane sticky (~116px) :
  // offset réel au-dessus de la carte, pour qu'elle tienne entière dans l'écran visible.
  const mapStickyTop = (scrolled ? 60 : 80) + 116;
  const [ports, setPorts] = useState([]);
  const [boats, setBoats] = useState([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [mapBounds, setMapBounds] = useState(null);
  const [highlightedBoatId, setHighlightedBoatId] = useState(null);
  const [focusBoat, setFocusBoat] = useState(null);
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

  // Matomo « Recherches sur le site » : une entrée par destination cherchée,
  // avec le nombre de bateaux correspondants (no-op sans consentement analytics).
  useEffect(() => {
    if (!destinationQuery || boats.length === 0) return;
    const results = boats.filter((b) => b.location.toLowerCase().includes(destinationQuery)).length;
    trackSiteSearch(destinationQuery, results);
  }, [destinationQuery, boats]);
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
      if (mapBounds) {
        const { lat, lng } = correctPortPosition(boat.location, boat.portLat, boat.portLng);
        if (
          lat < mapBounds.south ||
          lat > mapBounds.north ||
          lng < mapBounds.west ||
          lng > mapBounds.east
        )
          return false;
      }
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
      const { lat, lng } = correctPortPosition(p.city, Number(p.latitude), Number(p.longitude));
      return {
        id: p.id_port,
        lat,
        lng,
        title: p.city,
        subtitle: p.country,
        available: launched,
        badge: launched ? (matchCountByCity[p.city] ?? 0) : null,
      };
    });

  // Recadre la carte sur les ports correspondant à la destination recherchée ;
  // sans destination, on recadre sur les ports disponibles (tous en France pour
  // l'instant) plutôt que sur l'ensemble des ports (dont certains à l'étranger,
  // "bientôt disponibles"), qui ferait dézoomer inutilement sur toute l'Europe.
  const focusMapMarkers = destinationQuery
    ? mapMarkers.filter((m) => m.title.toLowerCase().includes(destinationQuery))
    : mapMarkers.filter((m) => m.available);

  // Pins bateaux individuels (avec prix), affichés par MapView au-delà d'un certain
  // niveau de zoom — dispersés artificiellement autour du port (cf. scatterBoatPosition).
  const boatMapMarkers = filteredBoats
    .filter((b) => Number.isFinite(b.portLat) && Number.isFinite(b.portLng))
    .map((b) => {
      const { lat, lng } = correctPortPosition(b.location, b.portLat, b.portLng);
      return {
        id: b.id,
        ...scatterBoatPosition(b.id, lat, lng),
        price: b.price,
        name: b.name,
        city: b.location,
      };
    });

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

  // Clic sur un pin bateau : révèle la carte correspondante dans la liste (en
  // augmentant visibleCount si besoin) puis scroll+surligne dessus.
  function handleBoatMapSelect(boat) {
    const idx = filteredBoats.findIndex((b) => b.id === boat.id);
    if (idx === -1) return;
    if (idx >= visibleCount) setVisibleCount(idx + 1);
    setHighlightedBoatId(boat.id);
  }

  // Clic sur une fiche produit : zoome la carte sur le pin bateau correspondant.
  function handleBoatCardClick(boatId) {
    const boatMarker = boatMapMarkers.find((b) => b.id === boatId);
    if (!boatMarker) return;
    setFocusBoat({ lat: boatMarker.lat, lng: boatMarker.lng });
  }

  useEffect(() => {
    if (highlightedBoatId == null) return undefined;
    document
      .getElementById(`boat-${highlightedBoatId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const timer = setTimeout(() => setHighlightedBoatId(null), 2500);
    return () => clearTimeout(timer);
  }, [highlightedBoatId, visibleCount]);

  return (
    <main className="w-full min-h-screen pt-20 bg-white">
      <div>
        {/* Fond photo bateau — englobe le strip sous le header, la searchbar et les résultats */}
        <div
          className="relative"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${bateauBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        >
          {/* Section 0 — Strip sous le header uniquement */}
          <section className="relative w-full -mt-20" style={{ height: '80px' }} />

          {/* Section 1 — Searchbar sticky */}
          <section
            className="z-40"
            style={{
              position: 'sticky',
              top: scrolled ? '60px' : '80px',
              backgroundColor: scrolled ? 'rgba(255,255,255,0.1)' : 'transparent',
              backdropFilter: scrolled ? 'blur(5px)' : 'none',
              WebkitBackdropFilter: scrolled ? 'blur(5px)' : 'none',
              borderBottom: scrolled ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
              transition: 'top 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease',
            }}
          >
            <div className="flex items-center gap-8 pt-8 pl-28">
              <FilterBar
                light
                compact={scrolled}
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
              <SearchBar light compact={scrolled} />
            </div>
            <div className="pb-2 pl-28">
              <Breadcrumb light compact={scrolled} />
            </div>
          </section>

          {/* Section 2 — Listings + Carte 50/50 */}
          <div id="resultats" className="flex items-start gap-6 px-28 py-5 scroll-mt-[120px]">
            {/* Listings — 50% */}
            <div className="w-1/2 flex flex-col gap-5 relative">
              <div className="relative z-10 flex flex-col gap-5">
                <div className="flex items-end justify-between">
                  <div
                    className="flex flex-col items-start gap-3 rounded-2xl border px-4 py-2.5"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    <p className="text-xs font-bold tracking-widest uppercase underline underline-offset-4 text-sky-500">
                      {t('category.results.kicker')}
                    </p>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                      {t('category.results.title')}
                    </h2>
                  </div>
                  <span
                    className="text-sm text-white/80 font-medium rounded-full border px-3 py-1"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderColor: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
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
                        highlighted={highlightedBoatId === boat.id}
                        onSelect={handleBoatCardClick}
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
            {/* Offset sticky = hauteur du header fixe + hauteur de la barre filtre/recherche/fil
                d'ariane (toutes deux sticky au-dessus) + un petit espace de respiration. */}
            <aside
              className="w-1/2 sticky flex flex-col gap-2"
              style={{ top: `${mapStickyTop}px`, transition: 'top 0.3s ease' }}
            >
              <div
                className="flex flex-col rounded-2xl border overflow-hidden"
                style={{ borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <p className="text-xs font-bold tracking-widest uppercase text-sky-500">
                    {t('category.map.title')}
                  </p>
                  <span
                    className="text-[10px] font-semibold flex items-center gap-1.5"
                    style={{ color: '#16a34a' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    {t('category.map.live')}
                  </span>
                </div>
                <div style={{ height: `calc(100vh - ${mapStickyTop}px - 56px)` }}>
                  <MapView
                    markers={mapMarkers}
                    boatMarkers={boatMapMarkers}
                    focusMarkers={focusMapMarkers}
                    focusBoat={focusBoat}
                    className="h-full !rounded-none !border-0"
                    emptyLabel={t('category.map.empty')}
                    onBoatSelect={handleBoatMapSelect}
                    onBoundsChange={(bounds) =>
                      setMapBounds({
                        north: bounds.getNorth(),
                        south: bounds.getSouth(),
                        east: bounds.getEast(),
                        west: bounds.getWest(),
                      })
                    }
                  />
                </div>
              </div>
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
