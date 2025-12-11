import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function Terdekat() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    const getUserLocation = () => {
      if (!navigator.geolocation) {
        setError('Browser tidak mendukung geolocation');
        fetchAllRestaurants();
        return;
      }

      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationLoading(false);
        },
        (error) => {
          setError('Akses lokasi ditolak. Menampilkan semua restoran.');
          setLocationLoading(false);
          fetchAllRestaurants();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyRestaurants();
    }
  }, [userLocation]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;
    return distanceKm;
  };

  const fetchAllRestaurants = async () => {
    try {
      setLoading(true);
      const restaurantsQuery = query(
        collection(db, 'restaurants'),
        where('status', '==', 'approved'),
        where('isOpen', '==', true),
        orderBy('name'),
        limit(20)
      );

      const querySnapshot = await getDocs(restaurantsQuery);
      const restaurantsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        distance: null
      }));

      setRestaurants(restaurantsData);
    } catch (error) {
      setError('Gagal memuat data restoran');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyRestaurants = async () => {
    try {
      setLoading(true);
      
      const restaurantsQuery = query(
        collection(db, 'restaurants'),
        where('status', '==', 'approved'),
        where('isOpen', '==', true)
      );

      const querySnapshot = await getDocs(restaurantsQuery);
      let restaurantsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      restaurantsData = restaurantsData.map(restaurant => {
        if (restaurant.location && restaurant.location.lat && restaurant.location.lng) {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            restaurant.location.lat,
            restaurant.location.lng
          );
          return {
            ...restaurant,
            distance: distance,
            distanceText: distance < 1 
              ? `${(distance * 1000).toFixed(0)} m` 
              : `${distance.toFixed(1)} km`
          };
        } else {
          return {
            ...restaurant,
            distance: null,
            distanceText: 'Lokasi tidak tersedia'
          };
        }
      });

      restaurantsData.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      const nearbyRestaurants = restaurantsData.slice(0, 20);
      setRestaurants(nearbyRestaurants);

    } catch (error) {
      setError('Gagal memuat data restoran terdekat');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryLocation = () => {
    setError('');
    setUserLocation(null);
    setLocationLoading(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setLocationLoading(false);
      },
      (error) => {
        setError('Tidak bisa mengakses lokasi Anda. Menampilkan semua restoran.');
        setLocationLoading(false);
        fetchAllRestaurants();
      }
    );
  };

  const getRatingStars = (rating) => {
    const roundedRating = Math.round(rating || 0);
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${
          i < roundedRating ? 'text-yellow-500' : 'text-gray-300'
        }`}
      >
        ★
      </span>
    ));
  };

  if (loading || locationLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">
              {locationLoading ? 'Mendeteksi lokasi Anda...' : 'Memuat restoran terdekat...'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Restoran Terdekat</h1>
                <p className="text-gray-600 mt-2">
                  {userLocation 
                    ? `Menampilkan restoran di sekitar lokasi Anda`
                    : 'Menampilkan semua restoran yang tersedia'
                  }
                </p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={handleRetryLocation}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Refresh Lokasi
                </button>
                <button 
                  onClick={() => router.push('/')}
                  className="text-gray-600 hover:text-gray-700 font-medium"
                >
                  ← Kembali
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{error}</p>
                </div>
                <button 
                  onClick={handleRetryLocation}
                  className="ml-4 bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          )}

          {restaurants.length > 0 ? (
            <>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-gray-600">
                  Ditemukan <span className="font-semibold">{restaurants.length}</span> restoran
                  {userLocation && ' di dekat Anda'}
                </p>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <span>Diurutkan berdasarkan jarak terdekat</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {restaurants.map(restaurant => (
                  <div 
                    key={restaurant.id} 
                    onClick={() => router.push(`/restaurants/${restaurant.id}`)}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <img 
                      src={restaurant.imageUrl || restaurant.image || '/images/restaurant-placeholder.jpg'} 
                      alt={restaurant.name}
                      className="w-full h-48 object-cover"
                    />
                    
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {restaurant.name}
                          </h3>
                          
                          <div className="flex items-center mb-3">
                            <div className="flex mr-2">
                              {getRatingStars(restaurant.rating)}
                            </div>
                            <span className="text-gray-600 text-sm">
                              ({restaurant.reviewCount || 0} ulasan)
                            </span>
                          </div>
                        </div>
                        
                        {restaurant.distanceText && restaurant.distanceText !== 'Lokasi tidak tersedia' && (
                          <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            </svg>
                            {restaurant.distanceText}
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-4">
                        {restaurant.address}
                      </p>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-700 font-medium">
                          {restaurant.priceRange || 'Murah (Rp 5.000 - Rp 35.000)'}
                        </span>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/restaurant/${restaurant.id}`);
                          }}
                          className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                        >
                          Lihat Resto
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {userLocation ? 'Tidak ada restoran terdekat' : 'Tidak ada restoran'}
              </h3>
              <p className="text-gray-500 mb-6">
                {userLocation 
                  ? 'Tidak ada restoran yang ditemukan di sekitar lokasi Anda.'
                  : 'Belum ada restoran yang terdaftar.'
                }
              </p>
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => router.push('/restaurants')}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
                >
                  Lihat Semua Restoran
                </button>
              </div>
            </div>
          )}

          <div className="mt-12 bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tentang Restoran Terdekat</h3>
            <p className="text-gray-600 mb-4">
              {userLocation 
                ? 'Restoran diurutkan berdasarkan jarak terdekat dari lokasi Anda saat ini.'
                : 'Izinkan akses lokasi untuk melihat restoran terdekat dengan posisi Anda.'
              }
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}