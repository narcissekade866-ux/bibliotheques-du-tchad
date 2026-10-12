import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUT_COLORS = {
  fonctionnel: '#1B7A3D',
  partiellement_fonctionnel: '#D4920A',
  non_fonctionnel: '#C0392B',
  temporairement_ferme: '#8A9690',
};

function createColorIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 21.9 12.5 41 12.5 41S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
    <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
}

const iconCache = {};
function getStatusIcon(statut) {
  const color = STATUT_COLORS[statut] || STATUT_COLORS.fonctionnel;
  if (!iconCache[color]) iconCache[color] = createColorIcon(color);
  return iconCache[color];
}

function FitBounds({ bibliotheques }) {
  const map = useMap();
  useEffect(() => {
    if (bibliotheques.length === 0) return;
    const points = bibliotheques
      .filter((b) => b.latitude && b.longitude)
      .map((b) => [parseFloat(b.latitude), parseFloat(b.longitude)]);
    if (points.length > 0) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    }
  }, [bibliotheques, map]);
  return null;
}

export default function MapView({ bibliotheques, center, zoom, onMarkerClick }) {
  const validBiblios = bibliotheques.filter((b) => b.latitude && b.longitude);

  return (
    <MapContainer
      center={center || [12.1048, 15.0445]}
      zoom={zoom || 13}
      style={{ height: '100%', width: '100%', minHeight: '400px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds bibliotheques={bibliotheques} />
      {validBiblios.map((b) => (
        <Marker
          key={b.id}
          position={[parseFloat(b.latitude), parseFloat(b.longitude)]}
          icon={getStatusIcon(b.statut_fonctionnement)}
          eventHandlers={{
            click: () => onMarkerClick?.(b),
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'var(--sans)', lineHeight: 1.5 }}>
              <strong style={{ fontSize: '14px', color: '#174D36' }}>{b.nom_officiel}</strong>
              {b.ville_nom && (
                <div style={{ fontSize: '13px', color: '#65736A', marginTop: '2px' }}>
                  {b.quartier ? `${b.quartier}, ` : ''}{b.ville_nom}
                </div>
              )}
              {b.type && (
                <div style={{ fontSize: '12px', color: '#8A9690', marginTop: '4px' }}>{b.type}</div>
              )}
              {b.distance_m != null && (
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#8A9690' }}>
                  {b.distance_m < 1000
                    ? `${Math.round(b.distance_m)} m`
                    : `${(b.distance_m / 1000).toFixed(1)} km`}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
