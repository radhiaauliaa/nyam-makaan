import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const createCustomIcon = () => {
  return L.divIcon({
    html: `
      <div style="
        background-color: #EA580C; 
        width: 30px; 
        height: 30px; 
        border-radius: 50% 50% 50% 0; 
        transform: rotate(-45deg); 
        display: flex; 
        align-items: center; 
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 12px;">📍</div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
};

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      icon={createCustomIcon()}
    />
  );
}

const LocationPicker = ({ onLocationSelect, initialLocation }) => {
  const [position, setPosition] = useState(initialLocation || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);

  // Handle client-side only
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle position change
  useEffect(() => {
    if (position) {
      onLocationSelect({
        lat: position.lat,
        lng: position.lng,
        address: searchQuery || `Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}`
      });
    }
  }, [position, searchQuery, onLocationSelect]);

  // Search location using Nominatim (OpenStreetMap)
  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const firstResult = data[0];
        const newPosition = {
          lat: parseFloat(firstResult.lat),
          lng: parseFloat(firstResult.lon)
        };
        setPosition(newPosition);
      } else {
        alert('Lokasi tidak ditemukan. Coba kata kunci lain.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Error mencari lokasi');
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchLocation();
  };

  // Prevent SSR issues with Leaflet
  if (!isClient) {
    return (
      <div className="h-64 w-full rounded-lg border border-gray-300 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cari Lokasi Restoran
        </label>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Contoh: Jalan Sudirman Jakarta, Restoran Bandung, dll."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          />
          <button
            type="submit"
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            Cari
          </button>
        </form>
        <p className="text-xs text-gray-500 mt-1">
          Gunakan nama jalan, kota, atau landmark
        </p>
      </div>

      {/* Map */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pilih Lokasi di Peta
        </label>
        <p className="text-sm text-gray-500 mb-2">Klik di peta untuk menandai lokasi tepat</p>
        
        <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-300">
          <MapContainer
            center={position || [-6.2088, 106.8456]} // Default Jakarta
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </div>
      </div>

      {/* Selected Location Info */}
      {position && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Lokasi Terpilih:</strong><br />
            Latitude: {position.lat.toFixed(6)}, Longitude: {position.lng.toFixed(6)}
            {searchQuery && (
              <>
                <br />
                <strong>Pencarian:</strong> {searchQuery}
              </>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            💡 Klik di peta untuk mengubah lokasi secara manual
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;