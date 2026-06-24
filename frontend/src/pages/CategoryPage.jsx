import { useState } from 'react';
import SearchBar from '../components/common/SearchBar.jsx';
import MapView from '../components/common/MapView.jsx';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { MdAnchor, MdPerson, MdLocationOn, MdPeople } from 'react-icons/md';
import { FaChevronDown, FaChevronUp, FaArrowRight, FaSliders } from 'react-icons/fa6';
import portMarseille from '../assets/image/ports/Marseille.webp';
import portNice from '../assets/image/ports/Nice.webp';
import portCroatie from '../assets/image/ports/Croatie.webp';
import portNaples from '../assets/image/ports/Naples.webp';
import portAthenes from '../assets/image/ports/Athènes.webp';
import portBordeaux from '../assets/image/ports/Bordeaux.webp';
import portBrest from '../assets/image/ports/Brest.webp';
import portGenes from '../assets/image/ports/Gênes.webp';

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

const SUGGESTIONS = [
  {
    id: 1,
    image: portBordeaux,
    name: 'Beneteau Flyer 8',
    location: 'Cannes',
    price: 220,
    rating: 4.5,
  },
  {
    id: 2,
    image: portAthenes,
    name: 'Zodiac Medline 7.5',
    location: 'Nice',
    price: 180,
    rating: 4.3,
  },
  {
    id: 3,
    image: portBrest,
    name: 'Jeanneau Cap Camarat 7.5',
    location: 'Toulon',
    price: 310,
    rating: 4.6,
  },
  {
    id: 4,
    image: portGenes,
    name: 'Bénéteau Antares 9',
    location: 'Antibes',
    price: 265,
    rating: 4.4,
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
];

const MAP_MARKERS = [
  { id: 1, lat: 43.3, lng: 5.37, title: 'Oceanis 46.1', subtitle: 'Marseille, Vieux-Port' },
  { id: 2, lat: 41.93, lng: 8.74, title: "Lagoon 42 'Horizon'", subtitle: 'Ajaccio, Corse' },
  { id: 3, lat: 43.12, lng: 6.13, title: 'Sun Odyssey 410', subtitle: 'Hyères, Port-Cros' },
  { id: 4, lat: 43.27, lng: 6.64, title: "Azimut 60 'Luxury'", subtitle: 'Saint-Tropez, Var' },
];

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

function FilterCheckbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 py-1 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3.5 h-3.5 accent-sky-500 cursor-pointer"
      />
      <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
        {label}
      </span>
    </label>
  );
}

