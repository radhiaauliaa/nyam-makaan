import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc, 
  getDoc,
  limit,
  startAfter
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function UserReservations() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State untuk pagination
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 5; // Jumlah data per load

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    loadInitialReservations();
  }, [currentUser]);

  // Load data pertama
  const loadInitialReservations = async () => {
    try {
      setLoading(true);
      setError('');

      const reservationsRef = collection(db, 'reservations');
      const q = query(
        reservationsRef, 
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(LIMIT)
      );

      const snapshot = await getDocs(q);
      
      const reservationsData = await processReservations(snapshot);
      
      setReservations(reservationsData);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(reservationsData.length === LIMIT);
      setLoading(false);

    } catch (err) {
      console.error('Error loading reservations:', err);
      setError('Gagal memuat data reservasi');
      setLoading(false);
    }
  };

  // Load more data
  const loadMoreReservations = async () => {
    if (!lastDoc || !hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      
      const reservationsRef = collection(db, 'reservations');
      const nextQuery = query(
        reservationsRef, 
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc), // Mulai dari dokumen terakhir
        limit(LIMIT)
      );

      const snapshot = await getDocs(nextQuery);
      const newReservations = await processReservations(snapshot);
      
      // Gabungkan data baru dengan data existing
      setReservations(prev => [...prev, ...newReservations]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(newReservations.length === LIMIT);
      setLoadingMore(false);

    } catch (err) {
      console.error('Error loading more reservations:', err);
      setLoadingMore(false);
    }
  };

  // Process reservations data
  const processReservations = async (snapshot) => {
    const reservationsData = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data();
        
        // Ambil data restoran
        let restaurantData = null;
        if (data.restaurantId) {
          try {
            const restaurantDoc = await getDoc(doc(db, 'restaurants', data.restaurantId));
            if (restaurantDoc.exists()) {
              restaurantData = restaurantDoc.data();
            }
          } catch (err) {
            console.error('Error mengambil data restoran:', err);
          }
        }

        return {
          id: docSnapshot.id,
          ...data,
          restaurantData
        };
      })
    );

    return reservationsData;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    
    try {
      let date;
      
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      } else if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'number') {
        date = new Date(dateValue * 1000);
      } else {
        return '-';
      }

      if (isNaN(date.getTime())) return '-';

      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return '-';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'confirmed': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'rejected': return 'bg-gray-100 text-gray-800 border border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Menunggu Konfirmasi';
      case 'confirmed': return 'Dikonfirmasi';
      case 'cancelled': return 'Dibatalkan';
      case 'completed': return 'Selesai';
      case 'rejected': return 'Ditolak';
      default: return status;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Waktu tidak tersedia';
    
    try {
      let date;
      
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        return 'Waktu tidak tersedia';
      }

      if (isNaN(date.getTime())) return 'Waktu tidak tersedia';

      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Waktu tidak tersedia';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat data reservasi...</p>
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
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reservasi Saya</h1>
            <p className="text-gray-600">Kelola dan lihat history reservasi Anda</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
              <button 
                onClick={loadInitialReservations}
                className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Reservations List */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              {reservations.length === 0 && !error ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Belum Ada Reservasi</h3>
                  <p className="mt-1 text-sm text-gray-500 mb-6">Yuk, pesan meja di restoran favorit Anda!</p>
                  <button 
                    onClick={() => router.push('/restaurants')}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Cari Restoran
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {reservations.map((reservation) => (
                      <div key={reservation.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-lg text-gray-900 mb-1">
                                  {reservation.restaurantData?.name || reservation.restaurantName || 'Restoran'}
                                </h3>
                                <p className="text-gray-600 text-sm">
                                  ID: {reservation.id} • {reservation.userPhone || 'No. Telepon tidak tersedia'}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium mt-2 sm:mt-0 ${getStatusColor(reservation.status)}`}>
                                {getStatusText(reservation.status)}
                              </span>
                            </div>
                            
                            {/* Reservation Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                              <div>
                                <span className="font-medium">Tanggal:</span>
                                <br />
                                {formatDate(reservation.date)}
                              </div>
                              <div>
                                <span className="font-medium">Waktu:</span>
                                <br />
                                {reservation.time || '-'}
                              </div>
                              <div>
                                <span className="font-medium">Jumlah Orang:</span>
                                <br />
                                {reservation.guests || 2} orang • {reservation.area ? reservation.area.charAt(0).toUpperCase() + reservation.area.slice(1) : 'Indoor'}
                              </div>
                              <div>
                                <span className="font-medium">Metode Bayar:</span>
                                <br />
                                {reservation.paymentMethod === 'transfer' ? 'TRANSFER' : 'Bayar di Tempat'}
                              </div>
                            </div>

                            {/* Menu Items */}
                            {reservation.menus && reservation.menus.length > 0 && (
                              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-3">Menu yang Dipesan:</h4>
                                <div className="space-y-2">
                                  {reservation.menus.map((menu, index) => (
                                    <div key={index} className="flex justify-between text-sm">
                                      <span>{menu.name} x{menu.quantity}</span>
                                      <span>{formatCurrency(menu.price * menu.quantity)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-semibold">
                                  <span>Total Pesanan:</span>
                                  <span className="text-orange-600">{formatCurrency(reservation.totalPrice)}</span>
                                </div>
                                {reservation.dpAmount && (
                                  <div className="flex justify-between text-sm mt-1">
                                    <span>DP 50%:</span>
                                    <span>{formatCurrency(reservation.dpAmount)}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Customer Contact Info */}
                            <div className="text-sm text-gray-600 space-y-1">
                              {reservation.userEmail && (
                                <p><span className="font-medium">Email:</span> {reservation.userEmail}</p>
                              )}
                              {reservation.specialRequests && (
                                <div>
                                  <span className="font-medium">Permintaan Khusus:</span>
                                  <p className="text-gray-700 bg-gray-50 p-2 rounded mt-1">{reservation.specialRequests}</p>
                                </div>
                              )}
                            </div>

                            {/* Timestamp */}
                            <div className="mt-4 text-xs text-gray-500">
                              Dibuat: {formatTimestamp(reservation.createdAt)}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col space-y-2 lg:w-48">
                            {/* View Details Button */}
                            <button
                              onClick={() => router.push(`/user/reservations/${reservation.id}`)}
                              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                            >
                              Lihat Detail
                            </button>

                            {/* Contact Restaurant */}
                            {reservation.restaurantData?.phone && (
                              <a
                                href={`https://wa.me/${reservation.restaurantData.phone.replace('+', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium text-sm transition-colors text-center"
                              >
                                WhatsApp Restoran
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="mt-8 text-center">
                      <button 
                        onClick={loadMoreReservations}
                        disabled={loadingMore}
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 font-medium disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center mx-auto"
                      >
                        {loadingMore ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Memuat...
                          </span>
                        ) : (
                          'Muat Lebih Banyak'
                        )}
                      </button>
                      <p className="text-sm text-gray-500 mt-2">
                        Menampilkan {reservations.length} reservasi
                      </p>
                    </div>
                  )}

                  {/* No More Data Message */}
                  {!hasMore && reservations.length > 0 && (
                    <div className="mt-8 text-center">
                      <p className="text-gray-500 text-sm">
                        ✅ Semua reservasi telah dimuat ({reservations.length} total)
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}