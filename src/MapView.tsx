// src/MapView.tsx
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';

const MapView: React.FC = () => {
  const [start, setStart] = useState<[number, number]>([51.505, -0.09]);
  const [end, setEnd] = useState<[number, number]>([51.515, -0.1]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string; }[]>([]);
  const [target, setTarget] = useState<[number, number] | null>(null);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.height = '100vh';
    document.documentElement.style.height = '100%';
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.length > 2) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
          .then((res) => res.json())
          .then((data) => setResults(data));
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const generateMessyRoute = (start: [number, number], end: [number, number]): [number, number][] => {
    return [
      start,
      [start[0] + 0.01, start[1] - 0.01],
      [start[0] + 0.005, start[1] + 0.015],
      [end[0] - 0.01, end[1] + 0.01],
      end
    ];
  };

  const messyRoute = generateMessyRoute(start, end);

  const handleSelect = (lat: string, lon: string) => {
    const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
    setTarget(coords);
    setResults([]);
    setQuery('');
  };

  const PanToTarget: React.FC = () => {
    const map = useMap();
    useEffect(() => {
      if (target) {
        map.setView(target, 14);
      }
    }, [target]);
    return null;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <div style={{
        position: 'absolute',
        top: '30px',
        left: '10px',
        zIndex: 1000,
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        padding: '8px'
      }}>
        <input
          type="text"
          placeholder="Search Google Maps"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: 'none',
            fontSize: '16px',
            borderRadius: '4px',
            backgroundColor: '#f1f3f4',
            outline: 'none'
          }}
        />
        {results.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0', maxHeight: '200px', overflowY: 'auto' }}>
            {results.map((r, i) => (
              <li
                key={i}
                onClick={() => handleSelect(r.lat, r.lon)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}
              >
                {r.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ flexGrow: 1 }}>
        <MapContainer center={start} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Marker position={start}>
            <Popup>Start</Popup>
          </Marker>
          <Marker position={end}>
            <Popup>End</Popup>
          </Marker>
          {target && (
            <Marker position={target}>
              <Popup>Target</Popup>
            </Marker>
          )}
          <Polyline positions={messyRoute} pathOptions={{ color: 'purple' }} />
          <PanToTarget />
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
