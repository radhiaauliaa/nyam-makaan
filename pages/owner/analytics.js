import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout/Layout';

export default function OwnerAnalytics() {
  const { currentUser, userData } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && userData?.role === 'owner') {
      fetchAnalytics();
    }
  }, [currentUser, userData, timeRange]);

  const fetchAnalytics = async () => {
    // TODO: Fetch analytics from Firestore
    const sampleData = {
      revenue: {
        total: 12500000,
        change: 12,
        chartData: [1000000, 1500000, 1200000, 1800000, 2000000, 2200000, 2500000]
      },
      reservations: {
        total: 45,
        change: 5,
        chartData: [5, 8, 6, 10, 12, 15, 18]
      },
      customers: {
        total: 128,
        change: 8,
        chartData: [10, 15, 12, 18, 20, 22, 25]
      },
      popularHours: [
        { hour: '12:00', count: 15 },
        { hour: '13:00', count: 12 },
        { hour: '19:00', count: 20 },
        { hour: '20:00', count: 18 },
      ],
      topMenuItems: [
        { name: 'Steak Sirloin', orders: 45, revenue: 5400000 },
        { name: 'Pasta Carbonara', orders: 32, revenue: 2400000 },
        { name: 'Caesar Salad', orders: 28, revenue: 1260000 },
      ],
      customerSatisfaction: {
        averageRating: 4.5,
        totalReviews: 128,
        ratingDistribution: [2, 5, 10, 25, 86] // 1-5 stars
      }
    };
    setAnalytics(sampleData);
    setLoading(false);
  };

  if (!currentUser || userData?.role !== 'owner') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Akses ditolak. Hanya untuk pemilik resto.</p>
            <a href="/" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700">
              Kembali ke Home
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
                <p className="text-gray-600 mt-2">Analisis kinerja restoran Anda</p>
              </div>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="week">Minggu Ini</option>
                <option value="month">Bulan Ini</option>
                <option value="year">Tahun Ini</option>
              </select>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Pendapatan</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        Rp {analytics.revenue.total.toLocaleString()}
                      </div>
                      <div className={`text-sm ${analytics.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.revenue.change >= 0 ? '+' : ''}{analytics.revenue.change}% dari periode sebelumnya
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Reservasi</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{analytics.reservations.total}</div>
                      <div className={`text-sm ${analytics.reservations.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.reservations.change >= 0 ? '+' : ''}{analytics.reservations.change}% dari periode sebelumnya
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Pelanggan</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{analytics.customers.total}</div>
                      <div className={`text-sm ${analytics.customers.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {analytics.customers.change >= 0 ? '+' : ''}{analytics.customers.change}% dari periode sebelumnya
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Popular Hours */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Jam Populer</h3>
              <div className="space-y-3">
                {analytics.popularHours.map((hour, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 w-16">{hour.hour}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 mx-4">
                      <div 
                        className="bg-orange-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(hour.count / Math.max(...analytics.popularHours.map(h => h.count))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{hour.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Satisfaction */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Kepuasan Pelanggan</h3>
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-900">{analytics.customerSatisfaction.averageRating}</div>
                <div className="text-yellow-500 text-lg">⭐⭐⭐⭐⭐</div>
                <p className="text-sm text-gray-600">{analytics.customerSatisfaction.totalReviews} ulasan</p>
              </div>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars, index) => (
                  <div key={stars} className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 w-8">{stars} bintang</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(analytics.customerSatisfaction.ratingDistribution[index] / analytics.customerSatisfaction.totalReviews) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">
                      {analytics.customerSatisfaction.ratingDistribution[index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Menu Items */}
            <div className="bg-white shadow rounded-lg p-6 lg:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Menu Terpopuler</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Menu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pesanan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pendapatan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.topMenuItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{item.orders} pesanan</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">Rp {item.revenue.toLocaleString()}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-8 flex justify-end">
            <button className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 font-medium">
              Export Laporan
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}