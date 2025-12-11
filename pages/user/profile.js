import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/router";
import Layout from "../../components/Layout/Layout";
import { useState, useEffect } from "react";
import { getUserFavorites } from "../../lib/firestore";

export default function Profile() {
  const { currentUser, userData, logout } = useAuth();
  const router = useRouter();
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (currentUser) {
      loadFavoriteCount();
    }
  }, [currentUser]);

  const loadFavoriteCount = async () => {
    if (!currentUser) return;
    
    try {
      setLoadingFavorites(true);
      console.log('🔍 [Profile] Loading favorite count for user:', currentUser.uid);
      
      const result = await getUserFavorites(currentUser.uid);
      console.log('📊 [Profile] Favorite result:', result);
      
      if (result.success) {
        // Tampilkan semua favorites, termasuk yang restaurantData null
        console.log('✅ [Profile] Total favorites found:', result.data.length);
        setFavorites(result.data);
        setFavoriteCount(result.data.length);
      } else {
        console.error('❌ [Profile] Failed to load favorites:', result.error);
        setFavoriteCount(0);
      }
    } catch (error) {
      console.error('❌ [Profile] Error loading favorite count:', error);
      setFavoriteCount(0);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error('Error logging out:', error);
      alert('Gagal logout. Silakan coba lagi.');
    }
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-orange-400 to-orange-500">
          <div className="text-center bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Kamu belum login
            </h2>
            <p className="text-gray-600 mb-6">
              Login dulu supaya bisa akses profile dan reservasi kamu.
            </p>
            <button
              onClick={() => router.push("/auth/login")}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl shadow font-semibold transition-all duration-200"
            >
              Login Sekarang
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-white">

        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-10 px-6 text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30 shadow-lg">
            {userData?.profileImage ? (
              <img 
                src={userData.profileImage} 
                alt={userData.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 14c3.866 0 7-3.134 7-7S15.866 0 12 0 5 3.134 5 7s3.134 7 5 7zm0 2c-4.971 0-9 3.582-9 8v2h18v-2c0-4.418-4.029-8-9-8z"
                />
              </svg>
            )}
          </div>

          <h1 className="text-3xl font-bold">{userData?.displayName || "Pengguna"}</h1>
          <p className="text-white/90">{currentUser?.email}</p>
          <div className="mt-3 flex justify-center gap-4 text-sm">
            <span>👤 {userData?.role || 'user'}</span>
            <span>📅 Bergabung: {userData?.createdAt ? 
              new Date(userData.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 
              'Tidak tersedia'
            }</span>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-xl mx-auto px-6 py-10">
          
          {/* Stats Card */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {loadingFavorites ? (
                  <div className="animate-pulse">...</div>
                ) : (
                  favoriteCount
                )}
              </div>
              <div className="text-gray-600 text-sm">Favorit</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-gray-600 text-sm">Reservasi</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-gray-600 text-sm">Ulasan</div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Informasi Akun</h2>

            <div className="space-y-4">
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">Username</span>
                <span className="font-medium">{userData?.displayName || "-"}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">Email</span>
                <span className="font-medium">{currentUser?.email}</span>
              </div>
              <div className="flex justify-between border-b pb-3">
                <span className="text-gray-500">Telepon</span>
                <span className="font-medium">{userData?.phoneNumber || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <span className="font-medium px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                  {userData?.role || 'Pengguna'}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Buttons */}
          <div className="space-y-4">
            <button
              onClick={() => router.push("/user/favorites")}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-300 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Restoran Favorit</div>
                  <div className="text-sm text-gray-500">
                    {loadingFavorites ? (
                      <span className="animate-pulse">Memuat...</span>
                    ) : (
                      <span>
                        {favoriteCount === 0 
                          ? 'Belum ada restoran favorit' 
                          : `${favoriteCount} restoran tersimpan`
                        }
                        {favoriteCount > 0 && favorites.some(f => !f.restaurantData) && (
                          <span className="text-yellow-600 ml-1">⚠️</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => router.push("/user/reservations")}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-300 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Reservasi Saya</div>
                  <div className="text-sm text-gray-500">Lihat riwayat reservasi</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-300 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Logout</div>
                  <div className="text-sm text-gray-500">Keluar dari akun</div>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}