// pages/owner/dashboard.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { getRestaurantsByOwner, getRestaurantReservations } from '../../lib/firestore';
import Layout from '../../components/Layout/Layout';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function OwnerDashboard() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    pendingReservations: 0,
    todayReservations: 0
  });
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (currentUser && userData?.role === 'owner') {
      loadOwnerData();
    }
  }, [currentUser, userData]);

  const loadOwnerData = async () => {
    try {
      // Load owner's restaurants
      const ownerRestaurants = await getRestaurantsByOwner(currentUser.uid);
      setRestaurants(ownerRestaurants);
      
      if (ownerRestaurants.length > 0) {
        const firstRestaurant = ownerRestaurants[0];
        setSelectedRestaurant(firstRestaurant);
        setIsOpen(firstRestaurant.isOpen || false);
      }

      // Calculate stats
      let pendingReservations = 0;
      let todayReservations = 0;
      
      for (const restaurant of ownerRestaurants) {
        const reservations = await getRestaurantReservations(restaurant.id);
        pendingReservations += reservations.filter(r => r.status === 'pending').length;
        
        const today = new Date().toDateString();
        todayReservations += reservations.filter(r => {
          const reservationDate = new Date(r.date).toDateString();
          return reservationDate === today;
        }).length;
      }

      setStats({
        totalRestaurants: ownerRestaurants.length,
        pendingReservations,
        todayReservations
      });

    } catch (error) {
      console.error('Error loading owner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRestaurantStatus = async () => {
    if (!selectedRestaurant) return;
    
    setUpdatingStatus(true);
    try {
      // Update status di Firestore - INI YANG PENTING!
      const restaurantRef = doc(db, 'restaurants', selectedRestaurant.id);
      await updateDoc(restaurantRef, {
        isOpen: !isOpen,
        updatedAt: new Date()
      });

      // Update state lokal
      setIsOpen(!isOpen);
      
      // Update selected restaurant data
      setSelectedRestaurant(prev => ({
        ...prev,
        isOpen: !isOpen
      }));

      // Update semua restoran di state
      setRestaurants(prev => 
        prev.map(rest => 
          rest.id === selectedRestaurant.id 
            ? { ...rest, isOpen: !isOpen }
            : rest
        )
      );

      console.log(`✅ Status restoran diubah menjadi: ${!isOpen ? 'Buka' : 'Tutup'}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal mengubah status restoran');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTambahPromo = () => {
    if (!selectedRestaurant) {
      alert('Anda belum memiliki restoran!');
      router.push('/owner/add-restaurant');
      return;
    }
    router.push(`/owner/promo/add?restaurantId=${selectedRestaurant.id}`);
  };

  // Fungsi untuk menampilkan peta OpenStreetMap
  const getOpenStreetMapUrl = (restaurant) => {
    if (!restaurant?.location) return null;
    
    const { lat, lng } = restaurant.location;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`;
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* HEADER */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Pemilik Restoran</h1>
            <p className="text-gray-600">
              Selamat datang, {userData?.displayName || 'Pemilik'}! Kelola restoran Anda di sini.
            </p>
          </div>

          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button 
              onClick={() => router.push('/owner/reservations')}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left border border-gray-200 hover:border-orange-300"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">📅 Kelola Reservasi</h3>
              <p className="text-gray-600">Lihat dan konfirmasi reservasi</p>
            </button>

            <button 
              onClick={() => router.push('/owner/reviews')}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left border border-gray-200 hover:border-orange-300"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">⭐ Kelola Ulasan</h3>
              <p className="text-gray-600">Lihat dan balas ulasan pelanggan</p>
            </button>

            <button 
              onClick={() => router.push('/owner/menu')}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow text-left border border-gray-200 hover:border-orange-300"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">🍽️ Kelola Menu</h3>
              <p className="text-gray-600">Edit dan tambah menu restoran</p>
            </button>
          </div>

          {/* MAP AND ACTIONS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Map Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lokasi Restoran</h3>
              <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center relative overflow-hidden">
                {selectedRestaurant?.location ? (
                  <>
                    {/* OpenStreetMap Embed */}
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight="0"
                      marginWidth="0"
                      src={getOpenStreetMapUrl(selectedRestaurant)}
                      className="rounded-lg"
                      title={`Peta lokasi ${selectedRestaurant.name}`}
                    />
                    <div className="absolute bottom-2 right-2 bg-white px-2 py-1 rounded text-xs text-gray-600">
                      <a 
                        href={`https://www.openstreetmap.org/?mlat=${selectedRestaurant.location.lat}&mlon=${selectedRestaurant.location.lng}#map=15/${selectedRestaurant.location.lat}/${selectedRestaurant.location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Lihat peta lebih besar
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                    </svg>
                    <p className="text-gray-700 font-medium">Lokasi belum diatur</p>
                    <p className="text-gray-500 text-sm mt-1">
                      Atur lokasi di pengaturan restoran
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Section */}
            <div className="space-y-6">
              {/* Tambah Promo */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tambah Promo</h3>
                <button 
                  onClick={handleTambahPromo}
                  className="w-full bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Buat Promo Baru
                </button>
              </div>

              {/* Status Restoran */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Restoran</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => !updatingStatus && toggleRestaurantStatus()}
                    disabled={updatingStatus}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center ${
                      isOpen 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {updatingStatus ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    ) : null}
                    Buka
                  </button>
                  <button
                    onClick={() => !updatingStatus && toggleRestaurantStatus()}
                    disabled={updatingStatus}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center ${
                      !isOpen 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {updatingStatus ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    ) : null}
                    Tutup
                  </button>
                </div>
                <p className={`text-sm font-medium mt-3 text-center ${
                  isOpen ? 'text-green-600' : 'text-red-600'
                }`}>
                  {isOpen ? '🟢 Restoran Anda sedang buka' : '🔴 Restoran Anda sedang tutup'}
                </p>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Status ini akan terlihat oleh semua pengguna
                </p>
              </div>
            </div>
          </div>

          {/* RESTAURANTS LIST */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Restoran Anda</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {restaurants.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 mb-4">Anda belum memiliki restoran</p>
                  <button 
                    onClick={() => router.push('/owner/add-restaurant')}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-medium"
                  >
                    Daftarkan Restoran Pertama
                  </button>
                </div>
              ) : (
                restaurants.map((restaurant) => (
                  <div key={restaurant.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {restaurant.image ? (
                          <img 
                            className="h-16 w-16 rounded-lg object-cover" 
                            src={restaurant.image} 
                            alt={restaurant.name} 
                          />
                        ) : (
                          <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                        
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{restaurant.name}</h3>
                          <p className="text-gray-600">{restaurant.category} • {restaurant.address}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              restaurant.status === 'approved' ? 'bg-green-100 text-green-800' :
                              restaurant.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {restaurant.status === 'approved' ? 'Disetujui' : 
                               restaurant.status === 'pending' ? 'Menunggu Verifikasi' : 'Ditolak'}
                            </span>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              restaurant.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {restaurant.isOpen ? '🟢 Buka' : '🔴 Tutup'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => router.push(`/owner/restaurants/edit?id=${restaurant.id}`)}
                          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => router.push(`/owner/reservations?restaurant=${restaurant.id}`)}
                          className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-medium"
                        >
                          Reservasi
                        </button>
                        <button 
                          onClick={() => router.push(`/owner/reviews`)}
                          className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 font-medium"
                        >
                          Ulasan
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}