import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { 
  doc, getDoc, collection, query, where, getDocs, orderBy,
  onSnapshot, updateDoc
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Layout from '../../../components/Layout/Layout';
import Map from '../../../components/Map/Map';
import ReviewForm from '../../../components/Review/ReviewForm';
import ReviewList from '../../../components/Review/ReviewList';
import ReviewStats from '../../../components/Review/ReviewStats';
import FavoriteButton from '../../../components/Favorite/FavoriteButton';
import { getActivePromosForRestaurant } from '../../../lib/firestore';

export default function RestaurantDetail() {
  const router = useRouter();
  const { id } = router.query;

  const [activeTab, setActiveTab] = useState('info');
  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [menus, setMenus] = useState([]);
  const [activePromos, setActivePromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingMenus, setLoadingMenus] = useState(true);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [error, setError] = useState(null);

  // Fungsi untuk render rating bintang
  const renderRatingStars = (rating = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center">
        {/* Bintang penuh */}
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400 text-xl">★</span>
        ))}
        
        {/* Setengah bintang */}
        {hasHalfStar && (
          <span className="text-yellow-400 text-xl">★</span>
        )}
        
        {/* Bintang kosong */}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} className="text-gray-300 text-xl">★</span>
        ))}
        
        {/* Rating number */}
        <span className="ml-2 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  /** 🔥 Auto-Update Restaurant Rating in Firestore */
  const autoUpdateRestaurantRating = async () => {
    if (!id || !reviews.length) return;
    
    try {
      const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      const averageRating = totalRating / reviews.length;
      const roundedRating = Math.round(averageRating * 10) / 10;
      
      // Update restaurant document with new rating
      await updateDoc(doc(db, 'restaurants', id), {
        rating: roundedRating,
        reviewCount: reviews.length,
        lastRatingUpdate: new Date(),
        updatedAt: new Date()
      });
      
      // Also update local restaurant state
      setRestaurant(prev => prev ? {
        ...prev,
        rating: roundedRating,
        reviewCount: reviews.length
      } : null);
      
    } catch (error) {
      console.error('Error updating restaurant rating:', error);
    }
  };

  /** 🔥 Real-time Subscription untuk Reviews */
  useEffect(() => {
    if (!id) return;
    
    let unsubscribe;
    
    try {
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('restaurantId', '==', id),
        orderBy('createdAt', 'desc')
      );
      
      unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
        const reviewsData = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          reviewsData.push({
            id: doc.id,
            ...data,
            ownerReply: data.ownerReply || null,
            repliedAt: data.repliedAt || null,
            ownerName: data.ownerName || null,
            createdAt: data?.createdAt || null,
            rating: data.rating || 0
          });
        });
        
        setReviews(reviewsData);
        setLoadingReviews(false);
        
        // Auto-update restaurant rating setelah reviews berubah
        if (reviewsData.length > 0) {
          autoUpdateRestaurantRating();
        }
      }, (error) => {
        console.error('Error in reviews listener:', error);
        // Fallback: load reviews manually
        loadRestaurantReviewsManually();
      });
      
    } catch (error) {
      console.error('Error setting up listener:', error);
      // Fallback ke manual loading
      loadRestaurantReviewsManually();
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id]);

  /** 🔥 Manual Load Reviews (Fallback) */
  const loadRestaurantReviewsManually = async () => {
    if (!id) return;

    try {
      setLoadingReviews(true);
      
      let reviewsQuery;
      let hasOrderBy = false;

      try {
        reviewsQuery = query(
          collection(db, 'reviews'),
          where('restaurantId', '==', id),
          orderBy('createdAt', 'desc')
        );
        hasOrderBy = true;
      } catch (queryError) {
        reviewsQuery = query(
          collection(db, 'reviews'),
          where('restaurantId', '==', id)
        );
        hasOrderBy = false;
      }

      const querySnapshot = await getDocs(reviewsQuery);

      let reviewsData = [];
      if (querySnapshot.docs && Array.isArray(querySnapshot.docs)) {
        reviewsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          
          return {
            id: doc.id,
            ...data,
            ownerReply: data.ownerReply || null,
            repliedAt: data.repliedAt || null,
            ownerName: data.ownerName || null,
            createdAt: data?.createdAt || null,
            rating: data.rating || 0
          };
        });
      }

      if (!hasOrderBy && reviewsData.length > 0) {
        reviewsData.sort((a, b) => {
          try {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 
                         (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 
                         (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
          } catch (error) {
            return 0;
          }
        });
      }

      setReviews(reviewsData);
      
      // Auto-update restaurant rating
      if (reviewsData.length > 0) {
        autoUpdateRestaurantRating();
      }
      
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  /** 🔥 Load Active Promos */
  const loadActivePromos = async (restaurantId) => {
    try {
      setLoadingPromos(true);
      const promos = await getActivePromosForRestaurant(restaurantId);
      setActivePromos(promos);
    } catch (error) {
      console.error('Error loading promos:', error);
    } finally {
      setLoadingPromos(false);
    }
  };

  /** 🔥 Load Menus from Firestore */
  const loadRestaurantMenus = async () => {
    if (!id) {
      setLoadingMenus(false);
      return;
    }

    try {
      const menusRef = collection(db, 'restaurants', id, 'menus');
      const menusQuery = query(menusRef, where('available', '==', true));
      
      const querySnapshot = await getDocs(menusQuery);

      const menusData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        menusData.push({
          id: doc.id,
          ...data,
          name: data.name || 'No Name',
          price: data.price || 0,
          category: data.category || 'Lainnya',
          description: data.description || '',
          image: data.image || null,
          available: data.available !== false
        });
      });

      setMenus(menusData);
      
    } catch (error) {
      console.error('Error loading menus:', error);
      try {
        const menusRef = collection(db, 'restaurants', id, 'menus');
        const querySnapshot = await getDocs(menusRef);
        const menusData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          menusData.push({
            id: doc.id,
            ...data,
            name: data.name || 'No Name',
            price: data.price || 0,
            category: data.category || 'Lainnya',
            available: data.available !== false
          });
        });
        setMenus(menusData);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        setMenus([]);
      }
    } finally {
      setLoadingMenus(false);
    }
  };

  /** 🔥 Load Restaurant */
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const docRef = doc(db, 'restaurants', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const restaurantData = {
            id: docSnap.id,
            ...docSnap.data()
          };
          
          setRestaurant(restaurantData);
          await Promise.all([
            // Reviews sudah di-handle oleh real-time listener
            loadRestaurantMenus(),
            loadActivePromos(id)
          ]);

        } else {
          setError('Restaurant tidak ditemukan');
        }

      } catch (error) {
        console.error('Error:', error);
        setError('Gagal memuat data restaurant: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [id]);

  // Hitung rating rata-rata dan jumlah ulasan dari data real-time
  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    return totalRating / reviews.length;
  };

  const averageRating = calculateAverageRating();
  const reviewCount = reviews.length;

  // Fungsi untuk mendapatkan promo untuk menu tertentu
  const getPromoForMenu = (menuId) => {
    const menuPromos = activePromos.filter(promo => {
      if (promo.status !== 'active') {
        return false;
      }
      
      if (!promo.menuIds) {
        return false;
      }
      
      let hasMenu = false;
      
      if (Array.isArray(promo.menuIds)) {
        hasMenu = promo.menuIds.includes(menuId);
      } else if (typeof promo.menuIds === 'string') {
        hasMenu = promo.menuIds === menuId;
      }
      
      return hasMenu;
    });
    
    return menuPromos;
  };

  // Fungsi untuk mendapatkan diskon tertinggi untuk menu
  const getHighestDiscountForMenu = (menuId) => {
    const menuPromos = getPromoForMenu(menuId);
    if (menuPromos.length === 0) {
      return null;
    }

    const highestPromo = menuPromos.reduce((max, promo) => {
      return promo.discountValue > max.discountValue ? promo : max;
    });

    return highestPromo;
  };

  // Hitung harga setelah diskon
  const calculateDiscountedPrice = (originalPrice, promo) => {
    if (!promo) return originalPrice;
    
    if (promo.discountType === 'percentage') {
      return Math.round(originalPrice * (1 - promo.discountValue / 100));
    } else {
      return Math.max(0, originalPrice - promo.discountValue);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleReviewAdded = () => {
    // Real-time listener sudah otomatis menangani update
  };

  // Group menus by category
  const menusByCategory = menus.reduce((acc, menu) => {
    const category = menu.category || 'Lainnya';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(menu);
    return acc;
  }, {});

  // --- UI Handling ---

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="ml-4 text-gray-600">Memuat restoran...</p>
        </div>
      </Layout>
    );
  }

  if (error || !restaurant) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center text-center">
          <div>
            <p className="text-gray-600 mb-4 text-lg">{error || 'Restaurant tidak ditemukan'}</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 font-medium"
            >
              Kembali ke Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const mapCenter = restaurant.location 
    ? [restaurant.location.lat, restaurant.location.lng]
    : [-6.2088, 106.8456];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">

        {/* --- HERO --- */}
        <div className="relative h-64 md:h-96">
          <img 
            src={restaurant.image || '/placeholder.jpg'} 
            alt={restaurant.name}
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>

          <div className="absolute bottom-6 left-6 text-white flex items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{restaurant.name}</h1>
              <div className="flex items-center gap-2 mt-2 text-lg">
                <div className="flex items-center gap-2">
                  {renderRatingStars(averageRating)}
                  <span>• {reviewCount} ulasan</span>
                  {restaurant.cuisine && <span>• {restaurant.cuisine}</span>}
                </div>
              </div>
            </div>
            <FavoriteButton 
              restaurantId={id} 
              restaurantData={{
                name: restaurant.name,
                image: restaurant.image,
                category: restaurant.category,
                description: restaurant.description,
                rating: averageRating,
                address: restaurant.address,
                priceRange: restaurant.priceRange
              }}
              size="lg" 
            />
          </div>

          {/* Promo Badge di Header */}
          {restaurant.isPromo && (
            <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              🎉 PROMO {restaurant.discount}% OFF
            </div>
          )}
        </div>

        {/* --- CONTENT --- */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <div className="bg-white rounded-lg shadow overflow-hidden">

            {/* TABS */}
            <div className="border-b">
              <nav className="flex">
                {['info', 'menu', 'ulasan', 'lokasi'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 text-center border-b-2 font-medium transition-colors ${
                      activeTab === tab
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'ulasan' ? 'Ulasan & Rating' : 
                     tab === 'info' ? 'Info' :
                     tab === 'menu' ? 'Menu' : 'Lokasi'}
                  </button>
                ))}
              </nav>
            </div>

            {/* TAB CONTENT */}
            <div className="p-6">

              {/* INFO TAB */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  <p className="text-gray-700 text-lg leading-relaxed">{restaurant.description}</p>

                  {/* Promo Info */}
                  {restaurant.isPromo && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold mb-2">🎉 {restaurant.promoTitle || 'Promo Spesial!'}</h3>
                          <p className="text-orange-100">
                            {restaurant.promoDescription || `Dapatkan diskon ${restaurant.discount}% untuk menu pilihan`}
                          </p>
                          <p className="text-sm mt-2">
                            📅 Berlaku hingga {restaurant.promoExpiry || '30 September 2024'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">{restaurant.discount}% OFF</div>
                          <p className="text-sm">Min. belanja {formatCurrency(restaurant.minPurchase || 50000)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                    <div>
                      <h3 className="font-semibold text-xl mb-4 text-gray-900">Informasi</h3>
                      <div className="space-y-3">
                        <p className="flex items-center gap-3">
                          <span className="text-gray-500">📍</span>
                          <span>{restaurant.address}</span>
                        </p>
                        <p className="flex items-center gap-3">
                          <span className="text-gray-500">📞</span>
                          <span>{restaurant.phone}</span>
                        </p>
                        {restaurant.email && (
                          <p className="flex items-center gap-3">
                            <span className="text-gray-500">✉️</span>
                            <span>{restaurant.email}</span>
                          </p>
                        )}
                        <p className="flex items-center gap-3">
                          <span className="text-gray-500">⏰</span>
                          <span>{restaurant.openingHours}</span>
                        </p>
                        <p className="flex items-center gap-3">
                          <span className="text-gray-500">👥</span>
                          <span>Kapasitas: {restaurant.capacity} orang</span>
                        </p>
                        <p className="flex items-center gap-3">
                          <span className="text-gray-500">💰</span>
                          <span>Harga: {restaurant.priceRange}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MENU TAB - DENGAN PROMO */}
              {activeTab === 'menu' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Menu Restoran</h2>
                    {restaurant.isPromo && (
                      <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                        🎉 PROMO AKTIF
                      </div>
                    )}
                  </div>

                  {loadingMenus ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                      <p className="text-gray-600 mt-4">Memuat menu...</p>
                    </div>
                  ) : menus.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-6xl mb-4">🍽️</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Ada Menu</h3>
                      <p className="text-gray-500 mb-4">
                        Restoran ini belum menambahkan menu atau menu sedang tidak tersedia.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {Object.entries(menusByCategory).map(([category, categoryMenus]) => (
                        <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-orange-600 text-white px-6 py-4">
                            <h3 className="text-xl font-bold">{category}</h3>
                            <p className="text-orange-100 text-sm">
                              {categoryMenus.length} menu
                              {categoryMenus.filter(menu => getPromoForMenu(menu.id).length > 0).length > 0 && 
                                ` • ${categoryMenus.filter(menu => getPromoForMenu(menu.id).length > 0).length} menu promo`
                              }
                            </p>
                          </div>
                          <div className="divide-y divide-gray-200">
                            {categoryMenus.map((menu) => {
                              const promo = getHighestDiscountForMenu(menu.id);
                              const hasPromo = promo !== null;
                              const discountedPrice = calculateDiscountedPrice(menu.price, promo);

                              return (
                                <div key={menu.id} className="p-6 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-lg font-semibold text-gray-900">
                                              {menu.name}
                                            </h4>
                                            {hasPromo && (
                                              <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                                                PROMO
                                              </span>
                                            )}
                                            {!menu.available && (
                                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                                                HABIS
                                              </span>
                                            )}
                                          </div>
                                          {menu.description && (
                                            <p className="text-gray-600 mt-1">{menu.description}</p>
                                          )}
                                        </div>
                                        
                                        <div className="text-right ml-4 min-w-[120px]">
                                          {hasPromo ? (
                                            <div className="space-y-1">
                                              <div className="flex flex-col items-end">
                                                <span className="text-lg font-bold text-red-600">
                                                  {formatCurrency(discountedPrice)}
                                                </span>
                                                <span className="text-sm text-gray-500 line-through">
                                                  {formatCurrency(menu.price)}
                                                </span>
                                              </div>
                                              <div className="text-xs text-green-600 font-semibold">
                                                Hemat {formatCurrency(menu.price - discountedPrice)}
                                              </div>
                                            </div>
                                          ) : (
                                            <span className="text-lg font-bold text-gray-900">
                                              {formatCurrency(menu.price)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {menu.image && (
                                        <div className="mt-3">
                                          <img 
                                            src={menu.image} 
                                            alt={menu.name}
                                            className="w-32 h-24 object-cover rounded-lg"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ULASAN TAB */}
              {activeTab === 'ulasan' && (
                <div className="space-y-8">
                  <h2 className="text-2xl font-bold text-gray-900">Ulasan & Rating</h2>

                  {/* ✅ TAMPILAN RATING STATS DARI ULASAN REAL-TIME */}
                  <ReviewStats reviews={reviews} />

                  <ReviewForm 
                    restaurantId={id} 
                    restaurantName={restaurant.name}
                    onReviewAdded={handleReviewAdded} 
                  />

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">
                      Semua Ulasan ({reviewCount})
                    </h3>

                    {loadingReviews ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Memuat ulasan...</p>
                      </div>
                    ) : (
                      <ReviewList reviews={reviews} />
                    )}
                  </div>
                </div>
              )}

              {/* LOKASI TAB */}
              {activeTab === 'lokasi' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">Lokasi</h2>
                  
                  <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
                    <Map center={mapCenter} zoom={15} restaurants={[restaurant]} />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-medium text-gray-900">{restaurant.address}</p>
                    {restaurant.location && (
                      <p className="text-sm text-gray-600 mt-1">
                        Koordinat: {restaurant.location.lat.toFixed(6)}, {restaurant.location.lng.toFixed(6)}
                      </p>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RESERVATION BTN */}
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={() => router.push(`/restaurant/${id}/reserve`)}
              className="bg-orange-600 text-white px-6 py-4 rounded-full shadow-lg hover:bg-orange-700 font-medium flex items-center gap-2 transition-transform hover:scale-105"
            >
              <span>📅</span>
              <span>Reservasi Sekarang</span>
            </button>
          </div>

        </div>
      </div>
    </Layout>
  );
}