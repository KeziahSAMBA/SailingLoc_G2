import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Les bundlers cassent les chemins d'icônes par défaut de Leaflet. mergeOptions ne
// suffit pas toujours avec react-leaflet : on construit une icône explicite passée
// à chaque marqueur, ce qui garantit l'affichage.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Centre/zoom par défaut : France métropolitaine.
const FRANCE_CENTER = [46.6, 2.3];
const FRANCE_ZOOM = 5;

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
      { padding: [40, 40] }
    );
  }, [points.map((p) => `${p.lat},${p.lng}`).join('|'), map]);
  return null;
}

function MapView({ markers = [], className = '', emptyLabel = 'Aucun point à afficher.' }) {
  const points = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));

  return (
    // `isolate` + `z-0` créent un stacking context : les z-index internes de Leaflet
    // (jusqu'à 700+ pour les popups/controls) restent contenus dans la carte et ne
    // passent plus au-dessus du header fixe ni de ses panneaux burger.
    <div
      className={`relative z-0 isolate overflow-hidden rounded-2xl border border-slate-800 ${className}`}
    >
      <MapContainer
        center={FRANCE_CENTER}
        zoom={FRANCE_ZOOM}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={defaultIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{m.title}</div>
                {m.subtitle && <div className="text-slate-500">{m.subtitle}</div>}
                {m.badge != null && (
                  <div className="mt-1 text-slate-700">
                    {m.badge} bateau{m.badge > 1 ? 'x' : ''}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-slate-950/40 text-sm text-slate-200">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

export default MapView;
