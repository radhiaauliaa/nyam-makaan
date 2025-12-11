import { useState, useEffect } from 'react';
import Layout from '../../components/Layout/Layout';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Link from 'next/link';

export default function UserHome() {
  const [popularRestaurants, setPopularRestaurants] = useState([]);
  const [promoRestaurants, setPromoRestaurants] = useState([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch nearby restaurants (dummy data for now)
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

  const RestaurantCard = ({ restaurant, showPromo = false }) => (
    <Link href={`/restaurants/${restaurant.id}`} className="block">
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
    </Link>
  );

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat restoran...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-orange-500 to-orange-600 text-white py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Nyam!<br />
                <span className="text-orange-200">Makan</span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-orange-100">
                Lagi lapar? Temukan makanan enak di sekitar Mu!
              </p>
              <p className="text-lg mb-8 text-orange-100 max-w-2xl mx-auto">
                Dari tempat hits, promo spesial, sampai makanan terenak khusus untukmu.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-orange-600 px-8 py-3 rounded-full font-bold hover:bg-orange-50 transition-colors">
                  Cari Restoran Sekarang
                </button>
                <button className="border-2 border-white text-white px-8 py-3 rounded-full font-bold hover:bg-white hover:text-orange-600 transition-colors">
                  Lihat Promo
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <section className="sticky top-0 bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center space-x-8 md:space-x-12">
              {['Home', 'Popular', 'Promo', 'Terdekat'].map((tab) => (
                <button
                  key={tab}
                  className="py-4 px-2 font-semibold text-gray-700 hover:text-orange-600 border-b-2 border-transparent hover:border-orange-600 transition-colors"
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Restoran Enak Sekitar Mu */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Restoran Enak</h2>
                <p className="text-gray-600 mt-2">Sekitar Mu!</p>
              </div>
              <Link href="/restaurants?filter=nearby" className="text-orange-600 font-semibold hover:text-orange-700">
                Lihat Semua →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyRestaurants.slice(0, 6).map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          </div>
        </section>

        {/* Top 10 Resto Populer */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Top 10 Resto</h2>
                <p className="text-gray-600 mt-2">Populer Nih!</p>
              </div>
              <Link href="/restaurants?filter=popular" className="text-orange-600 font-semibold hover:text-orange-700">
                Lihat Semua →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {popularRestaurants.slice(0, 10).map((restaurant, index) => (
                <div key={restaurant.id} className="relative">
                  <div className="absolute -top-2 -left-2 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold z-10">
                    {index + 1}
                  </div>
                  <RestaurantCard restaurant={restaurant} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Promo Section */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-orange-100 rounded-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="md:w-1/2 mb-6 md:mb-0">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    Eh, ada promo cihuy!
                  </h2>
                  <p className="text-lg text-gray-700 mb-6">
                    Resto yang lagi baik hati nih, yuk mampiri
                  </p>
                  <button className="bg-orange-600 text-white px-6 py-3 rounded-full font-bold hover:bg-orange-700 transition-colors">
                    Lihat Semua Promo
                  </button>
                </div>
                <div className="md:w-1/2 grid grid-cols-2 gap-4">
                  {promoRestaurants.slice(0, 4).map((restaurant) => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} showPromo={true} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Info */}
        <section className="py-12 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Mau makan apa hari ini?</h3>
            <p className="text-gray-300 mb-6">
              Temukan berbagai pilihan makanan dari restoran terbaik di sekitarmu
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Nasi Goreng', 'Ayam Geprek', 'Mie Ayam', 'Sate', 'Bakso', 'Sushi', 'Pizza', 'Burger'].map((food) => (
                <span key={food} className="bg-gray-800 px-4 py-2 rounded-full text-sm hover:bg-orange-600 transition-colors cursor-pointer">
                  {food}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}