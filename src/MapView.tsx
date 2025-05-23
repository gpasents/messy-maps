// src/MapView.tsx
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import polyline from '@mapbox/polyline';

const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY;
console.log('Loaded ORS API key:', ORS_API_KEY);

const MapView: React.FC = () => {
  const [start, setStart] = useState<[number, number] | null>(null);
  const [startName, setStartName] = useState<string>('');
  const [end, setEnd] = useState<[number, number]>([51.515, -0.1]);
  const [endName, setEndName] = useState<string>('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string; }[]>([]);
  const [target, setTarget] = useState<[number, number] | null>(null);
  const [messyRoute, setMessyRoute] = useState<[number, number][]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
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

  const fetchRouteAndMessItUp = async (start: [number, number], end: [number, number]) => {
    console.log('Calling routing API with:', { start, end });
    console.log('Using ORS API key:', ORS_API_KEY);

    // Generate absurd waypoints in the wrong direction
    const absurdDetours: [number, number][] = [
      [start[0] + 1.5, start[1] + 2.5],  // plausible east
      [start[0] - 2.0, start[1] - 3.0],  // plausible southwest
      [start[0] + 1.0, start[1] - 4.0]   // plausible southeast
    ];

    const allPoints = [start, ...absurdDetours, end];
    const coordinates = allPoints.map(([lat, lon]) => [lon, lat]);

    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}`;
    const body = {
      coordinates
    };

    try {
      console.log('Request URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ORS returned an error:', response.status, errorText);
        return;
      }

      const data = await response.json();
      console.log('Response from ORS:', data);

      if (!data.routes || data.routes.length === 0) {
        console.warn('No route data returned:', data);
        return;
      }

      const route = data.routes[0];
      const coords = polyline.decode(route.geometry).map(([lat, lng]) => [lat, lng]);
      const steps = route.segments[0].steps.map((step: any) => step.instruction);

      // Add absurd detours
      const messy = coords.flatMap((point, index) => {
        const [lat, lng] = point;
        if (index % 10 === 0) {
          return [
            [lat + 0.002, lng - 0.002],
            [lat, lng]
          ];
        }
        return [point];
      });

      setMessyRoute(messy);
      setInstructions(steps);
    } catch (error) {
      console.error('Routing error:', error);
    }
  };

  const handleSelect = (lat: string, lon: string, name: string) => {
    const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
    setTarget(coords);
    setEnd(coords);
    setEndName(name);
    setQuery(name);
    setShowDirectionForm(true);
    setSearchVisible(false);
    setResults([]);
    if (start) {
      fetchRouteAndMessItUp(start, coords);
    } else {
      console.warn('Start location not yet available when selecting destination.');
    }
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
        boxSizing: 'border-box',
        overflowY: 'auto',
        maxHeight: '95vh'
      }}>
        {showDirectionForm && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ marginRight: '8px', width: '24px', textAlign: 'center' }}>📍</span>
              <input
                type="text"
                value={startName}
                readOnly
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ marginRight: '8px', width: '24px', textAlign: 'center' }}>🎯</span>
              <input
                type="text"
                placeholder="Enter destination..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {instructions.length > 0 && (
              <ul style={{ paddingLeft: '24px', fontSize: '14px', color: '#333' }}>
                {instructions.map((step, i) => (
                  <li key={i} style={{ marginBottom: '6px' }}>{step}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {!showDirectionForm && searchVisible && (
          <input
            type="text"
            placeholder="Search Messy Maps"
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
            {target && messyRoute.length > 0 && (
              <Polyline positions={messyRoute} pathOptions={{ color: 'purple' }} />
            )}
            <PanToTarget />
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default MapView;
