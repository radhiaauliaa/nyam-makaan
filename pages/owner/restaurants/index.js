import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout/Layout';
import { getRestaurantsByOwner } from '../../../lib/firestore';

export default function OwnerRestaurants() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && userData?.role === 'owner') {
      loadRestaurants();
    }
  }, [currentUser, userData]);

  const loadRestaurants = async () => {
    try {
      const data = await getRestaurantsByOwner(currentUser.uid);
      setRestaurants(data);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      alert('Gagal memuat data restoran');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', text: 'Menunggu Verifikasi' },
      'approved': { color: 'bg-green-100 text-green-800', text: 'Aktif' },
      'rejected': { color: 'bg-red-100 text-red-800', text: 'Ditolak' },
      'suspended': { color: 'bg-gray-100 text-gray-800', text: 'Ditangguhkan' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // ✅ PERBAIKAN: Cek role OWNER, bukan ADMIN
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Kelola Restoran</h1>
            <p className="text-gray-600 mt-2">Lihat dan kelola semua restoran Anda</p>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat data restoran...</p>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada restoran</h3>
              <p className="mt-1 text-sm text-gray-500">Mulai dengan mendaftarkan restoran pertama Anda.</p>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/owner/add-restaurant')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  Tambah Restoran Pertama
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {restaurants.map((restaurant) => (
                  <li key={restaurant.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {restaurant.image ? (
                              <img className="h-16 w-16 rounded-lg object-cover" src={restaurant.image} alt={restaurant.name} />
                            ) : (
                              <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center">
                              <h4 className="text-lg font-semibold text-gray-900">{restaurant.name}</h4>
                              <div className="ml-3">
                                {getStatusBadge(restaurant.status)}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">{restaurant.category}</span> • {restaurant.address}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {restaurant.priceRange} • Kapasitas: {restaurant.capacity} orang
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => router.push(`/owner/restaurants/edit?id=${restaurant.id}`)}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium"
                            disabled={restaurant.status !== 'approved'}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => router.push(`/owner/reservations?restaurant=${restaurant.id}`)}
                            className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-medium"
                          >
                            Reservasi
                          </button>
                        </div>
                      </div>
                      
                      {restaurant.status === 'pending' && (
                        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-yellow-700">
                                Restoran Anda sedang menunggu verifikasi admin. Anda akan dapat mengelola reservasi setelah disetujui.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}