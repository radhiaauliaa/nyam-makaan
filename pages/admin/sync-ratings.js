// pages/admin/sync-ratings.js
import { useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import Layout from '../../components/Layout/Layout';

export default function SyncRatingsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  const syncAllRatings = async () => {
    setLoading(true);
    setResults([]);
    setSummary(null);
    
    try {
      // 1. Ambil semua restoran
      const restaurantsRef = collection(db, 'restaurants');
      const restaurantsSnap = await getDocs(restaurantsRef);
      
      const updates = [];
      let totalUpdated = 0;
      
      for (const restaurantDoc of restaurantsSnap.docs) {
        const restaurantId = restaurantDoc.id;
        const restaurantData = restaurantDoc.data();
        
        // 2. Ambil semua review untuk restoran ini
        const reviewsRef = collection(db, 'reviews');
        const reviewsQuery = query(reviewsRef, where('restaurantId', '==', restaurantId));
        const reviewsSnap = await getDocs(reviewsQuery);
        
        const reviewCount = reviewsSnap.size;
        let totalRating = 0;
        
        reviewsSnap.forEach(reviewDoc => {
          const review = reviewDoc.data();
          if (review.rating && review.rating > 0) {
            totalRating += review.rating;
          }
        });
        
        const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
        
        const update = {
          id: restaurantId,
          name: restaurantData.name,
          oldRating: restaurantData.rating || 0,
          newRating: Number(averageRating.toFixed(1)),
          oldReviewCount: restaurantData.reviewCount || 0,
          newReviewCount: reviewCount,
          updated: false
        };
        
        // 3. Update jika ada perubahan
        if (update.oldRating !== update.newRating || update.oldReviewCount !== update.newReviewCount) {
          await updateDoc(doc(db, 'restaurants', restaurantId), {
            rating: update.newRating,
            reviewCount: update.newReviewCount,
            lastRatingUpdate: new Date()
          });
          
          update.updated = true;
          totalUpdated++;
        }
        
        updates.push(update);
        setResults([...updates]);
      }
      
      setSummary({
        totalRestaurants: restaurantsSnap.size,
        totalUpdated,
        lastSync: new Date().toLocaleString()
      });
      
      alert(`✅ ${totalUpdated} restoran berhasil di-update!`);
      
    } catch (error) {
      console.error('Error syncing ratings:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Sync Restaurant Ratings</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <p className="text-gray-600 mb-4">
              Sync rating dan jumlah ulasan dari collection <code>reviews</code> ke collection <code>restaurants</code>
            </p>
            
            <button
              onClick={syncAllRatings}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Syncing...' : 'Sync All Ratings'}
            </button>
            
            {summary && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800">
                  ✅ <strong>{summary.totalUpdated}</strong> dari {summary.totalRestaurants} restoran di-update
                </p>
                <p className="text-green-600 text-sm">Terakhir sync: {summary.lastSync}</p>
              </div>
            )}
          </div>
          
          {results.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Results</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Restoran</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating Lama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating Baru</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ulasan Lama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ulasan Baru</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((result) => (
                      <tr key={result.id} className={result.updated ? 'bg-green-50' : 'bg-white'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{result.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{result.oldRating}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{result.newRating}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{result.oldReviewCount}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{result.newReviewCount}</td>
                        <td className="px-6 py-4">
                          {result.updated ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Updated
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              No Change
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}