import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX } from 'react-icons/fi';
import { fetchPorts } from '../../services/portService.js';
import { fetchBoats } from '../../services/boatService.js';
import DateRangePicker from './DateRangePicker.jsx';
import { useCategoryNavigate } from '../../hooks/useCategoryTransition.js';

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

function isWithinRange(day, startStr, endStr) {
  const day0 = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const start = new Date(startStr);
  const end = new Date(endStr);
  const start0 = new Date(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  ).getTime();
  const end0 = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()).getTime();
  return day0 >= start0 && day0 <= end0;
}

function SearchBar({
  light = false,
  compact = false,
  fitContentOnDesktop = false,
  fitContentOnTablet = false,
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const goToCategory = useCategoryNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [destination, setDestination] = useState(searchParams.get('destination') ?? '');
  const [start, setStart] = useState(searchParams.get('start') ?? '');
  const [end, setEnd] = useState(searchParams.get('end') ?? '');
  const [travelers, setTravelers] = useState(searchParams.get('travelers') ?? '');

  const [ports, setPorts] = useState([]);
  const [boats, setBoats] = useState([]);
  const [destinationFocused, setDestinationFocused] = useState(false);
  const [nearestSuggestion, setNearestSuggestion] = useState(null);
  const destinationInputRef = useRef(null);
  const travelersInputRef = useRef(null);

  const hasValues = destination || start || end || travelers;

  // Ports réellement proposés à la location (ceux sans bateau ne sont pas suggérés).
  useEffect(() => {
    Promise.all([fetchPorts(), fetchBoats()])
      .then(([portsRes, boatsRes]) => {
        const launchedCities = new Set(boatsRes.data.map((b) => b.port?.city));
        setPorts(portsRes.data.filter((p) => launchedCities.has(p.city)));
        setBoats(boatsRes.data);
      })
      .catch(() => {});
  }, []);

  const trimmedDestination = destination.trim();
  const localMatches = ports.filter(
    (p) => !trimmedDestination || normalize(p.city).includes(normalize(trimmedDestination))
  );

  // Un jour est disponible si au moins un bateau publié (dans la destination
  // recherchée, si renseignée) a une période d'ouverture couvrant ce jour et
  // n'a pas de réservation active (pending/confirmed) ce même jour.
  function isDateAvailable(day) {
    const normalizedDestination = normalize(trimmedDestination);
    return boats.some((boat) => {
      if (
        normalizedDestination &&
        !normalize(boat.port?.city || '').includes(normalizedDestination)
      ) {
        return false;
      }
      const inOpenWindow = (boat.availabilities || []).some((a) =>
        isWithinRange(day, a.start_date, a.end_date)
      );
      if (!inOpenWindow) return false;
      const isBooked = (boat.booked_ranges || []).some((r) =>
        isWithinRange(day, r.start_date, r.end_date)
      );
      return !isBooked;
    });
  }

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
    goToCategory(`/categorie${params.toString() ? `?${params.toString()}` : ''}`);
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
      className={`mx-auto flex w-full max-w-4xl flex-col items-stretch gap-1 rounded-2xl border p-1 shadow-xl sm:flex-row sm:gap-0 sm:rounded-full sm:p-0.5 max-sm:flex-row max-sm:gap-0 max-sm:rounded-full max-sm:p-0.5 ${
        fitContentOnTablet
          ? 'md:w-fit md:max-w-full'
          : fitContentOnDesktop
            ? 'lg:mx-0 lg:w-fit lg:max-w-full'
            : ''
      }`}
      style={{
        backgroundColor: compact
          ? 'rgba(0,0,0,0.45)'
          : light
            ? 'rgba(255,255,255,0.1)'
            : 'rgba(0,0,0,0.05)',
        borderColor: compact
          ? 'rgba(255,255,255,0.15)'
          : light
            ? 'rgba(255,255,255,0.3)'
            : 'rgba(0,0,0,0.1)',
        backdropFilter: compact ? 'blur(5px)' : 'blur(40px)',
        WebkitBackdropFilter: compact ? 'blur(14px)' : 'blur(40px)',
      }}
    >
      <div className="flex items-stretch overflow-visible max-sm:min-w-0 max-sm:flex-[16_1_0%]">
        <div
          className={`relative mx-0.5 flex flex-1 flex-col justify-center rounded-xl px-3 py-2 text-center transition-colors sm:rounded-full sm:px-6 sm:py-0.5 max-sm:mx-0 max-sm:flex-[6_1_0%] max-sm:rounded-full max-sm:px-1.5 max-sm:py-1 max-sm:min-w-0 ${
            fitContentOnTablet ? 'md:min-w-0' : fitContentOnDesktop ? 'lg:min-w-0' : ''
          } ${light ? 'hover:bg-surface/10' : 'hover:bg-overlay/10'}`}
        >
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 max-sm:truncate ${light ? 'text-on-dark' : 'text-on-light'}`}
          >
            {t('searchBar.destination')}
          </span>
          <input
            ref={destinationInputRef}
            type="text"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setDestinationFocused(true);
            }}
            onFocus={() => setDestinationFocused(true)}
            onBlur={() => setTimeout(() => setDestinationFocused(false), 150)}
            placeholder={t('searchBar.destinationPlaceholder')}
            autoComplete="off"
            className={`w-full bg-transparent outline-none text-xs text-center max-sm:min-w-0 ${light ? 'text-on-dark placeholder-on-dark/50' : 'text-on-light placeholder-black/50'}`}
          />

          {destinationFocused && (localMatches.length > 0 || nearestSuggestion) && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-surface shadow-xl border border-border-light py-1.5 z-50 text-left max-sm:w-[min(16rem,calc(100vw-2rem))]">
              {localMatches.length > 0
                ? localMatches.slice(0, 6).map((p) => (
                    <button
                      key={p.id_port}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectDestination(p.city)}
                      className="w-full text-left px-4 py-1.5 text-xs text-content-muted hover:bg-info-surface hover:text-info-text transition-colors"
                    >
                      {p.city}
                    </button>
                  ))
                : nearestSuggestion && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectDestination(nearestSuggestion.city)}
                      className="w-full text-left px-4 py-2 text-xs text-content-muted hover:bg-info-surface transition-colors"
                    >
                      {t('searchBar.noPortMatch', { query: trimmedDestination })}{' '}
                      <span className="font-semibold text-info-text">{nearestSuggestion.city}</span>{' '}
                      ({t('searchBar.distanceKm', { km: Math.round(nearestSuggestion.distanceKm) })}
                      )
                    </button>
                  )}
            </div>
          )}
        </div>

        <div
          className={`h-px w-[calc(100%-1rem)] self-center sm:h-5 sm:w-px max-sm:h-5 max-sm:w-px max-sm:shrink-0 ${light ? 'bg-surface/20' : 'bg-overlay/20'}`}
        />
        <DateRangePicker
          start={start}
          end={end}
          onChangeStart={setStart}
          onChangeEnd={setEnd}
          isDateAvailable={isDateAvailable}
          onOpen={() => {
            setDestinationFocused(false);
            destinationInputRef.current?.blur();
            travelersInputRef.current?.blur();
          }}
          light={light}
        />
        <div
          className={`h-px w-[calc(100%-1rem)] self-center sm:h-5 sm:w-px max-sm:h-5 max-sm:w-px max-sm:shrink-0 ${light ? 'bg-surface/20' : 'bg-overlay/20'}`}
        />

        <div
          className={`mx-0.5 flex flex-col justify-center rounded-xl px-3 py-2 text-center transition-colors sm:rounded-full sm:px-5 sm:py-0.5 max-sm:mx-0 max-sm:flex-[4_1_0%] max-sm:min-w-0 max-sm:rounded-full max-sm:px-1.5 max-sm:py-1 ${light ? 'hover:bg-surface/10' : 'hover:bg-overlay/10'}`}
        >
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 max-sm:whitespace-nowrap ${light ? 'text-on-dark' : 'text-on-light'}`}
          >
            {t('searchBar.travelers')}
          </span>
          <input
            ref={travelersInputRef}
            type="number"
            min="1"
            value={travelers}
            onChange={(e) => setTravelers(e.target.value)}
            placeholder={t('searchBar.travelersPlaceholder')}
            className={`w-full bg-transparent text-center text-xs outline-none sm:w-36 max-sm:min-w-0 max-sm:placeholder-transparent ${light ? 'text-on-dark placeholder-on-dark/50' : 'text-on-light placeholder-black/50'}`}
          />
        </div>

        {hasValues && (
          <button
            type="button"
            onClick={handleReset}
            title={t('searchBar.resetTitle')}
            className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors self-center mr-1 max-sm:mr-0.5 max-sm:shrink-0 ${light ? 'text-on-dark/60 hover:text-on-dark hover:bg-surface/10' : 'text-on-light/50 hover:text-on-light hover:bg-overlay/10'}`}
          >
            <FiX size={14} />
          </button>
        )}
      </div>

      <button
        type="submit"
        title={t('searchBar.search')}
        className="flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-action-deep/50 px-5 py-1.5 text-xs font-semibold text-on-dark transition-colors hover:bg-brand-navy sm:min-h-0 sm:w-auto sm:rounded-full max-sm:min-h-0 max-sm:min-w-0 max-sm:flex-[2.5_1_0%] max-sm:rounded-full max-sm:px-1.5 max-sm:py-1.5"
      >
        <FiSearch size={14} />
        <span className="max-sm:hidden">{t('searchBar.search')}</span>
      </button>
    </form>
  );
}

export default SearchBar;
