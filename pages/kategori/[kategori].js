import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Layout from '../../components/Layout/Layout';

// Categories sesuai gambar
const categories = [
  { id: 'indonesian', name: 'Indonesian' },
  { id: 'western', name: 'Western' },
  { id: 'japanese', name: 'Japanese' },
  { id: 'chinese', name: 'Chinese' },
  { id: 'korean', name: 'Korean' },
  { id: 'fast_food', name: 'Fast Food' },
  { id: 'fine_dining', name: 'Fine Dining' },
  { id: 'cafe', name: 'Cafe' },
  { id: 'street_food', name: 'Street Food' }
];

export default function KategoriPage() {
  const router = useRouter();
  const { kategori } = router.query;

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fungsi untuk mapping kategori frontend ke nilai database
  const getDatabaseCuisineValue = (categoryId) => {
    const mapping = {
      'indonesian': 'Indonesian',
      'western': 'Western', 
      'japanese': 'Japanese',
      'chinese': 'Chinese',
      'korean': 'Korean',
      'fast_food': 'Fast Food',
      'fine_dining': 'Fine Dining',
      'cafe': 'Cafe',
      'street_food': 'Street Food'
    };
    return mapping[categoryId] || categoryId;
  };

  // Fetch restaurants from Firebase berdasarkan kategori
  useEffect(() => {
    const fetchRestaurantsByCategory = async () => {
      setLoading(true);
      try {
        console.log('🔍 [Kategori] Fetching restaurants for category:', kategori);
        
        let restaurantsQuery;
        
        if (kategori === 'all' || !kategori) {
          // Jika kategori "all" atau tidak ada, ambil semua restoran
          restaurantsQuery = query(
            collection(db, 'restaurants'),
            orderBy('name')
          );
        } else {
          // Dapatkan nilai cuisine untuk database
          const cuisineValue = getDatabaseCuisineValue(kategori);
          console.log('🔍 [Kategori] Searching for cuisine:', cuisineValue);
          
          // Coba filter dengan beberapa field yang mungkin
          restaurantsQuery = query(
            collection(db, 'restaurants')
          );
        }
        
        const querySnapshot = await getDocs(restaurantsQuery);
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
            isOpen: data.isOpen !== undefined ? data.isOpen : true // Default true jika tidak ada
          };
        });

        // Filter manual di frontend untuk handle berbagai kemungkinan field
        let filteredRestaurants = allRestaurants;
        
        if (kategori !== 'all' && kategori) {
          const cuisineValue = getDatabaseCuisineValue(kategori);
          filteredRestaurants = allRestaurants.filter(restaurant => {
            // Cek di berbagai field yang mungkin menyimpan kategori
            const restaurantCuisine = restaurant.cuisine?.toLowerCase();
            const restaurantType = restaurant.type?.toLowerCase();
            const searchValue = cuisineValue.toLowerCase();
            
            return restaurantCuisine?.includes(searchValue) || 
                   restaurantType?.includes(searchValue) ||
                   restaurantCuisine?.includes(kategori) ||
                   restaurantType?.includes(kategori);
          });
        }

        console.log('✅ [Kategori] Successfully fetched restaurants:', filteredRestaurants.length);
        console.log('📊 [Kategori] Sample restaurant data:', filteredRestaurants[0]);
        setRestaurants(filteredRestaurants);

      } catch (error) {
        console.error('❌ [Kategori] Error fetching restaurants:', error);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    if (kategori) {
      fetchRestaurantsByCategory();
    }
  }, [kategori]);

  const formatPrice = (price) => {
    if (typeof price === 'string') {
      return price;
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  // Get category name for display
  const getCategoryDisplayName = () => {
    if (!kategori || kategori === 'all') return 'Semua Restoran';
    
    const category = categories.find(cat => cat.id === kategori);
    return category ? category.name : kategori;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => router.back()}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-6"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Kembali
            </button>
            
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {getCategoryDisplayName()}
              </h1>
              <p className="text-xl text-gray-600">
                Temukan {getCategoryDisplayName().toLowerCase()} terbaik untuk kamu
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Categories Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Pilih Kategori</h3>
                
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/kategori/all')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                      (!kategori || kategori === 'all') 
                        ? 'bg-orange-600 text-white shadow-md' 
                        : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                    }`}
                  >
                    Semua Restoran
                  </button>
                  
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => router.push(`/kategori/${category.id}`)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                        kategori === category.id
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="mt-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
                  <h4 className="font-bold mb-2">📊 Informasi</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Restoran:</span>
                      <span className="font-bold">{restaurants.length} restoran</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kategori:</span>
                      <span className="font-bold">{getCategoryDisplayName()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="lg:w-3/4">
              
              {/* Results Header */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {getCategoryDisplayName()}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Menampilkan {restaurants.length} {getCategoryDisplayName().toLowerCase()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                    <button 
                      onClick={() => router.push('/search')}
                      className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      🔍 Cari Restoran
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Memuat restoran...</p>
                </div>
              )}

              {/* Results Grid */}
              {!loading && restaurants.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {restaurants.map((restaurant) => (
                    <div 
                      key={restaurant.id}
                      onClick={() => router.push(`/restaurant/${restaurant.id}`)}
                      className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 relative"
                    >
                      {/* Overlay untuk restoran tutup */}
                      {!restaurant.isOpen && (
                        <div className="absolute inset-0 bg-black bg-opacity-70 z-10 flex items-center justify-center rounded-2xl">
                          <div className="text-white text-center p-4">
                            <div className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-lg mb-2">
                              🔴 SEDANG TUTUP
                            </div>
                            <p className="text-sm">Restoran sedang tidak beroperasi</p>
                          </div>
                        </div>
                      )}

                      <div className="relative">
                        <img 
                          src={restaurant.imageUrl} 
                          alt={restaurant.name}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.target.src = '/images/restaurant-placeholder.jpg';
                          }}
                        />
                        
                        {/* Status Badge */}
                        <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-bold ${
                          restaurant.isOpen 
                            ? 'bg-green-600 text-white' 
                            : 'bg-red-600 text-white'
                        }`}>
                          {restaurant.isOpen ? '🟢 BUKA' : '🔴 TUTUP'}
                        </div>
                        
                        <div className="absolute top-4 right-4 bg-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {restaurant.priceRange || formatPrice(restaurant.averagePrice)}
                        </div>
                        
                        {restaurant.isPromo && (
                          <div className="absolute bottom-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                            PROMO
                          </div>
                        )}
                      </div>

                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                          {restaurant.name}
                        </h3>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {restaurant.description}
                        </p>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-gray-600">
                            <span className="w-20 flex-shrink-0 font-medium">🍽️ Jenis</span>
                            <span className="flex-1">{restaurant.type} • {restaurant.cuisine}</span>
                          </div>
                          
                          <div className="flex items-center text-gray-600">
                            <span className="w-20 flex-shrink-0 font-medium">💰 Harga</span>
                            <span className="flex-1">{restaurant.priceRange || formatPrice(restaurant.averagePrice)}</span>
                          </div>

                          {restaurant.distance && (
                            <div className="flex items-center text-gray-600">
                              <span className="w-20 flex-shrink-0 font-medium">📍 Jarak</span>
                              <span className="flex-1">{restaurant.distance}</span>
                            </div>
                          )}
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/restaurant/${restaurant.id}`);
                          }}
                          className={`w-full mt-4 py-3 rounded-xl font-semibold transition-colors ${
                            restaurant.isOpen
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-gray-400 text-white cursor-not-allowed'
                          }`}
                          disabled={!restaurant.isOpen}
                        >
                          {restaurant.isOpen ? 'Lihat Detail' : 'Restoran Tutup'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && restaurants.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Tidak Ada Restoran</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {`Tidak ada restoran ${getCategoryDisplayName().toLowerCase()} yang tersedia saat ini.`}
                  </p>
                  <div className="space-x-4">
                    <button 
                      onClick={() => router.push('/kategori/all')}
                      className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
                    >
                      Lihat Semua Restoran
                    </button>
                    <button 
                      onClick={() => router.push('/')}
                      className="bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                    >
                      Kembali ke Home
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}