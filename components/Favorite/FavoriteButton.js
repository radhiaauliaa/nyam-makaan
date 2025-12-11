import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { isRestaurantFavorite, toggleFavorite } from '../../lib/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function FavoriteButton({ 
  restaurantId, 
  restaurantData = null,
  size = 'md', 
  showText = false,
  className = ''
}) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [localRestaurantData, setLocalRestaurantData] = useState(restaurantData);

  // Check if restaurant is already favorite
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!currentUser || !restaurantId) {
        setChecking(false);
        return;
      }

      try {
        console.log('🔍 [FavoriteButton] Checking favorite status:', {
          userId: currentUser.uid,
          restaurantId,
          hasRestaurantData: !!restaurantData
        });

        // Get restaurant data if not provided
        if (!localRestaurantData) {
          try {
            console.log('📦 [FavoriteButton] Fetching restaurant data...');
            const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
            if (restaurantDoc.exists()) {
              const data = restaurantDoc.data();
              setLocalRestaurantData({
                name: data.name || 'Restoran',
                image: data.image || null,
                category: data.category || 'Restoran',
                description: data.description || '',
                rating: data.rating || 0,
                address: data.address || '',
                priceRange: data.priceRange || '',
                cuisine: data.cuisine || ''
              });
              console.log('✅ [FavoriteButton] Restaurant data fetched:', data.name);
            }
          } catch (fetchError) {
            console.error('❌ [FavoriteButton] Error fetching restaurant:', fetchError);
          }
        }

        const result = await isRestaurantFavorite(currentUser.uid, restaurantId);
        
        if (result.success) {
          console.log('✅ [FavoriteButton] Favorite status:', {
            isFavorite: result.isFavorite,
            userId: currentUser.uid
          });
          setIsFavorite(result.isFavorite);
        } else {
          console.error('❌ [FavoriteButton] Failed to check favorite:', result.error);
          setIsFavorite(false);
        }
      } catch (error) {
        console.error('❌ [FavoriteButton] Error checking favorite:', error);
        setIsFavorite(false);
      } finally {
        setChecking(false);
      }
    };

    checkFavoriteStatus();
  }, [currentUser, restaurantId, restaurantData]);

  const handleFavoriteClick = async () => {
    // Jika belum login, arahkan ke login
    if (!currentUser) {
      alert('Silakan login terlebih dahulu untuk menambahkan favorit!');
      router.push('/auth/login');
      return;
    }

    // Jika masih loading, jangan lakukan apa-apa
    if (loading || checking) return;

    setLoading(true);
    
    try {
      console.log('🔄 [FavoriteButton] Toggling favorite:', {
        userId: currentUser.uid,
        restaurantId,
        hasRestaurantData: !!localRestaurantData
      });

      // Prepare restaurant data for saving
      let dataToSave = localRestaurantData;
      
      // If still no data, try to fetch it now
      if (!dataToSave) {
        try {
          console.log('📦 [FavoriteButton] Fetching restaurant data before toggle...');
          const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
          if (restaurantDoc.exists()) {
            const data = restaurantDoc.data();
            dataToSave = {
              name: data.name || 'Restoran',
              image: data.image || null,
              category: data.category || 'Restoran',
              description: data.description || '',
              rating: data.rating || 0,
              address: data.address || '',
              priceRange: data.priceRange || '',
              cuisine: data.cuisine || ''
            };
            console.log('✅ [FavoriteButton] Restaurant data fetched for toggle:', data.name);
          }
        } catch (fetchError) {
          console.error('❌ [FavoriteButton] Error fetching restaurant data:', fetchError);
          // Use minimal data
          dataToSave = {
            name: 'Restoran',
            restaurantId: restaurantId
          };
        }
      }

      const result = await toggleFavorite(
        currentUser.uid, 
        restaurantId, 
        dataToSave
      );
      
      if (result.success) {
        console.log('✅ [FavoriteButton] Toggle success:', {
          action: result.action,
          isFavorite: result.isFavorite,
          userId: currentUser.uid
        });
        
        setIsFavorite(result.isFavorite);
        
        // Show success message
        if (result.isFavorite) {
          alert('✅ Restoran berhasil ditambahkan ke favorit!');
        } else {
          alert('🗑️ Restoran dihapus dari favorit.');
        }
      } else {
        console.error('❌ [FavoriteButton] Toggle failed:', result.error);
        alert('Gagal memperbarui favorit. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('❌ [FavoriteButton] Error toggling favorite:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    md: {
      button: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-base'
    },
    lg: {
      button: 'w-12 h-12',
      icon: 'w-6 h-6',
      text: 'text-lg'
    }
  };

  // Jika sedang checking status, tampilkan loading
  if (checking) {
    return (
      <button
        className={`
          ${sizeClasses[size].button} 
          rounded-full bg-gray-100 flex items-center justify-center
          ${className}
        `}
        disabled
        title="Memuat status favorit..."
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
      </button>
    );
  }

  return (
    <div className="flex items-center">
      <button
        onClick={handleFavoriteClick}
        disabled={loading}
        className={`
          ${sizeClasses[size].button} 
          rounded-full 
          flex items-center justify-center
          transition-all duration-200
          hover:scale-105 active:scale-95
          ${isFavorite 
            ? 'bg-red-100 text-red-600 hover:bg-red-200 border border-red-200' 
            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
          }
          ${loading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
          shadow-md hover:shadow-lg
          ${className}
        `}
        title={isFavorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}
      >
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : (
          <svg 
            className={sizeClasses[size].icon}
            fill={isFavorite ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={isFavorite ? 0 : 2}
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        )}
      </button>
      
      {showText && (
        <span 
          className={`
            ml-2 font-medium ${sizeClasses[size].text}
            ${isFavorite ? 'text-red-600' : 'text-gray-700'}
          `}
        >
          {isFavorite ? 'Favorit' : 'Tambahkan ke Favorit'}
        </span>
      )}
      
      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="ml-2 text-xs text-gray-500">
          <div>ID: {restaurantId?.substring(0, 8)}...</div>
          <div>Status: {isFavorite ? '❤️' : '🤍'}</div>
        </div>
      )}
    </div>
  );
}