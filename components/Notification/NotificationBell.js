import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getOwnerNotifications, 
  getUserNotifications,
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadNotificationCount 
} from '../../lib/firestore';
import { useRouter } from 'next/router';

export default function NotificationBell() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Fetch notifikasi berdasarkan role
  useEffect(() => {
    if (currentUser && userData) {
      setLoading(true);
      
      let unsubscribe = null;
      
      // Hanya owner yang punya notifikasi real-time
      if (userData?.role === 'owner') {
        unsubscribe = getOwnerNotifications(currentUser.uid, (fetchedNotifications) => {
          if (fetchedNotifications) {
            setNotifications(fetchedNotifications);
            const unread = fetchedNotifications.filter(n => !n.isRead).length;
            setUnreadCount(unread);
          }
          setLoading(false);
        });

        return () => unsubscribe && unsubscribe();
      } else {
        // Untuk user dan admin, load sekali
        loadNotificationsOnce();
      }
    }
  }, [currentUser, userData]);

  const loadNotificationsOnce = async () => {
    try {
      // User biasa bisa dapat notifikasi (reservasi dikonfirmasi, dll)
      if (userData?.role === 'user') {
        const result = await getUserNotifications(currentUser.uid);
        if (result.success) {
          setNotifications(result.data);
          const unread = result.data.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      }
      // Admin tidak butuh notifikasi bell untuk sekarang
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification) => {
    // Tandai sebagai sudah dibaca
    if (userData?.role === 'owner') {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id);
      }
    }

    // Redirect berdasarkan tipe notifikasi
    if (notification.type === 'new_reservation' && notification.reservationId) {
      if (userData?.role === 'owner') {
        router.push(`/owner/reservations/${notification.reservationId}`);
      } else {
        router.push(`/user/reservations/${notification.reservationId}`);
      }
    } else if (notification.type === 'reservation_confirmed') {
      router.push(`/user/reservations`);
    } else if (notification.restaurantId && userData?.role === 'owner') {
      router.push(`/owner/dashboard`);
    }
    
    setShowDropdown(false);
  };

  const handleMarkAllAsRead = async () => {
    if (currentUser && userData?.role === 'owner') {
      await markAllNotificationsAsRead(currentUser.uid);
      setUnreadCount(0);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays < 7) return `${diffDays} hari lalu`;
      
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      return '';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_reservation':
        return '📅';
      case 'reservation_confirmed':
        return '✅';
      case 'reservation_cancelled':
        return '❌';
      case 'review':
        return '⭐';
      case 'system':
        return '📢';
      default:
        return '🔔';
    }
  };

  // Hanya tampilkan untuk owner dan user (bukan admin)
  if (!currentUser || (userData?.role !== 'owner' && userData?.role !== 'user')) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="Notifikasi"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notifikasi</h3>
              <div className="flex items-center space-x-2">
                {userData?.role === 'owner' && unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Tandai semua terbaca
                  </button>
                )}
                <button
                  onClick={() => {
                    if (userData?.role === 'owner') {
                      router.push('/owner/notifications');
                    } else {
                      router.push('/user/notifications');
                    }
                    setShowDropdown(false);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Lihat semua
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                <p className="text-gray-500 text-sm mt-2">Memuat notifikasi...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-gray-500 mt-2">Tidak ada notifikasi</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    (userData?.role === 'owner' ? !notification.isRead : !notification.read) 
                      ? 'bg-blue-50' 
                      : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-medium ${
                          (userData?.role === 'owner' ? !notification.isRead : !notification.read) 
                            ? 'text-gray-900' 
                            : 'text-gray-700'
                        }`}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.restaurantName && (
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {notification.restaurantName}
                        </div>
                      )}
                    </div>
                    {(userData?.role === 'owner' ? !notification.isRead : !notification.read) && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 5 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button
                onClick={() => {
                  if (userData?.role === 'owner') {
                    router.push('/owner/notifications');
                  } else {
                    router.push('/user/notifications');
                  }
                  setShowDropdown(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Lihat semua notifikasi ({notifications.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}