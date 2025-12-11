import { useEffect, useState, useRef } from 'react';
import Layout from '../../../components/Layout/Layout';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserNotifications, markNotificationAsRead } from '../../../lib/firestore';

export default function UserNotificationsPage() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    try {
      unsubscribeRef.current = getUserNotifications(currentUser.uid, (list) => {
        setNotifications(list);
        setLoading(false);
      });
    } catch (e) {
      console.error('Error subscribing notifications:', e);
      setLoading(false);
    }
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [currentUser]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
    } catch (e) {
      console.warn('Failed marking read:', e?.message || e);
    }
  };

  const iconForType = (type) => {
    switch (type) {
      case 'reservation_confirmed':
        return '✅';
      case 'new_reservation':
        return '📅';
      case 'new_review':
        return '⭐';
      default:
        return '🔔';
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Baru saja';
      if (mins < 60) return `${mins} menit lalu`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} jam lalu`;
      const days = Math.floor(hrs / 24);
      return `${days} hari lalu`;
    } catch {
      return '';
    }
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Silakan login untuk melihat notifikasi.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Notifikasi</h1>
            <p className="text-gray-600 mt-1">Notifikasi terbaru untuk akun Anda</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto" />
              <p className="text-gray-600 mt-4">Memuat notifikasi...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600">Tidak ada notifikasi</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
              {notifications.map((n) => (
                <div key={n.id} className={`p-4 flex items-start ${!n.isRead ? 'bg-blue-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mr-4 ${!n.isRead ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                    {iconForType(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900 truncate">{n.title || 'Notifikasi'}</h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap ml-2">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{n.message}</p>
                    {n.restaurantName && (
                      <p className="text-xs text-gray-500 mt-1">Restoran: {n.restaurantName}</p>
                    )}
                    {n.date && n.time && (
                      <p className="text-xs text-gray-500">Jadwal: {n.date} • {n.time}</p>
                    )}
                  </div>
                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Tandai dibaca
                    </button>
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
