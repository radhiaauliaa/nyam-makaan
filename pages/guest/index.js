// pages/guest/index.js
import { useState, useEffect } from 'react';
import LayoutGuest from '../../components/Layout/LayoutGuest';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRouter } from 'next/router';
import LoginModal from '../../components/LoginModal/LoginModal';

export default function GuestHome() {
  const [popularRestaurants, setPopularRestaurants] = useState([]);
  const [promoRestaurants, setPromoRestaurants] = useState([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        // Fetch popular restaurants (top 10)
        const popularQuery = query(
          collection(db, 'restaurants'),
          orderBy('rating', 'desc'),
          limit(10)
        );
        const popularSnapshot = await getDocs(popularQuery);
        const popularData = popularSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPopularRestaurants(popularData);

        // Fetch restaurants with promotions
        const promoQuery = query(
          collection(db, 'restaurants'),
          where('hasPromo', '==', true),
          limit(8)
        );
        const promoSnapshot = await getDocs(promoQuery);
        const promoData = promoSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPromoRestaurants(promoData);

        // Fetch nearby restaurants
        const nearbyQuery = query(
          collection(db, 'restaurants'),
          limit(6)
        );
        const nearbySnapshot = await getDocs(nearbyQuery);
        const nearbyData = nearbySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNearbyRestaurants(nearbyData);

      } catch (error) {
        console.error('Error fetching restaurants:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const handleRestaurantClick = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setShowLoginModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (selectedRestaurant) {
      router.push(`/restaurants/${selectedRestaurant.id}`);
    }
  };

  const RestaurantCard = ({ restaurant, showPromo = false, showRank = false, rank = 0 }) => (
    <div 
      onClick={() => handleRestaurantClick(restaurant)}
      className="block cursor-pointer"
    >
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="relative">
          <img 
            src={restaurant.image || '/images/restaurant-placeholder.jpg'} 
            alt={restaurant.name}
            className="w-full h-48 object-cover"
          />
          {showPromo && restaurant.hasPromo && (
            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
              PROMO
            </div>
          )}
          {showRank && (
            <div className="absolute top-2 left-2 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold z-10">
              {rank}
            </div>
          )}
          <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
            ⭐ {restaurant.rating || '4.5'}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg text-gray-900 mb-1">{restaurant.name}</h3>
          <p className="text-gray-600 text-sm mb-2">{restaurant.category || 'Restoran'}</p>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 text-sm">📍 {restaurant.distance || '1.2 km'}</span>
            {restaurant.deliveryFee && (
              <span className="text-green-600 text-sm">Gratis ongkir</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <LayoutGuest>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat restoran...</p>
          </div>
        </div>
      </LayoutGuest>
    );
  }

  return (
    <LayoutGuest>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">

        {/* Semua konten tetap sama */}
        {/* Hero Section */}
        {/* Tabs */}
        {/* Restaurant Sections */}
        {/* Login Modal */}

        <LoginModal 
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onLoginSuccess={handleLoginSuccess}
          message="Login dulu yuk buat bisa reservasi dan lihat detail restoran!"
        />
      </div>
    </LayoutGuest>
  );
}
