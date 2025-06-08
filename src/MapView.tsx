// src/MapView.tsx
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import polyline from '@mapbox/polyline';

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
console.log('Loaded ORS API key:', ORS_API_KEY);

// Countries and their coordinates (used for stitching cross-country segments)
const verifiedCountryNodes: { name: string; coords: [number, number] }[] = [
  { name: 'Netherlands', coords: [52.1326, 5.2913] },
  { name: 'Germany', coords: [51.1657, 10.4515] },
  { name: 'France', coords: [46.6034, 1.8883] },
  { name: 'Belgium', coords: [50.5039, 4.4699] },
  { name: 'UK', coords: [55.3781, -3.4360] },
  { name: 'Italy', coords: [41.8719, 12.5674] },
  { name: 'Spain', coords: [40.4637, -3.7492] },
  { name: 'Austria', coords: [47.5162, 14.5501] },
  { name: 'Hungary', coords: [47.1625, 19.5033] },
  { name: 'Greece', coords: [39.0742, 21.8243] },
  { name: 'Switzerland', coords: [46.8182, 8.2275] },
  { name: 'Poland', coords: [51.9194, 19.1451] },
  { name: 'Czechia', coords: [49.8175, 15.4730] },
];

export default function MapView() {
  const [start, setStart] = useState<[number, number] | null>(null);
  const [startName, setStartName] = useState('');
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [endName, setEndName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string; }[]>([]);
  const [target, setTarget] = useState<[number, number] | null>(null);
  const [messyRoute, setMessyRoute] = useState<[number, number][]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const coords: [number, number] = [latitude, longitude];
        setStart(coords);
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await res.json();
        setStartName(data.display_name || 'Current Location');
      });
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.length > 2) {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
          .then((res) => res.json())
          .then((data) => {
            const filtered = data.filter((r: any) => r.display_name !== endName);
            setResults(filtered);
          });
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, endName]);

  const fetchSegmentRoute = async (start: [number, number], end: [number, number]) => {
    const coordinates = [start, end].map(([lat, lon]) => [lon, lat]);
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}`;
    const body = { coordinates };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = polyline.decode(route.geometry).map(([lat, lng]) => [lat, lng]);
      return coords;
    }
    return null;
  };

  const fetchRouteAndMessItUp = async (start: [number, number], end: [number, number]) => {
    if (!start || !end) return;

    // Try all possible detour paths and find the longest valid route within 6000km
    let longestRoute: [number, number][] = [];

    for (let i = 0; i < verifiedCountryNodes.length - 1; i++) {
      for (let j = i + 1; j < verifiedCountryNodes.length; j++) {
        const segmentStart = verifiedCountryNodes[i].coords;
        const segmentEnd = verifiedCountryNodes[j].coords;

        try {
          const routePart = await fetchSegmentRoute(segmentStart, segmentEnd);
          if (routePart) {
            const candidateRoute = [start, ...routePart, end];
            const totalDistance = candidateRoute.length; // very rough proxy
            if (totalDistance > longestRoute.length && totalDistance < 10000) {
              longestRoute = candidateRoute;
            }
          }
        } catch {
          continue;
        }
      }
    }

    if (longestRoute.length > 0) {
      setMessyRoute(longestRoute);
      setInstructions(['Custom messy route generated.']);
    } else {
      console.error('No valid messy route found.');
    }
  };

  const handleSelect = (lat: string, lon: string, name: string) => {
    const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
    setTarget(coords);
    setEnd(coords);
    setEndName(name);
    setQuery(name);
    if (start) fetchRouteAndMessItUp(start, coords);
  };

  const PanToTarget: React.FC = () => {
    const map = useMap();
    useEffect(() => {
      if (target) map.setView(target, 14);
    }, [target]);
    return null;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <div style={{ position: 'absolute', top: '30px', left: '10px', zIndex: 1000, width: 'calc(100% - 20px)', maxWidth: '400px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', padding: '8px', boxSizing: 'border-box' }}>
        <input
          type="text"
          placeholder="Search Messy Maps"
          value={query || endName}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: 'none', fontSize: '16px', borderRadius: '4px', backgroundColor: '#f1f3f4', outline: 'none', boxSizing: 'border-box' }}
        />
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
            {messyRoute.length > 0 && <Polyline positions={messyRoute} pathOptions={{ color: 'purple' }} />}
            <PanToTarget />
          </MapContainer>
        )}
      </div>
    </div>
  );
}
