import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function OwnerReservationDetail() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Load reservation data
  useEffect(() => {
    const fetchReservation = async () => {
      if (!id) return;

      try {
        const reservationRef = doc(db, 'reservations', id);
        const reservationSnap = await getDoc(reservationRef);

        if (reservationSnap.exists()) {
          const data = reservationSnap.data();
          setReservation({
            id: reservationSnap.id,
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
          });
        } else {
          alert('Reservasi tidak ditemukan');
          router.push('/owner/reservations');
        }
      } catch (error) {
        console.error('Error fetching reservation:', error);
        alert('Gagal memuat detail reservasi');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && userData?.role === 'owner') {
      fetchReservation();
    }
  }, [id, currentUser, userData, router]);

  // Update reservation status
  const updateReservationStatus = async (newStatus) => {
    if (!reservation) return;

    setUpdating(true);
    try {
      const reservationRef = doc(db, 'reservations', id);
      const updateData = {
        status: newStatus,
        updatedAt: new Date()
      };

      // Tambahkan timestamp untuk confirmed
      if (newStatus === 'confirmed') {
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = currentUser.uid;
      }

      // Tambahkan timestamp untuk cancelled
      if (newStatus === 'cancelled') {
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = currentUser.uid;
      }

      // Tambahkan timestamp untuk completed
      if (newStatus === 'completed') {
        updateData.completedAt = new Date();
        updateData.completedBy = currentUser.uid;
      }

      await updateDoc(reservationRef, updateData);
      
      // Update local state
      setReservation(prev => ({ ...prev, status: newStatus }));
      
      alert(`Reservasi berhasil ${getStatusText(newStatus).toLowerCase()}`);
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert('Gagal mengupdate reservasi: ' + error.message);
    } finally {
      setUpdating(false);
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

  // Format datetime for created at
  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    
    if (timestamp.toDate) {
      const date = timestamp.toDate();
      return date.toLocaleString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
      case 'cancelled': return 'Ditolak';
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

  const getAreaText = (area) => {
    switch (area) {
      case 'indoor': return 'Indoor';
      case 'outdoor': return 'Outdoor';
      case 'vip': return 'VIP';
      default: return area;
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

  if (!reservation) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Reservasi tidak ditemukan.</p>
            <button 
              onClick={() => router.push('/owner/reservations')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Kembali
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
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <button 
                  onClick={() => router.push('/owner/reservations')}
                  className="flex items-center text-orange-600 hover:text-orange-700 mb-4"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                  </svg>
                  Kembali ke Daftar Reservasi
                </button>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Detail Reservasi</h1>
                <p className="text-gray-600">Kelola reservasi dari pelanggan</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(reservation.status)}`}>
                  {getStatusText(reservation.status)}
                </span>
                <span className={`px-3 py-2 rounded-full text-xs font-medium ${getPaymentStatusColor(reservation.paymentStatus)}`}>
                  {getPaymentStatusText(reservation.paymentStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content */}
            <div className="lg:col-span-2">
              
              {/* Customer Information */}
              <div className="bg-white rounded-lg shadow mb-6">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Informasi Pelanggan</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Kontak Pelanggan</h3>
                      <div className="space-y-2">
                        <p><strong>Nama:</strong> {reservation.userName}</p>
                        <p><strong>Telepon:</strong> {reservation.userPhone}</p>
                        <p><strong>Email:</strong> {reservation.userEmail}</p>
                      </div>
                      
                      <div className="mt-4">
                        <button 
                          onClick={() => window.open(`https://wa.me/${reservation.userPhone.replace(/\D/g, '')}`, '_blank')}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893-.001-3.189-1.262-6.187-3.55-8.444"/>
                          </svg>
                          Hubungi via WhatsApp
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Detail Reservasi</h3>
                      <div className="space-y-2">
                        <p><strong>Tanggal:</strong> {formatDate(reservation.date)}</p>
                        <p><strong>Waktu:</strong> {reservation.time}</p>
                        <p><strong>Jumlah Tamu:</strong> {reservation.guests} orang</p>
                        <p><strong>Area:</strong> {getAreaText(reservation.area)}</p>
                        <p><strong>Total Harga:</strong> <span className="text-orange-600 font-bold">{formatCurrency(reservation.totalPrice)}</span></p>
                        <p><strong>DP Dibayar:</strong> <span className="text-green-600 font-bold">{formatCurrency(reservation.downPayment)}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              {reservation.menuItems && reservation.menuItems.length > 0 && (
                <div className="bg-white rounded-lg shadow mb-6">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Menu Pre-Order</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {reservation.menuItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">{formatCurrency(item.price)} × {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                      
                      {/* Total */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <p className="font-bold text-gray-900">Total</p>
                        <p className="font-bold text-orange-600 text-lg">{formatCurrency(reservation.totalPrice)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {reservation.specialRequests && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Permintaan Khusus</h2>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-700">{reservation.specialRequests}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Actions & Info */}
            <div className="space-y-6">
              
              {/* Actions */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Aksi</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    
                    {/* Pending Approval Actions */}
                    {reservation.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={() => updateReservationStatus('confirmed')}
                          disabled={updating}
                          className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center disabled:opacity-50"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                          </svg>
                          {updating ? 'Memproses...' : 'Setujui Reservasi'}
                        </button>
                        <button
                          onClick={() => updateReservationStatus('cancelled')}
                          disabled={updating}
                          className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center disabled:opacity-50"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          {updating ? 'Memproses...' : 'Tolak Reservasi'}
                        </button>
                      </>
                    )}

                    {/* Confirmed Actions */}
                    {reservation.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => updateReservationStatus('completed')}
                          disabled={updating}
                          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center disabled:opacity-50"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          {updating ? 'Memproses...' : 'Tandai Selesai'}
                        </button>
                        <button
                          onClick={() => updateReservationStatus('cancelled')}
                          disabled={updating}
                          className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center disabled:opacity-50"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                          {updating ? 'Memproses...' : 'Batalkan Reservasi'}
                        </button>
                      </>
                    )}

                    {/* Completed/Cancelled Actions */}
                    {(reservation.status === 'completed' || reservation.status === 'cancelled') && (
                      <button
                        onClick={() => router.push('/owner/reservations')}
                        className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 font-medium"
                      >
                        Kembali ke Daftar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reservation Info */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Informasi Reservasi</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">ID Reservasi</p>
                      <p className="text-gray-600 font-mono">{reservation.id}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Dibuat Pada</p>
                      <p className="text-gray-600">{formatDateTime(reservation.createdAt)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Status Terakhir</p>
                      <p className="text-gray-600">{getStatusText(reservation.status)}</p>
                    </div>
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