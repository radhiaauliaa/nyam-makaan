import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import ImageUpload from '../../../components/UI/ImageUpload';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase'; 

export default function AddMenu() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Makanan',
    price: '',
    description: '',
    available: true,
    image: ''
  });

  const categories = [
    'Makanan',
    'Minuman', 
    'Appetizer',
    'Dessert',
    'Snack'
  ];

  // Fungsi untuk mendapatkan restoran yang dimiliki user
  const getUsersRestaurant = async () => {
    if (!currentUser) return null;
    
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(restaurantsRef, where('ownerId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Tidak ada restoran yang dimiliki user ini');
      }
      
      // Ambil restoran pertama
      const restaurantDoc = querySnapshot.docs[0];
      
      return {
        id: restaurantDoc.id,
        data: restaurantDoc.data()
      };
    } catch (error) {
      console.error('Error dalam getUsersRestaurant:', error);
      throw error;
    }
  };

  // Pada saat komponen dimuat, ambil restaurantId
  useEffect(() => {
    const fetchRestaurantData = async () => {
      if (currentUser && userData?.role === 'owner') {
        try {
          const restaurant = await getUsersRestaurant();
          setRestaurantId(restaurant.id);
          setRestaurantData(restaurant.data);
        } catch (error) {
          console.error('Error fetching restaurant:', error);
          alert('Anda belum memiliki restoran. Harap daftarkan restoran terlebih dahulu.');
          router.push('/owner/restaurants/add'); // Pastikan path ini sesuai
        }
      }
    };

    fetchRestaurantData();
  }, [currentUser, userData, router]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageUpload = (imageUrl) => {
    setFormData(prev => ({
      ...prev,
      image: imageUrl
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!restaurantId) {
      alert('Restoran tidak ditemukan');
      return;
    }

    // Validasi form
    if (!formData.name || !formData.category || !formData.price) {
      alert('Harap isi semua field yang wajib diisi (Nama Menu, Kategori, dan Harga)');
      return;
    }

    // Validasi harga
    if (Number(formData.price) <= 0) {
      alert('Harga harus lebih dari 0');
      return;
    }

    setLoading(true);

    try {
      // Data menu yang akan disimpan
      const menuData = {
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price),
        description: formData.description.trim(),
        available: formData.available,
        image: formData.image,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Tambahkan menu ke subcollection menus dari restoran
      const menusRef = collection(db, 'restaurants', restaurantId, 'menus');
      await addDoc(menusRef, menuData);
      
      alert('Menu berhasil ditambahkan!');
      
      // Redirect ke halaman menu
      router.push('/owner/menu');
      
    } catch (error) {
      console.error('Error adding menu:', error);
      alert('Gagal menambahkan menu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || userData?.role !== 'owner') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Akses ditolak. Hanya untuk pemilik resto.</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Kembali ke Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!restaurantId) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data restoran...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tambah Menu Baru</h1>
            <p className="text-gray-600 mb-8">
              Tambahkan menu baru ke restoran <strong>{restaurantData?.name}</strong>
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <ImageUpload
                onImageUpload={handleImageUpload}
                currentImage={formData.image}
                label="Foto Menu"
              />

              {/* Nama Menu */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Menu *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Nama menu"
                />
              </div>

              {/* Kategori */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori *
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Harga */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Harga Normal *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  required
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Contoh: 15000"
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi Menu
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Jelaskan tentang menu ini"
                />
              </div>

              {/* Tersedia */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="available"
                  name="available"
                  checked={formData.available}
                  onChange={handleChange}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="available" className="ml-2 block text-sm text-gray-700">
                  Menu tersedia
                </label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.push('/owner/menu')}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 font-medium flex items-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Menambahkan...
                    </>
                  ) : (
                    'Tambah Menu'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}