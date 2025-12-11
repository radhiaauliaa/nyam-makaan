import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getReviewReports,
  updateReportStatus,
  getUserById,
  getRestaurantById,
  getReviewById,
  suspendUserAccount,
  deleteReview,
  updateRestaurantRating 
} from '../../../lib/firestore';
import Layout from '../../../components/Layout/Layout';

export default function AdminReports() {
  const { userData } = useAuth();
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionReason, setActionReason] = useState('');
  
  // Additional data for selected report
  const [reviewData, setReviewData] = useState(null);
  const [userDataDetail, setUserDataDetail] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [userReportCount, setUserReportCount] = useState(0);

  useEffect(() => {
    if (userData?.role === 'admin') {
      loadReports();
    }
  }, [userData]);

  useEffect(() => {
    filterReports();
  }, [reports, filter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await getReviewReports('all');
      if (res?.success) {
        // Normalisasi field agar kompatibel dengan UI lama
        const reviewReports = (res.data || [])
          .filter(r => r.reviewId)
          .map(r => ({
            id: r.id,
            ...r,
            // Samakan nama field status
            status: r.reportStatus || r.status,
          }));
        setReports(reviewReports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      alert('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;
    
    if (filter !== 'all') {
      filtered = filtered.filter(report => report.status === filter);
    }
    
    setFilteredReports(filtered);
  };

  const loadReportDetails = async (report) => {
    try {
      // Load review data
      if (report.reviewId) {
        const review = await getReviewById(report.reviewId);
        setReviewData(review);
      }
      
      // Load user data
      if (report.userId) {
        const user = await getUserById(report.userId);
        setUserDataDetail(user);
        
        // Count user's reports
        const userReports = reports.filter(r => 
          r.userId === report.userId && 
          r.status === 'approved'
        );
        setUserReportCount(userReports.length + 1); // + current report
      }
      
      // Load restaurant data
      if (report.restaurantId) {
        const restaurant = await getRestaurantById(report.restaurantId);
        setRestaurantData(restaurant);
      }
    } catch (error) {
      console.error('Error loading report details:', error);
    }
  };

  const handleViewDetails = async (report) => {
    setSelectedReport(report);
    await loadReportDetails(report);
    setShowDetailModal(true);
  };

  const handleResolveReport = async (reportId, action, reviewId = null, userId = null, restaurantId = null) => {
    try {
      // Update report status
      await updateReportStatus(reportId, action);
      
      // Jika report disetujui
      if (action === 'approved') {
        // Hapus review
        if (reviewId) {
          await deleteReview(reviewId);
        }
        // Recalculate and persist restaurant rating for listing cards
        if (restaurantId) {
          try {
            await updateRestaurantRating(restaurantId);
          } catch (e) {
            console.warn('Gagal sinkron rating restoran:', e?.message || e);
          }
        }
        
        // Jika user memiliki 10+ approved reports, suspend
        if (userId && userReportCount >= 10) {
          await suspendUserAccount(userId, 
            `Sistem: User menerima ${userReportCount} laporan dari berbagai restoran.`
          );
        }
      }
      
      // Reload reports
      loadReports();
      
      alert(`Laporan berhasil ${action === 'approved' ? 'disetujui' : 'ditolak'}`);
      
      if (showDetailModal) {
        setShowDetailModal(false);
        setSelectedReport(null);
      }
    } catch (error) {
      console.error('Error resolving report:', error);
      alert('Gagal memproses laporan: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pending': { color: 'bg-yellow-100 text-yellow-800', label: 'Menunggu' },
      'approved': { color: 'bg-green-100 text-green-800', label: 'Disetujui' },
      'rejected': { color: 'bg-red-100 text-red-800', label: 'Ditolak' }
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
      const d = date?.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '-';
    }
  };

  const getRatingStars = (rating) => {
    if (!rating) return '☆☆☆☆☆';
    
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (halfStar) stars += '½';
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    
    return stars;
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
            <h1 className="text-3xl font-bold text-gray-900">Laporan Ulasan</h1>
            <p className="text-gray-600 mt-2">
              Kelola laporan ulasan dari pemilik restoran
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Menunggu</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {reports.filter(r => r.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Disetujui</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {reports.filter(r => r.status === 'approved').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ditolak</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {reports.filter(r => r.status === 'rejected').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="mb-6 bg-white p-4 rounded-lg shadow">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">Semua</option>
                <option value="pending">Menunggu</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </select>
              
              <div className="flex-1"></div>
              
              <button
                onClick={loadReports}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat laporan...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Tidak ada laporan</h3>
              <p className="mt-1 text-gray-500">
                {filter !== 'all' ? `Tidak ada laporan dengan status "${filter}"` : 'Belum ada laporan ulasan'}
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <div key={report.id} className="p-6 hover:bg-gray-50">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-semibold text-sm">
                              {report.userName?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {report.userName || 'User Tidak Diketahui'}
                            </h3>
                            <p className="text-sm text-gray-600">{report.userEmail}</p>
                          </div>
                          <div className="ml-auto">
                            {getStatusBadge(report.status)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Restoran</p>
                            <p className="text-gray-900">{report.restaurantName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Dilaporkan Oleh</p>
                            <p className="text-gray-900">{report.reportedByOwnerName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Tanggal Laporan</p>
                            <p className="text-gray-900">{formatDate(report.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">ID Review</p>
                            <p className="text-gray-900 font-mono text-xs">{report.reviewId}</p>
                          </div>
                        </div>
                        
                        {report.reason && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-1">Alasan Laporan:</p>
                            <p className="text-gray-900">{report.reason}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 lg:mt-0 lg:ml-4 flex flex-col space-y-2">
                        <button
                          onClick={() => handleViewDetails(report)}
                          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Lihat Detail
                        </button>
                        
                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleResolveReport(report.id, 'approved', report.reviewId, report.userId, report.restaurantId)}
                              className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Setujui
                            </button>
                            <button
                              onClick={() => handleResolveReport(report.id, 'rejected')}
                              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Tolak
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail Laporan */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Detail Laporan Ulasan</h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedReport(null);
                    setReviewData(null);
                    setUserDataDetail(null);
                    setRestaurantData(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-8">
                {/* Informasi User yang Dilaporkan */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Informasi User</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Nama</p>
                      <p className="text-gray-900">{selectedReport.userName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-900">{selectedReport.userEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">User ID</p>
                      <p className="text-gray-900 font-mono text-sm">{selectedReport.userId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Total Laporan Disetujui</p>
                      <p className={`font-bold ${userReportCount >= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                        {userReportCount} laporan
                        {userReportCount >= 10 && ' ⚠️ (Siap ditangguhkan)'}
                      </p>
                    </div>
                  </div>
                  
                  {userDataDetail && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Data User Tambahan:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>Bergabung: {formatDate(userDataDetail.createdAt)}</span>
                        <span>Role: {userDataDetail.role || 'user'}</span>
                        {userDataDetail.phone && <span>Telepon: {userDataDetail.phone}</span>}
                        {userDataDetail.status === 'suspended' && (
                          <span className="text-red-600">Status: Ditangguhkan</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Informasi Restoran */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏪 Informasi Restoran</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Nama Restoran</p>
                      <p className="text-gray-900">{selectedReport.restaurantName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Restoran ID</p>
                      <p className="text-gray-900 font-mono text-sm">{selectedReport.restaurantId}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Pemilik yang Melaporkan</p>
                      <p className="text-gray-900">{selectedReport.reportedByOwnerName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Owner ID</p>
                      <p className="text-gray-900 font-mono text-sm">{selectedReport.reportedByOwnerId}</p>
                    </div>
                  </div>
                  
                  {restaurantData && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Data Restoran:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span>Rating: {restaurantData.rating?.toFixed(1) || 0}/5</span>
                        <span>Ulasan: {restaurantData.reviewCount || 0}</span>
                        <span>Alamat: {restaurantData.address?.substring(0, 50)}...</span>
                        <span>Kategori: {restaurantData.category}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Informasi Review */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⭐ Ulasan yang Dilaporkan</h3>
                  
                  {reviewData ? (
                    <>
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg text-yellow-500">
                            {getRatingStars(reviewData.rating || 0)}
                          </span>
                          <span className="font-medium text-gray-900">
                            {reviewData.rating?.toFixed(1) || 0}/5
                          </span>
                        </div>
                        <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                          {reviewData.comment || 'Tidak ada komentar'}
                        </p>
                        <div className="mt-2 text-sm text-gray-500">
                          Ditulis pada: {formatDate(reviewData.createdAt)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">Memuat data review...</p>
                  )}
                  
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Alasan Laporan dari Pemilik:</p>
                    <p className="text-yellow-900">{selectedReport.reason || 'Tidak ada alasan spesifik'}</p>
                  </div>
                </div>

                {/* Action Section */}
                {selectedReport.status === 'pending' && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Tindakan Admin</h3>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catatan Tindakan (opsional):
                      </label>
                      <textarea
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Tambahkan catatan mengapa mengambil tindakan ini..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Approve Section */}
                      <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <h4 className="font-semibold text-green-800 mb-3">Setujui Laporan</h4>
                        <ul className="text-sm text-green-700 space-y-2 mb-4">
                          <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            Review akan dihapus dari sistem
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            Rating restoran akan diperbarui
                          </li>
                          {userReportCount >= 10 && (
                            <li className="flex items-start">
                              <span className="mr-2">⚠️</span>
                              User akan ditangguhkan (10+ laporan)
                            </li>
                          )}
                        </ul>
                        <button
                          onClick={() => handleResolveReport(
                            selectedReport.id, 
                            'approved', 
                            selectedReport.reviewId, 
                            selectedReport.userId
                          )}
                          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium"
                        >
                          Setujui & Hapus Review
                        </button>
                      </div>
                      
                      {/* Reject Section */}
                      <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <h4 className="font-semibold text-red-800 mb-3">Tolak Laporan</h4>
                        <ul className="text-sm text-red-700 space-y-2 mb-4">
                          <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            Review tetap dipertahankan
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            Pemilik akan diberitahu
                          </li>
                          <li className="flex items-start">
                            <span className="mr-2">✓</span>
                            Laporan ditandai sebagai "Ditolak"
                          </li>
                        </ul>
                        <button
                          onClick={() => handleResolveReport(selectedReport.id, 'rejected')}
                          className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium"
                        >
                          Tolak Laporan
                        </button>
                      </div>
                    </div>
                    
                    {/* Warning if user has 10+ reports */}
                    {userReportCount >= 10 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.928-.833-2.698 0L4.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <p className="text-red-800 font-medium">
                            PERINGATAN: User ini sudah memiliki {userReportCount} laporan yang disetujui.
                            Jika Anda menyetujui laporan ini, user akan otomatis ditangguhkan.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}