import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FiRefreshCw } from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';

// Navy — couleur "sérieuse" de la marque (déjà utilisée pour le header scrollé et le
// fil d'ariane), plus lisible sur les tuiles claires que le sky ou le blanc.
const PIN_COLOR_AVAILABLE = 'rgb(var(--sl-map-available))';
const PIN_COLOR_UNAVAILABLE = 'rgb(var(--sl-map-unavailable-strong))';

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c]
  );
}

// iconSize [0,0] + transform CSS (comme createPriceIcon) : la pastille s'auto-
// dimensionne au nom de ville (largeur variable) tout en restant ancrée exactement
// sur le point GPS via son coin bas-centre.
function createPortIcon({ available, badge, city }) {
  const color = available ? PIN_COLOR_AVAILABLE : PIN_COLOR_UNAVAILABLE;
  const showBadge = available && Number(badge) > 0;
  const availabilityLabel = available ? 'Disponible' : 'Bientôt disponible';
  const markerLabel = `${city ?? ''} — ${availabilityLabel}`;
  const pinShape = available
    ? `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z" fill="${color}"/>
          <path d="m8.8 9.2 2.1 2.1 4.3-4.3" fill="none" stroke="rgb(var(--sl-on-dark))" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="m12 2 9 10-9 10-9-10 9-10z" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3 2" stroke-linejoin="round"/>
          <path d="m9 9 6 6m0-6-6 6" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>`;
  return L.divIcon({
    className: '',
    html: `
      <div role="img" aria-label="${escapeHtml(markerLabel)}" data-marker-availability="${available ? 'available' : 'unavailable'}" style="position:relative;">
        <div style="position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:flex;align-items:center;gap:4px;padding:3px 8px 3px 3px;${showBadge ? 'padding-right:14px;' : ''}border-radius:9999px;background:rgb(var(--sl-surface) / 0.45);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgb(var(--sl-glass) / 0.5);box-shadow:0 2px 8px rgba(2,44,74,0.25);white-space:nowrap;">
          <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="flex-shrink:0;">
            ${pinShape}
          </svg>
          <span style="font-size:10px;font-weight:700;color:${color};">${escapeHtml(city ?? '')}</span>
          ${
            showBadge
              ? `<span style="position:absolute;top:-5px;right:-5px;min-width:15px;height:15px;padding:0 3px;border-radius:9999px;background:rgb(var(--sl-danger-base));color:rgb(var(--sl-on-dark));font-size:8px;font-weight:700;line-height:15px;text-align:center;border:2px solid rgb(var(--sl-surface));box-shadow:0 1px 3px rgba(2,44,74,0.35);">${badge}</span>`
              : ''
          }
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
}

// Pastille prix (style Airbnb) pour les pins bateaux individuels affichés au fort
// zoom. iconSize [0,0] + transform CSS : la pastille s'auto-dimensionne au texte
// (le prix a une largeur variable) tout en restant centrée/ancrée sur le point GPS.
function createPriceIcon(price, label) {
  const markerLabel = label || `${price}€ / jour`;
  return L.divIcon({
    className: '',
    html: `
      <div role="img" aria-label="${escapeHtml(markerLabel)}" data-marker-availability="available" style="position:relative;">
        <div style="position:absolute;left:0;top:0;transform:translate(-50%,-100%);padding:4px 9px;border-radius:9999px;background:rgb(var(--sl-surface));border:1.5px solid rgb(var(--sl-map-available));color:rgb(var(--sl-map-available));font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(2,44,74,0.35);">
          ${price}€
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -18],
  });
}

// Au-delà de ce niveau de zoom, on bascule des pins port (agrégés) vers les pins
// bateaux individuels avec prix.
const BOAT_ZOOM_THRESHOLD = 7;

// Centre/zoom par défaut : France métropolitaine.
const FRANCE_CENTER = [46.6, 2.3];
const FRANCE_ZOOM = 5;

// Durée (s) des animations flyTo/flyToBounds — plus courte que la valeur par défaut
// de Leaflet (souvent 1-2s+ sur les longs trajets) pour une carte plus réactive.
const FLY_DURATION = 0.5;

// Recadre la carte sur l'ensemble des marqueurs à chaque changement de liste.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      return;
    }
    map.fitBounds(
      points.map((p) => [p.lat, p.lng]),
      { padding: [55, 55] }
    );
  }, [points.map((p) => `${p.lat},${p.lng}`).join('|'), map]);
  return null;
}

// Notifie le parent des limites visibles de la carte à chaque déplacement/zoom,
// pour permettre de filtrer une liste externe sur la zone affichée.
function BoundsWatcher({ onBoundsChange }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
  });
  return null;
}

// Suit le niveau de zoom courant pour basculer entre pins port et pins bateaux.
function ZoomWatcher({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });
  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);
  return null;
}

// Zoome/centre sur un bateau donné (ex : clic sur une fiche produit dans la liste).
const BOAT_FOCUS_ZOOM = 18;

function FlyToBoat({ boat, zoom = BOAT_FOCUS_ZOOM }) {
  const map = useMap();
  useEffect(() => {
    if (!boat) return;
    map.flyTo([boat.lat, boat.lng], zoom, { duration: FLY_DURATION });
  }, [boat, zoom, map]);
  return null;
}

