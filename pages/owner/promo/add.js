// pages/owner/promo/add.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getRestaurantById, 
  addPromoAndUpdateRestaurant, // Updated function
  getMenusByRestaurantId 
} from '../../../lib/firestore';
import Layout from '../../../components/Layout/Layout';

export default function TambahPromo() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const { restaurantId } = router.query;
  
  const [restaurant, setRestaurant] = useState(null);
  const [menus, setMenus] = useState([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState([]);
  const [formData, setFormData] = useState({
    promoName: '',
    terms: '',
    description: '',
    discountType: 'percentage',
    discountValue: 15, // Default 15%
    startDate: '',
    endDate: '',
    menuOption: 'all',
    minPurchase: 50000 // Default min purchase
  });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  // Load restaurant data and menus from Firestore
  useEffect(() => {
    if (restaurantId && currentUser) {
      loadRestaurantData();
    } else {
      setLoadingData(false);
      if (!restaurantId) {
        setError('Restaurant ID tidak ditemukan');
      }
      if (!currentUser) {
        setError('User tidak login');
      }
    }
  }, [restaurantId, currentUser]);

  const loadRestaurantData = async () => {
    try {
      setLoadingData(true);
      setError('');

      console.log('🔄 Loading restaurant data for:', restaurantId);

      // Load restaurant data
      const restaurantData = await getRestaurantById(restaurantId);
      
      // Verify restaurant ownership
      if (restaurantData.ownerId !== currentUser.uid) {
        setError('Anda tidak memiliki akses ke restoran ini');
        return;
      }
      
      setRestaurant(restaurantData);

      // Load menus for this restaurant
      console.log('📋 Loading menus for restaurant:', restaurantId);
      const menuData = await getMenusByRestaurantId(restaurantId);
      console.log('🍽️ Loaded menus:', menuData);
      console.log('📊 Number of menus:', menuData.length);
      
      setMenus(menuData);

    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Gagal memuat data: ${error.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));

    // Auto-select all menus when switching to "all"
    if (name === 'menuOption' && value === 'all' && menus.length > 0) {
      setSelectedMenuIds(menus.map(menu => menu.id));
    }
  };

  const handleMenuSelection = (menuId) => {
    setSelectedMenuIds(prev => {
      if (prev.includes(menuId)) {
        return prev.filter(id => id !== menuId);
      } else {
        return [...prev, menuId];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedMenuIds(prev => {
      if (prev.length === menus.length) {
        return [];
      } else {
        return menus.map(menu => menu.id);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.promoName.trim()) {
      setError('Nama promo harus diisi');
      return;
    }

    if (!formData.terms.trim()) {
      setError('Syarat dan ketentuan harus diisi');
      return;
    }

    if (formData.discountValue <= 0) {
      setError('Diskon harus lebih dari 0');
      return;
    }

    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      setError('Diskon persentase tidak boleh lebih dari 100%');
      return;
    }

    // Validasi untuk menu tertentu
    if (formData.menuOption === 'selected' && selectedMenuIds.length === 0) {
      setError('Harap pilih minimal 1 menu untuk promo');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Tanggal mulai dan berakhir harus diisi');
      return;
    }

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError('Tanggal berakhir harus setelah tanggal mulai');
      return;
    }

    setLoading(true);

    try {
      const promoData = {
        name: formData.promoName,
        description: formData.description,
        terms: formData.terms,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        startDate: formData.startDate,
        endDate: formData.endDate,
        minPurchase: Number(formData.minPurchase),
        restaurantId,
        restaurantName: restaurant?.name,
        menuIds: formData.menuOption === 'all' 
          ? menus.map(menu => menu.id) 
          : selectedMenuIds,
        appliedToAll: formData.menuOption === 'all',
        status: 'active',
        ownerId: currentUser.uid,
        createdAt: new Date()
      };

      console.log('Submitting promo data:', promoData);
      
      // Use the updated function that also updates the restaurant
      await addPromoAndUpdateRestaurant(promoData);
      
      setShowSuccess(true);
      
      setTimeout(() => {
        setFormData({
          promoName: '',
          terms: '',
          description: '',
          discountType: 'percentage',
          discountValue: 15,
          startDate: '',
          endDate: '',
          menuOption: 'all',
          minPurchase: 50000
        });
        setSelectedMenuIds([]);
        setShowSuccess(false);
        router.push('/owner/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('Error adding promo:', error);
      setError(`Gagal menambahkan promo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Auto-select all menus when menus change and "all" option is selected
  useEffect(() => {
    if (menus.length > 0 && formData.menuOption === 'all') {
      setSelectedMenuIds(menus.map(menu => menu.id));
    }
  }, [menus, formData.menuOption]);

  // Set default start date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      startDate: today
    }));
  }, []);

  // Redirect jika bukan owner
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

  if (loadingData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data restoran dan menu...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !restaurant) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Gagal memuat data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={() => router.push('/owner/dashboard')}
                className="block w-full bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
              >
                Kembali ke Dashboard
              </button>
              <button 
                onClick={loadRestaurantData}
                className="block w-full bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            {/* Header */}
            <div className="mb-8 relative">
              <button 
                onClick={() => router.push('/owner/dashboard')}
                className="absolute left-0 top-0 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali
              </button>
              <div className="text-center pt-2">
                <h1 className="text-3xl font-bold text-orange-600">Tambah Promo</h1>
                <p className="text-gray-600 mt-2">Restoran: {restaurant?.name}</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Informasi Promo */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Informasi Promo</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Promo *
                    </label>
                    <input
                      type="text"
                      name="promoName"
                      value={formData.promoName}
                      onChange={handleInputChange}
                      placeholder="Contoh: Promo Akhir Tahun, Diskon Spesial, dll"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      disabled={loading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi Promo
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Jelaskan detail promo kepada customer..."
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jenis Diskon *
                      </label>
                      <select
                        name="discountType"
                        value={formData.discountType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={loading}
                      >
                        <option value="percentage">Persentase (%)</option>
                        <option value="fixed">Potongan Harga (Rp)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {formData.discountType === 'percentage' ? 'Diskon (%) *' : 'Potongan Harga (Rp) *'}
                      </label>
                      <input
                        type="number"
                        name="discountValue"
                        value={formData.discountValue}
                        onChange={handleInputChange}
                        min="0"
                        max={formData.discountType === 'percentage' ? '100' : undefined}
                        step={formData.discountType === 'percentage' ? '1' : '1000'}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={loading}
                        placeholder={formData.discountType === 'percentage' ? '0-100' : '0'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimal Pembelian (Rp) *
                      </label>
                      <input
                        type="number"
                        name="minPurchase"
                        value={formData.minPurchase}
                        onChange={handleInputChange}
                        min="0"
                        step="1000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={loading}
                        placeholder="50000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Mulai *
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={loading}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Berakhir *
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        min={formData.startDate || new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pilih Menu Promo */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Pilih Menu Promo</h3>
                
                {/* Info Message */}
                {menus.length === 0 ? (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-700 text-sm">
                      <strong>Info:</strong> Anda belum memiliki menu. Silakan tambah menu terlebih dahulu.
                    </p>
                    <button 
                      type="button"
                      onClick={() => router.push('/owner/tambah-menu')}
                      className="mt-2 text-orange-600 hover:text-orange-700 font-medium text-sm flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                      </svg>
                      Tambah Menu Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 text-sm">
                      <strong>Berhasil!</strong> Ditemukan {menus.length} menu. Pilih menu yang akan mendapatkan promo.
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-3 sm:space-y-0">
                    {/* Semua Menu Radio */}
                    <label className="flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors">
                      <input
                        type="radio"
                        name="menuOption"
                        value="all"
                        checked={formData.menuOption === 'all'}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-orange-600 focus:ring-orange-500 border-gray-300 cursor-pointer"
                        disabled={loading || menus.length === 0}
                      />
                      <span className={`text-gray-700 ${(loading || menus.length === 0) ? 'opacity-50' : ''}`}>
                        Semua Menu ({menus.length})
                      </span>
                    </label>
                    
                    {/* Pilih Menu Tertentu Radio */}
                    <label className="flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors">
                      <input
                        type="radio"
                        name="menuOption"
                        value="selected"
                        checked={formData.menuOption === 'selected'}
                        onChange={handleInputChange}
                        className="w-5 h-5 text-orange-600 focus:ring-orange-500 border-gray-300 cursor-pointer"
                        disabled={loading || menus.length === 0}
                      />
                      <span className={`text-gray-700 ${(loading || menus.length === 0) ? 'opacity-50' : ''}`}>
                        Pilih Menu Tertentu
                      </span>
                    </label>
                  </div>

                  {/* Menu Selection Area */}
                  {formData.menuOption === 'selected' && menus.length > 0 && (
                    <div className="border border-gray-300 rounded-xl p-4 mt-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-gray-900">
                          Pilih Menu yang Dapat Promo ({selectedMenuIds.length} terpilih)
                        </h4>
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium px-3 py-1 border border-orange-600 rounded-lg transition-colors"
                        >
                          {selectedMenuIds.length === menus.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                        </button>
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {menus.map(menu => (
                          <label 
                            key={menu.id} 
                            className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedMenuIds.includes(menu.id) 
                                ? 'bg-orange-50 border border-orange-200' 
                                : 'hover:bg-gray-100 border border-transparent'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedMenuIds.includes(menu.id)}
                              onChange={() => handleMenuSelection(menu.id)}
                              className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                              disabled={loading}
                            />
                            <div className="ml-3 flex-1 flex justify-between items-center">
                              <div className="flex-1">
                                <span className="text-gray-900 font-medium block">{menu.name}</span>
                                {menu.description && (
                                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{menu.description}</p>
                                )}
                              </div>
                              <span className="text-gray-600 font-semibold whitespace-nowrap ml-4">
                                {formatCurrency(menu.price)}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Syarat & Ketentuan */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Syarat & Ketentuan *
                </h3>
                
                <div>
                  <textarea
                    name="terms"
                    value={formData.terms}
                    onChange={handleInputChange}
                    placeholder="Tulis syarat dan ketentuan promo...
Contoh:
- Minimal pembelian Rp 50.000
- Tidak bisa digabung dengan promo lain
- Berlaku untuk dine-in dan takeaway
- Masa berlaku promo hingga 31 Desember 2024"
                    rows="5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    disabled={loading}
                  />
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="text-center">
                <button 
                  type="submit" 
                  className={`bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-orange-700 transition-colors ${
                    loading || menus.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={loading || menus.length === 0}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      MENAMBAHKAN PROMO...
                    </div>
                  ) : (
                    'TAMBAH PROMO'
                  )}
                </button>
                {menus.length === 0 && (
                  <p className="text-red-500 text-sm mt-2">
                    Tidak dapat membuat promo karena belum ada menu
                  </p>
                )}
              </div>
            </form>
            
            {showSuccess && (
              <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl text-center">
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Promo "{formData.promoName}" berhasil ditambahkan!
                </div>
                <p className="text-sm mt-1">Mengarahkan ke dashboard...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}