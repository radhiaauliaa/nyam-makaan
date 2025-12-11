import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout/Layout';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// 🔧 MENGGUNAKAN ENVIRONMENT VARIABLES
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function PaymentPage() {
  const router = useRouter();
  const { reservationId } = router.query;
  const { currentUser } = useAuth();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  // Fungsi upload ke Cloudinary
  const uploadToCloudinary = async (file) => {
    try {
      // Validasi environment variables
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error('Konfigurasi Cloudinary tidak ditemukan. Pastikan environment variables sudah di-set.');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'payment-proofs');

      console.log('🔄 Mengupload ke Cloudinary...');
      console.log('Cloud Name:', CLOUDINARY_CLOUD_NAME);
      console.log('Upload Preset:', CLOUDINARY_UPLOAD_PRESET);
      console.log('File:', file.name, file.size, file.type);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      console.log('📨 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Cloudinary error:', errorData);
        throw new Error(`Upload gagal: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Upload berhasil:', data.secure_url);
      return data.secure_url;
    } catch (error) {
      console.error('❌ Error detail:', error);
      throw new Error(`Gagal upload ke Cloudinary: ${error.message}`);
    }
  };

  useEffect(() => {
    const fetchReservation = async () => {
      if (!reservationId || !currentUser) return;

      try {
        setLoading(true);
        setError('');

        const docRef = doc(db, 'reservations', reservationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId !== currentUser.uid) {
            setError('Anda tidak memiliki akses ke reservasi ini.');
            return;
          }

          if (data.status !== 'confirmed' || data.paymentStatus !== 'unpaid') {
            setError('Reservasi ini tidak memerlukan pembayaran atau sudah diproses.');
            return;
          }

          setReservation({ 
            id: docSnap.id, 
            userName: data.userName || 'Tidak ada nama',
            userPhone: data.userPhone || 'Tidak ada telepon',
            userEmail: data.userEmail || 'Tidak ada email',
            restaurantName: data.restaurantName || 'Restoran Tidak Diketahui',
            totalPrice: data.totalPrice || 0,
            downPayment: data.downPayment || (data.totalPrice * 0.5),
            date: data.date || '',
            time: data.time || '',
            guests: data.guests || 1,
            ...data 
          });
        } else {
          setError('Reservasi tidak ditemukan.');
        }
      } catch (error) {
        console.error('Error fetching reservation:', error);
        setError('Terjadi kesalahan saat memuat data reservasi.');
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId, currentUser]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Harap pilih file gambar (JPG, PNG, dll).');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB.');
        return;
      }

      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!image) {
      alert('Pilih bukti pembayaran terlebih dahulu.');
      return;
    }

    if (!reservation) {
      alert('Data reservasi tidak valid.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const imageUrl = await uploadToCloudinary(image);

      const reservationRef = doc(db, 'reservations', reservationId);
      await updateDoc(reservationRef, {
        paymentProof: imageUrl,
        paymentStatus: 'pending_verification',
        paymentMethod: 'qris',
        paymentDate: new Date(),
        updatedAt: new Date()
      });

      alert('Bukti pembayaran berhasil diupload! Menunggu verifikasi admin.');
      router.push(`/user/reservations/${reservationId}`);
    } catch (error) {
      console.error('Error uploading proof:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Rp 0';
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

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

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data pembayaran...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !reservation) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Terjadi Kesalahan</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/user/reservations')}
                className="w-full bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
              >
                Kembali ke Daftar Reservasi
              </button>
              <button 
                onClick={() => router.push('/')}
                className="w-full bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!reservation) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Data reservasi tidak ditemukan.</p>
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

  const downPayment = reservation.downPayment || (reservation.totalPrice * 0.5);
  const qrValue = `NYAMIMAKAN|${reservation.restaurantName}|${downPayment}|${reservation.id}`;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-6">
            <button 
              onClick={() => router.push(`/user/reservations/${reservationId}`)}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Kembali ke Detail Reservasi
            </button>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Pembayaran DP 50%</h1>
                <p className="text-gray-600 mt-2">ID Reservasi: {reservation.id}</p>
              </div>
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium">
                Menunggu Pembayaran DP
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - QRIS & Payment Info */}
            <div className="space-y-6">
              {/* QRIS Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Scan QRIS</h2>
                
                <div className="border-2 border-dashed border-orange-200 rounded-lg p-6 text-center bg-orange-50">
                  <div className="bg-white rounded-lg p-4 mb-4 mx-auto max-w-xs border border-gray-200">
                    <QRCodeGenerator 
                      value={qrValue}
                      size={200}
                    />
                  </div>
                  
                  <div className="text-center mb-4">
                    <p className="text-lg font-bold text-orange-600 mb-1">
                      {formatCurrency(downPayment)}
                    </p>
                    <p className="text-sm text-gray-600">Scan untuk bayar via QRIS</p>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 text-left max-w-md mx-auto">
                    <div className="flex items-center">
                      <span className="mr-3 text-lg">📱</span>
                      <span>Gunakan GoPay, OVO, Dana, LinkAja, atau mobile banking</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3 text-lg">⏱️</span>
                      <span>Batas waktu pembayaran: 24 jam</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-3 text-lg">💰</span>
                      <span>Pastikan jumlah transfer tepat</span>
                    </div>
                  </div>
                </div>

                {/* Manual Transfer Info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                    Transfer Manual
                  </h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Jika QRIS tidak bekerja, Anda bisa transfer manual ke:
                  </p>
                  <div className="bg-white rounded p-3 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Bank:</span>
                      <span>BCA (Bank Central Asia)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">No. Rekening:</span>
                      <span className="font-mono">1234 5678 9012</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Atas Nama:</span>
                      <span>{reservation.restaurantName.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="font-medium text-gray-700">Jumlah Transfer:</span>
                      <span className="font-bold text-orange-600">{formatCurrency(downPayment)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reservation Info Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Reservasi</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Restoran</span>
                    <span className="font-medium text-gray-900">{reservation.restaurantName}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tanggal & Waktu</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(reservation.date)} • {reservation.time}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jumlah Orang</span>
                    <span className="font-medium text-gray-900">{reservation.guests} orang</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Nama Pemesan</span>
                    <span className="font-medium text-gray-900">{reservation.userName}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Details & Upload */}
            <div className="space-y-6">
              {/* Payment Summary Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Ringkasan Pembayaran</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Pesanan</span>
                    <span className="font-medium text-gray-900">{formatCurrency(reservation.totalPrice)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">DP 50%</span>
                    <span className="font-bold text-orange-600">{formatCurrency(downPayment)}</span>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900">Yang harus dibayar</span>
                      <span className="text-green-600">{formatCurrency(downPayment)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Proof Card */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Bukti Pembayaran</h2>
                
                <div className="space-y-4">
                  {/* Preview Image */}
                  {previewUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview Bukti Bayar:</p>
                      <div className="border border-gray-300 rounded-lg p-4 text-center">
                        <img 
                          src={previewUrl} 
                          alt="Preview bukti pembayaran" 
                          className="mx-auto max-w-full h-48 object-contain rounded"
                        />
                        <button
                          onClick={() => {
                            setImage(null);
                            setPreviewUrl('');
                          }}
                          className="mt-2 text-sm text-red-600 hover:text-red-700"
                        >
                          Hapus Gambar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* File Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pilih File Bukti Pembayaran
                    </label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                          </svg>
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Klik untuk upload</span> atau drag & drop
                          </p>
                          <p className="text-xs text-gray-500">JPG, PNG (MAX. 5MB)</p>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Upload Button */}
                  <button
                    onClick={handleUpload}
                    disabled={uploading || !image}
                    className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Mengupload...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                        Upload Bukti Pembayaran
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Information Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Informasi Penting
                </h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Pastikan jumlah pembayaran sesuai dengan DP 50%</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Upload bukti pembayaran yang jelas dan terbaca</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Reservasi akan aktif setelah pembayaran diverifikasi oleh admin</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Untuk pertanyaan, hubungi restoran langsung</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Sisa pembayaran dapat dilakukan di restoran</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}