// Popup restylée en glass sky pour matcher le reste de l'UI plutôt que le blanc/gris
// par défaut de Leaflet.
const MAP_STYLE_CSS = `
.sailingloc-popup .leaflet-popup-content-wrapper {
  background: rgb(var(--sl-surface));
  color: rgb(var(--sl-content));
  border-radius: 14px;
  border: 1px solid rgb(var(--sl-brand-focus) / 0.35);
  box-shadow: 0 8px 24px rgba(2,44,74,0.18);
}
.sailingloc-popup .leaflet-popup-tip {
  background: rgb(var(--sl-surface));
  box-shadow: none;
}
.leaflet-control-zoom a {
  background: rgb(var(--sl-surface));
  color: rgb(var(--sl-content));
  border-bottom-color: rgb(var(--sl-border-light));
}
.leaflet-control-zoom a:hover,
.leaflet-control-zoom a:focus-visible {
  background: rgb(var(--sl-page));
  color: rgb(var(--sl-brand-text));
}
`;

// Zoom sur un port au clic, sans dépasser le niveau de zoom déjà atteint par l'utilisateur.
const MARKER_ZOOM = 13;

function ZoomableMarker({ marker }) {
  const map = useMap();
  return (
    <Marker
      position={[marker.lat, marker.lng]}
      icon={createPortIcon({
        available: marker.available !== false,
        badge: marker.badge,
        city: marker.title,
      })}
      eventHandlers={{
        click: () =>
          map.flyTo([marker.lat, marker.lng], Math.max(map.getZoom(), MARKER_ZOOM), {
            duration: FLY_DURATION,
          }),
      }}
    >
      <Popup className="sailingloc-popup">
        <div
          className="text-sm"
          role="group"
          aria-label={`${marker.title} — ${
            marker.available === false ? 'Bientôt disponible' : 'Disponible'
          }`}
        >
          <div className="font-semibold">{marker.title}</div>
          {marker.subtitle && <div className="text-content-muted">{marker.subtitle}</div>}
          {marker.available === false && (
            <div className="mt-1 text-content-subtle italic">Bientôt disponible</div>
          )}
          {marker.badge != null && (
            <div className="mt-1 font-medium text-info">
              {marker.badge} bateau{marker.badge === 1 ? '' : 'x'}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

function BoatMarker({ boat, onSelect }) {
  return (
    <Marker
      position={[boat.lat, boat.lng]}
      icon={createPriceIcon(
        boat.price,
        `${boat.name}${boat.city ? ` — ${boat.city}` : ''} — ${boat.price}€ / jour`
      )}
      eventHandlers={{ click: () => onSelect?.(boat) }}
    >
      <Popup className="sailingloc-popup">
        <div
          className="text-sm"
          role="group"
          aria-label={`${boat.name}${boat.city ? ` — ${boat.city}` : ''} — ${boat.price}€ / jour`}
        >
          <div className="font-semibold">{boat.name}</div>
          {boat.city && <div className="text-content-muted">{boat.city}</div>}
          <div className="mt-1 font-medium text-info">{boat.price}€ / jour</div>
        </div>
      </Popup>
    </Marker>
  );
}

function MapView({
  markers = [],
  boatMarkers = [],
  focusMarkers,
  focusBoat,
  focusZoom,
  className = '',
  emptyLabel = 'Aucun point à afficher.',
  onBoundsChange,
  onBoatSelect,
}) {
  const points = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  // Par défaut la vue se recadre sur tous les marqueurs. `focusMarkers` permet à
  // l'appelant de restreindre ce recadrage (ex : uniquement les ports correspondant
  // à une recherche), sans changer les marqueurs réellement affichés sur la carte.
  const fitPoints = (focusMarkers ?? markers).filter(
    (m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)
  );
  const boatPoints = boatMarkers.filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng));
  const mapRef = useRef(null);
  const [zoom, setZoom] = useState(FRANCE_ZOOM);
  const showBoats = zoom >= BOAT_ZOOM_THRESHOLD && boatPoints.length > 0;

  function handleResetView() {
    const map = mapRef.current;
    if (!map) return;
    if (fitPoints.length === 1) {
      map.flyTo([fitPoints[0].lat, fitPoints[0].lng], 11, { duration: FLY_DURATION });
    } else if (fitPoints.length > 1) {
      map.flyToBounds(
        fitPoints.map((p) => [p.lat, p.lng]),
        { padding: [40, 40], duration: FLY_DURATION }
      );
    } else {
      map.flyTo(FRANCE_CENTER, FRANCE_ZOOM, { duration: FLY_DURATION });
    }
  }

  return (
    // `isolate` + `z-0` créent un stacking context : les z-index internes de Leaflet
    // (jusqu'à 700+ pour les popups/controls) restent contenus dans la carte et ne
    // passent plus au-dessus du header fixe ni de ses panneaux burger.
    <div
      className={`relative z-0 isolate overflow-hidden rounded-2xl border border-dark-elevated ${className}`}
    >
      <style>{MAP_STYLE_CSS}</style>
      <MapContainer
        ref={mapRef}
        center={FRANCE_CENTER}
        zoom={FRANCE_ZOOM}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <FitBounds points={fitPoints} />
        {onBoundsChange && <BoundsWatcher onBoundsChange={onBoundsChange} />}
        <ZoomWatcher onZoomChange={setZoom} />
        <FlyToBoat boat={focusBoat} zoom={focusZoom} />
        {showBoats
          ? boatPoints.map((b) => <BoatMarker key={b.id} boat={b} onSelect={onBoatSelect} />)
          : points.map((m) => <ZoomableMarker key={m.id} marker={m} />)}
      </MapContainer>
      <button
        type="button"
        onClick={handleResetView}
        title="Réinitialiser la carte"
        aria-label="Réinitialiser la carte"
        className="absolute top-2.5 right-2.5 z-[500] flex items-center justify-center w-8 h-8 rounded-md bg-surface text-on-light shadow-md hover:bg-page transition-colors"
      >
        <FiRefreshCw size={15} />
      </button>
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-dark-strong/40 text-sm text-content-light">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

export default MapView;
