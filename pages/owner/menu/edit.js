// pages/owner/menu/edit.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import ImageUpload from '../../../components/UI/ImageUpload';
import { collection, doc, getDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase'; 

export default function EditMenu() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const { id: menuId, restaurantId } = router.query;
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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

  // Fungsi untuk mendapatkan data menu yang akan diedit
  const getMenuData = async () => {
    if (!menuId || !restaurantId) return;
    
    try {
      console.log('🔍 Mengambil data menu:', { menuId, restaurantId });
      
      const menuRef = doc(db, 'restaurants', restaurantId, 'menus', menuId);
      const menuSnap = await getDoc(menuRef);
      
      if (menuSnap.exists()) {
        const menuData = menuSnap.data();
        console.log('✅ Data menu ditemukan:', menuData);
        
        setFormData({
          name: menuData.name || '',
          category: menuData.category || 'Makanan',
          price: menuData.price?.toString() || '',
          description: menuData.description || '',
          available: menuData.available !== undefined ? menuData.available : true,
          image: menuData.image || ''
        });
      } else {
        console.log('❌ Menu tidak ditemukan');
        alert('Menu tidak ditemukan');
        router.push('/owner/menu');
      }
    } catch (error) {
      console.error('Error fetching menu data:', error);
      alert('Gagal memuat data menu: ' + error.message);
    } finally {
      setInitialLoading(false);
    }
  };

  // Fungsi untuk mendapatkan data restoran
  const getRestaurantData = async () => {
    if (!restaurantId) return;
    
    try {
      const restaurantRef = doc(db, 'restaurants', restaurantId);
      const restaurantSnap = await getDoc(restaurantRef);
      
      if (restaurantSnap.exists()) {
        setRestaurantData(restaurantSnap.data());
      }
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
    }
  };

  // Validasi kepemilikan restoran
  const validateRestaurantOwnership = async () => {
    if (!currentUser || !restaurantId) return false;
    
    try {
      const restaurantsRef = collection(db, 'restaurants');
      const q = query(restaurantsRef, where('ownerId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const userRestaurants = querySnapshot.docs.map(doc => doc.id);
      return userRestaurants.includes(restaurantId);
    } catch (error) {
      console.error('Error validating ownership:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (currentUser && userData?.role === 'owner' && menuId && restaurantId) {
        const isOwner = await validateRestaurantOwnership();
        if (!isOwner) {
          alert('Anda tidak memiliki akses untuk mengedit menu ini');
          router.push('/owner/menu');
          return;
        }
        
        await getRestaurantData();
        await getMenuData();
      }
    };

    loadData();
  }, [currentUser, userData, menuId, restaurantId, router]);

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
    
    if (!menuId || !restaurantId) {
      alert('Data menu tidak valid');
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
      // Data menu yang akan diupdate
      const menuData = {
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price),
        description: formData.description.trim(),
        available: formData.available,
        image: formData.image,
        updatedAt: new Date()
      };

      console.log('📦 Updating menu data:', menuData);

      // Update menu di Firestore
      const menuRef = doc(db, 'restaurants', restaurantId, 'menus', menuId);
      await updateDoc(menuRef, menuData);
      
      console.log('✅ Menu berhasil diupdate');
      alert('Menu berhasil diperbarui!');
      
      // Redirect ke halaman menu
      router.push('/owner/menu');
      
    } catch (error) {
      console.error('❌ Error updating menu:', error);
      alert('Gagal memperbarui menu: ' + error.message);
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

  if (initialLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data menu...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Menu</h1>
            <p className="text-gray-600 mb-8">
              Edit menu di restoran <strong>{restaurantData?.name}</strong>
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
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Perubahan'
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