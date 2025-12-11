import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { 
  getSystemNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../../../lib/firestore';
import Layout from '../../../components/Layout/Layout';

export default function AdminNotifications() {
  const { userData } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (userData?.role === 'admin') {
      loadNotifications();
    }
  }, [userData]);

  const loadNotifications = async () => {
    try {
      const data = await getSystemNotifications(50);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // Mark Single Notification Read
  // -----------------------------
  const handleMarkAsRead = async (notificationId) => {
    try {
      setUpdating(true);

      const result = await markNotificationAsRead(notificationId);

      if (result.success) {
        setNotifications(notifications.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        ));
      } else {
        alert(`Gagal: ${result.error || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      alert('Terjadi kesalahan sistem.');
    } finally {
      setUpdating(false);
    }
  };

  // -----------------------------
  // Mark ALL Notification Read
  // -----------------------------
  const handleMarkAllAsRead = async () => {
    try {
      setUpdating(true);

      const result = await markAllNotificationsAsRead();

      if (result.success) {
        // update local state
        setNotifications(notifications.map(notif => ({
          ...notif,
          read: true
        })));

        alert(result.message || 'Semua notifikasi telah ditandai sebagai dibaca');
      } else {
        alert(`Gagal: ${result.error || 'Terjadi kesalahan tidak diketahui'}`);
      }

    } catch (error) {
      console.error('Error in handleMarkAllAsRead:', error);
      alert('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setUpdating(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
    if (diffInHours < 24) return `${diffInHours} jam lalu`;
    if (diffInDays === 1) return 'Kemarin';
    return `${diffInDays} hari lalu`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'restaurant_new': return '🏪';
      case 'restaurant_approved': return '✅';
      case 'restaurant_rejected': return '❌';
      case 'user_registered': return '👤';
      case 'reservation_new': return '📅';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Notifikasi Sistem</h1>
          <p className="text-gray-600 mb-8">Kelola notifikasi dan aktivitas sistem</p>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{notifications.length}</div>
                  <div className="text-gray-600">Total Notifikasi</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{readCount}</div>
                  <div className="text-gray-600">Telah Dibaca</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
                  <div className="text-gray-600">Belum Dibaca</div>
                </div>
              </div>

              <button
                onClick={handleMarkAllAsRead}
                disabled={updating || unreadCount === 0}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:bg-orange-400"
              >
                {updating ? 'Memproses...' : 'Tandai Semua Dibaca'}
              </button>
            </div>
          </div>

          {/* Notification List */}
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Memuat notifikasi...</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🔔</div>
                  <p className="text-gray-500 text-lg">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-6 hover:bg-gray-50 ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="text-2xl">{getNotificationIcon(notification.type)}</div>

                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold ${!notification.read ? 'text-blue-900' : 'text-gray-900'}`}>
                              {notification.title}
                            </h3>

                            <p className={`${!notification.read ? 'text-blue-700' : 'text-gray-600'} mt-1`}>
                              {notification.message}
                            </p>

                            <p className="text-sm text-gray-400 mt-2">
                              {formatTime(notification.createdAt)}
                            </p>

                            {notification.relatedId && (
                              <p className="text-xs text-gray-500 mt-1">ID: {notification.relatedId}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={updating}
                              className="text-sm text-orange-600 hover:text-orange-800"
                            >
                              Tandai Dibaca
                            </button>
                          )}
                          <span className={`inline-block w-2 h-2 rounded-full ${!notification.read ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
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
    </Layout>
  );
}
