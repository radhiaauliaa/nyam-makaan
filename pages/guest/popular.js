import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Layout from '../../components/Layout/Layout';

export default function GuestPopular() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPopularRestaurants = async () => {
      try {
        setLoading(true);
        
        // Coba query dengan where rating > 0
        try {
          const popularQuery = query(
            collection(db, 'restaurants'),
            where('reviewCount', '>=', 1),
            where('rating', '>=', 1),
            orderBy('rating', 'desc'),
            orderBy('reviewCount', 'desc'),
            limit(10)
          );
          
          const querySnapshot = await getDocs(popularQuery);
          const restaurantsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setRestaurants(restaurantsData);
        } catch (error) {
          console.log('⚠️ Index error, using fallback query');
          
          // Fallback query tanpa where
          const fallbackQuery = query(
            collection(db, 'restaurants'),
            orderBy('rating', 'desc'),
            limit(10)
          );
          
          const fallbackSnapshot = await getDocs(fallbackQuery);
          let fallbackData = fallbackSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              rating: data.rating || 0,
              reviewCount: data.reviewCount || 0
            };
          });
          
          // Filter di client side
          fallbackData = fallbackData.filter(r => (r.reviewCount || 0) > 0 && (r.rating || 0) > 0);
          fallbackData.sort((a, b) => b.rating - a.rating);
          
          setRestaurants(fallbackData.slice(0, 10));
        }
        
      } catch (error) {
        console.error('Error fetching popular restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularRestaurants();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat restoran populer...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Restoran Populer</h1>
            <p className="text-gray-600">
              Temukan restoran terpopuler dengan rating tertinggi
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Diurutkan berdasarkan rating dari pelanggan
            </p>
          </div>

          {/* Restaurants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant, index) => (
              <div 
                key={restaurant.id}
                onClick={() => router.push(`/restaurant/${restaurant.id}`)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
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
                  <div className="absolute top-2 left-2 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    #{index + 1}
                  </div>
                  <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-sm">
                    ⭐ {restaurant.rating?.toFixed(1) || '0.0'}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{restaurant.name}</h3>
                  <div className="flex items-center mb-2">
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
                  <div className="flex items-center justify-between">
                    <div className="text-gray-700 text-sm">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        </svg>
                        {restaurant.address?.substring(0, 30)}...
                      </div>
                    </div>
                    <span className="text-green-600 text-sm font-semibold">
                      {restaurant.priceRange || 'Rp 50.000 - 150.000'}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/restaurant/${restaurant.id}`);
                    }}
                    className="w-full mt-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    Lihat Detail Restoran
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Login Info Box */}
          <div className="mt-8 p-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-center text-white">
            <h3 className="text-lg font-semibold mb-2">Ingin reservasi?</h3>
            <p className="mb-4 opacity-90">
              Login atau daftar terlebih dahulu untuk bisa melakukan reservasi di restoran favorit Anda.
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => router.push('/auth/login')}
                className="bg-white text-orange-600 px-6 py-2 rounded-lg font-medium hover:bg-orange-50"
              >
                Login Sekarang
              </button>
              <button 
                onClick={() => router.push('/auth/register')}
                className="bg-transparent border border-white text-white px-6 py-2 rounded-lg font-medium hover:bg-white hover:text-orange-600"
              >
                Daftar
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tentang Restoran Populer</h3>
            <p className="text-gray-600 mb-4">
              Restoran di halaman ini diurutkan berdasarkan <strong>rating tertinggi</strong> dari ulasan pelanggan. 
              Anda bisa melihat detail restoran tanpa login. Login diperlukan hanya untuk melakukan reservasi.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}