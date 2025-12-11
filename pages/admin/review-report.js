import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout/Layout';
import { 
  getReviewReports, 
  updateReportStatus 
} from '../../lib/firestore';

export default function ReviewReportsPage() {
  const { currentUser, userData } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (currentUser && userData?.role === 'admin') {
      loadReports();
    }
  }, [currentUser, userData, filter]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const result = await getReviewReports(filter);
      if (result.success) {
        setReports(result.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId, status) => {
    try {
      const result = await updateReportStatus(reportId, status);
      if (result.success) {
        alert(`Report ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
        loadReports();
      }
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Gagal update status report');
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Laporan Ulasan</h1>
          <p className="text-gray-600 mb-8">
            Kelola laporan ulasan dari pemilik restoran
          </p>

          {/* Filter Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter Status:
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="all">Semua</option>
              <option value="pending">Menunggu</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
            </select>
          </div>

          {/* Reports List */}
          {loading ? (
            <div>Loading...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Tidak ada laporan</p>
              <p className="text-gray-400">Belum ada laporan ulasan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{report.restaurantName}</h3>
                      <p className="text-gray-600">Dilaporkan oleh: {report.reportedByOwnerName}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(report.createdAt?.toDate()).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      report.reportStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      report.reportStatus === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {report.reportStatus === 'pending' ? 'Menunggu' :
                       report.reportStatus === 'approved' ? 'Disetujui' : 'Ditolak'}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Review yang Dilaporkan:</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="font-medium">{report.userName}</p>
                      <p className="text-yellow-600">Rating: {report.rating} ★</p>
                      <p>{report.comment}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Alasan Report:</h4>
                    <p className="text-red-600">{report.reason}</p>
                  </div>

                  {report.reportStatus === 'pending' && (
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Setujui Report
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(report.id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Tolak Report
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}