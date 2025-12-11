// pages/admin/dashboard.js
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { 
  getAllUsers, 
  getAllRestaurants,
  getPendingRestaurantsCount
} from '../../lib/firestore';
import Layout from '../../components/Layout/Layout';

export default function AdminDashboard() {
  const { userData } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRestaurants: 0,
    pendingRestaurants: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData?.role === 'admin') {
      loadDashboardData();
    }
  }, [userData]);

  const loadDashboardData = async () => {
    try {
      console.log('Loading admin dashboard data...');
      
      // Load semua data secara parallel
      const [users, restaurants, pendingCount] = await Promise.all([
        getAllUsers(),
        getAllRestaurants(),
        getPendingRestaurantsCount()
      ]);

      console.log('Dashboard Data:', { 
        users: users.length, 
        restaurants: restaurants.length, 
        pendingCount 
      });

      // Hitung stats
      setStats({
        totalUsers: users.length,
        totalRestaurants: restaurants.length,
        pendingRestaurants: pendingCount
      });

      // Generate activity dari data terbaru
      const activity = generateRecentActivity(restaurants, users);
      setRecentActivity(activity);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecentActivity = (restaurants, users) => {
    const activities = [];
    
    // Ambil restoran pending terbaru
    const pendingRestaurants = restaurants
      .filter(r => r.status === 'pending')
      .slice(0, 3);
    
    pendingRestaurants.forEach(restaurant => {
      activities.push({
        message: `${restaurant.name} menunggu verifikasi`,
        time: formatTime(restaurant.createdAt)
      });
    });

    // Ambil user terbaru
    const newUsers = users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3 - pendingRestaurants.length);
    
    newUsers.forEach(user => {
      activities.push({
        message: `${user.displayName || user.email} bergabung sebagai ${user.role}`,
        time: formatTime(user.createdAt)
      });
    });

    return activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  };

  const formatTime = (date) => {
    if (!date) return '';
    
    try {
      const now = new Date();
      const activityDate = new Date(date);
      const diffInMinutes = Math.floor((now - activityDate) / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) return 'Baru saja';
      if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
      if (diffInHours < 24) return `${diffInHours} jam lalu`;
      if (diffInDays === 1) return 'Kemarin';
      return `${diffInDays} hari lalu`;
    } catch (error) {
      return '';
    }
  };

  if (userData?.role !== 'admin') {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Akses ditolak. Hanya untuk admin.</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
          <p className="text-gray-600 mb-8">Kelola seluruh sistem NYAMI MAKAN</p>

          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat data...</p>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Pengguna</h3>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Restoran</h3>
                  <p className="text-3xl font-bold text-green-600">{stats.totalRestaurants}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Menunggu Verifikasi</h3>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingRestaurants}</p>
                  <p className="text-red-600 text-sm mt-2">Perlu Tindakan</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Aktivitas Terbaru</h2>
                  <div className="space-y-4">
                    {recentActivity.length === 0 ? (
                      <p className="text-gray-500">Tidak ada aktivitas terbaru</p>
                    ) : (
                      recentActivity.map((activity, index) => (
                        <div key={index} className="border-l-4 border-orange-500 pl-4">
                          <p className="text-gray-800">{activity.message}</p>
                          <p className="text-gray-500 text-sm">{activity.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Kelola Cepat</h2>
                  <div className="space-y-4">
                    <button 
                      onClick={() => router.push('/admin/restaurants')}
                      className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <h3 className="font-semibold text-gray-900">Kelola Restoran</h3>
                      <p className="text-gray-600">{stats.totalRestaurants} Restaurants</p>
                    </button>

                    <button 
                      onClick={() => router.push('/admin/users')}
                      className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <h3 className="font-semibold text-gray-900">Kelola Pengguna</h3>
                      <p className="text-gray-600">{stats.totalUsers} Users</p>
                    </button>

                    <button 
                      onClick={() => router.push('/admin/notifications')}
                      className="block w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <h3 className="font-semibold text-gray-900">Notifikasi Sistem</h3>
                      <p className="text-gray-600">{stats.pendingRestaurants} Menunggu</p>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}