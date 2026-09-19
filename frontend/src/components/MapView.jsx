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
          eventHandlers={{
            click: () => onMarkerClick?.(b),
          }}
        >
          <Popup>
            <strong>{b.nom_officiel}</strong>
            {b.ville_nom && <div>{b.quartier ? `${b.quartier}, ` : ''}{b.ville_nom}</div>}
            {b.type && <div style={{ fontSize: '12px', color: '#666' }}>{b.type}</div>}
            {b.distance_m != null && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {b.distance_m < 1000
                  ? `${Math.round(b.distance_m)} m`
                  : `${(b.distance_m / 1000).toFixed(1)} km`}
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
