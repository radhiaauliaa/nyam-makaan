import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { getActivePromosForRestaurant } from '../../../lib/firestore';

export default function OwnerMenu() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [menus, setMenus] = useState([]);
  const [activePromos, setActivePromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [rejectedOwner, setRejectedOwner] = useState(false);

  // Fungsi untuk mendapatkan restoran milik user
  const getRestaurantsByOwner = async (ownerId) => {
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(restaurantsRef, where('ownerId', '==', ownerId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting restaurants:', error);
      throw error;
    }
  };

  // Fungsi untuk mendapatkan menu berdasarkan restoran
  const getMenusByRestaurant = async (restaurantId) => {
    try {
      const menusRef = collection(db, 'restaurants', restaurantId, 'menus');
      const querySnapshot = await getDocs(menusRef);
      
      const menusData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return menusData;
    } catch (error) {
      console.error('Error getting menus:', error);
      throw error;
    }
  };

  // Fungsi untuk menghapus menu
  const deleteMenu = async (menuId) => {
    try {
      await deleteDoc(doc(db, 'restaurants', selectedRestaurant, 'menus', menuId));
    } catch (error) {
      console.error('Error deleting menu:', error);
      throw error;
    }
  };

  // Memuat promo aktif
  const loadActivePromos = async (restaurantId) => {
    try {
      const promos = await getActivePromosForRestaurant(restaurantId);
      
      // Filter hanya promo yang aktif dan masih berlaku
      const now = new Date();
      const activePromos = promos.filter(promo => {
        const isActive = promo.status === 'active';
        const startDate = new Date(promo.startDate);
        const endDate = new Date(promo.endDate);
        const isValidDate = now >= startDate && now <= endDate;
        
        return isActive && isValidDate;
      });
      
      setActivePromos(activePromos);
    } catch (error) {
      console.error('Error loading promos:', error);
    }
  };

  useEffect(() => {
    if (currentUser && userData?.role === 'owner') {
      loadRestaurants();
    }
  }, [currentUser, userData]);

  const loadRestaurants = async () => {
    try {
      const data = await getRestaurantsByOwner(currentUser.uid);
      setRestaurants(data);
      if (data.length > 0) {
        if (data[0]?.status === 'rejected') {
          setRejectedOwner(true);
          return;
        }
        setSelectedRestaurant(data[0].id);
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRestaurant) {
      loadMenus(selectedRestaurant);
      loadActivePromos(selectedRestaurant);
    }
  }, [selectedRestaurant]);

  const loadMenus = async (restaurantId) => {
    setLoading(true);
    try {
      const data = await getMenusByRestaurant(restaurantId);
      setMenus(data);
    } catch (error) {
      console.error('Error loading menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (confirm('Apakah Anda yakin ingin menghapus menu ini?')) {
      try {
        await deleteMenu(menuId);
        alert('Menu berhasil dihapus!');
        loadMenus(selectedRestaurant);
      } catch (error) {
        alert('Gagal menghapus menu: ' + error.message);
      }
    }
  };

  const handleEditMenu = (menu) => {
    router.push(`/owner/menu/edit?id=${menu.id}&restaurantId=${selectedRestaurant}`);
  };

  // Fungsi untuk mendapatkan promo untuk menu tertentu
  const getPromoForMenu = (menuId) => {
    const menuPromos = activePromos.filter(promo => {
      // Cek apakah promo aktif dan tanggal masih berlaku
      if (promo.status !== 'active') {
        return false;
      }

      // Cek tanggal promo
      const now = new Date();
      const startDate = new Date(promo.startDate);
      const endDate = new Date(promo.endDate);
      
      if (now < startDate || now > endDate) {
        return false;
      }

      // Handle appliedToAll - jika true, berlaku untuk semua menu
      if (promo.appliedToAll === true) {
        return true;
      }
      
      // Handle jika menuIds tidak ada
      if (!promo.menuIds) {
        return false;
      }
      
      // Handle berbagai format menuIds
      let hasMenu = false;
      
      if (Array.isArray(promo.menuIds)) {
        hasMenu = promo.menuIds.some(promoMenuId => 
          promoMenuId.toString().trim() === menuId.toString().trim()
        );
      } else if (typeof promo.menuIds === 'string') {
        hasMenu = promo.menuIds.trim() === menuId.trim();
      } else if (typeof promo.menuIds === 'object') {
        const menuIdsArray = Object.values(promo.menuIds);
        hasMenu = menuIdsArray.some(id => id.toString().trim() === menuId.toString().trim());
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

    // Cari promo dengan diskon tertinggi
    const highestPromo = menuPromos.reduce((max, promo) => {
      return promo.discountValue > max.discountValue ? promo : max;
    });

    return highestPromo;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
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

  const categories = ['all', ...new Set(menus.map(menu => menu.category))];
  const filteredMenus = activeCategory === 'all' 
    ? menus 
    : menus.filter(menu => menu.category === activeCategory);

  // Hitung statistik
  const availableMenus = menus.filter(menu => menu.available).length;
  const unavailableMenus = menus.filter(menu => !menu.available).length;
  
  // Hitung menu dengan promo
  const menusWithPromo = menus.filter(menu => {
    const menuPromos = getPromoForMenu(menu.id);
    return menuPromos.length > 0;
  }).length;

  if (!currentUser || userData?.role !== 'owner') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Akses ditolak. Hanya untuk pemilik resto.</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Kembali ke Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (rejectedOwner) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="max-w-md text-center bg-white p-8 rounded-lg shadow">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">!
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Restoran Anda Ditolak</h2>
            <p className="text-gray-600 mb-6">Restoran Anda ditolak oleh admin karena tidak memenuhi persyaratan. Anda tidak dapat mengakses fitur pemilik. Silakan kembali ke dashboard guest.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Kembali ke Dashboard Guest
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Kelola Menu</h1>
                <p className="text-gray-600 mt-2">Kelola menu restoran Anda</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    if (selectedRestaurant) {
                      router.push(`/owner/promo/add?restaurantId=${selectedRestaurant}`);
                    } else {
                      alert('Pilih restoran terlebih dahulu');
                    }
                  }}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  Tambah Promo
                </button>
                <button
                  onClick={() => router.push('/owner/menu/add')}
                  className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Tambah Menu
                </button>
              </div>
            </div>
          </div>

          {/* Restaurant Selector */}
          {restaurants.length > 1 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Restoran
              </label>
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              >
                {restaurants.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stats and Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Menu</p>
                  <p className="text-2xl font-semibold text-gray-900">{menus.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tersedia</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {availableMenus}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Menu Promo</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {menusWithPromo}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Habis</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {unavailableMenus}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          {menus.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      activeCategory === category
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {category === 'all' ? 'Semua' : category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Menu List */}
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat menu...</p>
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada menu</h3>
              <p className="mt-1 text-sm text-gray-500">Mulai dengan menambahkan menu pertama Anda.</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/owner/menu/add')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  Tambah Menu Pertama
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMenus.map((menu) => {
                const promo = getHighestDiscountForMenu(menu.id);
                const hasPromo = promo !== null;
                const discountedPrice = calculateDiscountedPrice(menu.price, promo);

                return (
                  <div key={menu.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative">
                      {menu.image ? (
                        <img 
                          src={menu.image} 
                          alt={menu.name}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400">No Image</span>
                        </div>
                      )}
                      
                      {/* Promo Badge */}
                      {hasPromo && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                          {promo.discountType === 'percentage' 
                            ? `PROMO ${promo.discountValue}%`
                            : `PROMO ${formatCurrency(promo.discountValue)}`
                          }
                        </div>
                      )}
                      
                      {/* Availability Badge */}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                        menu.available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        {menu.available ? 'Tersedia' : 'Habis'}
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{menu.name}</h3>
                      
                      {/* Category */}
                      <div className="mb-2">
                        <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {menu.category}
                        </span>
                      </div>

                      {/* Price dengan promo */}
                      <div className="mb-3">
                        {hasPromo ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-red-600">
                                {formatCurrency(discountedPrice)}
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                {formatCurrency(menu.price)}
                              </span>
                            </div>
                            <div className="text-xs text-green-600 font-semibold">
                              Hemat {formatCurrency(menu.price - discountedPrice)}!
                            </div>
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(menu.price)}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {menu.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {menu.description}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditMenu(menu)}
                          className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteMenu(menu.id)}
                          className="flex-1 bg-red-600 text-white py-2 rounded text-sm hover:bg-red-700 font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}