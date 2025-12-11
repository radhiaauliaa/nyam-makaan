import Link from 'next/link';
import StarRating from '../Review/StarRating';
import FavoriteButton from '../Favorite/FavoriteButton';

export default function RestaurantCard({ restaurant, useStarComponent = true }) {
  // Format rating untuk display
  const displayRating = restaurant.rating ? restaurant.rating.toFixed(1) : '0.0';
  const reviewCount = restaurant.reviewCount || 0;
  const ratingStars = Math.round(restaurant.rating || 0);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      
      {/* IMAGE + FAVORITE */}
      <div className="relative">
        <img 
          src={restaurant.image || restaurant.imageUrl || '/images/restaurant-placeholder.jpg'} 
          alt={restaurant.name}
          className="w-full h-48 object-cover"
        />

        {/* Badge Jarak */}
        {restaurant.distanceText && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded text-sm font-semibold">
            {restaurant.distanceText}
          </div>
        )}

        {/* Favorite Button */}
        <div className="absolute bottom-3 right-3">
          <FavoriteButton 
            restaurantId={restaurant.id} 
            size="sm" 
            restaurantData={restaurant}
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6">

        {/* Nama Restoran */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900">{restaurant.name}</h3>
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-medium">
            {restaurant.category || restaurant.type || 'Restoran'}
          </span>
        </div>

        {/* RATING - SIMPLE DISPLAY */}
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            {/* Bintang Rating */}
            <div className="flex mr-2">
              {[...Array(5)].map((_, index) => (
                <span
                  key={index}
                  className={`text-lg ${
                    index < ratingStars ? 'text-yellow-500' : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            
            {/* Nilai Rating dan Jumlah Ulasan */}
            <div className="flex flex-col">
              <span className="text-gray-500 text-sm">
                {reviewCount} ulasan
              </span>
            </div>
          </div>
        </div>

        {/* Alamat */}
        <div className="flex items-start mb-2">
          <svg className="w-4 h-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <p className="text-gray-600 text-sm">
            {restaurant.address || 'Alamat tidak tersedia'}
          </p>
        </div>

        {/* Tombol Detail */}
        <div className="flex justify-between items-center mt-4">
          {restaurant.priceRange && (
            <span className="text-gray-700 font-medium text-sm">
              {restaurant.priceRange}
            </span>
          )}
          
          <Link 
            href={`/restaurant/${restaurant.id}`}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium text-sm transition-colors"
          >
            Lihat Resto
          </Link>
        </div>
      </div>
    </div>
  );
}