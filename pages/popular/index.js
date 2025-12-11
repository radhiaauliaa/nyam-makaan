// pages/popular/index.js - PERBAIKI QUERY
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function PopularPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPopularRestaurants = async () => {
      try {
        setLoading(true);

        // OPTION 1: Query untuk restoran dengan rating > 0 (HANYA JIKA INDEX ADA)
        try {
          const restaurantsQuery = query(
            collection(db, 'restaurants'),
            where('reviewCount', '>=', 1), // Minimal ada 1 review
            where('rating', '>=', 1), // Rating minimal 1
            orderBy('rating', 'desc'),
            orderBy('reviewCount', 'desc'),
            limit(10)
          );
          
          const querySnapshot = await getDocs(restaurantsQuery);
          const restaurantsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          console.log('✅ [Popular] Query dengan where berhasil:', restaurantsData.length, 'restoran');
          
          if (restaurantsData.length > 0) {
            setRestaurants(restaurantsData);
            return;
          }
          
        } catch (indexError) {
          console.log('⚠️ [Popular] Index belum ada, menggunakan fallback query...');
        }

        // OPTION 2: Query alternatif tanpa where rating (lebih aman)
        try {
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
              // Pastikan rating ada, jika tidak default 0
              rating: data.rating || 0,
              reviewCount: data.reviewCount || 0
            };
          });

          console.log('✅ [Popular] Fallback query berhasil:', fallbackData.length, 'restoran');

          // Filter di client side untuk hanya yang ada review
          fallbackData = fallbackData.filter(restaurant => 
            (restaurant.reviewCount || 0) > 0 && (restaurant.rating || 0) > 0
          );

          // Sort lagi di client side untuk memastikan urutan benar
          fallbackData.sort((a, b) => {
            // Urutkan rating tertinggi dulu
            if (b.rating !== a.rating) {
              return b.rating - a.rating;
            }
            // Jika rating sama, urutkan jumlah review
            return b.reviewCount - a.reviewCount;
          });

          setRestaurants(fallbackData.slice(0, 10));
          
        } catch (fallbackError) {
          console.error('❌ [Popular] Fallback error:', fallbackError);
          
          // OPTION 3: Query paling sederhana
          const simpleQuery = query(
            collection(db, 'restaurants'),
            limit(20)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          let simpleData = simpleSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              rating: data.rating || 0,
              reviewCount: data.reviewCount || 0
            };
          });

          // Sort di client side
          simpleData.sort((a, b) => {
            if (b.rating !== a.rating) {
              return b.rating - a.rating;
            }
            return b.reviewCount - a.reviewCount;
          });

          // Filter yang ada rating > 0 dan reviewCount > 0
          simpleData = simpleData.filter(restaurant => 
            (restaurant.reviewCount || 0) > 0 && (restaurant.rating || 0) > 0
          );

          setRestaurants(simpleData.slice(0, 10));
          setError('Menampilkan restoran dengan rating tertinggi');
        }

      } catch (error) {
        console.error('❌ [Popular] Error:', error);
        setError('Gagal memuat restoran populer: ' + error.message);
        
        // Empty state
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularRestaurants();
  }, []);

  // Fungsi untuk menampilkan bintang rating yang benar
  const renderRatingStars = (rating) => {
    // Jika rating 0, tampilkan bintang kosong
    if (!rating || rating === 0) {
      return (
        <div className="flex items-center">
          {[...Array(5)].map((_, index) => (
            <span key={index} className="text-gray-300 text-lg">★</span>
          ))}
          <span className="ml-2 text-gray-400 text-sm">Belum ada rating</span>
        </div>
      );
    }

    const roundedRating = Math.round(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => {
          if (index < roundedRating) {
            return <span key={index} className="text-yellow-500 text-lg">★</span>;
          } else if (index === roundedRating && hasHalfStar) {
            return <span key={index} className="text-yellow-500 text-lg">⯨</span>;
          } else {
            return <span key={index} className="text-gray-300 text-lg">★</span>;
          }
        })}
        <span className="ml-2 text-gray-700 font-semibold">
          {rating ? rating.toFixed(1) : '0.0'}
        </span>
      </div>
    );
  };

  // Format jumlah review
  const formatReviewCount = (count) => {
    if (!count || count === 0) return 'Belum ada ulasan';
    if (count === 1) return '1 ulasan';
    return `${count} ulasan`;
  };

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
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Hot Topic Nih!</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Eitss, ada yang lagi rame lohh dikalangan foodies!!
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Diurutkan berdasarkan rating tertinggi
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <p>{error}</p>
            </div>
          )}

          {/* Restaurants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant, index) => (
              <div 
                key={restaurant.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
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
                  
                  {/* Ranking Badge */}
                  <div className="absolute top-4 left-4">
                    <div className="bg-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold shadow-lg">
                      #{index + 1}
                    </div>
                  </div>
                  
                  {/* Rating Badge */}
                  {restaurant.rating > 0 && (
                    <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                      ⭐ {restaurant.rating?.toFixed(1) || '0.0'}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {/* Restaurant Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {restaurant.name}
                  </h3>

                  {/* Rating Display */}
                  <div className="mb-4">
                    {renderRatingStars(restaurant.rating)}
                    <p className="text-gray-600 text-sm mt-1">
                      {formatReviewCount(restaurant.reviewCount)}
                    </p>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-2 mb-4">
                    {restaurant.type && (
                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        <span className="text-sm">{restaurant.type || 'Restoran'}</span>
                      </div>
                    )}

                    {restaurant.address && (
                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span className="text-sm">{restaurant.address}</span>
                      </div>
                    )}

                    {restaurant.priceRange && (
                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span className="text-sm">{restaurant.priceRange || 'Harga bervariasi'}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => router.push(`/restaurant/${restaurant.id}`)}
                    className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                  >
                    Lihat Resto
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {restaurants.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Belum Ada Restoran Populer</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Belum ada restoran yang memiliki rating dan ulasan. Coba nanti lagi!
              </p>
              <button 
                onClick={() => router.push('/restaurants')}
                className="bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
              >
                Jelajahi Restoran
              </button>
            </div>
          )}

          {/* Info Section */}
          {restaurants.length > 0 && (
            <div className="mt-12 bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tentang Restoran Populer</h3>
              <p className="text-gray-600 mb-4">
                Restoran di halaman ini diurutkan berdasarkan <strong>rating tertinggi</strong> dari ulasan pelanggan. 
                Semakin tinggi rating dan semakin banyak ulasan, semakin tinggi peringkatnya.
              </p>
              <div className="text-sm text-gray-500">
                <p>📊 <strong>Peringkat berdasarkan:</strong></p>
                <ul className="list-disc ml-5 mt-2">
                  <li>Rating bintang (1-5)</li>
                  <li>Jumlah ulasan (sebagai tie-breaker)</li>
                  <li>Hanya restoran dengan minimal 1 ulasan yang ditampilkan</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}