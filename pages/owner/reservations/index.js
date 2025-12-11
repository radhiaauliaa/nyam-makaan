import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import { collection, getDocs, query, where, updateDoc, doc, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function OwnerReservations() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [rejectedOwner, setRejectedOwner] = useState(false);

  // Fungsi untuk mendapatkan restoran milik user
  const getUsersRestaurants = async () => {
    if (!currentUser) return [];
    
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(restaurantsRef, where('ownerId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Tidak ada restoran yang dimiliki user ini');
      }
      
      const restaurantsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return restaurantsData;
    } catch (error) {
      console.error('Error getting restaurants:', error);
      throw error;
    }
  };

  // Fungsi untuk mendapatkan reservasi
  const getReservations = async (restaurantId) => {
    try {
      const reservationsRef = collection(db, 'reservations');
      const q = query(
        reservationsRef, 
        where('restaurantId', '==', restaurantId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const reservationsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userName: data.userName || 'Tidak ada nama',
          userPhone: data.userPhone || 'Tidak ada telepon',
          userEmail: data.userEmail || 'Tidak ada email',
          date: data.date || '',
          time: data.time || '',
          area: data.area || 'indoor',
          guests: data.guests || 1,
          menuItems: data.menuItems || [],
          totalPrice: data.totalPrice || 0,
          downPayment: data.downPayment || 0,
          status: data.status || 'pending_approval',
          paymentStatus: data.paymentStatus || 'unpaid',
          specialRequests: data.specialRequests || '',
          createdAt: data.createdAt || null,
          ...data
        };
      });
      
      return reservationsData;
    } catch (error) {
      console.error('Error getting reservations:', error);
      // Fallback tanpa orderBy jika index belum dibuat
      try {
        const reservationsRef = collection(db, 'reservations');
        const q = query(reservationsRef, where('restaurantId', '==', restaurantId));
        const querySnapshot = await getDocs(q);
        
        const reservationsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            userName: data.userName || 'Tidak ada nama',
            userPhone: data.userPhone || 'Tidak ada telepon',
            userEmail: data.userEmail || 'Tidak ada email',
            date: data.date || '',
            time: data.time || '',
            area: data.area || 'indoor',
            guests: data.guests || 1,
            menuItems: data.menuItems || [],
            totalPrice: data.totalPrice || 0,
            downPayment: data.downPayment || 0,
            status: data.status || 'pending_approval',
            paymentStatus: data.paymentStatus || 'unpaid',
            specialRequests: data.specialRequests || '',
            createdAt: data.createdAt || null,
            ...data
          };
        });
        
        // Manual sorting
        reservationsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 
                       (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 
                       (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return timeB - timeA;
        });
        
        return reservationsData;
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  // Load data saat komponen mount
  useEffect(() => {
    const loadData = async () => {
      if (currentUser && userData?.role === 'owner') {
        try {
          const restaurantsData = await getUsersRestaurants();
          setRestaurants(restaurantsData);
          
          if (restaurantsData.length > 0) {
            if (restaurantsData[0]?.status === 'rejected') {
              setRejectedOwner(true);
              return;
            }
            const firstRestaurantId = restaurantsData[0].id;
            setRestaurantId(firstRestaurantId);
            
            const reservationsData = await getReservations(firstRestaurantId);
            setReservations(reservationsData);
          }
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [currentUser, userData]);

  // Reload reservations when restaurant changes
  useEffect(() => {
    if (restaurantId) {
      loadReservations(restaurantId);
    }
  }, [restaurantId]);

  const loadReservations = async (id) => {
    setLoading(true);
    try {
      const reservationsData = await getReservations(id);
      setReservations(reservationsData);
    } catch (error) {
      console.error('Error loading reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk update status reservasi
  const updateReservationStatus = async (reservationId, newStatus) => {
    try {
      const reservationRef = doc(db, 'reservations', reservationId);
      const reservationSnap = await getDoc(reservationRef);
      const reservationData = reservationSnap.exists() ? reservationSnap.data() : {};
      const updateData = {
        status: newStatus,
        updatedAt: new Date()
      };

      // Tambahkan timestamp untuk confirmed
      if (newStatus === 'confirmed') {
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = currentUser.uid;
      }

      // Tambahkan timestamp untuk cancelled (dibatalkan oleh owner)
      if (newStatus === 'cancelled') {
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = currentUser.uid;
        updateData.cancellationReason = 'dibatalkan_oleh_restoran';
        // DP harus 0 dan status pembayaran unpaid
        updateData.downPayment = 0;
        updateData.paymentStatus = 'unpaid';
      }

      // Tambahkan timestamp untuk rejected (ditolak oleh owner/admin)
      if (newStatus === 'rejected') {
        updateData.rejectedAt = new Date();
        updateData.rejectedBy = currentUser.uid;
        updateData.rejectionReason = 'ditolak_oleh_restoran';
        // DP harus 0 dan status pembayaran unpaid
        updateData.downPayment = 0;
        updateData.paymentStatus = 'unpaid';
      }

      // Tambahkan timestamp untuk completed
      if (newStatus === 'completed') {
        updateData.completedAt = new Date();
        updateData.completedBy = currentUser.uid;
      }

      await updateDoc(reservationRef, updateData);

      // Notify user when confirmed
      if (newStatus === 'confirmed') {
        try {
          const notifyPayload = {
            id: reservationId,
            restaurantId: reservationData.restaurantId,
            restaurantName: reservationData.restaurantName,
            guestCount: reservationData.guests,
            date: reservationData.date,
            time: reservationData.time,
            totalPrice: reservationData.totalPrice,
            downPayment: reservationData.downPayment,
          };
          const { createUserReservationNotification } = await import('../../../lib/firestore');
          await createUserReservationNotification(reservationData.userId, notifyPayload);
        } catch (e) {
          console.warn('Gagal kirim notifikasi user:', e?.message || e);
        }
      }
      
      // Update local state
      setReservations(prev => 
        prev.map(res => 
          res.id === reservationId 
            ? { ...res, status: newStatus }
            : res
        )
      );
      
      alert(`Reservasi berhasil ${getStatusText(newStatus).toLowerCase()}`);
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert('Gagal mengupdate reservasi: ' + error.message);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    if (dateString.toDate) {
      const date = dateString.toDate();
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Hitung statistik
  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'pending_approval').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
    completed: reservations.filter(r => r.status === 'completed').length
  };

  // Filter reservasi berdasarkan status
  const filteredReservations = activeFilter === 'all' 
    ? reservations 
    : reservations.filter(r => r.status === activeFilter);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_approval': return 'Menunggu Persetujuan';
      case 'confirmed': return 'Dikonfirmasi';
      case 'cancelled': return 'Dibatalkan';
      case 'rejected': return 'Ditolak';
      case 'completed': return 'Selesai';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'unpaid': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Lunas';
      case 'unpaid': return 'Belum Bayar';
      case 'partial': return 'DP Dibayar';
      default: return status;
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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data reservasi...</p>
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Kelola Reservasi</h1>
                <p className="text-gray-600">Kelola semua reservasi restoran Anda</p>
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
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
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

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Reservasi</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
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
                  <p className="text-sm font-medium text-gray-600">Menunggu Persetujuan</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
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
                  <p className="text-sm font-medium text-gray-600">Dikonfirmasi</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.confirmed}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ditolak</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.cancelled}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Selesai</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeFilter === 'all'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setActiveFilter('pending_approval')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeFilter === 'pending_approval'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Menunggu Persetujuan
                </button>
                <button
                  onClick={() => setActiveFilter('confirmed')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeFilter === 'confirmed'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dikonfirmasi
                </button>
                <button
                  onClick={() => setActiveFilter('cancelled')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeFilter === 'cancelled'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Ditolak
                </button>
                <button
                  onClick={() => setActiveFilter('completed')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    activeFilter === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Selesai
                </button>
              </div>
            </div>

            {/* Reservations List */}
            <div className="p-6">
              {filteredReservations.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada reservasi</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeFilter === 'all' 
                      ? 'Belum ada reservasi untuk restoran Anda.' 
                      : `Tidak ada reservasi dengan status ${getStatusText(activeFilter)}.`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredReservations.map((reservation) => (
                    <div key={reservation.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {reservation.userName}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(reservation.status)}`}>
                              {getStatusText(reservation.status)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(reservation.paymentStatus)}`}>
                              {getPaymentStatusText(reservation.paymentStatus)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                            <div>
                              <span className="font-medium text-gray-700">Tanggal & Waktu:</span>
                              <p>{formatDate(reservation.date)}</p>
                              <p className="font-semibold">{reservation.time}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Detail:</span>
                              <p>{reservation.guests} orang • {reservation.area === 'indoor' ? 'Indoor' : reservation.area === 'outdoor' ? 'Outdoor' : 'VIP'}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Kontak:</span>
                              <p>{reservation.userPhone}</p>
                              <p className="text-xs">{reservation.userEmail}</p>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Total:</span>
                              <p className="font-bold text-orange-600">
                                {formatCurrency(reservation.totalPrice)}
                              </p>
                              <p className="text-xs text-gray-500">
                                DP: {formatCurrency(reservation.downPayment)}
                              </p>
                            </div>
                          </div>

                          {/* Menu Items */}
                          {reservation.menuItems && reservation.menuItems.length > 0 && (
                            <div className="mb-3">
                              <span className="font-medium text-gray-700 text-sm">Menu Pre-Order:</span>
                              <div className="mt-1 space-y-1">
                                {reservation.menuItems.slice(0, 3).map((item, index) => (
                                  <div key={index} className="flex justify-between text-xs text-gray-600">
                                    <span>{item.name} × {item.quantity}</span>
                                    <span>{formatCurrency(item.price * item.quantity)}</span>
                                  </div>
                                ))}
                                {reservation.menuItems.length > 3 && (
                                  <p className="text-xs text-gray-500">
                                    +{reservation.menuItems.length - 3} menu lainnya...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Special Requests */}
                          {reservation.specialRequests && (
                            <div className="mb-3">
                              <span className="font-medium text-gray-700 text-sm">Permintaan Khusus:</span>
                              <p className="text-sm text-gray-600 mt-1">{reservation.specialRequests}</p>
                            </div>
                          )}

                          {/* Reservation Info */}
                          <div className="text-xs text-gray-500">
                            ID: {reservation.id} • 
                            Dibuat: {reservation.createdAt ? 
                              (reservation.createdAt.toDate ? 
                                reservation.createdAt.toDate().toLocaleString('id-ID') : 
                                new Date(reservation.createdAt).toLocaleString('id-ID')
                              ) : 'Tanggal tidak tersedia'
                            }
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 ml-4">
                          {/* Action Buttons for Pending Reservations */}
                          {reservation.status === 'pending_approval' && (
                            <>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-medium flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                                </svg>
                                Setujui
                              </button>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'rejected')}
                                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 font-medium flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                Tolak
                              </button>
                            </>
                          )}

                          {/* Additional actions for confirmed reservations */}
                          {reservation.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'completed')}
                                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Selesai
                              </button>
                              <button
                                onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 font-medium flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                                Batalkan
                              </button>
                              <button
                                onClick={() => router.push(`/owner/reservations/${reservation.id}`)}
                                className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 font-medium flex items-center"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Detail
                              </button>
                            </>
                          )}

                          {/* View details for other statuses */}
                          {(reservation.status === 'cancelled' || reservation.status === 'completed') && (
                            <button
                              onClick={() => router.push(`/owner/reservations/${reservation.id}`)}
                              className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 font-medium flex items-center"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                              </svg>
                              Detail
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}