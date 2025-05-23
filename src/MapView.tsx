// src/MapView.tsx
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';

const MapView: React.FC = () => {
  const [start, setStart] = useState<[number, number] | null>(null);
  const [startName, setStartName] = useState<string>('');
  const [end, setEnd] = useState<[number, number]>([51.515, -0.1]);
  const [endName, setEndName] = useState<string>('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string; }[]>([]);
  const [target, setTarget] = useState<[number, number] | null>(null);
  const [showDirectionForm, setShowDirectionForm] = useState(false);
  const [searchVisible, setSearchVisible] = useState(true);

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.height = '100vh';
    document.documentElement.style.height = '100%';

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const currentCoords: [number, number] = [latitude, longitude];
        setStart(currentCoords);
        setEnd(currentCoords);

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
          .then(res => res.json())
          .then(data => setStartName(data.display_name || 'Current Location'));
      });
    }
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.length > 2) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
          .then((res) => res.json())
          .then((data) => {
            const filtered = data.filter(r => r.display_name !== endName);
            setResults(filtered);
          });
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, endName]);

  const generateMessyRoute = (start: [number, number], end: [number, number]): [number, number][] => {
    return [
      start,
      [start[0] + 0.01, start[1] - 0.01],
      [start[0] + 0.005, start[1] + 0.015],
      [end[0] - 0.01, end[1] + 0.01],
      end
    ];
  };

  const messyRoute = start && target ? generateMessyRoute(start, target) : [];

  const handleSelect = (lat: string, lon: string, name: string) => {
    const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
    setTarget(coords);
    setEnd(coords);
    setEndName(name);
    setQuery(name);
    setShowDirectionForm(true);
    setSearchVisible(false);
    setResults([]);
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
        width: 'calc(100% - 20px)',
        maxWidth: '400px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        padding: '8px',
        boxSizing: 'border-box'
      }}>
        {showDirectionForm && (
          <div>
            <input
              type="text"
              value={`📍 ${startName}`}
              readOnly
              style={{
                width: '100%',
                padding: '10px 14px',
                marginBottom: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
            <input
              type="text"
              placeholder="Enter destination..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                marginBottom: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}
        {!showDirectionForm && searchVisible && (
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
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        )}
        {results.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0', maxHeight: '200px', overflowY: 'auto' }}>
            {results.map((r, i) => (
              <li
                key={i}
                onClick={() => handleSelect(r.lat, r.lon, r.display_name)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}
              >
                {r.display_name}
              </li>
            ))}
          </ul>
        )}
        {showDirectionForm && target && (
          <button
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#6200ee',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
              boxSizing: 'border-box',
              marginTop: '8px'
            }}
          >
            Directions
          </button>
        )}
      </div>
      <div style={{ flexGrow: 1 }}>
        {start && (
          <MapContainer center={start} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <Marker position={start}>
              <Popup>Start</Popup>
            </Marker>
            {target && (
              <Marker position={target}>
                <Popup>Target</Popup>
              </Marker>
            )}
            {target && <Polyline positions={messyRoute} pathOptions={{ color: 'purple' }} />}
            <PanToTarget />
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default MapView;