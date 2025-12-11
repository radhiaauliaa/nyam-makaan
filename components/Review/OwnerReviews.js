// components/Review/OwnerReviews.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import { getOwnerReviews, updateReviewReply } from '../../lib/firestore';

export default function OwnerReviews() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (currentUser && userData?.role === 'owner') {
      console.log('🔍 [OwnerReviews] Owner detected, loading reviews...');
      loadReviews();
    } else {
      console.log('🔍 [OwnerReviews] User is not owner or not logged in');
    }
  }, [currentUser, userData]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      console.log('🔍 [OwnerReviews] Loading reviews for owner:', currentUser.uid);
      
      const result = await getOwnerReviews(currentUser.uid);
      console.log('🔍 [OwnerReviews] Result from getOwnerReviews:', result);
      
      if (result.success) {
        console.log('✅ [OwnerReviews] Reviews loaded successfully:', result.data);
        setReviews(result.data);
      } else {
        console.error('❌ [OwnerReviews] Error loading reviews:', result.error);
        alert('Gagal memuat ulasan: ' + result.error);
      }
    } catch (error) {
      console.error('❌ [OwnerReviews] Unexpected error:', error);
      alert('Terjadi kesalahan saat memuat ulasan');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (reviewId) => {
    setReplying(reviewId);
    setReplyText('');
  };

  const cancelReply = () => {
    setReplying(null);
    setReplyText('');
  };

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) {
      alert('Balasan tidak boleh kosong');
      return;
    }

    try {
      console.log('🔍 [OwnerReviews] Submitting reply for review:', reviewId);
      
      const result = await updateReviewReply(reviewId, {
        reply: replyText,
        ownerId: currentUser.uid,
        ownerName: userData?.displayName || 'Pemilik Restoran'
      });
      
      if (result.success) {
        alert('✅ Balasan berhasil dikirim!');
        setReplying(null);
        setReplyText('');
        loadReviews(); // Reload reviews
      } else {
        alert('❌ Gagal mengirim balasan: ' + result.error);
      }
    } catch (error) {
      console.error('❌ [OwnerReviews] Error submitting reply:', error);
      alert('Gagal mengirim balasan: ' + error.message);
    }
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${
          i < rating ? 'text-yellow-400' : 'text-gray-300'
        }`}
      >
        ★
      </span>
    ));
  };

  // Hitung statistik
  const stats = {
    totalReviews: reviews.length,
    averageRating: reviews.length > 0 
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : '0.0',
    pendingReplies: reviews.filter(review => !review.ownerReply).length,
    repliedReviews: reviews.filter(review => review.ownerReply).length
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Kelola Ulasan</h1>
            <p className="text-gray-600 mt-2">Lihat dan balas ulasan dari pelanggan</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Ulasan</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalReviews}</p>
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
                  <p className="text-sm font-medium text-gray-600">Rating Rata-rata</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.averageRating}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Menunggu Balasan</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pendingReplies}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Sudah Dibalas</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.repliedReviews}</p>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat ulasan...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada ulasan</h3>
              <p className="mt-1 text-sm text-gray-500">Belum ada ulasan untuk restoran Anda.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-500 text-sm font-medium">
                          {review.userName?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{review.userName || 'User'}</h4>
                        <div className="flex items-center mt-1">
                          {getRatingStars(review.rating)}
                          <span className="ml-2 text-sm text-gray-600">{review.rating}.0</span>
                          <span className="ml-3 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                            {review.restaurantName || 'Restoran'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {review.createdAt?.toDate ? 
                        new Date(review.createdAt.toDate()).toLocaleDateString('id-ID') : 
                        'Tanggal tidak tersedia'
                      }
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-gray-700">{review.comment}</p>
                  </div>

                  {review.ownerReply ? (
                    <div className="mt-4 bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-orange-900">Balasan dari Pemilik:</span>
                        <span className="text-sm text-orange-700">
                          {review.repliedAt?.toDate ? 
                            new Date(review.repliedAt.toDate()).toLocaleDateString('id-ID') : 
                            'Tanggal tidak tersedia'
                          }
                        </span>
                      </div>
                      <p className="text-orange-800">{review.ownerReply}</p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      {replying === review.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Tulis balasan Anda..."
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={() => submitReply(review.id)}
                              className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 font-medium"
                            >
                              Kirim Balasan
                            </button>
                            <button
                              onClick={cancelReply}
                              className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400 font-medium"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReply(review.id)}
                          className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 font-medium"
                        >
                          Balas Ulasan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}