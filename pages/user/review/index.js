import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Layout from '../../../components/Layout/Layout';
import StarRating from '../../../components/Review/StarRating';
import { getUserReviews } from '../../../lib/firestore';

export default function UserReviews() {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserReviews = async () => {
      if (!currentUser) {
        console.log('🔍 [UserReviews] User not logged in');
        return;
      }

      try {
        setLoading(true);
        setError('');

        console.log('🔍 [UserReviews] Fetching reviews for user:', currentUser.uid);

        const result = await getUserReviews(currentUser.uid);
        console.log('🔍 [UserReviews] Result from getUserReviews:', result);
        
        if (result.success) {
          console.log('✅ [UserReviews] Reviews loaded successfully:', result.data);
          setReviews(result.data);
        } else {
          console.error('❌ [UserReviews] Error loading reviews:', result.error);
          setError('Gagal memuat data ulasan: ' + result.error);
        }

      } catch (error) {
        console.error('❌ [UserReviews] Unexpected error:', error);
        setError('Gagal memuat data ulasan');
      } finally {
        setLoading(false);
      }
    };

    fetchUserReviews();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Silakan login untuk melihat ulasan Anda</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat ulasan...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Ulasan Saya</h1>
            <p className="text-gray-600 mt-2">
              {reviews.length > 0 
                ? `Anda memiliki ${reviews.length} ulasan`
                : 'Kelola ulasan yang telah Anda berikan'
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="text-gray-400 text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Ada Ulasan</h3>
              <p className="text-gray-600 mb-6">Mulai berikan ulasan untuk restoran yang Anda kunjungi!</p>
              <a href="/" className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 font-medium">
                Cari Restoran
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {review.restaurantName || 'Restoran tidak ditemukan'}
                      </h3>
                      <p className="text-gray-600">
                        {review.createdAt ? new Date(review.createdAt.toDate()).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Tanggal tidak tersedia'}
                      </p>
                    </div>
                    <StarRating rating={review.rating} size="md" />
                  </div>
                  
                  <p className="text-gray-700 mb-4">{review.comment || 'Tidak ada komentar'}</p>

                  {/* TAMPILKAN BALASAN PEMILIK (UPDATE) */}
                  {review.ownerReply && (
                    <div className="mt-4 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                      <div className="flex items-center mb-2">
                        <span className="font-semibold text-gray-900 text-sm">Balasan dari Pemilik:</span>
                        <span className="text-gray-600 text-xs ml-2">
                          {review.repliedAt ? new Date(review.repliedAt.toDate()).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'numeric',
                            year: 'numeric'
                          }) : ''}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{review.ownerReply}</p>
                      {review.ownerName && (
                        <p className="text-gray-600 text-xs mt-1">Oleh: {review.ownerName}</p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    <a 
                      href={`/restaurants/${review.restaurantId}`}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Lihat Restoran
                    </a>
                    
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-700 font-medium">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-700 font-medium">
                        Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
