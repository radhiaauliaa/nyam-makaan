import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import ImageUpload from '../../components/UI/ImageUpload';
import { createRestaurant, getRestaurantsByOwner } from '../../lib/firestore';

// Dynamic import untuk peta
import dynamic from 'next/dynamic';
const LocationPicker = dynamic(() => import('../../components/UI/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">Memuat peta...</div>
});

export default function AddRestaurant() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingRestaurant, setCheckingRestaurant] = useState(true);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [restaurantStatus, setRestaurantStatus] = useState(null);
  const [rejectionData, setRejectionData] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  
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
      lat: -6.2088,
      lng: 106.8456
    }
  });

  const [manualAddress, setManualAddress] = useState('');

  // ✅ TAMBAHKAN STATE UNTUK LOCK ACCESS
  const [accessDenied, setAccessDenied] = useState(false);

  // ✅ CEK STATUS RESTORAN SEBELUM RENDER APAPUN
  useEffect(() => {
    const checkRestaurantAccess = async () => {
      if (!currentUser || userData?.role !== 'owner') {
        setAccessDenied(true);
        setCheckingRestaurant(false);
        return;
      }

      try {
        const restaurants = await getRestaurantsByOwner(currentUser.uid);
        console.log('🔄 Checking restaurants:', restaurants);
        
        if (restaurants.length > 0) {
          setHasRestaurant(true);
          const restaurant = restaurants[0];
          setRestaurantStatus(restaurant.status);
          
          // 🔴 JIKA DITOLAK: TUTUP AKSES
          if (restaurant.status === 'rejected') {
            setAccessDenied(true);
            setRejectionData({
              name: restaurant.name,
              rejectionReason: restaurant.rejectionReason || 'Restoran tidak memenuhi persyaratan yang ditetapkan oleh admin.',
              rejectionDate: restaurant.rejectionDate || restaurant.updatedAt
            });
          }
          // 🟡 JIKA PENDING: REDIRECT
          else if (restaurant.status === 'pending') {
            router.replace('/owner/dashboard?status=pending');
            return;
          }
          // 🟢 JIKA APPROVED: REDIRECT
          else if (restaurant.status === 'approved') {
            router.replace('/owner/dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('❌ Error checking restaurants:', error);
        setError('Gagal memuat data restoran');
      } finally {
        setCheckingRestaurant(false);
      }
    };

    checkRestaurantAccess();
  }, [currentUser, userData, router]);

  // ✅ TAMPILKAN LOADING SELAMA PENGECEKAN
  if (checkingRestaurant) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memeriksa status restoran...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ✅ JIKA AKSES DITOLAK (BUKAN OWNER ATAU RESTORAN DITOLAK)
  if (accessDenied) {
    if (restaurantStatus === 'rejected' && rejectionData) {
      return (
        <Layout>
          <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <div className="text-center mb-8">
                  <div className="text-red-500 mb-4">
                    <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-red-600">Akses Ditolak</h1>
                  <p className="text-gray-600 mt-2">
                    Anda tidak dapat mendaftarkan restoran.
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-red-800">Restoran "{rejectionData.name}" Ditolak</h3>
                      <div className="mt-2 text-red-700">
                        <p className="font-medium">Alasan Penolakan:</p>
                        <p className="mt-1">{rejectionData.rejectionReason}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 font-medium">
                      ⚠️ Setiap akun hanya dapat mendaftarkan satu restoran. 
                      Karena restoran Anda telah ditolak, Anda tidak dapat mendaftarkan restoran lagi.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800">
                      Jika Anda merasa ini adalah kesalahan, silakan hubungi tim support kami.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => router.push('/')}
                    className="bg-orange-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                    Kembali ke Home
                  </button>
                  
                  <button
                    onClick={() => router.push('/contact')}
                    className="bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    Hubungi Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      );
    }
    
    // JIKA BUKAN OWNER
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

  // ✅ JIKA SUDAH PUNYA RESTORAN (APPROVED/PENDING)
  if (hasRestaurant) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-4">
              Mengarahkan ke dashboard...
            </p>
            <button 
              onClick={() => router.push('/owner/dashboard')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Ke Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ✅ KODE FUNGSI-FUNGSI UNTUK FORM (tetap sama)
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleImageUpload = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }));
  };

  const handleManualAddressChange = (e) => {
    const value = e.target.value;
    setManualAddress(value);
    setFormData(prev => ({
      ...prev,
      address: value
    }));
  };

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

  const handleLocationSelect = (locationData) => {
    const { lat, lng } = locationData;
    
    console.log('📍 Location selected:', lat, lng);
    
    setFormData(prev => ({
      ...prev,
      location: { lat, lng }
    }));
    
    if (!manualAddress) {
      setSuccess('Lokasi dipilih! Silakan ketik alamat manual di kolom alamat.');
    }
  };

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
      // ✅ VALIDASI ULANG SEBELUM SUBMIT
      const existingRestaurants = await getRestaurantsByOwner(currentUser.uid);
      
      if (existingRestaurants.length > 0) {
        const restaurant = existingRestaurants[0];
        
        if (restaurant.status === 'rejected') {
          setError('Akun Anda telah didaftarkan untuk restoran yang ditolak. Anda tidak dapat mendaftarkan restoran lagi.');
          setLoading(false);
          
          // Update state untuk trigger block
          setAccessDenied(true);
          setRejectionData({
            name: restaurant.name,
            rejectionReason: restaurant.rejectionReason || 'Restoran tidak memenuhi persyaratan yang ditetapkan oleh admin.',
            rejectionDate: restaurant.rejectionDate || restaurant.updatedAt
          });
          return;
        }
        
        if (restaurant.status === 'approved') {
          setError('Anda sudah memiliki restoran yang disetujui. Setiap owner hanya boleh memiliki 1 restoran.');
          setLoading(false);
          return;
        }

        if (restaurant.status === 'pending') {
          setError('Anda sudah memiliki restoran yang sedang menunggu persetujuan. Tunggu hingga restoran Anda disetujui atau ditolak.');
          setLoading(false);
          return;
        }
      }

      // Validasi form
      if (!formData.name || !formData.address || !formData.phone || !formData.category || !formData.priceRange || !formData.description) {
        setError('Harap isi semua field yang wajib diisi (bertanda *)');
        setLoading(false);
        return;
      }

      if (formData.address.includes('📍')) {
        setError('Harap ketik alamat lengkap restoran, bukan hanya koordinat');
        setLoading(false);
        return;
      }

      const restaurantData = {
        ...formData,
        capacity: parseInt(formData.capacity) || 50,
        ownerId: currentUser.uid,
        ownerName: userData?.name || currentUser.displayName || currentUser.email,
        status: 'pending',
        isOpen: false,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        rejectionReason: '',
        rejectionDate: null
      };

      console.log('Submitting restaurant data:', restaurantData);
      
      const restaurantId = await createRestaurant(restaurantData);
      
      if (restaurantId) {
        setSuccess('Restoran berhasil diajukan! Menunggu verifikasi admin. Anda akan diarahkan ke dashboard.');
        
        setTimeout(() => {
          router.push('/owner/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating restaurant:', error);
      setError('Gagal mengajukan restoran: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ RENDER FORM (HANYA JIKA TIDAK ADA RESTORAN DAN TIDAK DIBLOKIR)
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-orange-600">Tambah Restoran</h1>
              <p className="text-gray-600 mt-2">
                Isi informasi restoran Anda untuk mulai menerima reservasi dari pelanggan.
              </p>
              <p className="text-sm text-orange-500 mt-1">
                ⓘ Setiap akun pemilik hanya dapat mendaftarkan satu restoran.
              </p>
            </div>

            {/* ... (sisa kode form tetap sama) ... */}
            {/* Untuk menghemat space, bagian form di bawah ini tetap sama seperti sebelumnya */}
            {/* Pastikan semua elemen form ada di sini */}

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
                  onClick={() => router.push('/owner/dashboard')}
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
                      Mengajukan Restoran...
                    </div>
                  ) : (
                    'Ajukan Restoran'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}