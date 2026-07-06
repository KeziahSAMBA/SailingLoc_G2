import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX } from 'react-icons/fi';
import { fetchPorts } from '../../services/portService.js';
import { fetchBoats } from '../../services/boatService.js';

const DIACRITICS_REGEX = /[̀-ͯ]/g;

function normalize(str) {
  return str.normalize('NFD').replace(DIACRITICS_REGEX, '').toLowerCase();
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function DateInput({ label, value, onChange, light }) {
  return (
    <div
      className={`group flex flex-col justify-center px-5 py-0.5 mx-0.5 rounded-full transition-colors cursor-pointer ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
    >
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${light ? 'text-white' : 'text-black'}`}
      >
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className={`bg-transparent outline-none text-xs cursor-pointer ${light ? 'text-white/80' : 'text-black/80'}`}
      />
    </div>
  );
}

function SearchBar({ light = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get('destination') ?? '');
  const [start, setStart] = useState(searchParams.get('start') ?? '');
  const [end, setEnd] = useState(searchParams.get('end') ?? '');
  const [travelers, setTravelers] = useState(searchParams.get('travelers') ?? '');

  const [ports, setPorts] = useState([]);
  const [destinationFocused, setDestinationFocused] = useState(false);
  const [nearestSuggestion, setNearestSuggestion] = useState(null);

  const hasValues = destination || start || end || travelers;

  // Ports réellement proposés à la location (ceux sans bateau ne sont pas suggérés).
  useEffect(() => {
    Promise.all([fetchPorts(), fetchBoats()])
      .then(([portsRes, boatsRes]) => {
        const launchedCities = new Set(boatsRes.data.map((b) => b.port?.city));
        setPorts(portsRes.data.filter((p) => launchedCities.has(p.city)));
      })
      .catch(() => {});
  }, []);

  const trimmedDestination = destination.trim();
  const localMatches = ports.filter(
    (p) => !trimmedDestination || normalize(p.city).includes(normalize(trimmedDestination))
  );

  // Aucun port ne correspond au texte saisi : on géocode la destination (Nominatim,
  // OSM déjà utilisé pour la carte) pour proposer le port disponible le plus proche.
  useEffect(() => {
    if (!trimmedDestination || localMatches.length > 0 || ports.length === 0) {
      setNearestSuggestion(null);
      return undefined;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmedDestination)}`
      )
        .then((res) => res.json())
        .then((results) => {
          if (cancelled) return;
          const hit = results[0];
          if (!hit) {
            setNearestSuggestion(null);
            return;
          }
          const lat = Number(hit.lat);
          const lon = Number(hit.lon);
          const nearest = ports.reduce((best, p) => {
            const d = haversineKm(lat, lon, Number(p.latitude), Number(p.longitude));
            return !best || d < best.distanceKm ? { city: p.city, distanceKm: d } : best;
          }, null);
          setNearestSuggestion(nearest);
        })
        .catch(() => {
          if (!cancelled) setNearestSuggestion(null);
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [trimmedDestination, ports]);

  function selectDestination(city) {
    setDestination(city);
    setDestinationFocused(false);
    setNearestSuggestion(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set('destination', destination);
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    if (travelers) params.set('travelers', travelers);
    navigate(`/categorie${params.toString() ? `?${params.toString()}` : ''}`);
  }

  function handleReset() {
    setDestination('');
    setStart('');
    setEnd('');
    setTravelers('');
    if (location.pathname === '/categorie') {
      navigate('/categorie');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-stretch backdrop-blur- border rounded-full shadow-xl max-w-4xl mx-auto p-0.5 gap-0"
      style={{
        backgroundColor: light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        borderColor: light ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <div
        className={`relative flex-1 flex flex-col justify-center px-6 py-0.5 mx-0.5 rounded-full transition-colors ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${light ? 'text-white' : 'text-black'}`}
        >
          {t('searchBar.destination')}
        </span>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          onFocus={() => setDestinationFocused(true)}
          onBlur={() => setTimeout(() => setDestinationFocused(false), 150)}
          placeholder={t('searchBar.destinationPlaceholder')}
          autoComplete="off"
          className={`bg-transparent outline-none text-xs ${light ? 'text-white placeholder-white/50' : 'text-black placeholder-black/50'}`}
        />

        {destinationFocused && (localMatches.length > 0 || nearestSuggestion) && (
          <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 text-left">
            {localMatches.length > 0
              ? localMatches.slice(0, 6).map((p) => (
                  <button
                    key={p.id_port}
                    type="button"
                    onClick={() => selectDestination(p.city)}
                    className="w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                  >
                    {p.city}
                  </button>
                ))
              : nearestSuggestion && (
                  <button
                    type="button"
                    onClick={() => selectDestination(nearestSuggestion.city)}
                    className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-sky-50 transition-colors"
                  >
                    {t('searchBar.noPortMatch', { query: trimmedDestination })}{' '}
                    <span className="font-semibold text-sky-700">{nearestSuggestion.city}</span> (
                    {t('searchBar.distanceKm', { km: Math.round(nearestSuggestion.distanceKm) })})
                  </button>
                )}
          </div>
        )}
      </div>

      <div className={`w-px self-center h-5 ${light ? 'bg-white/20' : 'bg-black/20'}`} />
      <DateInput
        label={t('searchBar.arrival')}
        value={start}
        onChange={(e) => setStart(e.target.value)}
        light={light}
      />
      <div className={`w-px self-center h-5 ${light ? 'bg-white/20' : 'bg-black/20'}`} />
      <DateInput
        label={t('searchBar.departure')}
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        light={light}
      />
      <div className={`w-px self-center h-5 ${light ? 'bg-white/20' : 'bg-black/20'}`} />

      <div
        className={`flex flex-col justify-center px-5 py-0.5 mx-0.5 rounded-full transition-colors ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
      >
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${light ? 'text-white' : 'text-black'}`}
        >
          {t('searchBar.travelers')}
        </span>
        <input
          type="number"
          min="1"
          value={travelers}
          onChange={(e) => setTravelers(e.target.value)}
          placeholder={t('searchBar.travelersPlaceholder')}
          className={`w-29 bg-transparent outline-none text-xs ${light ? 'text-white placeholder-white/50' : 'text-black placeholder-black/50'}`}
        />
      </div>

      {hasValues && (
        <button
          type="button"
          onClick={handleReset}
          title={t('searchBar.resetTitle')}
          className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors self-center mr-1 ${light ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/50 hover:text-black hover:bg-black/10'}`}
        >
          <FiX size={14} />
        </button>
      )}

      <button
        type="submit"
        className="flex items-center gap-2 bg-sky-700/50 hover:bg-sky-900 text-white px-5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
      >
        <FiSearch size={14} />
        {t('searchBar.search')}
      </button>
    </form>
  );
}

export default SearchBar;
