// components/Review/ReviewForm.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { addReview } from '../../lib/firestore';
import StarRating from './StarRating';

export default function ReviewForm({ restaurantId, restaurantName, onReviewAdded }) {
  const { currentUser, userData } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [safeRestaurantName, setSafeRestaurantName] = useState('');

  // EFFECT UNTUK MEMASTIKAN restaurantName TIDAK UNDEFINED
  useEffect(() => {
    console.log('ReviewForm props:', { restaurantId, restaurantName });
    
    if (restaurantName && restaurantName !== 'undefined') {
      setSafeRestaurantName(restaurantName);
    } else {
      setSafeRestaurantName('Restoran');
      console.warn('Restaurant name is undefined, using fallback');
    }
  }, [restaurantId, restaurantName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      alert('Silakan login untuk memberikan review');
      return;
    }

    if (rating === 0) {
      alert('Berikan rating terlebih dahulu');
      return;
    }

    // VALIDASI LEBIH SAFE
    if (!restaurantId) {
      alert('Error: ID restoran tidak ditemukan');
      return;
    }

    setSubmitting(true);
    
    try {
      // DATA YANG DIKIRIM - DENGAN FALLBACK VALUES
      const reviewData = {
        restaurantId: restaurantId,
        restaurantName: safeRestaurantName, // GUNAKAN STATE YANG SUDAH DIPASTIKAN
        rating: rating,
        comment: comment.trim(),
        userId: currentUser.uid,
        userName: userData?.displayName || currentUser.email || 'User',
        userEmail: currentUser.email || '',
        createdAt: new Date(),
        hasOwnerReply: false,
        ownerReply: '',
        ownerId: '',
        ownerName: '',
        repliedAt: null
      };

      console.log('Mengirim review data:', reviewData);

      const result = await addReview(reviewData);

      if (result.success) {
        alert('Review berhasil ditambahkan!');
        setRating(0);
        setComment('');
        setShowForm(false);
        if (onReviewAdded) {
          onReviewAdded();
        }
      } else {
        alert('Gagal menambah review: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding review:', error);
      alert('Terjadi error saat menambah review: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium"
      >
        Tulis Review
      </button>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold mb-4">
        Tulis Review untuk {safeRestaurantName}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rating *
          </label>
          <StarRating 
            rating={rating} 
            onRatingChange={setRating}
            editable={true}
          />
          {rating === 0 && (
            <p className="text-red-500 text-sm mt-1">Pilih rating terlebih dahulu</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Komentar *
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
            placeholder="Bagaimana pengalaman Anda di restoran ini?"
            required
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
          >
            {submitting ? 'Mengirim...' : 'Kirim Review'}
          </button>
          
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 font-medium"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}