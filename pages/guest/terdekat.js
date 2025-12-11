import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Layout from '../../components/Layout/Layout';

export default function GuestTerdekat() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        
        const restaurantsQuery = query(
          collection(db, 'restaurants'),
          limit(12)
        );
        
        const querySnapshot = await getDocs(restaurantsQuery);
        const restaurantsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Tambahkan dummy distance untuk guest
        const restaurantsWithDistance = restaurantsData.map(restaurant => ({
          ...restaurant,
          distance: `${(Math.random() * 5 + 0.5).toFixed(1)} km`,
          rating: restaurant.rating || 0,
          reviewCount: restaurant.reviewCount || 0
        }));
        
        // Sort by distance (ascending)
        restaurantsWithDistance.sort((a, b) => {
          const distA = parseFloat(a.distance.replace(' km', ''));
          const distB = parseFloat(b.distance.replace(' km', ''));
          return distA - distB;
        });
        
        setRestaurants(restaurantsWithDistance);
        
      } catch (error) {
        console.error('Error fetching restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat restoran terdekat...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Restoran Terdekat</h1>
            <p className="text-gray-600">
              Temukan restoran enak di sekitar lokasimu
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Tampilkan lokasi akurat setelah login
            </p>
          </div>

          {/* Location Info */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex items-center border border-gray-200">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lokasi saat ini</p>
              <p className="font-medium text-gray-900">Jakarta Pusat (Estimasi)</p>
              <p className="text-xs text-gray-500">Login untuk deteksi lokasi akurat</p>
            </div>
          </div>

          {/* Restaurants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <div 
                key={restaurant.id}
                onClick={() => router.push(`/restaurant/${restaurant.id}`)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer border border-gray-100"
              >
                <div className="relative">
                  <img 
                    src={restaurant.imageUrl || restaurant.image || '/images/restaurant-placeholder.jpg'} 
                    alt={restaurant.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      e.target.src = '/images/restaurant-placeholder.jpg';
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-sm">
                    ⭐ {restaurant.rating?.toFixed(1) || '0.0'}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{restaurant.name}</h3>
                    <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {restaurant.distance}
                    </div>
                  </div>
                  <div className="flex items-center mb-3">
                    <div className="flex text-yellow-500 mr-2">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.round(restaurant.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-600 text-sm">
                      ({restaurant.reviewCount || 0} ulasan)
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{restaurant.type || restaurant.category || 'Restoran'}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-700 text-sm">
                      🕒 {restaurant.openingHours || '10:00 - 22:00'}
                    </span>
                    <span className="text-green-600 text-sm font-semibold">
                      {restaurant.priceRange || 'Rp 50.000 - Rp 150.000'}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/restaurant/${restaurant.id}`);
                    }}
                    className="w-full py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    Lihat Detail Restoran
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Login Info Box */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-center text-white">
            <h3 className="text-lg font-semibold mb-2">Ingin lihat lokasi akurat?</h3>
            <p className="mb-4 opacity-90">
              Login untuk melihat peta lokasi dan rute yang tepat ke restoran.
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => router.push('/auth/login')}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50"
              >
                Login Sekarang
              </button>
              <button 
                onClick={() => router.push('/auth/register')}
                className="bg-transparent border border-white text-white px-6 py-2 rounded-lg font-medium hover:bg-white hover:text-blue-600"
              >
                Daftar
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tentang Restoran Terdekat</h3>
            <p className="text-gray-600 mb-4">
              Anda bisa melihat detail restoran tanpa login. Setelah login, Anda akan bisa melihat:
            </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-1">
              <li>Lokasi akurat dengan Google Maps</li>
              <li>Rute menuju restoran</li>
              <li>Fitur reservasi online</li>
              <li>Ulasan lengkap dari pelanggan</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}