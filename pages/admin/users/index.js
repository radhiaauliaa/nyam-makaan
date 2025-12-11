import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getAllUsers, updateUser } from '../../../lib/firestore';
import Layout from '../../../components/Layout/Layout';

export default function AdminUsers() {
  const { userData } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (userData?.role === 'admin') {
      loadUsers();
    }
  }, [userData]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      console.log('Memuat data users...');
      const data = await getAllUsers();
      console.log('Data users yang diterima:', data);
      
      // Safety check - pastikan data adalah array
      if (Array.isArray(data)) {
        setUsers(data);
        console.log('Jumlah users:', data.length);
      } else {
        console.error('Data users bukan array:', data);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Gagal memuat data pengguna');
      setUsers([]); // Pastikan set ke array kosong jika error
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    // Safety check - pastikan users adalah array
    if (!Array.isArray(users)) {
      setFilteredUsers([]);
      return;
    }

    let filtered = users;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user?.role === roleFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user?.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      await updateUser(userId, { status: newStatus });
      alert(`Status pengguna diperbarui`);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Gagal memperbarui status pengguna');
    }
  };

  // Fungsi untuk format tanggal yang aman
  const formatDate = (date) => {
    if (!date) return '-';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString('id-ID');
    } catch (error) {
      console.error('Error formatting date:', error);
      return '-';
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Kelola Pengguna</h1>
          <p className="text-gray-600 mb-8">Kelola semua pengguna sistem</p>

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <input
                  type="text"
                  placeholder="Cari pengguna..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">Semua Role</option>
                  <option value="user">Pengguna</option>
                  <option value="owner">Pemilik Resto</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="suspended">Ditangguhkan</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat data...</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {/* Safety check tambahan */}
              {!Array.isArray(filteredUsers) || filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Tidak ada pengguna ditemukan</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <li key={user.id} className="hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-orange-600 font-semibold text-sm">
                                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user?.displayName || 'No Name'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user?.email}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Bergabung: {formatDate(user?.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              user?.role === 'owner' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user?.role === 'admin' ? 'Admin' : 
                               user?.role === 'owner' ? 'Pemilik Resto' : 'Pengguna'}
                            </span>
                            
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              (user?.status === 'active' || !user?.status) ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {user?.status === 'active' || !user?.status ? 'Aktif' : 'Ditangguhkan'}
                            </span>

                            <div className="flex space-x-2">
                              {(user?.status === 'active' || !user?.status) ? (
                                <button 
                                  onClick={() => handleStatusUpdate(user.id, 'suspended')}
                                  className="text-yellow-600 hover:text-yellow-900 text-sm"
                                >
                                  Tangguhkan
                                </button>
                              ) : (
                                <button 
                                  onClick={() => handleStatusUpdate(user.id, 'active')}
                                  className="text-green-600 hover:text-green-900 text-sm"
                                >
                                  Aktifkan
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}