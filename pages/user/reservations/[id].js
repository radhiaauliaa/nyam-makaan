import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Layout from '../../../components/Layout/Layout';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function ReservationDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser, userData } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Fetch reservation and restaurant data from Firebase
  useEffect(() => {
    const fetchReservationData = async () => {
      if (!id || !currentUser) return;

      try {
        setLoading(true);
        setError('');

        console.log('Fetching reservation:', id);
        
        // Get reservation document
        const reservationDoc = await getDoc(doc(db, 'reservations', id));
        
        if (!reservationDoc.exists()) {
          setError('Reservasi tidak ditemukan');
          setLoading(false);
          return;
        }

        const reservationData = {
          id: reservationDoc.id,
          ...reservationDoc.data()
        };

        console.log('Reservation data:', reservationData);

        // Check if current user is authorized to view this reservation
        const isOwner = reservationData.userId === currentUser.uid;
        const isRestaurantOwner = userData?.role === 'owner' && reservationData.restaurantOwnerId === currentUser.uid;
        
        if (!isOwner && !isRestaurantOwner) {
          setError('Anda tidak memiliki akses ke reservasi ini');
          setLoading(false);
          return;
        }

        setReservation(reservationData);

        // Fetch restaurant data
        if (reservationData.restaurantId) {
          const restaurantDoc = await getDoc(doc(db, 'restaurants', reservationData.restaurantId));
          if (restaurantDoc.exists()) {
            setRestaurant({
              id: restaurantDoc.id,
              ...restaurantDoc.data()
            });
          }
        }

      } catch (error) {
        console.error('Error fetching reservation:', error);
        setError('Gagal memuat data reservasi');
      } finally {
        setLoading(false);
      }
    };

    fetchReservationData();
  }, [id, currentUser, userData]);

  // Real-time updates for reservation
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'reservations', id), (doc) => {
      if (doc.exists()) {
        const reservationData = {
          id: doc.id,
          ...doc.data()
        };
        setReservation(reservationData);
      }
    });

    return () => unsubscribe();
  }, [id]);

  const handleCancelReservation = async () => {
    if (!reservation || !window.confirm('Apakah Anda yakin ingin membatalkan reservasi ini?')) {
      return;
    }

    try {
      setCancelling(true);
      
      await updateDoc(doc(db, 'reservations', reservation.id), {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: currentUser.uid,
        updatedAt: new Date()
      });

      alert('Reservasi berhasil dibatalkan');
      
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      setError('Gagal membatalkan reservasi');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'rejected': return 'bg-gray-100 text-gray-800 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending_approval': return 'Menunggu Persetujuan';
      case 'confirmed': return 'Dikonfirmasi';
      case 'cancelled': return 'Dibatalkan';
      case 'completed': return 'Selesai';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border border-green-200';
      case 'unpaid': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'partial': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'paid': return 'Lunas';
      case 'unpaid': return 'Belum Bayar';
      case 'partial': return 'DP Dibayar';
      case 'cancelled': return 'Dibatalkan';
      default: return status;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    
    // Handle Firestore timestamp
    if (dateString.toDate) {
      const date = dateString.toDate();
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Handle string date
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString;
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Calculate total from menu items
  const calculateMenuTotal = () => {
    if (!reservation?.menuItems) return 0;
    return reservation.menuItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Silakan login untuk melihat detail reservasi</p>
            <button 
              onClick={() => router.push('/auth/login')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Login
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
            <p className="text-gray-600 mt-4">Memuat detail reservasi...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Terjadi Kesalahan</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button 
              onClick={() => router.push('/user/reservations')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Kembali ke Daftar Reservasi
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!reservation) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Data reservasi tidak ditemukan</p>
            <button 
              onClick={() => router.push('/user/reservations')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Kembali ke Daftar Reservasi
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const totalPrice = reservation.totalPrice || calculateMenuTotal();
  const downPayment = reservation.downPayment || totalPrice * 0.5;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <button 
              onClick={() => router.push('/user/reservations')}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Kembali ke Daftar Reservasi
            </button>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Detail Reservasi</h1>
                <p className="text-gray-600 mt-2">ID: {reservation.id}</p>
              </div>
              <div className="flex flex-col sm:items-end gap-2">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(reservation.status)}`}>
                  {getStatusText(reservation.status)}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(reservation.paymentStatus)}`}>
                  {getPaymentStatusText(reservation.paymentStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Restaurant Info Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {restaurant?.name || reservation.restaurantName || 'Restoran Tidak Ditemukan'}
                </h2>
                <div className="space-y-2 text-gray-600">
                  <p>📍 {restaurant?.address || 'Alamat tidak tersedia'}</p>
                  {restaurant?.phone && <p>📞 {restaurant.phone}</p>}
                  {restaurant?.email && <p>✉️ {restaurant.email}</p>}
                </div>
              </div>

              {/* Reservation Details Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Detail Reservasi</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal Reservasi</label>
                      <p className="font-semibold text-gray-900">
                        {formatDateTime(reservation.date)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Waktu</label>
                      <p className="font-semibold text-gray-900">
                        {formatTime(reservation.time)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Area</label>
                      <p className="font-semibold text-gray-900 capitalize">
                        {reservation.area === 'indoor' ? 'Indoor' : 
                         reservation.area === 'outdoor' ? 'Outdoor' : 
                         reservation.area === 'vip' ? 'VIP' : reservation.area}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah Orang</label>
                      <p className="font-semibold text-gray-900">
                        {reservation.guests} orang
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Nama Pemesan</label>
                      <p className="font-semibold text-gray-900">
                        {reservation.userName || 'Tidak tersedia'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Telepon</label>
                      <p className="font-semibold text-gray-900">
                        {reservation.userPhone || 'Tidak tersedia'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu Pre-Order</h3>
                
                {reservation.menuItems && reservation.menuItems.length > 0 ? (
                  <div className="space-y-4">
                    {reservation.menuItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-start py-3 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                            </div>
                            <span className="text-orange-600 font-bold ml-4">
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Jumlah: {item.quantity} × {formatCurrency(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Total Summary */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(totalPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">DP 50%:</span>
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(downPayment)}
                        </span>
                      </div>
                      {reservation.paymentStatus === 'paid' && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                          <span className="text-green-600 font-medium">Sudah dibayar:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(downPayment)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600 text-center py-4">Tidak ada menu yang dipesan</p>
                )}
              </div>

              {/* Special Requests Card */}
              {reservation.specialRequests && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Permintaan Khusus</h3>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {reservation.specialRequests}
                  </p>
                </div>
              )}

              {/* Payment Information Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pembayaran</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Status Pembayaran</label>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(reservation.paymentStatus)}`}>
                        {getPaymentStatusText(reservation.paymentStatus)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Metode Pembayaran</label>
                      <p className="font-medium text-gray-900">
                        {reservation.paymentMethod === 'transfer' ? 'Transfer Bank' : 
                         reservation.paymentMethod || 'Bayar di Tempat'}
                      </p>
                    </div>
                  </div>

                  {reservation.paymentProof && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">Bukti Pembayaran</label>
                      <div className="flex items-center space-x-4">
                        <img 
                          src={reservation.paymentProof} 
                          alt="Bukti Pembayaran" 
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200 cursor-pointer"
                          onClick={() => window.open(reservation.paymentProof, '_blank')}
                        />
                        <a 
                          href={reservation.paymentProof} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                        >
                          Lihat Full Size
                        </a>
                      </div>
                    </div>
                  )}

                  {reservation.paymentStatus === 'unpaid' && reservation.status === 'confirmed' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-yellow-800 text-sm">
                        <strong>Pembayaran DP 50%:</strong> Silakan lakukan pembayaran sebesar{' '}
                        <span className="font-bold">{formatCurrency(downPayment)}</span> untuk mengkonfirmasi reservasi Anda.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Timeline Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Reservasi</h3>
                <div className="space-y-4">
                  {/* Created */}
                  <div className="flex items-start">
                    <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">Reservasi Dibuat</p>
                      <p className="text-sm text-gray-600">
                        {reservation.createdAt ? 
                          (reservation.createdAt.toDate ? 
                            reservation.createdAt.toDate().toLocaleString('id-ID') : 
                            new Date(reservation.createdAt).toLocaleString('id-ID')
                          ) : 'Waktu tidak tersedia'}
                      </p>
                    </div>
                  </div>

                  {/* Confirmed */}
                  {reservation.status === 'confirmed' && reservation.confirmedAt && (
                    <div className="flex items-start">
                      <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">Reservasi Dikonfirmasi</p>
                        <p className="text-sm text-gray-600">
                          {reservation.confirmedAt.toDate ? 
                            reservation.confirmedAt.toDate().toLocaleString('id-ID') : 
                            new Date(reservation.confirmedAt).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Payment */}
                  {reservation.paymentStatus === 'paid' && reservation.paymentDate && (
                    <div className="flex items-start">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">DP 50% Dibayar</p>
                        <p className="text-sm text-gray-600">
                          {reservation.paymentDate.toDate ? 
                            reservation.paymentDate.toDate().toLocaleString('id-ID') : 
                            new Date(reservation.paymentDate).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Cancelled */}
                  {reservation.cancelledAt && (
                    <div className="flex items-start">
                      <div className="w-3 h-3 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">Reservasi Dibatalkan</p>
                        <p className="text-sm text-gray-600">
                          {reservation.cancelledAt.toDate ? 
                            reservation.cancelledAt.toDate().toLocaleString('id-ID') : 
                            new Date(reservation.cancelledAt).toLocaleString('id-ID')}
                          {reservation.cancelledBy && ` • Oleh: ${reservation.cancelledBy === currentUser.uid ? 'Anda' : 'Restoran'}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Actions Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push(`/restaurant/${reservation.restaurantId}`)}
                    className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 font-medium transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Lihat Restoran
                  </button>
                  
                  {(reservation.status === 'pending_approval' || reservation.status === 'confirmed') && 
                   reservation.userId === currentUser.uid && (
                    <button 
                      onClick={handleCancelReservation}
                      disabled={cancelling}
                      className={`w-full bg-red-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
                        cancelling ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                      }`}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      {cancelling ? 'Membatalkan...' : 'Batalkan Reservasi'}
                    </button>
                  )}

                  {reservation.paymentStatus === 'unpaid' && reservation.status === 'confirmed' && (
                    <button
                      onClick={() => router.push(`/payment/${reservation.id}`)}
                      className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                      </svg>
                      Bayar DP 50%
                    </button>
                  )}

                  {reservation.paymentStatus === 'unpaid' && reservation.status === 'confirmed' && (
                  <button
                    onClick={() => router.push(`/payment/${reservation.id}`)}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                    </svg>
                    Bayar DP 50% via QRIS
                  </button>
                )}

                  <button
                    onClick={() => router.push('/user/reservations')}
                    className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 font-medium transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                    </svg>
                    Kembali ke Daftar
                  </button>
                </div>
              </div>

              {/* Reservation Summary Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Pesanan</span>
                    <span className="font-medium text-gray-900">{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">DP 50%</span>
                    <span className="font-medium text-orange-600">{formatCurrency(downPayment)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Yang harus dibayar</span>
                      <span className="text-green-600">
                        {reservation.paymentStatus === 'paid' ? 'Lunas' : formatCurrency(downPayment)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Information Card */}
              <div className="bg-blue-50 rounded-lg shadow-sm p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Informasi Penting</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Datang tepat waktu sesuai reservasi</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Hubungi restoran jika ada perubahan</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Batalkan minimal 2 jam sebelumnya</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>DP 50% sudah termasuk dalam total</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Sisa pembayaran dilakukan di restoran</span>
                  </li>
                </ul>
              </div>

              {/* Contact Restaurant */}
              {restaurant?.phone && (
                <div className="bg-green-50 rounded-lg shadow-sm p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">Hubungi Restoran</h3>
                  <p className="text-green-800 mb-3 text-sm">Butuh bantuan? Hubungi restoran langsung:</p>
                  <a 
                    href={`tel:${restaurant.phone}`}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-medium transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                    Telepon Restoran
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}