function FilterSection({ title, expanded, onToggle, children }) {
  return (
    <div className="border-b border-gray-100 pb-3 mb-3 last:border-0 last:pb-0 last:mb-0">
      <button onClick={onToggle} className="flex items-center justify-between w-full mb-2 group">
        <span className="text-sm font-semibold text-gray-700 group-hover:text-sky-600 transition-colors">
          {title}
        </span>
        {expanded ? (
          <FaChevronUp size={10} className="text-gray-400" />
        ) : (
          <FaChevronDown size={10} className="text-gray-400" />
        )}
      </button>
      {expanded && <div className="space-y-0.5">{children}</div>}
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

function SuggestionCard({ image, name, location, price, rating }) {
  return (
    <div
      className="flex overflow-hidden rounded-xl border border-gray-100 bg-white hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 24px rgba(14,165,233,0.25)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)')}
    >
      <div className="w-28 flex-shrink-0 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="flex flex-col justify-center py-3 px-4 flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 mb-1 truncate">{name}</h4>
        <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
          <MdLocationOn className="text-sky-400 flex-shrink-0" style={{ fontSize: '11px' }} />
          {location}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-gray-900">{price}€</span>
          <div className="flex items-center gap-1">
            <StarRating rating={Math.floor(rating)} />
            <span className="text-xs text-gray-400 ml-0.5">{rating}</span>
          </div>
        </div>
      </div>
    </div>
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
  const [boatTypeFilters, setBoatTypeFilters] = useState({
    voilier: false,
    catamaran: false,
    yacht: false,
    moteur: false,
    semiRigide: false,
  });
  const [equipmentFilters, setEquipmentFilters] = useState({
    skipper: false,
    cuisine: false,
    clim: false,
    wifi: false,
  });
  const [selectedCabins, setSelectedCabins] = useState(null);
  const [typeExpanded, setTypeExpanded] = useState(true);
  const [equipExpanded, setEquipExpanded] = useState(true);
  const [cabinsExpanded, setCabinsExpanded] = useState(true);

  function resetFilters() {
    setBoatTypeFilters({
      voilier: false,
      catamaran: false,
      yacht: false,
      moteur: false,
      semiRigide: false,
    });
    setEquipmentFilters({ skipper: false, cuisine: false, clim: false, wifi: false });
    setSelectedCabins(null);
  }

  const activeFiltersCount =
    Object.values(boatTypeFilters).filter(Boolean).length +
    Object.values(equipmentFilters).filter(Boolean).length +
    (selectedCabins !== null ? 1 : 0);

  return (
    <main className="w-full min-h-screen pt-20" style={{ backgroundColor: '#f8fafc' }}>
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-2 px-8 py-2.5 text-xs text-gray-500 border-b border-sky-100"
        style={{ backgroundColor: 'rgba(0,78,87,0.05)' }}
      >
        <a href="/" className="hover:text-sky-600 transition-colors">
          Accueil
        </a>
        <span className="text-gray-300">/</span>
        <a href="#" className="hover:text-sky-600 transition-colors">
          Destinations
        </a>
        <span className="text-gray-300">/</span>
        <span className="font-semibold" style={{ color: 'rgba(14,165,233,0.95)' }}>
          Méditerranée
        </span>
      </nav>

      {/* Search bar — dark teal wrapper matches SearchBar's glass design */}
      <div
        className="px-8 py-4"
        style={{
          background: 'linear-gradient(105deg, rgb(0,78,87) 0%, rgba(10,49,114,0.92) 100%)',
        }}
      >
        <SearchBar />
      </div>

      {/* ── 3-column layout ──────────────────────────────────────────────────── */}
      <div
        className="flex items-start gap-4 px-4 py-5"
        style={{ maxWidth: '1600px', margin: '0 auto' }}
      >
        {/* ── LEFT : Filter panel ──────────────────────────────────────────── */}
        <aside className="w-52 flex-shrink-0 sticky top-24 flex flex-col gap-3">
          {/* Filter card */}
          <div
            className="rounded-2xl border border-gray-100 bg-white p-4"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <span className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                <FaSliders className="text-sky-500" size={11} />
                Filtres
                {activeFiltersCount > 0 && (
                  <span
                    className="text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold"
                    style={{ backgroundColor: 'rgba(14,165,233,0.95)' }}
                  >
                    {activeFiltersCount}
                  </span>
                )}
              </span>
              <button
                onClick={resetFilters}
                className="text-xs font-medium transition-colors hover:opacity-70"
                style={{ color: 'rgba(14,165,233,0.95)' }}
              >
                Réinitialiser
              </button>
            </div>

            <FilterSection
              title="Type de bateau"
              expanded={typeExpanded}
              onToggle={() => setTypeExpanded((v) => !v)}
            >
              <FilterCheckbox
                label="Voiliers"
                checked={boatTypeFilters.voilier}
                onChange={(e) => setBoatTypeFilters((f) => ({ ...f, voilier: e.target.checked }))}
              />
              <FilterCheckbox
                label="Catamarans"
                checked={boatTypeFilters.catamaran}
                onChange={(e) => setBoatTypeFilters((f) => ({ ...f, catamaran: e.target.checked }))}
              />
              <FilterCheckbox
                label="Yachts"
                checked={boatTypeFilters.yacht}
                onChange={(e) => setBoatTypeFilters((f) => ({ ...f, yacht: e.target.checked }))}
              />
              <FilterCheckbox
                label="Bateaux à moteur"
                checked={boatTypeFilters.moteur}
                onChange={(e) => setBoatTypeFilters((f) => ({ ...f, moteur: e.target.checked }))}
              />
              <FilterCheckbox
                label="Semi-rigides"
                checked={boatTypeFilters.semiRigide}
                onChange={(e) =>
                  setBoatTypeFilters((f) => ({ ...f, semiRigide: e.target.checked }))
                }
              />
            </FilterSection>

            <FilterSection
              title="Équipements"
              expanded={equipExpanded}
              onToggle={() => setEquipExpanded((v) => !v)}
            >
              <FilterCheckbox
                label="Skipper inclus"
                checked={equipmentFilters.skipper}
                onChange={(e) => setEquipmentFilters((f) => ({ ...f, skipper: e.target.checked }))}
              />
              <FilterCheckbox
                label="Cuisine équipée"
                checked={equipmentFilters.cuisine}
                onChange={(e) => setEquipmentFilters((f) => ({ ...f, cuisine: e.target.checked }))}
              />
              <FilterCheckbox
                label="Climatisation"
                checked={equipmentFilters.clim}
                onChange={(e) => setEquipmentFilters((f) => ({ ...f, clim: e.target.checked }))}
              />
              <FilterCheckbox
                label="Wifi à bord"
                checked={equipmentFilters.wifi}
                onChange={(e) => setEquipmentFilters((f) => ({ ...f, wifi: e.target.checked }))}
              />
            </FilterSection>

            <FilterSection
              title="Nombre de cabines"
              expanded={cabinsExpanded}
              onToggle={() => setCabinsExpanded((v) => !v)}
            >
              <div className="flex gap-2 mt-1 flex-wrap">
                {[1, 2, 3, '4+'].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSelectedCabins(selectedCabins === n ? null : n)}
                    className="w-9 h-9 rounded-full text-sm font-semibold border transition-all duration-200"
                    style={{
                      backgroundColor: selectedCabins === n ? 'rgba(14,165,233,0.95)' : '#fff',
                      color: selectedCabins === n ? '#fff' : '#4b5563',
                      borderColor: selectedCabins === n ? 'rgba(14,165,233,0.95)' : '#e5e7eb',
                      boxShadow: selectedCabins === n ? '0 2px 8px rgba(14,165,233,0.4)' : 'none',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </FilterSection>
          </div>

          {/* Besoin d'aide */}
          <div
            className="rounded-2xl border border-sky-100 p-4 text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(0,78,87,0.06), rgba(14,165,233,0.07))',
            }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
              style={{
                background: 'rgba(14,165,233,0.12)',
                border: '1px solid rgba(14,165,233,0.25)',
              }}
            >
              <MdAnchor className="text-sky-500 text-xl" />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Besoin d&apos;aide ?</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-3">
              Nos experts maritimes sont disponibles 7j/7 pour vous accompagner.
            </p>
            <a
              href="#contact"
              className="text-xs font-semibold transition-colors flex items-center justify-center gap-1 hover:opacity-70"
              style={{ color: 'rgba(14,165,233,0.95)' }}
            >
              Nous contacter <FaArrowRight size={8} />
            </a>
          </div>
        </aside>

        {/* ── CENTER : Listings ────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
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
            <span className="text-sm text-gray-400 font-medium pb-1">156 bateaux disponibles</span>
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

          {/* Suggestions à proximité */}
          <section className="flex flex-col gap-4">
            <div>
              <p
                className="text-xs font-bold tracking-widest uppercase mb-1 underline underline-offset-4"
                style={{ color: 'rgba(14,165,233,0.95)' }}
              >
                Suggestions
              </p>
              <h2 className="text-xl font-bold text-gray-900">Suggestions à proximité</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SUGGESTIONS.map((s) => (
                <SuggestionCard key={s.id} {...s} />
              ))}
            </div>
          </section>

          {/* Avis & Commentaires */}
          <section
            className="rounded-2xl border border-gray-100 p-6"
            style={{
              background: 'linear-gradient(135deg, #ffffff, rgba(235,245,253,0.6))',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div className="text-center mb-5">
              <p
                className="text-xs font-bold tracking-widest uppercase mb-1 underline underline-offset-4"
                style={{ color: 'rgba(14,165,233,0.95)' }}
              >
                Témoignages
              </p>
              <h2 className="text-xl font-bold text-gray-900">Avis &amp; Commentaires</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {REVIEWS.map((r) => (
                <ReviewCard key={r.id} {...r} />
              ))}
            </div>
          </section>

          {/* CTA bottom */}
          <div className="flex flex-col items-center gap-3 pb-8">
            <p className="text-gray-700 font-semibold text-sm">
              Vous ne trouvez pas ce que vous cherchez ?
            </p>
            <GhostButton>
              <MdAnchor className="text-base" />
              Voir toutes nos annonces
            </GhostButton>
          </div>
        </div>

        {/* ── RIGHT : Sticky map ───────────────────────────────────────────── */}
        <aside className="w-72 flex-shrink-0 sticky top-24 flex flex-col gap-2">
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
            className="h-[560px]"
            emptyLabel="Aucun bateau à afficher."
          />
          <p className="text-[10px] text-gray-400 text-center px-2">
            Cliquez sur un marqueur pour voir les détails du bateau
          </p>
        </aside>
      </div>
    </main>
  );
}

export default CategoryPage;
