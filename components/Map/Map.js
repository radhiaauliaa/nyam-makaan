import { useEffect, useRef } from 'react';

export default function Map({ center = [-6.2088, 106.8456], zoom = 13, restaurants = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    const loadMap = async () => {
      // load library leaflet secara dynamic
      const L = await import('leaflet');
      require('leaflet/dist/leaflet.css');

      // FIX missing default icon pada leaflet (Next.js)
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 
          'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // INIT MAP (hanya sekali)
      if (mapRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);

        // Tambah tile layer OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapInstanceRef.current);
      }

      // Hapus marker lama
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Tambah marker restoran
      if (mapInstanceRef.current) {
        restaurants.forEach((restaurant) => {
          if (restaurant.location?.lat && restaurant.location?.lng) {
            const marker = L.marker([restaurant.location.lat, restaurant.location.lng])
              .addTo(mapInstanceRef.current)
              .bindPopup(`
                <div class="p-2">
                  <h3 class="font-bold">${restaurant.name}</h3>
                  <p class="text-sm text-gray-600">${restaurant.address || ''}</p>
                  <p class="text-xs text-orange-600">${restaurant.cuisine || ''}</p>
                </div>
              `);

            markersRef.current.push(marker);
          }
        });
      }
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, restaurants]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full min-h-[400px] rounded-lg"
      style={{ zIndex: 1 }}
    />
  );
}
