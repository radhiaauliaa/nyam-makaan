import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function PromoPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPromoRestaurants = async () => {
      try {
        setLoading(true);
        console.log('🔍 [Promo] Fetching promo restaurants...');

        let restaurantsData = [];

        // Try query with where isPromo = true first
        try {
          const restaurantsQuery = query(
            collection(db, 'restaurants'),
            where('isPromo', '==', true),
            orderBy('name')
          );
          
          const querySnapshot = await getDocs(restaurantsQuery);
          restaurantsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || 'Unknown Restaurant',
              description: data.description || '',
              type: data.type || data.category || 'restaurant',
              cuisine: data.cuisine || '',
              averagePrice: data.averagePrice || data.price || 150000,
              priceRange: data.priceRange || 'Rp 50.000 - Rp 300.000',
              rating: data.rating || 4.0,
              imageUrl: data.imageUrl || data.image || '/images/restaurant-placeholder.jpg',
              address: data.address || '',
              distance: data.distance || '',
              isPromo: data.isPromo || false,
              promoText: data.promoText || '',
              discount: data.discount || 15,
              minPurchase: data.minPurchase || 50000,
              promoExpiry: data.promoExpiry || '30 September 2024',
              promoTitle: data.promoTitle || `Promo Spesial ${data.discount || 15}%`,
              promoDescription: data.promoDescription || '',
              isOpen: data.isOpen !== undefined ? data.isOpen : true
            };
          });
          
          console.log('✅ [Promo] Found promo restaurants:', restaurantsData.length);
          
        } catch (queryError) {
          console.log('❌ [Promo] Query with where failed, trying fallback...', queryError);
          
          // Fallback: get all restaurants and filter client-side
          const allRestaurantsQuery = query(
            collection(db, 'restaurants'),
            orderBy('name')
          );
          
          const querySnapshot = await getDocs(allRestaurantsQuery);
          const allRestaurants = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || 'Unknown Restaurant',
              description: data.description || '',
              type: data.type || data.category || 'restaurant',
              cuisine: data.cuisine || '',
              averagePrice: data.averagePrice || data.price || 150000,
              priceRange: data.priceRange || 'Rp 50.000 - Rp 300.000',
              rating: data.rating || 4.0,
              imageUrl: data.imageUrl || data.image || '/images/restaurant-placeholder.jpg',
              address: data.address || '',
              distance: data.distance || '',
              isPromo: data.isPromo || false,
              promoText: data.promoText || '',
              discount: data.discount || 15,
              minPurchase: data.minPurchase || 50000,
              promoExpiry: data.promoExpiry || '30 September 2024',
              promoTitle: data.promoTitle || `Promo Spesial ${data.discount || 15}%`,
              promoDescription: data.promoDescription || '',
              isOpen: data.isOpen !== undefined ? data.isOpen : true
            };
          });
          
          restaurantsData = allRestaurants.filter(restaurant => restaurant.isPromo);
          console.log('✅ [Promo] Fallback found promo restaurants:', restaurantsData.length);
        }

        if (restaurantsData.length === 0) {
          setError('Tidak ada restoran promo saat ini');
        }

        setRestaurants(restaurantsData);

      } catch (error) {
        console.error('❌ [Promo] Error:', error);
        setError('Gagal memuat restoran promo: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPromoRestaurants();
  }, []);

  // Format currency untuk minPurchase
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    if (amount >= 1000) {
      return `Rp ${(amount / 1000).toLocaleString('id-ID')}RB`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Format tanggal promo expiry
  const formatPromoExpiry = (expiry) => {
    if (!expiry) return '30 September 2024';
    
    // Jika sudah dalam format string, return as is
    if (typeof expiry === 'string') {
      return expiry;
    }
    
    // Jika berupa timestamp Firestore
    if (expiry.toDate) {
      const date = expiry.toDate();
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    
    return '30 September 2024';
  };

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
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-6"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Kembali ke Home
            </button>
            
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Ada Promo Apa Aja Sih Hari Ini???</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Penyalamat dompet nih! Cek promo terbaru dari restoran favoritmu
              </p>
            </div>
          </div>

          {/* Statistics */}
          {restaurants.length > 0 && (
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 text-white mb-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <h2 className="text-2xl font-bold mb-2">🎉 Promo Spesial!</h2>
                  <p className="text-orange-100">
                    {restaurants.length} restoran sedang memberikan penawaran menarik
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-xl px-4 py-2">
                  <p className="font-semibold">Diskon hingga {Math.max(...restaurants.map(r => r.discount || 0))}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Restaurants Grid */}
          {restaurants.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <div 
                  key={restaurant.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="relative">
                    <img 
                      src={restaurant.imageUrl} 
                      alt={restaurant.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.target.src = '/images/restaurant-placeholder.jpg';
                      }}
                    />
                    
                    {/* Promo Badge */}
                    <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {restaurant.discount}% OFF
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold ${
                      restaurant.isOpen 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {restaurant.isOpen ? '🟢 BUKA' : '🔴 TUTUP'}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Restaurant Name */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {restaurant.name}
                    </h3>

                    {/* Promo Title */}
                    <div className="mb-3">
                      <h4 className="text-lg font-semibold text-red-600 mb-1">
                        {restaurant.promoTitle}
                      </h4>
                      {restaurant.promoDescription && (
                        <p className="text-gray-600 text-sm">
                          {restaurant.promoDescription}
                        </p>
                      )}
                    </div>

                    {/* Promo Details */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Min. Belanja:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(restaurant.minPurchase)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Berlaku hingga:</span>
                        <span className="font-semibold text-gray-900">
                          {formatPromoExpiry(restaurant.promoExpiry)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jenis:</span>
                        <span className="font-semibold text-gray-900">
                          {restaurant.type} • {restaurant.cuisine}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Harga:</span>
                        <span className="font-semibold text-orange-600">
                          {restaurant.priceRange}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button 
                        onClick={() => router.push(`/restaurant/${restaurant.id}`)}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-colors text-center ${
                          restaurant.isOpen
                            ? 'bg-orange-600 text-white hover:bg-orange-700'
                            : 'bg-gray-400 text-white cursor-not-allowed'
                        }`}
                        disabled={!restaurant.isOpen}
                      >
                        {restaurant.isOpen ? 'Lihat Resto' : 'Resto Tutup'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {restaurants.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Tidak Ada Promo Saat Ini</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {error || 'Cek kembali nanti untuk penawaran spesial dari restoran favorit Anda.'}
              </p>
              <div className="space-x-4">
                <button 
                  onClick={() => router.push('/')}
                  className="bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                >
                  Kembali ke Home
                </button>
                <button 
                  onClick={() => router.push('/kategori/all')}
                  className="bg-gray-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Lihat Semua Restoran
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}