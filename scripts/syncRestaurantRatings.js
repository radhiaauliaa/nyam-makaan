// scripts/syncAllRatings.js
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const syncAllRestaurantRatings = async () => {
  try {
    console.log('🔄 Starting sync of all restaurant ratings...');
    
    // 1. Ambil semua restoran
    const restaurantsRef = collection(db, 'restaurants');
    const restaurantsSnap = await getDocs(restaurantsRef);
    
    console.log(`Found ${restaurantsSnap.size} restaurants`);
    
    const updates = [];
    
    for (const restaurantDoc of restaurantsSnap.docs) {
      const restaurantId = restaurantDoc.id;
      const restaurantData = restaurantDoc.data();
      
      // 2. Ambil semua review untuk restoran ini
      const reviewsRef = collection(db, 'reviews');
      const reviewsQuery = query(reviewsRef, where('restaurantId', '==', restaurantId));
      const reviewsSnap = await getDocs(reviewsQuery);
      
      let totalRating = 0;
      let reviewCount = reviewsSnap.size;
      
      if (reviewCount > 0) {
        reviewsSnap.forEach(reviewDoc => {
          const review = reviewDoc.data();
          if (review.rating && review.rating > 0) {
            totalRating += review.rating;
          }
        });
        
        const averageRating = totalRating / reviewCount;
        
        updates.push({
          id: restaurantId,
          name: restaurantData.name,
          oldRating: restaurantData.rating || 0,
          newRating: averageRating.toFixed(1),
          oldReviewCount: restaurantData.reviewCount || 0,
          newReviewCount: reviewCount
        });
        
        // 3. Update restoran
        await updateDoc(doc(db, 'restaurants', restaurantId), {
          rating: Number(averageRating.toFixed(1)),
          reviewCount: reviewCount,
          lastRatingUpdate: new Date()
        });
        
        console.log(`✅ ${restaurantData.name}: ${averageRating.toFixed(1)} (${reviewCount} reviews)`);
      } else {
        // Tidak ada review, set ke 0
        await updateDoc(doc(db, 'restaurants', restaurantId), {
          rating: 0,
          reviewCount: 0,
          lastRatingUpdate: new Date()
        });
        console.log(`➖ ${restaurantData.name}: No reviews (set to 0)`);
      }
    }
    
    console.log('✅ All ratings synced successfully!');
    console.log('Summary:', updates);
    
    return updates;
    
  } catch (error) {
    console.error('❌ Error syncing ratings:', error);
    return { error: error.message };
  }
};

// Jalankan script
syncAllRestaurantRatings();