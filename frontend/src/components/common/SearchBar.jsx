import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX, FiChevronLeft } from 'react-icons/fi';
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

// Easings de la rétraction et du déploiement, indépendants du FLIP de
// position géré par les pages : mêmes courbes miroir que la cascade des
// blocs (CATEGORY_EXIT_EASING / CATEGORY_ENTER_EASING), pour une motion
// cohérente. Une seule courbe pour les deux sens ne convient pas : l'ease-in
// de sortie, joué à l'ouverture, laisse la barre immobile la moitié du temps
// puis la fait claquer sur la fin.
const RETRACT_EASING = 'cubic-bezier(0.64, 0, 0.78, 0.39)';
const DEPLOY_EASING = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
// Durée par défaut pour l'ouverture/fermeture manuelle (clic sur la flèche), hors
// transition de page — les pages passent leur propre durée (retractDuration)
// pour que la rétraction/déploiement dure aussi longtemps que le reste de
// leur sortie et s'achève au même instant.
const DEFAULT_RETRACT_DURATION = 300;
// Repli tant que la largeur naturelle des champs n'a jamais été mesurée
// (rétractée dès le montage, jamais encore déployée) — exporté : les pages à
// transition (CategoryPage/ProductPage) s'en servent comme cible de secours
// pour leur propre pré-déploiement imperatif (cf. fieldsElRef ci-dessous).
export const FALLBACK_FIELDS_WIDTH = 500;

