// components/Review/ReviewStats.js
import StarRating from './StarRating';

export default function ReviewStats({ reviews }) {
  // FIX: Handle undefined reviews
  const safeReviews = reviews || [];
  console.log('🔍 [ReviewStats] Received reviews:', safeReviews);

  // Hitung statistik rating
  const totalReviews = safeReviews.length;
  const averageRating = totalReviews > 0 
    ? safeReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews 
    : 0;

  // Hitung distribusi rating dengan safety check
  const ratingDistribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
  safeReviews.forEach(review => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingDistribution[review.rating]++;
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Rating & Ulasan</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overall Rating */}
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 mb-2">
            {averageRating.toFixed(1)}
          </div>
          <StarRating rating={Math.round(averageRating)} size="lg" />
          <p className="text-gray-600 mt-2">{totalReviews} ulasan</p>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingDistribution[stars];
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            
            return (
              <div key={stars} className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 w-12">{stars} bintang</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}