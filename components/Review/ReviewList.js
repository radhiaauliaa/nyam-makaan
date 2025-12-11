// components/Review/ReviewList.js
import StarRating from './StarRating';

export default function ReviewList({ reviews }) {
  // FIX: Handle undefined reviews
  const safeReviews = reviews || [];
  
  console.log('🔍 [ReviewList] Received reviews:', safeReviews);

  if (safeReviews.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-6xl mb-4">💬</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Ada Ulasan</h3>
        <p className="text-gray-500">Jadilah yang pertama memberikan ulasan untuk restoran ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {safeReviews.map((review) => (
        <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">{review.userName || 'User'}</h4>
              <p className="text-gray-500 text-sm">{review.userEmail || ''}</p>
            </div>
            <div className="text-right">
              <StarRating rating={review.rating || 0} size="sm" />
              <p className="text-gray-500 text-sm mt-1">
                {review.createdAt?.toDate ? 
                  new Date(review.createdAt.toDate()).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 
                  'Tanggal tidak tersedia'
                }
              </p>
            </div>
          </div>
          
          <p className="text-gray-700 mb-4">{review.comment || 'Tidak ada komentar'}</p>

          {/* BALASAN PEMILIK */}
          {review.ownerReply && (
            <div className="mt-4 p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
              <div className="flex items-center mb-2">
                <span className="font-semibold text-gray-900 text-sm">Balasan dari Pemilik:</span>
                <span className="text-gray-600 text-xs ml-2">
                  {review.repliedAt?.toDate ? 
                    new Date(review.repliedAt.toDate()).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric'
                    }) : 
                    'Tanggal tidak tersedia'
                  }
                </span>
              </div>
              <p className="text-gray-700 text-sm">{review.ownerReply}</p>
              {review.ownerName && (
                <p className="text-gray-600 text-xs mt-1">Oleh: {review.ownerName}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}