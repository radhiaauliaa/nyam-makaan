import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Layout from '../../components/Layout/Layout';

export default function GuestPromo() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchPromoRestaurants = async () => {
      try {
        setLoading(true);
        
        // Coba query dengan where hasPromo = true
        try {
          const promoQuery = query(
            collection(db, 'restaurants'),
            where('isPromo', '==', true),
            limit(12)
          );
          
          const querySnapshot = await getDocs(promoQuery);
          const restaurantsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setRestaurants(restaurantsData);
        } catch (error) {
          console.log('⚠️ Promo query error, showing sample promos');
          
          // Fallback: ambil semua restoran dan filter di client
          const allQuery = query(
            collection(db, 'restaurants'),
            limit(12)
          );
          
          const allSnapshot = await getDocs(allQuery);
          let allData = allSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Tambahkan dummy promo untuk demo
          const dummyPromos = ['Diskon 20%', 'Buy 1 Get 1', 'Cashback 30K', 'Gratis Minuman'];
          
          const promoData = allData.map((restaurant, index) => ({
            ...restaurant,
            isPromo: true,
            promoText: dummyPromos[index % dummyPromos.length],
            discount: Math.floor(Math.random() * 30) + 10,
            rating: restaurant.rating || 0,
            reviewCount: restaurant.reviewCount || 0
          }));
          
          setRestaurants(promoData);
        }
        
      } catch (error) {
        console.error('Error fetching promo restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromoRestaurants();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat restoran promo...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Restoran dengan Promo</h1>
            <p className="text-gray-600">
              Nikmati berbagai promo menarik dari restoran terbaik
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Login untuk menikmati promo dan melakukan reservasi
            </p>
          </div>

          {/* Promo Banner */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white mb-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="text-center md:text-left mb-4 md:mb-0">
                <h2 className="text-2xl font-bold mb-2">🎉 Promo Spesial Menanti!</h2>
                <p className="text-red-100">Lihat detail promo dengan klik restoran</p>
              </div>
              <div className="bg-white text-red-600 px-6 py-2 rounded-full font-bold text-lg">
                DISKON HINGGA 50%
              </div>
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
                {/* Promo Badge */}
                <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                  PROMO {restaurant.discount || 20}%
                </div>
                
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
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{restaurant.name}</h3>
                  
                  {/* Promo Info */}
                  <div className="mb-3">
                    <div className="flex items-center text-red-600 font-semibold">
                      <span className="bg-red-100 px-3 py-1 rounded-full text-sm">
                        🎁 {restaurant.promoText || 'Diskon Spesial'}
                      </span>
                    </div>
                  </div>
                  
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
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500 text-sm">
                      📍 {restaurant.address?.substring(0, 20)}...
                    </span>
                    <span className="text-green-600 text-sm font-semibold">
                      {restaurant.priceRange || 'Rp 50.000 - 150.000'}
                    </span>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/restaurant/${restaurant.id}`);
                    }}
                    className="w-full py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    Lihat Detail & Promo
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Login Info Box */}
          <div className="mt-8 p-6 bg-gradient-to-r from-red-400 to-orange-500 rounded-lg text-center text-white">
            <h3 className="text-lg font-semibold mb-2">Promo Eksklusif Menunggu!</h3>
            <p className="mb-4 opacity-90">
              Dapatkan akses ke promo eksklusif dan diskon spesial dengan login ke akun Anda.
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
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Tentang Promo Restoran</h3>
            <p className="text-gray-600 mb-4">
              Anda bisa melihat promo yang tersedia tanpa login. Untuk menikmati promo dan melakukan reservasi, 
              Anda perlu login terlebih dahulu.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Sebelum Login</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Lihat daftar restoran promo</li>
                  <li>• Lihat detail restoran</li>
                  <li>• Baca ulasan pelanggan</li>
                </ul>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Setelah Login</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Nikmati promo eksklusif</li>
                  <li>• Lakukan reservasi online</li>
                  <li>• Beri ulasan & rating</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}