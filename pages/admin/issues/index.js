import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getAllUsers, 
  getAllRestaurants, 
  getReports, 
  updateUser, 
  updateRestaurantStatus,
  updateReportStatus,
  suspendUserAccount,
  suspendRestaurantAccount 
} from '../../../lib/firestore';
import Layout from '../../../components/Layout/Layout';

export default function AdminIssues() {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  
  // State untuk user bermasalah
  const [users, setUsers] = useState([]);
  const [problemUsers, setProblemUsers] = useState([]);
  
  // State untuk restoran bermasalah
  const [restaurants, setRestaurants] = useState([]);
  const [problemRestaurants, setProblemRestaurants] = useState([]);
  
  // State untuk reports
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionReason, setActionReason] = useState('');
  
  // State untuk suspended users/restaurants
  const [suspendedItems, setSuspendedItems] = useState([]);
  const [showReinstateModal, setShowReinstateModal] = useState(false);
  const [itemToReinstate, setItemToReinstate] = useState(null);

  useEffect(() => {
    if (userData?.role === 'admin') {
      loadAllData();
    }
  }, [userData]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load semua data sekaligus
      const [usersData, restaurantsData, reportsData] = await Promise.all([
        getAllUsers(),
        getAllRestaurants(),
        getReports()
      ]);

      setUsers(usersData || []);
      setRestaurants(restaurantsData || []);
      setReports(reportsData || []);
      
      // Filter data bermasalah
      filterProblemUsers(usersData || []);
      filterProblemRestaurants(restaurantsData || []);
      
      // Filter yang sudah ditangguhkan
      const suspendedUsers = (usersData || []).filter(u => u.status === 'suspended');
      const suspendedRestaurants = (restaurantsData || []).filter(r => r.status === 'suspended');
      setSuspendedItems([...suspendedUsers.map(u => ({...u, type: 'user'})), 
                         ...suspendedRestaurants.map(r => ({...r, type: 'restaurant'}))]);

    } catch (error) {
      console.error('Error loading data:', error);
      alert('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filterProblemUsers = (usersData) => {
    const problems = [];
    
    usersData.forEach(user => {
      if (user.status !== 'suspended') {
        // Cari report untuk user ini
        const userReports = reports.filter(r => 
          r.targetType === 'user' && r.targetId === user.id
        );
        
        if (userReports.length > 0) {
          problems.push({
            ...user,
            type: 'user',
            problemType: 'reported',
            reportCount: userReports.length,
            lastReport: userReports[0],
            issues: userReports.map(r => r.reason)
          });
        }
      }
    });

    setProblemUsers(problems);
  };

  const filterProblemRestaurants = (restaurantsData) => {
    const problems = [];
    
    restaurantsData.forEach(restaurant => {
      if (restaurant.status !== 'suspended') {
        // Rating rendah (< 2)
        if ((restaurant.rating || 0) < 2.0 && restaurant.reviewCount > 5) {
          problems.push({
            ...restaurant,
            type: 'restaurant',
            problemType: 'low_rating',
            rating: restaurant.rating || 0,
            reviewCount: restaurant.reviewCount || 0
          });
        }
      }
    });

    setProblemRestaurants(problems);
  };

  const handleSuspendUser = async (userId, reason = 'Sistem: multiple bad reviews') => {
    if (!actionReason.trim() && !reason.includes('Sistem')) {
      alert('Harap berikan alasan penangguhan');
      return;
    }

    try {
      const finalReason = reason.includes('Sistem') ? reason : actionReason;
      await suspendUserAccount(userId, finalReason);
      
      // Update local state
      setProblemUsers(prev => prev.filter(u => u.id !== userId));
      loadAllData(); // Reload data
      
      alert('Akun berhasil ditangguhkan');
      setActionReason('');
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Gagal menangguhkan akun: ' + error.message);
    }
  };

  const handleSuspendRestaurant = async (restaurantId) => {
    if (!actionReason.trim()) {
      alert('Harap berikan alasan penangguhan');
      return;
    }

    try {
      await suspendRestaurantAccount(restaurantId, actionReason);
      
      // Update local state
      setProblemRestaurants(prev => prev.filter(r => r.id !== restaurantId));
      loadAllData(); // Reload data
      
      alert('Restoran berhasil ditangguhkan');
      setActionReason('');
    } catch (error) {
      console.error('Error suspending restaurant:', error);
      alert('Gagal menangguhkan restoran: ' + error.message);
    }
  };

  const handleResolveReport = async (reportId, action) => {
    try {
      await updateReportStatus(reportId, action);
      
      // Update local state
      setReports(prev => prev.filter(r => r.id !== reportId));
      loadAllData(); // Reload data
      
      alert(`Report ${action === 'approved' ? 'disetujui' : 'ditolak'}`);
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Gagal memproses report: ' + error.message);
    }
  };

  const handleReinstate = async () => {
    if (!itemToReinstate) return;

    try {
      if (itemToReinstate.type === 'user') {
        await updateUser(itemToReinstate.id, { 
          status: 'active',
          suspensionReason: null,
          suspendedAt: null
        });
      } else {
        await updateRestaurantStatus(itemToReinstate.id, 'approved');
      }

      loadAllData(); // Reload data
      setShowReinstateModal(false);
      setItemToReinstate(null);
      
      alert('Akun/Restoran berhasil diaktifkan kembali');
    } catch (error) {
      console.error('Error reinstating:', error);
      alert('Gagal mengaktifkan kembali: ' + error.message);
    }
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
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
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Kelola Masalah</h1>
            <p className="text-gray-600 mt-2">
              Kelola akun dan restoran yang bermasalah
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Akun Bermasalah
                  {problemUsers.length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                      {problemUsers.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('restaurants')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'restaurants'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Restoran Bermasalah
                  {problemRestaurants.length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                      {problemRestaurants.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'reports'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Laporan
                  {reports.length > 0 && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                      {reports.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('suspended')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'suspended'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Ditangguhkan
                  {suspendedItems.length > 0 && (
                    <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                      {suspendedItems.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* Reason Input */}
          {(activeTab === 'users' || activeTab === 'restaurants') && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alasan Penangguhan (akan dikirim ke user/owner):
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                placeholder="Contoh: Akun ditangguhkan karena menerima 10+ laporan dari berbagai restoran."
              />
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat data...</p>
            </div>
          ) : (
            <>
              {/* Tab: Akun Bermasalah */}
              {activeTab === 'users' && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  {problemUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">Tidak ada akun bermasalah</p>
                      <p className="text-gray-400 mt-2">Semua akun dalam keadaan baik</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {problemUsers.map((user) => (
                        <div key={user.id} className="p-6 hover:bg-gray-50">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                                  <span className="text-red-600 font-semibold text-sm">
                                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {user.displayName || 'No Name'}
                                  </h3>
                                  <p className="text-sm text-gray-600">{user.email}</p>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${getSeverityColor('high')}`}>
                                      ⚠️ {user.reportCount} Laporan
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Role: {user.role || 'user'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Issues List */}
                              <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Masalah:</h4>
                                <ul className="space-y-1">
                                  {user.issues && user.issues.map((issue, idx) => (
                                    <li key={idx} className="text-sm text-gray-600 flex items-start">
                                      <span className="text-red-500 mr-2">•</span>
                                      {issue}
                                    </li>
                                  ))}
                                </ul>
                                {user.lastReport && (
                                  <div className="mt-2 text-xs text-gray-500">
                                    Laporan terakhir: {formatDate(user.lastReport.createdAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-4 lg:mt-0 lg:ml-4 flex flex-col space-y-2">
                              <button
                                onClick={() => handleSuspendUser(user.id)}
                                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                              >
                                Tangguhkan Akun
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReport(user.lastReport);
                                }}
                                className="text-blue-600 hover:text-blue-900 text-sm underline"
                              >
                                Lihat Detail Laporan
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Restoran Bermasalah */}
              {activeTab === 'restaurants' && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  {problemRestaurants.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">Tidak ada restoran bermasalah</p>
                      <p className="text-gray-400 mt-2">Semua restoran dalam keadaan baik</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {problemRestaurants.map((restaurant) => (
                        <div key={restaurant.id} className="p-6 hover:bg-gray-50">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4">
                                {restaurant.image ? (
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
                                
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {restaurant.name}
                                  </h3>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <span className="text-sm text-gray-600">
                                      Rating: <strong className="text-red-600">{restaurant.rating?.toFixed(1) || 0}</strong>/5.0
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      Ulasan: {restaurant.reviewCount || 0}
                                    </span>
                                  </div>
                                  <div className="mt-2">
                                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                      ⚠️ Rating Sangat Rendah
                                    </span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      Pemilik: {restaurant.ownerName}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 lg:mt-0 lg:ml-4 flex flex-col space-y-2">
                              <button
                                onClick={() => handleSuspendRestaurant(restaurant.id)}
                                className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
                              >
                                Tangguhkan Restoran
                              </button>
                              <button
                                onClick={() => window.open(`/restaurant/${restaurant.id}`, '_blank')}
                                className="text-blue-600 hover:text-blue-900 text-sm underline"
                              >
                                Lihat Detail Restoran
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Laporan */}
              {activeTab === 'reports' && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  {reports.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">Tidak ada laporan</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {reports.map((report) => (
                        <div key={report.id} className="p-6 hover:bg-gray-50">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {report.targetType === 'user' ? 'Laporan User' : 'Laporan Restoran'}
                                </h3>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  report.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {report.severity === 'high' ? 'Tinggi' : 
                                   report.severity === 'medium' ? 'Sedang' : 'Rendah'}
                                </span>
                              </div>
                              
                              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">Pelapor:</h4>
                                  <p className="text-sm text-gray-600">{report.reportedBy}</p>
                                  <p className="text-xs text-gray-500">Restoran: {report.restaurantName}</p>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">Target:</h4>
                                  <p className="text-sm text-gray-600">
                                    {report.targetType === 'user' ? 'User' : 'Restoran'}: {report.targetName}
                                  </p>
                                </div>
                                
                                <div className="md:col-span-2">
                                  <h4 className="text-sm font-medium text-gray-900">Alasan:</h4>
                                  <p className="text-sm text-gray-600 mt-1">{report.reason}</p>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">Tanggal:</h4>
                                  <p className="text-sm text-gray-600">{formatDate(report.createdAt)}</p>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">Status:</h4>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    report.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {report.status === 'pending' ? 'Menunggu' :
                                     report.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {report.status === 'pending' && (
                              <div className="mt-4 lg:mt-0 lg:ml-4 flex flex-col space-y-2">
                                <button
                                  onClick={() => handleResolveReport(report.id, 'approved')}
                                  className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                                >
                                  Setujui Laporan
                                </button>
                                <button
                                  onClick={() => handleResolveReport(report.id, 'rejected')}
                                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                                >
                                  Tolak Laporan
                                </button>
                                <button
                                  onClick={() => setSelectedReport(report)}
                                  className="text-blue-600 hover:text-blue-900 text-sm underline"
                                >
                                  Detail Laporan
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Ditangguhkan */}
              {activeTab === 'suspended' && (
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  {suspendedItems.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">Tidak ada akun/restoran yang ditangguhkan</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {suspendedItems.map((item) => (
                        <div key={item.id} className="p-6 hover:bg-gray-50">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-4">
                                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                                  item.type === 'user' ? 'bg-red-100' : 'bg-orange-100'
                                }`}>
                                  <span className={`font-semibold text-sm ${
                                    item.type === 'user' ? 'text-red-600' : 'text-orange-600'
                                  }`}>
                                    {item.type === 'user' ? 
                                      (item.displayName?.charAt(0) || item.email?.charAt(0) || 'U') :
                                      (item.name?.charAt(0) || 'R')}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {item.type === 'user' ? item.displayName || item.email : item.name}
                                  </h3>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                      {item.type === 'user' ? 'Akun User' : 'Restoran'}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      Ditangguhkan: {formatDate(item.suspendedAt)}
                                    </span>
                                  </div>
                                  {item.suspensionReason && (
                                    <p className="text-sm text-gray-600 mt-2">
                                      <strong>Alasan:</strong> {item.suspensionReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 lg:mt-0 lg:ml-4 flex flex-col space-y-2">
                              <button
                                onClick={() => {
                                  setItemToReinstate(item);
                                  setShowReinstateModal(true);
                                }}
                                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                              >
                                Aktifkan Kembali
                              </button>
                              {item.type === 'user' && (
                                <button
                                  onClick={() => window.open(`/admin/users/${item.id}`, '_blank')}
                                  className="text-blue-600 hover:text-blue-900 text-sm underline"
                                >
                                  Lihat Detail User
                                </button>
                              )}
                              {item.type === 'restaurant' && (
                                <button
                                  onClick={() => window.open(`/admin/restaurants/${item.id}`, '_blank')}
                                  className="text-blue-600 hover:text-blue-900 text-sm underline"
                                >
                                  Lihat Detail Restoran
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Detail Laporan */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Detail Laporan</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Jenis Laporan</h3>
                    <p className="text-gray-700 capitalize">{selectedReport.targetType}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Status</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      selectedReport.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedReport.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedReport.status === 'pending' ? 'Menunggu' :
                       selectedReport.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Pelapor</h3>
                    <p className="text-gray-700">{selectedReport.reportedBy}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Target</h3>
                    <p className="text-gray-700">{selectedReport.targetName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Restoran</h3>
                    <p className="text-gray-700">{selectedReport.restaurantName}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Tanggal</h3>
                    <p className="text-gray-700">{formatDate(selectedReport.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900">Alasan Laporan</h3>
                  <p className="text-gray-700 mt-2 bg-gray-50 p-4 rounded-lg">
                    {selectedReport.reason}
                  </p>
                </div>

                {selectedReport.details && (
                  <div>
                    <h3 className="font-semibold text-gray-900">Detail Tambahan</h3>
                    <p className="text-gray-700 mt-2">{selectedReport.details}</p>
                  </div>
                )}

                {selectedReport.evidence && (
                  <div>
                    <h3 className="font-semibold text-gray-900">Bukti</h3>
                    <div className="mt-2">
                      {selectedReport.evidence.map((item, idx) => (
                        <div key={idx} className="mb-2">
                          {item.type === 'image' ? (
                            <img src={item.url} alt="Bukti" className="max-w-full h-auto rounded" />
                          ) : (
                            <p className="text-gray-700">{item.content}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Catatan Admin</h3>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                    rows="3"
                    placeholder="Tambahkan catatan untuk laporan ini..."
                  />
                </div>

                {selectedReport.status === 'pending' && (
                  <div className="flex justify-end space-x-3 border-t pt-4">
                    <button
                      onClick={() => {
                        handleResolveReport(selectedReport.id, 'rejected');
                        setSelectedReport(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Tolak Laporan
                    </button>
                    <button
                      onClick={() => {
                        handleResolveReport(selectedReport.id, 'approved');
                        setSelectedReport(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Setujui & Tangguhkan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aktifkan Kembali */}
      {showReinstateModal && itemToReinstate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Aktifkan Kembali {itemToReinstate.type === 'user' ? 'Akun' : 'Restoran'}
              </h2>
              
              <p className="text-gray-600 mb-6">
                Apakah Anda yakin ingin mengaktifkan kembali {itemToReinstate.type === 'user' ? 'akun' : 'restoran'} ini?
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Informasi:</strong><br/>
                  • {itemToReinstate.type === 'user' ? 'User' : 'Restoran'} akan dapat digunakan kembali<br/>
                  • Semua akses akan dipulihkan<br/>
                  • Status akan diubah menjadi "active"
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowReinstateModal(false);
                    setItemToReinstate(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleReinstate}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Ya, Aktifkan Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}