function SearchBar({
  light = false,
  compact = false,
  retracted: baseRetracted = false,
  retractDuration = DEFAULT_RETRACT_DURATION,
  // Ref optionnelle vers le conteneur des champs (fieldsRef ci-dessous),
  // exposée aux pages à transition : elles y jouent leur propre animation de
  // largeur (démarrée avant la navigation, terminée après) directement sur ce
  // nœud, sans passer par le mécanisme retracted/retractDuration habituel.
  fieldsElRef,
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

  const hasValues = destination || start || end || travelers;

  // Rétraction (page produit uniquement, cf. baseRetracted) : déploiement et
  // repli uniquement au clic sur la flèche à côté du bouton — pas de
  // déploiement au survol.
  const [userExpanded, setUserExpanded] = useState(false);
  const retracted = baseRetracted && !userExpanded;

  // Rétraction/déploiement des champs : un simple maxWidth CSS entre 0 et
  // une valeur fixe ferait terminer le déploiement en avance (le contenu
  // atteint sa largeur naturelle avant la fin de la transition), rendant les
  // deux sens visiblement asymétriques. On mesure donc la vraie largeur
  // naturelle et on anime précisément entre 0 et cette valeur, comme le FLIP
  // de position des pages (mesurer, figer, puis transitionner au frame suivant).
  const fieldsRef = useRef(null);
  const naturalWidthRef = useRef(FALLBACK_FIELDS_WIDTH);
  const prevRetractedRef = useRef(retracted);

  // Tient la dernière largeur naturelle à jour tant que les champs sont
  // déployés : c'est cette valeur qui servira de point de départ/arrivée dès
  // qu'une rétraction ou un déploiement démarre.
  useLayoutEffect(() => {
    if (!retracted && fieldsRef.current) {
      naturalWidthRef.current = fieldsRef.current.scrollWidth;
    }
  });

  useLayoutEffect(() => {
    const el = fieldsRef.current;
    if (!el || prevRetractedRef.current === retracted) return undefined;
    prevRetractedRef.current = retracted;

    el.style.transition = 'none';
    el.style.maxWidth = retracted ? `${naturalWidthRef.current}px` : '0px';
    el.style.opacity = retracted ? '1' : '0';
    // Force le reflow avant d'activer la transition, sans quoi le navigateur
    // regrouperait les deux changements de style et sauterait l'animation.
    void el.offsetWidth;
    const easing = retracted ? RETRACT_EASING : DEPLOY_EASING;
    const raf = window.requestAnimationFrame(() => {
      el.style.transition = `max-width ${retractDuration}ms ${easing}, opacity ${retractDuration}ms ease`;
      el.style.maxWidth = retracted ? '0px' : `${naturalWidthRef.current}px`;
      el.style.opacity = retracted ? '0' : '1';
    });
    // Déploiement terminé : lève le plafond figé en px — la largeur naturelle
    // évolue ensuite (bouton reset, saisies) et serait sinon rognée — et coupe
    // la transition pour que ces ajustements de contenu ne soient pas animés.
    const settle = setTimeout(() => {
      if (!retracted) {
        el.style.transition = 'none';
        el.style.maxWidth = 'none';
      }
    }, retractDuration + 50);
    return () => {
      window.cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [retracted, retractDuration]);

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
    // Rétractée, la barre ne fait que se redéployer au premier clic : elle ne
    // lance la recherche qu'une fois les champs effectivement visibles.
    if (retracted) {
      setUserExpanded(true);
      return;
    }
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
      className={`mx-auto flex w-full max-w-4xl flex-col items-stretch gap-1 rounded-2xl border p-1 shadow-xl sm:flex-row sm:gap-0 sm:rounded-full sm:p-0.5 ${
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
      {/* Champs regroupés pour la rétraction : la barre se referme de gauche
          à droite jusqu'à ne plus laisser voir que le bouton "Rechercher".
          maxWidth/opacity ci-dessous ne servent qu'au premier rendu (état
          statique) : l'animation elle-même est pilotée par le layout effect
          ci-dessus, qui a besoin de mesurer/figer le style avant de l'activer. */}
      <div
        ref={(node) => {
          fieldsRef.current = node;
          if (fieldsElRef) fieldsElRef.current = node;
        }}
        className="flex items-stretch overflow-hidden"
        aria-hidden={retracted}
        style={{
          maxWidth: retracted ? '0px' : 'none',
          opacity: retracted ? 0 : 1,
        }}
      >
        <div
          className={`relative mx-0.5 flex flex-1 flex-col justify-center rounded-xl px-3 py-2 text-center transition-colors sm:rounded-full sm:px-6 sm:py-0.5 ${
            fitContentOnTablet ? 'md:min-w-0' : fitContentOnDesktop ? 'lg:min-w-0' : ''
          } ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
        >
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${light ? 'text-white' : 'text-black'}`}
          >
            {t('searchBar.destination')}
          </span>
          <input
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
            tabIndex={retracted ? -1 : undefined}
            className={`w-full bg-transparent outline-none text-xs text-center ${light ? 'text-white placeholder-white/50' : 'text-black placeholder-black/50'}`}
          />

          {destinationFocused && (localMatches.length > 0 || nearestSuggestion) && (
            <div className="absolute left-0 top-full mt-2 w-64 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50 text-left">
              {localMatches.length > 0
                ? localMatches.slice(0, 6).map((p) => (
                    <button
                      key={p.id_port}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectDestination(p.city)}
                      className="w-full text-left px-4 py-1.5 text-xs text-gray-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                    >
                      {p.city}
                    </button>
                  ))
                : nearestSuggestion && (
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
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

        <div
          className={`h-px w-[calc(100%-1rem)] self-center sm:h-5 sm:w-px ${light ? 'bg-white/20' : 'bg-black/20'}`}
        />
        <DateRangePicker
          start={start}
          end={end}
          onChangeStart={setStart}
          onChangeEnd={setEnd}
          isDateAvailable={isDateAvailable}
          light={light}
        />
        <div
          className={`h-px w-[calc(100%-1rem)] self-center sm:h-5 sm:w-px ${light ? 'bg-white/20' : 'bg-black/20'}`}
        />

        <div
          className={`mx-0.5 flex flex-col justify-center rounded-xl px-3 py-2 text-center transition-colors sm:rounded-full sm:px-5 sm:py-0.5 ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
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
            tabIndex={retracted ? -1 : undefined}
            className={`w-full bg-transparent text-center text-xs outline-none sm:w-29 ${light ? 'text-white placeholder-white/50' : 'text-black placeholder-black/50'}`}
          />
        </div>

        {hasValues && (
          <button
            type="button"
            onClick={handleReset}
            title={t('searchBar.resetTitle')}
            tabIndex={retracted ? -1 : undefined}
            className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors self-center mr-1 ${light ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/50 hover:text-black hover:bg-black/10'}`}
          >
            <FiX size={14} />
          </button>
        )}
      </div>

      {/* Flèche de déploiement/repli (pages où la barre démarre rétractée
          uniquement) : pointe vers les champs quand ils sont repliés, pivote
          vers le bouton une fois déployés — le clic inverse l'état. */}
      {baseRetracted && (
        <button
          type="button"
          onClick={() => setUserExpanded((v) => !v)}
          title={retracted ? t('searchBar.expandTitle') : t('searchBar.collapseTitle')}
          aria-label={retracted ? t('searchBar.expandTitle') : t('searchBar.collapseTitle')}
          aria-expanded={!retracted}
          className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors self-center mx-0.5 ${light ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/50 hover:text-black hover:bg-black/10'}`}
        >
          <FiChevronLeft
            size={15}
            className="transition-transform duration-300"
            style={{ transform: retracted ? 'none' : 'rotate(180deg)' }}
          />
        </button>
      )}

      <button
        type="submit"
        className="flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-sky-700/50 px-5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-900 sm:min-h-0 sm:w-auto sm:rounded-full"
      >
        <FiSearch size={14} />
        {t('searchBar.search')}
      </button>
    </form>
  );
}

export default SearchBar;
