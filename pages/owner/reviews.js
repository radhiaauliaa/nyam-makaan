import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout/Layout';
import { 
  getOwnerReviews, 
  updateReviewReply, 
  updateRestaurantRating,
  reportReview 
} from '../../lib/firestore';

export default function OwnerReviewPage() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    pendingReplies: 0,
    repliedReviews: 0
  });

  useEffect(() => {
    if (currentUser && userData?.role === 'owner') {
      loadReviews();
    }
  }, [currentUser, userData]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const result = await getOwnerReviews(currentUser.uid);
      
      if (result.success) {
        const reviewsData = result.data;
        setReviews(reviewsData);
        
        // Hitung statistik
        calculateStats(reviewsData);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData) => {
    if (reviewsData.length === 0) {
      setStats({
        totalReviews: 0,
        averageRating: 0,
        pendingReplies: 0,
        repliedReviews: 0
      });
      return;
    }
    
    const totalReviews = reviewsData.length;
    const totalRating = reviewsData.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = totalRating / totalReviews;
    const pendingReplies = reviewsData.filter(review => !review.ownerReply).length;
    const repliedReviews = reviewsData.filter(review => review.ownerReply).length;
    
    setStats({
      totalReviews,
      averageRating: averageRating.toFixed(1),
      pendingReplies,
      repliedReviews
    });
  };

  const handleReply = (reviewId) => {
    setReplying(reviewId);
    setReplyText('');
  };

  const cancelReply = () => {
    setReplying(null);
    setReplyText('');
  };

  const handleReport = (reviewId) => {
    setReporting(reviewId);
    setReportReason('');
  };

  const cancelReport = () => {
    setReporting(null);
    setReportReason('');
  };

  const submitReply = async (reviewId, restaurantId) => {
    if (!replyText.trim()) {
      alert('Balasan tidak boleh kosong');
      return;
    }

    try {
      const result = await updateReviewReply(reviewId, {
        reply: replyText,
        ownerId: currentUser.uid,
        ownerName: userData?.displayName || 'Pemilik Restoran',
        repliedAt: new Date()
      });
      
      if (result.success) {
        if (restaurantId) {
          await updateRestaurantRating(restaurantId);
        }
        
        alert('Balasan berhasil dikirim!');
        setReplying(null);
        setReplyText('');
        loadReviews();
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('Gagal mengirim balasan: ' + error.message);
    }
  };

  const submitReport = async (reviewId) => {
    if (!reportReason.trim()) {
      alert('Harap berikan alasan report');
      return;
    }

    try {
      const review = reviews.find(r => r.id === reviewId);
      if (!review) {
        alert('Review tidak ditemukan');
        return;
      }

      const reportData = {
        reviewId,
        restaurantId: review.restaurantId,
        restaurantName: review.restaurantName,
        userId: review.userId,
        userName: review.userName,
        userEmail: review.userEmail,
        rating: review.rating,
        comment: review.comment,
        reportedByOwnerId: currentUser.uid,
        reportedByOwnerName: userData?.name || currentUser.email,
        reason: reportReason,
        reportStatus: 'pending',
        createdAt: new Date()
      };

      const result = await reportReview(reportData);
      
      if (result.success) {
        alert('Report berhasil dikirim! Admin akan meninjau ulasan ini.');
        setReporting(null);
        setReportReason('');
        loadReviews();
      } else {
        alert('Gagal mengirim report: ' + result.error);
      }
    } catch (error) {
      console.error('Error reporting review:', error);
      alert('Gagal mengirim report: ' + error.message);
    }
  };

  // Fungsi untuk membuat bintang rating
  const renderRatingStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => {
          if (index < fullStars) {
            return <span key={index} className="text-yellow-500 text-lg">★</span>;
          } else if (index === fullStars && hasHalfStar) {
            return <span key={index} className="text-yellow-500 text-lg">⯨</span>;
          } else {
            return <span key={index} className="text-gray-300 text-lg">★</span>;
          }
        })}
        <span className="ml-2 text-gray-700 font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  // Tampilkan warna rating berdasarkan nilai
  const getRatingColor = (rating) => {
    if (rating >= 4) return 'text-green-600 bg-green-100';
    if (rating >= 3) return 'text-yellow-600 bg-yellow-100';
    if (rating >= 2) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  // Format tanggal
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Tanggal tidak tersedia';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Tanggal tidak valid';
    }
  };

  // Modal untuk report
  const ReportModal = () => {
    if (!reporting) return null;

    const review = reviews.find(r => r.id === reporting);
    if (!review) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Laporkan Ulasan</h3>
              <button
                onClick={cancelReport}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{review.userName || 'Pelanggan'}</span>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getRatingColor(review.rating)}`}>
                  {review.rating.toFixed(1)} ★
                </span>
              </div>
              <p className="text-gray-600 text-sm line-clamp-3">{review.comment}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Report *
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Pilih Alasan Report</option>
                <option value="spam">Ulasan spam atau promosi</option>
                <option value="inappropriate">Konten tidak pantas atau ofensif</option>
                <option value="fake">Ulasan palsu atau tidak akurat</option>
                <option value="personal_attack">Serangan pribadi atau hate speech</option>
                <option value="conflict_of_interest">Benturan kepentingan (kompetitor)</option>
                <option value="other">Lainnya</option>
              </select>
              
              {reportReason === 'other' && (
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows="3"
                  className="w-full mt-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Jelaskan alasan report..."
                />
              )}
            </div>

            <div className="text-sm text-gray-600 mb-6 p-3 bg-red-50 rounded-lg">
              <p className="font-medium text-red-800 mb-1">Perhatian:</p>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                <li>Report hanya untuk ulasan yang melanggar kebijakan</li>
                <li>Admin akan meninjau report dalam 24-48 jam</li>
                <li>Report palsu dapat mengakibatkan sanksi</li>
                <li>Ulasan yang valid akan dihapus dari sistem</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelReport}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => submitReport(review.id)}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!reportReason.trim()}
              >
                Kirim Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Kelola Ulasan</h1>
                <p className="text-gray-600 mt-2">Lihat, balas, dan laporkan ulasan dari pelanggan</p>
              </div>
              <button
                onClick={() => router.push('/owner/dashboard')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali ke Dashboard
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

          {/* Filter Section */}
          <div className="mb-6 flex flex-wrap gap-4">
            <button
              onClick={() => {
                // Reset filter
                loadReviews();
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
            >
              Semua Ulasan
            </button>
            <button
              onClick={() => {
                const lowRatings = reviews.filter(r => r.rating < 3);
                setReviews(lowRatings);
                calculateStats(lowRatings);
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
            >
              Rating Rendah (≤ 3)
            </button>
            <button
              onClick={() => {
                const unreplied = reviews.filter(r => !r.ownerReply);
                setReviews(unreplied);
                calculateStats(unreplied);
              }}
              className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 font-medium"
            >
              Belum Dibalas
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat ulasan...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Belum ada ulasan</h3>
              <p className="mt-1 text-gray-500">Saat ini belum ada pelanggan yang memberikan ulasan untuk restoran Anda.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white shadow rounded-lg p-6 relative">
                  {/* Badge for low rating */}
                  {review.rating < 3 && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                        ⚠️ Rating Rendah
                      </span>
                    </div>
                  )}

                  {/* Header dengan informasi user dan rating */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 text-lg font-semibold">
                          {review.userName?.charAt(0).toUpperCase() || 'P'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {review.userName || 'Pelanggan'}
                        </h4>
                        <div className="flex items-center mt-1 space-x-2">
                          <div className={`px-2 py-1 rounded-full ${getRatingColor(review.rating)}`}>
                            {renderRatingStars(review.rating || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  {/* Komentar review */}
                  <div className="mb-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                  </div>

                  {/* Info Restoran */}
                  {review.restaurantName && (
                    <div className="mb-4 flex items-center justify-between">
                      <span className="inline-block bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                        📍 {review.restaurantName}
                      </span>
                      
                      {/* Report status */}
                      {review.reportStatus && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          review.reportStatus === 'approved' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {review.reportStatus === 'approved' ? '✅ Report Diterima' : '⏳ Report Diproses'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Reply Section */}
                  {review.ownerReply ? (
                    <div className="mt-4 bg-orange-50 rounded-lg p-4 border border-orange-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-orange-900">
                            ✅ Balasan Anda:
                          </span>
                          <span className="text-sm text-orange-700">
                            {formatDate(review.repliedAt)}
                          </span>
                        </div>
                      </div>
                      <p className="text-orange-800 whitespace-pre-wrap">{review.ownerReply}</p>
                    </div>
                  ) : null}

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-between items-center border-t border-gray-100 pt-4">
                    <div className="space-x-3">
                      {!review.ownerReply && (
                        <button
                          onClick={() => handleReply(review.id)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                        >
                          Balas Ulasan
                        </button>
                      )}
                      
                      {/* Only show report button if not already reported or if report was rejected */}
                      {(!review.reportStatus || review.reportStatus === 'rejected') && (
                        <button
                          onClick={() => handleReport(review.id)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            review.rating < 3
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {review.rating < 3 ? '⚠️ Laporkan Ulasan' : 'Laporkan Ulasan'}
                        </button>
                      )}
                    </div>
                    
                    {/* Show report info if already reported */}
                    {review.reportStatus === 'pending' && (
                      <div className="text-yellow-600 text-sm">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Report sedang diproses admin
                        </span>
                      </div>
                    )}
                    
                    {review.reportStatus === 'approved' && (
                      <div className="text-red-600 text-sm">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          Report diterima, ulasan akan dihapus
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reply Form */}
                  {replying === review.id && (
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                        placeholder="Tulis balasan profesional untuk ulasan ini..."
                      />
                      <div className="flex justify-end space-x-3">
                        <button
                          onClick={cancelReply}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => submitReply(review.id, review.restaurantId)}
                          disabled={!replyText.trim()}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Kirim Balasan
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal />
    </Layout>
  );
}