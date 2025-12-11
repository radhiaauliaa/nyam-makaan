import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Layout from '../components/Layout/Layout';

// Fungsi untuk mengekstrak harga dari priceRange string
const extractPriceFromRange = (priceRange) => {
  if (!priceRange) return 150000;
  
  // Extract numbers from string like "Rp 20.000 - Rp 50.000"
  const matches = priceRange.match(/\d+/g);
  if (matches && matches.length >= 2) {
    // Take the lower bound (first number) and convert to number
    return parseInt(matches[0]) * 1000; // Convert "20" to 20000
  }
  
  return 150000;
};

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;

  const [searchQuery, setSearchQuery] = useState(q || '');
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [budgetRange, setBudgetRange] = useState([0, 300000]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Categories for filtering
  const categories = [
    { id: 'all', name: 'Semua' },
    { id: 'restaurant', name: 'Restoran' },
    { id: 'cafe', name: 'Kafe' },
    { id: 'street_food', name: 'Street Food' },
    { id: 'fine_dining', name: 'Fine Dining' },
    { id: 'fast_food', name: 'Fast Food' },
    { id: 'indonesian', name: 'Masakan Indonesia' },
    { id: 'chinese', name: 'Chinese' },
    { id: 'japanese', name: 'Japanese' },
    { id: 'western', name: 'Western' }
  ];

  // Fetch restaurants from Firebase
  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        console.log('🔍 [Search] Fetching restaurants from Firebase...');
        
        const restaurantsQuery = query(
          collection(db, 'restaurants'),
          orderBy('name')
        );
        
        const querySnapshot = await getDocs(restaurantsQuery);
        const restaurantsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`📄 [Search] Restaurant data:`, data.name, data);
          
          // Extract price from priceRange for filtering
          const extractedPrice = extractPriceFromRange(data.priceRange);
          
          return {
            id: doc.id,
            name: data.name || 'Unknown Restaurant',
            description: data.description || '',
            type: data.type || data.category || 'restaurant',
            cuisine: data.cuisine || '',
            averagePrice: data.averagePrice || data.price || extractedPrice,
            priceRange: data.priceRange || 'Rp 50.000 - Rp 300.000',
            rating: data.rating || 4.0,
            imageUrl: data.imageUrl || data.image || '/images/restaurant-placeholder.jpg',
            address: data.address || '',
            distance: data.distance || '',
            isPromo: data.isPromo || false,
            promoText: data.promoText || '',
            // Add extracted price for consistent filtering
            filterPrice: data.averagePrice || data.price || extractedPrice,
            isOpen: data.isOpen !== undefined ? data.isOpen : true // Default true jika tidak ada
          };
        });

        console.log('✅ [Search] Successfully fetched restaurants:', restaurantsData.length);
        setRestaurants(restaurantsData);
        setFilteredRestaurants(restaurantsData);

      } catch (error) {
        console.error('❌ [Search] Error fetching restaurants:', error);
        // No dummy data - just empty arrays
        setRestaurants([]);
        setFilteredRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Search and filter function
  useEffect(() => {
    let results = restaurants;

    // Text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      results = results.filter(restaurant => {
        const searchFields = [
          restaurant.name?.toLowerCase(),
          restaurant.description?.toLowerCase(),
          restaurant.cuisine?.toLowerCase(),
          restaurant.type?.toLowerCase(),
          restaurant.address?.toLowerCase()
        ].filter(Boolean);

        return searchFields.some(field => field.includes(query));
      });
    }

    // Category filter
    if (activeCategory !== 'all') {
      results = results.filter(restaurant => {
        const restaurantType = restaurant.type?.toLowerCase();
        const restaurantCuisine = restaurant.cuisine?.toLowerCase();
        const category = activeCategory.toLowerCase();
        
        return restaurantType === category || 
               restaurantCuisine === category ||
               restaurantType?.includes(category) ||
               restaurantCuisine?.includes(category);
      });
    }

    // Budget filter - UPDATED to use filterPrice
    results = results.filter(restaurant => {
      const priceToCheck = restaurant.filterPrice || restaurant.averagePrice;
      return priceToCheck >= budgetRange[0] && priceToCheck <= budgetRange[1];
    });

    console.log('🔍 [Search] Filtered results:', results.length);
    setFilteredRestaurants(results);
  }, [searchQuery, activeCategory, budgetRange, restaurants]);

  // Update search query when URL parameter changes
  useEffect(() => {
    if (q) {
      setSearchQuery(q);
    }
  }, [q]);

  const handleSearch = (e) => {
    e.preventDefault();
    router.push({
      pathname: '/search',
      query: { q: searchQuery }
    }, undefined, { shallow: true });
  };

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

  // UPDATED Price range labels for 300,000 max
  const getPriceRangeLabel = () => {
    if (budgetRange[1] >= 200000) {
      return 'Premium';
    } else if (budgetRange[1] >= 100000) {
      return 'Standar';
    } else {
      return 'Ekonomis';
    }
  };

  // Calculate price indicator position for slider
  const getPriceIndicatorPosition = () => {
    const percentage = (budgetRange[1] / 300000) * 100;
    return `${percentage}%`;
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
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Cari Restoran Favoritmu</h1>
              <p className="text-xl text-gray-600">
                Temukan restoran terbaik dengan budget hingga Rp 300.000
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari restoran, makanan, atau jenis masakan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 text-lg border border-gray-300 rounded-2xl focus:outline-none focus:ring-3 focus:ring-orange-500 focus:border-orange-500 shadow-sm"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button 
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-orange-600 text-white px-6 py-2 rounded-xl hover:bg-orange-700 transition-colors font-semibold"
                >
                  Cari
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Filters Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-4">
                
                {/* Filter Toggle for Mobile */}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden w-full flex items-center justify-between py-3 px-4 bg-orange-50 rounded-xl mb-4"
                >
                  <span className="font-semibold text-orange-600">Filter & Kategori</span>
                  <svg 
                    className={`w-5 h-5 text-orange-600 transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Filters Content */}
                <div className={`${showFilters ? 'block' : 'hidden'} lg:block space-y-8`}>
                  
                  {/* Budget Filter - UPDATED for 300,000 max */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                      Filter Budget
                      <span className="text-sm font-normal text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                        {getPriceRangeLabel()}
                      </span>
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Rp 0</span>
                        <span>Rp {budgetRange[1].toLocaleString('id-ID')}</span>
                      </div>
                      
                      {/* Range Slider - UPDATED for 300,000 max */}
                      <div className="relative py-4">
                        <div className="relative">
                          <input
                            type="range"
                            min="0"
                            max="300000"
                            step="10000" 
                            value={budgetRange[1]}
                            onChange={(e) => setBudgetRange([0, parseInt(e.target.value)])}
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer range-slider"
                          />
                          <div 
                            className="absolute top-1/2 h-3 bg-orange-500 rounded-l-lg pointer-events-none"
                            style={{ 
                              width: getPriceIndicatorPosition(),
                              transform: 'translateY(-50%)'
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* UPDATED Price indicators */}
                      <div className="flex justify-between text-xs text-gray-500">
                        <span className="text-green-600">Murah</span>
                        <span className="text-yellow-600">💰 Sedang</span>
                        <span className="text-orange-600">💎 Mahal</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  {/* Categories */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Kategori</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                            activeCategory === category.id
                              ? 'bg-orange-600 text-white shadow-md'
                              : 'bg-gray-50 text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Stats - UPDATED */}
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white">
                    <h4 className="font-bold mb-2">📊 Hasil Pencarian</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total Ditemukan:</span>
                        <span className="font-bold">{filteredRestaurants.length} restoran</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rentang Budget:</span>
                        <span className="font-bold">Rp 0 - {budgetRange[1].toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kategori:</span>
                        <span className="font-bold">
                          {categories.find(cat => cat.id === activeCategory)?.name || 'Semua'}
                        </span>
                      </div>
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
                      {searchQuery ? `Hasil pencarian untuk "${searchQuery}"` : 'Semua Restoran'}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Menampilkan {filteredRestaurants.length} restoran dengan budget hingga Rp 300.000
                      {activeCategory !== 'all' && ` dalam kategori ${categories.find(cat => cat.id === activeCategory)?.name}`}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setBudgetRange([0, 300000]);
                        setActiveCategory('all');
                        router.push('/search', undefined, { shallow: true });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      🔄 Reset Filter
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
              {!loading && filteredRestaurants.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredRestaurants.map((restaurant) => (
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
                        
                        {/* Status Badge hanya untuk TUTUP - HAPUS yang BUKA */}
                        {!restaurant.isOpen && (
                          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                            🔴 TUTUP
                          </div>
                        )}
                        
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
              {!loading && filteredRestaurants.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Tidak Ada Hasil</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {searchQuery 
                      ? `Tidak ditemukan restoran untuk "${searchQuery}" dengan budget hingga Rp 300.000. Coba kata kunci lain atau sesuaikan filter.`
                      : restaurants.length === 0 
                        ? 'Tidak ada restoran yang tersedia saat ini.' 
                        : 'Tidak ada restoran yang sesuai dengan filter budget hingga Rp 300.000.'
                    }
                  </p>
                  <div className="space-x-4">
                    <button 
                      onClick={() => {
                        setSearchQuery('');
                        setBudgetRange([0, 300000]);
                        setActiveCategory('all');
                      }}
                      className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors"
                    >
                      Tampilkan Semua Restoran
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

      <style jsx>{`
        .range-slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #EA580C;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .range-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #EA580C;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
    </Layout>
  );
}