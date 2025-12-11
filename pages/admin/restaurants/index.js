import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllRestaurants, updateRestaurantStatus, getRestaurantById } from '../../../lib/firestore';
import Layout from '../../../components/Layout/Layout';

export default function AdminRestaurants() {
  const { userData } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    if (userData?.role === 'admin') {
      loadRestaurants();
    }
  }, [userData]);

  useEffect(() => {
    filterRestaurants();
  }, [restaurants, statusFilter]);

  const loadRestaurants = async () => {
    try {
      console.log('Loading restaurants from Firestore...');
      const data = await getAllRestaurants();
      console.log('Loaded restaurants:', data);
      
      // Safety check - pastikan data adalah array
      if (Array.isArray(data)) {
        setRestaurants(data);
        console.log('Jumlah restaurants:', data.length);
      } else {
        console.error('Data restaurants bukan array:', data);
        setRestaurants([]);
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
      alert('Gagal memuat data restoran: ' + error.message);
      setRestaurants([]); // Pastikan set ke array kosong jika error
    } finally {
      setLoading(false);
    }
  };

  const filterRestaurants = () => {
    // Safety check - pastikan restaurants adalah array
    if (!Array.isArray(restaurants)) {
      setFilteredRestaurants([]);
      return;
    }

    if (statusFilter === 'all') {
      setFilteredRestaurants(restaurants);
    } else {
      setFilteredRestaurants(restaurants.filter(r => r?.status === statusFilter));
    }
  };

  const handleStatusUpdate = async (restaurantId, newStatus) => {
    setUpdatingId(restaurantId);
    try {
      await updateRestaurantStatus(restaurantId, newStatus);
      alert(`Restoran ${newStatus === 'approved' ? 'disetujui' : 'ditolak'}`);
      
      // Update local state
      setRestaurants(restaurants.map(r => 
        r?.id === restaurantId ? { ...r, status: newStatus } : r
      ));
    } catch (error) {
      console.error('Error updating restaurant:', error);
      alert('Gagal memperbarui status restoran: ' + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleViewDetails = async (restaurantId) => {
    try {
      const restaurant = await getRestaurantById(restaurantId);
      setSelectedRestaurant(restaurant);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error('Error loading restaurant details:', error);
      alert('Gagal memuat detail restoran: ' + error.message);
    }
  };

  const closeModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRestaurant(null);
  };

  const getStatusCount = (status) => {
    // Safety check
    if (!Array.isArray(restaurants)) return 0;
    return restaurants.filter(r => r?.status === status).length;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Menunggu' },
      'approved': { color: 'bg-green-100 text-green-800', label: 'Disetujui' },
      'rejected': { color: 'bg-red-100 text-red-800', label: 'Ditolak' },
      'suspended': { color: 'bg-gray-100 text-gray-800', label: 'Ditangguhkan' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('id-ID');
    } catch (error) {
      return '-';
    }
  };

  // Redirect jika bukan admin
  if (userData?.role !== 'admin') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Akses ditolak. Hanya untuk admin.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kelola Restoran</h1>
          <p className="text-gray-600 mb-8">Verifikasi dan kelola restoran yang mendaftar</p>

          {/* Status Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{getStatusCount('pending')}</div>
              <div className="text-gray-600">Diproses</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{getStatusCount('approved')}</div>
              <div className="text-gray-600">Diterima</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{getStatusCount('rejected')}</div>
              <div className="text-gray-600">Ditolak</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">{getStatusCount('suspended')}</div>
              <div className="text-gray-600">Ditangguhkan</div>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Verifikasi</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="suspended">Ditangguhkan</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat data restoran...</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {/* Safety check tambahan */}
              {!Array.isArray(filteredRestaurants) || filteredRestaurants.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Tidak ada restoran ditemukan</p>
                  <p className="text-gray-400 mt-2">
                    {statusFilter !== 'all' ? `Untuk status "${statusFilter}"` : 'Belum ada restoran yang terdaftar'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredRestaurants.map((restaurant) => (
                    <div key={restaurant?.id} className="p-6 hover:bg-gray-50">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4">
                            {restaurant?.image ? (
                              <img 
                                className="h-16 w-16 rounded-lg object-cover" 
                                src={restaurant.image} 
                                alt={restaurant.name} 
                              />
                            ) : (
                              <div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No Image</span>
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {restaurant?.name || 'No Name'}
                                </h3>
                                {getStatusBadge(restaurant?.status)}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Pemilik:</span> {restaurant?.ownerName || 'Tidak ada nama'}
                                </div>
                                <div>
                                  <span className="font-medium">Kategori:</span> {restaurant?.category}
                                </div>
                                <div>
                                  <span className="font-medium">Telepon:</span> {restaurant?.phone}
                                </div>
                                <div>
                                  <span className="font-medium">Email:</span> {restaurant?.email || '-'}
                                </div>
                              </div>
                              
                              <div className="mt-2 text-sm text-gray-600">
                                <span className="font-medium">Alamat:</span> {restaurant?.address}
                              </div>
                              
                              <div className="mt-1 text-xs text-gray-400">
                                Diajukan: {formatDate(restaurant?.createdAt)}
                                {restaurant?.approvedAt && ` • Disetujui: ${formatDate(restaurant.approvedAt)}`}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 lg:mt-0 lg:ml-4 flex flex-col space-y-2">
                          {restaurant?.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(restaurant.id, 'approved')}
                                disabled={updatingId === restaurant.id}
                                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center"
                              >
                                {updatingId === restaurant.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Memproses...
                                  </>
                                ) : (
                                  'Setujui'
                                )}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(restaurant.id, 'rejected')}
                                disabled={updatingId === restaurant.id}
                                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:bg-red-400"
                              >
                                Tolak
                              </button>
                            </>
                          )}
                          
                          {(restaurant?.status === 'approved' || restaurant?.status === 'rejected') && (
                            <button
                              onClick={() => handleStatusUpdate(restaurant.id, 'pending')}
                              disabled={updatingId === restaurant.id}
                              className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 disabled:bg-gray-400"
                            >
                              Reset Status
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleViewDetails(restaurant.id)}
                            className="text-blue-600 hover:text-blue-900 text-sm underline"
                          >
                            Lihat Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail Restoran */}
      {isDetailModalOpen && selectedRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Detail Restoran</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-6">
                {/* Gambar Restoran */}
                {selectedRestaurant.image && (
                  <div>
                    <img 
                      src={selectedRestaurant.image} 
                      alt={selectedRestaurant.name}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Informasi Dasar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Nama Restoran</h3>
                    <p className="text-gray-700">{selectedRestaurant.name}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Kategori</h3>
                    <p className="text-gray-700">{selectedRestaurant.category}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Status</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedRestaurant.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedRestaurant.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedRestaurant.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedRestaurant.status === 'approved' ? 'Disetujui' : 
                       selectedRestaurant.status === 'pending' ? 'Menunggu Verifikasi' : 
                       selectedRestaurant.status === 'rejected' ? 'Ditolak' : 'Ditangguhkan'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Rentang Harga</h3>
                    <p className="text-gray-700">{selectedRestaurant.priceRange || '-'}</p>
                  </div>
                </div>

                {/* Informasi Pemilik */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Informasi Pemilik</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm text-gray-600">Nama Pemilik</h4>
                      <p className="text-gray-700">{selectedRestaurant.ownerName || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-600">ID Pemilik</h4>
                      <p className="text-gray-700 text-sm font-mono">{selectedRestaurant.ownerId || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Kontak */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Kontak</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm text-gray-600">Telepon</h4>
                      <p className="text-gray-700">{selectedRestaurant.phone || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-600">Email</h4>
                      <p className="text-gray-700">{selectedRestaurant.email || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Alamat */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Alamat</h3>
                  <p className="text-gray-700">{selectedRestaurant.address || '-'}</p>
                </div>

                {/* Deskripsi */}
                {selectedRestaurant.description && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Deskripsi</h3>
                    <p className="text-gray-700 whitespace-pre-line">{selectedRestaurant.description}</p>
                  </div>
                )}

                {/* Informasi Operasional */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Informasi Operasional</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm text-gray-600">Jam Operasional</h4>
                      <p className="text-gray-700">{selectedRestaurant.openingHours || '-'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-600">Kapasitas</h4>
                      <p className="text-gray-700">{selectedRestaurant.capacity ? `${selectedRestaurant.capacity} orang` : '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Informasi Tambahan */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Informasi Tambahan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="text-gray-600">Diajukan Pada</h4>
                      <p className="text-gray-700">{formatDate(selectedRestaurant.createdAt)}</p>
                    </div>
                    {selectedRestaurant.approvedAt && (
                      <div>
                        <h4 className="text-gray-600">Disetujui Pada</h4>
                        <p className="text-gray-700">{formatDate(selectedRestaurant.approvedAt)}</p>
                      </div>
                    )}
                    {selectedRestaurant.rating !== undefined && (
                      <div>
                        <h4 className="text-gray-600">Rating</h4>
                        <p className="text-gray-700">{selectedRestaurant.rating || 0} / 5</p>
                      </div>
                    )}
                    {selectedRestaurant.reviewCount !== undefined && (
                      <div>
                        <h4 className="text-gray-600">Jumlah Review</h4>
                        <p className="text-gray-700">{selectedRestaurant.reviewCount || 0}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Catatan Admin */}
                {selectedRestaurant.adminNotes && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Catatan Admin</h3>
                    <p className="text-gray-700 bg-yellow-50 p-3 rounded-lg">{selectedRestaurant.adminNotes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Tutup
                </button>
                {selectedRestaurant.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedRestaurant.id, 'approved');
                        closeModal();
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Setujui
                    </button>
                    <button
                      onClick={() => {
                        handleStatusUpdate(selectedRestaurant.id, 'rejected');
                        closeModal();
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Tolak
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}