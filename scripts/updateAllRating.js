// scripts/updateAllRatings.js
import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const updateAllRestaurantRatings = async () => {
  try {
    // Ambil semua restoran
    const restaurantsRef = collection(db, 'restaurants');
    const restaurantsSnapshot = await getDocs(restaurantsRef);
    
    console.log(`Found ${restaurantsSnapshot.size} restaurants`);
    
    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantId = restaurantDoc.id;
      
      // Hitung ulang rating dari reviews
      const reviewsRef = collection(db, 'reviews');
      const reviewsQuery = query(reviewsRef, where('restaurantId', '==', restaurantId));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      let totalRating = 0;
      let validReviews = 0;
      
      reviewsSnapshot.forEach(reviewDoc => {
        const review = reviewDoc.data();
        if (review.rating && review.rating > 0) {
          totalRating += review.rating;
          validReviews++;
        }
      });
      
      const newRating = validReviews > 0 ? totalRating / validReviews : 0;
      
      // Update restoran
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        rating: Number(newRating.toFixed(1)),
        reviewCount: validReviews,
        updatedAt: new Date()
      });
      
      console.log(`Updated ${restaurantDoc.data().name}: ${newRating.toFixed(1)} (${validReviews} reviews)`);
    }
    
    console.log('✅ All ratings updated successfully!');
  } catch (error) {
    console.error('Error updating ratings:', error);
  }
};

updateAllRestaurantRatings();