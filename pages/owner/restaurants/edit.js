import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import ImageUpload from '../../../components/UI/ImageUpload';
import { getRestaurantById, updateRestaurant, getRestaurantsByOwner } from '../../../lib/firestore';

// Dynamic import untuk peta (karena Leaflet tidak support SSR)
import dynamic from 'next/dynamic';
const LocationPicker = dynamic(() => import('../../../components/UI/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">Memuat peta...</div>
});

export default function EditRestaurant() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const { id } = router.query; // ID restoran dari URL
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  
  const [restaurant, setRestaurant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    priceRange: '',
    openingHours: '10:00 - 22:00',
    capacity: '50',
    image: '',
    location: {
      lat: -6.2088, // Default Jakarta
      lng: 106.8456
    },
    isOpen: true,
    hasPromo: false,
    promoText: ''
  });

  const [manualAddress, setManualAddress] = useState('');

  const categories = [
    'Indonesian',
    'Western', 
    'Japanese',
    'Chinese',
    'Korean',
    'Fast Food',
    'Fine Dining',
    'Cafe',
    'Street Food'
  ];

  const priceRanges = [
    'Murah (Rp 5.000 - Rp 35.000)',
    'Sedang (Rp 35.000 - Rp 75.000)',
    'Mahal (Rp 75.000 - Rp 150.000)',
    'Sangat Mahal (Rp 150.000+)'
  ];

  // Fetch restaurant data
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (!currentUser || !id) return;

      try {
        setFetchLoading(true);
        console.log('🔍 Fetching restaurant data for ID:', id);
        
        const restaurantData = await getRestaurantById(id);
        
        if (!restaurantData) {
          throw new Error('Restoran tidak ditemukan');
        }

        // Check if current user is the owner of this restaurant
        if (restaurantData.ownerId !== currentUser.uid && userData?.role !== 'admin') {
          alert('Anda tidak memiliki akses untuk mengedit restoran ini');
          router.push('/owner/dashboard'); // Ubah ke dashboard
          return;
        }

        setRestaurant(restaurantData);

        // Populate form with existing data
        setFormData({
          name: restaurantData.name || '',
          category: restaurantData.category || '',
          description: restaurantData.description || '',
          address: restaurantData.address || '',
          phone: restaurantData.phone || '',
          email: restaurantData.email || '',
          priceRange: restaurantData.priceRange || '',
          openingHours: restaurantData.openingHours || '10:00 - 22:00',
          capacity: restaurantData.capacity?.toString() || '50',
          image: restaurantData.image || '',
          location: restaurantData.location || {
            lat: -6.2088,
            lng: 106.8456
          },
          isOpen: restaurantData.isOpen !== undefined ? restaurantData.isOpen : true,
          hasPromo: restaurantData.hasPromo || false,
          promoText: restaurantData.promoText || ''
        });

        setManualAddress(restaurantData.address || '');

      } catch (error) {
        console.error('❌ Error fetching restaurant:', error);
        setError('Gagal memuat data restoran: ' + error.message);
      } finally {
        setFetchLoading(false);
      }
    };

    if (currentUser && userData?.role === 'owner') {
      fetchRestaurantData();
    }
  }, [currentUser, userData, id, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleImageUpload = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }));
  };

  // Handle manual address input
  const handleManualAddressChange = (e) => {
    const value = e.target.value;
    setManualAddress(value);
    setFormData(prev => ({
      ...prev,
      address: value
    }));
  };

  // Fungsi untuk mencari koordinat dari alamat (forward geocoding)
  const searchAddressOnMap = async () => {
    if (!manualAddress.trim()) {
      setError('Masukkan alamat terlebih dahulu');
      return;
    }

    setSearchingAddress(true);
    setError('');

    try {
      console.log('🔍 Searching address:', manualAddress);
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualAddress)}&limit=1&countrycodes=id`
      );
      
      if (!response.ok) {
        throw new Error('Gagal mencari alamat');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        console.log('📍 Address found at:', lat, lng);
        
        // Update form data dengan koordinat baru
        setFormData(prev => ({
          ...prev,
          location: { lat, lng },
          address: manualAddress
        }));
        
        setSuccess('Alamat berhasil ditemukan di peta!');
      } else {
        setError('Alamat tidak ditemukan. Silakan periksa kembali atau gunakan format yang lebih spesifik.');
      }
    } catch (error) {
      console.error('Error searching address:', error);
      setError('Gagal mencari alamat: ' + error.message);
    } finally {
      setSearchingAddress(false);
    }
  };

  // Handle location selection dari peta (tanpa reverse geocoding)
  const handleLocationSelect = (locationData) => {
    const { lat, lng } = locationData;
    
    console.log('📍 Location selected:', lat, lng);
    
    // Update koordinat saja, tanpa mencari alamat
    setFormData(prev => ({
      ...prev,
      location: { lat, lng }
    }));
    
    // Tampilkan pesan bahwa user perlu input alamat manual
    if (!manualAddress) {
      setSuccess('Lokasi dipilih! Silakan ketik alamat manual di kolom alamat.');
    }
  };

  // Use current location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung di browser ini');
      return;
    }

    setSearchingAddress(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setFormData(prev => ({
          ...prev,
          location: { lat, lng }
        }));
        
        setSuccess('Lokasi saat ini berhasil dideteksi! Silakan ketik alamat manual.');
        setSearchingAddress(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Gagal mendapatkan lokasi saat ini: ' + error.message);
        setSearchingAddress(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validasi form
      if (!formData.name || !formData.address || !formData.phone || !formData.category || !formData.priceRange) {
        setError('Harap isi semua field yang wajib diisi (bertanda *)');
        setLoading(false);
        return;
      }

      // Validasi alamat tidak boleh hanya koordinat
      if (formData.address.includes('📍')) {
        setError('Harap ketik alamat lengkap restoran, bukan hanya koordinat');
        setLoading(false);
        return;
      }

      const restaurantData = {
        ...formData,
        capacity: parseInt(formData.capacity) || 50,
        updatedAt: new Date()
      };

      console.log('Updating restaurant data:', restaurantData);
      
      await updateRestaurant(id, restaurantData);
      
      setSuccess('Restoran berhasil diperbarui! Anda akan diarahkan ke dashboard.');
      
      // Redirect to DASHBOARD after 2 seconds (UBAH DI SINI)
      setTimeout(() => {
        router.push('/owner/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error updating restaurant:', error);
      setError('Gagal memperbarui restoran: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  if (fetchLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data restoran...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!restaurant) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Restoran tidak ditemukan.</p>
            <button 
              onClick={() => router.push('/owner/dashboard')} // Ubah ke dashboard
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold text-orange-600">Edit Restoran</h1>
                <p className="text-gray-600 mt-2">
                  Perbarui informasi restoran Anda
                </p>
              </div>
              <div className="text-sm text-gray-500 hidden md:block">
                ID: {restaurant.id}
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Restaurant Image */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Foto Restoran</h3>
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  currentImage={formData.image}
                  label="Unggah foto restoran Anda"
                />
              </div>

              {/* Basic Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Dasar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Restoran *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Nama restoran Anda"
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori *
                    </label>
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700 mb-2">
                      Rentang Harga *
                    </label>
                    <select
                      id="priceRange"
                      name="priceRange"
                      required
                      value={formData.priceRange}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      <option value="">Pilih Rentang Harga</option>
                      {priceRanges.map(range => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-2">
                      Kapasitas Tempat Duduk
                    </label>
                    <input
                      type="number"
                      id="capacity"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Contoh: 50"
                      min="1"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="mt-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi Restoran *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows="4"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Jelaskan tentang restoran Anda, menu spesial, suasana, dll."
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Kontak</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                      Alamat Lengkap *
                    </label>
                    <div className="space-y-2">
                      <textarea
                        id="address"
                        name="address"
                        required
                        rows="3"
                        value={manualAddress}
                        onChange={handleManualAddressChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Contoh: Jl. Sudirman No. 123, Jakarta Pusat"
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={searchAddressOnMap}
                          disabled={searchingAddress || !manualAddress.trim()}
                          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {searchingAddress ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Mencari...
                            </div>
                          ) : (
                            'Cari di Peta'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={useCurrentLocation}
                          disabled={searchingAddress}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {searchingAddress ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Mendeteksi...
                            </div>
                          ) : (
                            'Lokasi Saat Ini'
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Ketik alamat lengkap, lalu klik "Cari di Peta" untuk menandai lokasi di peta
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Nomor Telepon *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Contoh: 081234567890"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="email@restaurant.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Opening Hours */}
                <div className="mt-6">
                  <label htmlFor="openingHours" className="block text-sm font-medium text-gray-700 mb-2">
                    Jam Operasional *
                  </label>
                  <input
                    type="text"
                    id="openingHours"
                    name="openingHours"
                    required
                    value={formData.openingHours}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Contoh: 10:00 - 22:00 (Setiap Hari)"
                  />
                </div>
              </div>

              {/* Status Settings */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Restoran</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isOpen"
                      name="isOpen"
                      checked={formData.isOpen}
                      onChange={handleChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isOpen" className="ml-2 block text-sm text-gray-700">
                      Restoran Sedang Buka
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="hasPromo"
                      name="hasPromo"
                      checked={formData.hasPromo}
                      onChange={handleChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="hasPromo" className="ml-2 block text-sm text-gray-700">
                      Ada Promo
                    </label>
                  </div>
                </div>

                {formData.hasPromo && (
                  <div className="mt-4">
                    <label htmlFor="promoText" className="block text-sm font-medium text-gray-700 mb-2">
                      Teks Promo
                    </label>
                    <input
                      type="text"
                      id="promoText"
                      name="promoText"
                      value={formData.promoText}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Contoh: Diskon 20% untuk pembelian pertama"
                    />
                  </div>
                )}
              </div>

              {/* Location Picker */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Lokasi Restoran</h3>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tandai Lokasi di Peta
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Klik pada peta untuk menandai lokasi tepat, atau gunakan alamat di atas untuk mencari otomatis
                </p>
                <LocationPicker 
                  onLocationSelect={handleLocationSelect}
                  initialLocation={formData.location}
                />
                <div className="mt-4 text-sm text-gray-600 bg-white p-3 rounded-lg border">
                  <p><strong>Koordinat terpilih:</strong> {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}</p>
                  <p><strong>Alamat:</strong> {manualAddress || 'Belum ada alamat'}</p>
                </div>
                <p className="text-sm text-orange-600 mt-2">
                  💡 Tips: Ketik alamat lengkap di atas, lalu klik "Cari di Peta" untuk penandaan otomatis
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/owner/dashboard')} // Ubah ke dashboard
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !manualAddress.trim()}
                  className={`px-6 py-3 bg-orange-600 text-white rounded-lg font-medium transition-colors ${
                    (loading || !manualAddress.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-700'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Memperbarui...
                    </div>
                  ) : (
                    'Simpan Perubahan'
                  )}
                </button>
              </div>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Cara Mengisi Lokasi</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Ketik alamat lengkap restoran di kolom "Alamat Lengkap"</li>
                      <li>Klik "Cari di Peta" untuk menandai lokasi otomatis</li>
                      <li>Atau klik langsung di peta untuk menandai lokasi manual</li>
                      <li>Pastikan alamat sudah sesuai sebelum menyimpan</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}