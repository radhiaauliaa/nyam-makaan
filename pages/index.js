import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';

export default function Home() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Fungsi untuk handle klik kategori - Navigasi ke halaman terpisah
  const handleCategoryClick = (category) => {
    router.push(`/${category}`);
  };

  // Fungsi untuk handle klik kategori makanan
  const handleFoodCategoryClick = (categoryId) => {
    router.push(`/kategori/${categoryId}`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
        {/* Hero Section dengan Gambar */}
        <section className="relative bg-gradient-to-r from-orange-500 to-orange-600 text-white py-20">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")'
            }}
          ></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Nyam!<br />
                <span className="text-orange-200">Makan</span>
              </h1>
              <p className="text-xl md:text-2xl mb-4 text-orange-100">
                Lagi lapar? Temukan makanan enak di sekitar Mu!
              </p>
              <p className="text-lg text-orange-100 max-w-2xl mx-auto">
                Dari tempat hits, promo spesial, sampai makanan terdekat khusus untukmu.
              </p>
            </div>
          </div>
        </section>

        {/* Card Kategori Section */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Card 1: Restoran Enak Sekitar Mu */}
              <div 
                onClick={() => handleCategoryClick('terdekat')}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group"
              >
                <div className="relative h-48">
                  <img 
                    src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                    alt="Restoran Sekitar"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-300"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Restoran Enak<br />
                    <span className="text-orange-600">Sekitar Mu</span>
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Temukan restoran enak<br />
                    di sekitar mu
                  </p>
                </div>
              </div>

              {/* Card 2: Top 10 Resto Populer */}
              <div 
                onClick={() => handleCategoryClick('popular')}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group"
              >
                <div className="relative h-48">
                  <img 
                    src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80" 
                    alt="Restoran Populer"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-300"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Top 10 Resto<br />
                    <span className="text-orange-600">Populer Nih</span>
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Beberapa resto yang<br />
                    paling popular minggu ini
                  </p>
                </div>
              </div>

              {/* Card 3: Promo */}
              <div 
                onClick={() => handleCategoryClick('promo')}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group"
              >
                <div className="relative h-48">
                  <img 
                    src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                    alt="Promo Restoran"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition-all duration-300"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Eh, ada promo<br />
                    <span className="text-orange-600">cihuy</span>
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Resto yang lagi baik hati<br />
                    nih, yuk mampiri
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* Additional Food Images Section */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Jelajahi Berbagai Pilihan Makanan
              </h2>
              <p className="text-gray-600 text-lg">
                Dari makanan tradisional sampai internasional, semua ada di sini
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('indonesian')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=387&q=80" 
                  alt="Indonesian Food"
                  className="w-full h-32 md:h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Indonesian</p>
                </div>
              </div>

              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('western')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=387&q=80" 
                  alt="Western Food"
                  className="w-full h-32 md:h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Western</p>
                </div>
              </div>

              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('japanese')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1563379926898-05f4575a45d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=465&q=80" 
                  alt="Japanese Food"
                  className="w-full h-32 md:h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Japanese</p>
                </div>
              </div>

              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('chinese')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=781&q=80" 
                  alt="Chinese Food"
                  className="w-full h-32 md:h-48 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Chinese</p>
                </div>
              </div>
            </div>

            {/* Row 2 untuk kategori lainnya */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('korean')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1563245372-f21724e3856d?ixlib=rb-4.0.3&auto=format&fit=crop&w=435&q=80" 
                  alt="Korean Food"
                  className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Korean</p>
                </div>
              </div>

              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('fast_food')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=415&q=80" 
                  alt="Fast Food"
                  className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Fast Food</p>
                </div>
              </div>

              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('fine_dining')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" 
                  alt="Fine Dining"
                  className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Fine Dining</p>
                </div>
              </div>

              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('cafe')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?ixlib=rb-4.0.3&auto=format&fit=crop&w=387&q=80" 
                  alt="Cafe"
                  className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Cafe</p>
                </div>
              </div>

              <div 
                className="relative group cursor-pointer"
                onClick={() => handleFoodCategoryClick('street_food')}
              >
                <img 
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=1169&q=80" 
                  alt="Street Food"
                  className="w-full h-32 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  <p className="text-sm font-semibold">Street Food</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-orange-600 text-white">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-4">
              Siap Mencoba Restoran Baru?
            </h2>
            <p className="text-xl mb-8">
              Jelajahi restoran terbaik di sekitar Anda dan buat reservasi dengan mudah
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={() => router.push('/kategori/all')}
                className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Jelajahi Semua Restoran
              </button>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}