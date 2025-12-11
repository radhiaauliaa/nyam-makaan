import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/router";
import Layout from "../../components/Layout/Layout";
import { useState, useEffect } from "react";
import { getUserFavorites, removeFromFavorites } from "../../lib/firestore";

export default function FavoritesPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      console.log('🔍 [Favorites] User logged in:', currentUser.uid);
      loadFavorites();
    } else {
      console.log('⚠️ [Favorites] No user logged in');
      router.push("/auth/login");
    }
  }, [currentUser]);

  const loadFavorites = async (isRefresh = false) => {
    if (!currentUser) return;
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      console.log('🔍 [Favorites] Loading favorites for user:', currentUser.uid);
      
      const result = await getUserFavorites(currentUser.uid);
      console.log('📊 [Favorites] Raw result:', result);
      
      if (result.success) {
        console.log('✅ [Favorites] Total items loaded:', result.data.length);
        
        // Log detail untuk debugging
        result.data.forEach((fav, index) => {
          console.log(`📋 [Favorites] Item ${index + 1}:`, {
            id: fav.id,
            restaurantId: fav.restaurantId,
            hasRestaurantData: !!fav.restaurantData,
            restaurantName: fav.restaurantData?.name || 'No Name',
            restaurantData: fav.restaurantData
          });
        });
        
        setFavorites(result.data);
      } else {
        console.error('❌ [Favorites] Failed to load:', result.error);
      }
    } catch (error) {
      console.error('❌ [Favorites] Error loading favorites:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRemoveFavorite = async (restaurantId) => {
    if (!currentUser || !restaurantId) {
      console.error('❌ [Favorites] No user or restaurant ID');
      return;
    }

    if (!confirm('Yakin ingin menghapus restoran dari favorit?')) {
      return;
    }

    try {
      setDeletingId(restaurantId);
      console.log('🗑️ [Favorites] Removing favorite:', restaurantId);
      
      const result = await removeFromFavorites(currentUser.uid, restaurantId);
      
      if (result.success) {
        console.log('✅ [Favorites] Successfully removed');
        // Update local state
        setFavorites(prev => prev.filter(fav => fav.restaurantId !== restaurantId));
        
        // Show success message
        alert('Restoran berhasil dihapus dari favorit!');
      } else {
        console.error('❌ [Favorites] Failed to remove:', result.error);
        alert('Gagal menghapus favorit. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('❌ [Favorites] Error removing favorite:', error);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = () => {
    console.log('🔄 [Favorites] Manual refresh triggered');
    loadFavorites(true);
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
              Login dulu untuk melihat restoran favoritmu.
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-8 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-white/90 hover:text-white"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className="flex items-center text-white/90 hover:text-white bg-white/20 px-3 py-1 rounded-lg disabled:opacity-50"
              >
                <svg 
                  className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Memuat...' : 'Refresh'}
              </button>
            </div>
            <h1 className="text-3xl font-bold">Restoran Favorit</h1>
            <div className="flex items-center justify-between mt-2">
              <p className="text-white/90">
                {loading ? "Memuat..." : `${favorites.length} restoran tersimpan`}
              </p>
              <div className="text-xs bg-white/30 px-3 py-1 rounded-full">
                User ID: {currentUser.uid.substring(0, 8)}...
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Debug Info */}
          {favorites.some(fav => !fav.restaurantData) && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="font-semibold text-yellow-800">Beberapa data favorit tidak lengkap</h4>
                  <p className="text-sm text-yellow-700">
                    {favorites.filter(fav => !fav.restaurantData).length} restoran tidak memiliki data lengkap. 
                    Klik refresh untuk memperbarui data.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat restoran favorit...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="w-24 h-24 mx-auto mb-6 text-gray-400">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Belum ada restoran favorit
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Kamu belum menambahkan restoran apapun ke daftar favorit. 
                Cari restoran yang menarik dan tambahkan ke favorit!
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => router.push("/restaurants")}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl shadow font-semibold transition-all duration-200"
                >
                  Cari Restoran
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">{favorites.length}</div>
                  <div className="text-gray-600 text-sm">Total Favorit</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {favorites.filter(fav => fav.restaurantData).length}
                  </div>
                  <div className="text-gray-600 text-sm">Data Lengkap</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {favorites.filter(fav => !fav.restaurantData).length}
                  </div>
                  <div className="text-gray-600 text-sm">Perlu Diperbarui</div>
                </div>
              </div>

              {/* Favorites Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((favorite) => {
                  const hasData = !!favorite.restaurantData;
                  const restaurantName = hasData 
                    ? favorite.restaurantData.name || 'Restoran'
                    : 'Restoran (Data Tidak Lengkap)';
                  
                  const restaurantImage = hasData ? favorite.restaurantData.image : null;
                  const restaurantCategory = hasData ? favorite.restaurantData.category : 'Restoran';
                  const restaurantDescription = hasData ? favorite.restaurantData.description : '';

                  return (
                    <div
                      key={favorite.id || favorite.restaurantId}
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 border border-gray-100"
                    >
                      {/* Restaurant Image */}
                      <div className="relative h-48 overflow-hidden">
                        {restaurantImage ? (
                          <img
                            src={restaurantImage}
                            alt={restaurantName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.classList.add('bg-gradient-to-r', 'from-orange-100', 'to-orange-200');
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-orange-100 to-orange-200 flex items-center justify-center">
                            <svg className="w-12 h-12 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Warning badge if no data */}
                        {!hasData && (
                          <div className="absolute top-3 left-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                            ⚠️ Data Tidak Lengkap
                          </div>
                        )}
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveFavorite(favorite.restaurantId)}
                          disabled={deletingId === favorite.restaurantId}
                          className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg disabled:opacity-50"
                          title="Hapus dari favorit"
                        >
                          {deletingId === favorite.restaurantId ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Restaurant Info */}
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 truncate">
                          {restaurantName}
                        </h3>
                        
                        {restaurantDescription && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {restaurantDescription}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              {restaurantCategory}
                            </span>
                            
                            {favorite.addedAt && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                Ditambahkan: {favorite.addedAt?.seconds 
                                  ? new Date(favorite.addedAt.seconds * 1000).toLocaleDateString('id-ID')
                                  : new Date(favorite.addedAt).toLocaleDateString('id-ID')
                                }
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => router.push(`/restaurant/${favorite.restaurantId}`)}
                              className="text-orange-600 hover:text-orange-700 font-medium text-sm px-3 py-1 hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              Detail
                            </button>
                          </div>
                        </div>
                        
                        {/* Debug info for each card */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <details className="text-xs">
                            <summary className="text-gray-500 cursor-pointer hover:text-gray-700">
                              Info Database
                            </summary>
                            <div className="mt-2 space-y-1">
                              <p className="text-gray-600">
                                <span className="font-medium">Restaurant ID:</span> {favorite.restaurantId}
                              </p>
                              {favorite.id && (
                                <p className="text-gray-600">
                                  <span className="font-medium">Favorite ID:</span> {favorite.id}
                                </p>
                              )}
                              <p className="text-gray-600">
                                <span className="font-medium">Data Status:</span> 
                                <span className={`ml-1 ${hasData ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {hasData ? 'Lengkap' : 'Tidak Lengkap'}
                                </span>
                              </p>
                            </div>
                          </details>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Total Count */}
              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  Menampilkan <span className="font-semibold text-orange-600">{favorites.length}</span> restoran favorit
                </p>
                <div className="flex justify-center gap-4 mt-4">
                  <button
                    onClick={() => router.push("/restaurants")}
                    className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Restoran Favorit Lainnya
                  </button>
                  {favorites.some(fav => !fav.restaurantData) && (
                    <button
                      onClick={handleRefresh}
                      className="inline-flex items-center text-yellow-600 hover:text-yellow-700 font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Perbarui Data Restoran
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}