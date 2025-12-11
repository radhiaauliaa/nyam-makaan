import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getUnreadNotificationCount, getOwnerNotifications, markNotificationAsRead, getRestaurantsByOwner } from '../../../lib/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function NavbarOwner() {
  const { userData, currentUser, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isRejectedOwner, setIsRejectedOwner] = useState(false);
  
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (currentUser && userData?.role === 'owner') {
      // Check restaurant status for rejection
      (async () => {
        try {
          const list = await getRestaurantsByOwner(currentUser.uid);
          if (list && list.length > 0) {
            const r = list[0];
            if (r.status === 'rejected') {
              setIsRejectedOwner(true);
            } else {
              setIsRejectedOwner(false);
            }
          } else {
            setIsRejectedOwner(false);
          }
        } catch (e) {
          setIsRejectedOwner(false);
        }
      })();

      loadUnreadCount();
      
      // Setup real-time notifications listener
      const unsubscribe = getOwnerNotifications(currentUser.uid, (fetchedNotifications) => {
        if (fetchedNotifications) {
          setNotifications(fetchedNotifications);
          const unread = fetchedNotifications.filter(n => !n.isRead).length;
          setUnreadCount(unread);
        }
      });

      return () => unsubscribe && unsubscribe();
    }
  }, [currentUser, userData]);

  const loadUnreadCount = async () => {
    try {
      if (currentUser) {
        const result = await getUnreadNotificationCount(currentUser.uid);
        if (result.success) {
          setUnreadCount(result.count);
        }
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }
    
    // Redirect
    if (notification.reservationId) {
      router.push(`/owner/reservations/${notification.reservationId}`);
    }
    setShowNotifications(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)} jam lalu`;
      return `${Math.floor(diffMins / 1440)} hari lalu`;
    } catch {
      return '';
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      {isRejectedOwner && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
            <p className="text-sm text-red-700 font-medium">
              Restoran Anda ditolak admin karena tidak memenuhi persyaratan. Anda tidak dapat mengakses fitur pemilik.
            </p>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-md"
            >
              Kembali ke Dashboard Guest
            </button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo dan Brand - DIPERBESAR */}
          <div className="flex items-center">
            <Link href="/owner/dashboard" className="flex items-center space-x-3">
              {/* Logo Image - DIPERBESAR */}
              <div className="relative w-16 h-16"> {/* Diperbesar dari w-10 h-10 menjadi w-16 h-16 */}
                <Image
                  src="/images/logo.png" // Pastikan file ini ada di public/images/logo.png
                  alt="NYAMI MAKAN Logo"
                  width={112} 
                  height={112} 
                  className="rounded-lg object-contain"
                  priority
                />
              </div>
              <div>
                <span className="text-xl font-bold text-orange-600 hidden md:block">
                  NYAM! MAKAN
                </span>
                <span className="text-xs text-gray-500 hidden md:block">Owner Panel</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href={isRejectedOwner ? '/' : '/owner/dashboard'} 
              onClick={(e) => { if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              className={`font-medium ${isRejectedOwner ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-orange-600'} ${router.pathname === '/owner/dashboard' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              href={isRejectedOwner ? '/' : '/owner/menu'} 
              onClick={(e) => { if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              className={`font-medium ${isRejectedOwner ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-orange-600'} ${router.pathname === '/owner/menu' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Kelola Menu
            </Link>
            <Link 
              href={isRejectedOwner ? '/' : '/owner/reservations'} 
              onClick={(e) => { if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              className={`font-medium ${isRejectedOwner ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-orange-600'} ${router.pathname === '/owner/reservations' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Reservasi
            </Link>
            <Link 
              href={isRejectedOwner ? '/' : '/owner/reviews'} 
              onClick={(e) => { if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              className={`font-medium ${isRejectedOwner ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-orange-600'} ${router.pathname === '/owner/reviews' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Ulasan
            </Link>
          </div>

          {/* User Menu dengan Notification Bell */}
          <div className="flex items-center space-x-6">
            {/* Notification Bell dengan Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => {
                  if (isRejectedOwner) { router.push('/'); return; }
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className={`relative p-2 rounded-lg transition-colors ${isRejectedOwner ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'}`}
              >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                  />
                </svg>
                
                {/* Notification Badge */}
                {unreadCount > 0 && !isRejectedOwner && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform bg-red-600 rounded-full min-w-6 h-6">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 text-lg">Notifikasi</h3>
                      <div className="flex items-center space-x-3">
                        {unreadCount > 0 && (
                          <button
                            onClick={() => {
                              // Function to mark all as read
                              setShowNotifications(false);
                              router.push('/owner/notifications');
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Tandai semua
                          </button>
                        )}
                        <Link 
                          href="/owner/notifications"
                          onClick={() => setShowNotifications(false)}
                          className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Lihat semua
                        </Link>
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                          />
                        </svg>
                        <p className="text-gray-500 mt-2">Tidak ada notifikasi</p>
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                            !notification.isRead ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                              notification.type === 'new_reservation' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {notification.type === 'new_reservation' ? '📅' : '🔔'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {notification.title}
                                </p>
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
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {notification.restaurantName}
                                </div>
                              )}
                            </div>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 5 && (
                    <div className="p-3 border-t border-gray-200 text-center">
                      <Link
                        href="/owner/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Lihat semua notifikasi ({notifications.length})
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Icon dengan Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {/* Profile Icon */}
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-300">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                    />
                  </svg>
                </div>
                
                {/* Nama user kecil di desktop */}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                    {userData?.name || userData?.email || 'Pemilik'}
                  </p>
                  <p className="text-xs text-gray-500">Owner</p>
                </div>
                
                {/* Chevron icon */}
                <svg 
                  className={`w-5 h-5 text-gray-500 transition-transform ${showProfileMenu ? 'transform rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center border-2 border-orange-300">
                        <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {userData?.name || userData?.email || 'Pemilik'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{userData?.email}</p>
                        <p className="text-xs text-orange-600 font-medium mt-1">Owner Account</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                          />
                        </svg>
                        <span>Keluar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => {
                setShowMobileMenu(!showMobileMenu);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-4 bg-white rounded-lg shadow-lg mt-2">
            <div className="space-y-1 px-2">
              <Link 
                href={isRejectedOwner ? '/' : '/owner/dashboard'} 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                onClick={(e) => { setShowMobileMenu(false); if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                  />
                </svg>
                <span>Dashboard</span>
              </Link>
              
              <Link 
                href={isRejectedOwner ? '/' : '/owner/menu'} 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                onClick={(e) => { setShowMobileMenu(false); if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
                  />
                </svg>
                <span>Kelola Menu</span>
              </Link>
              
              <Link 
                href={isRejectedOwner ? '/' : '/owner/reservations'} 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                onClick={(e) => { setShowMobileMenu(false); if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                  />
                </svg>
                <span>Reservasi</span>
              </Link>
              
              <Link 
                href={isRejectedOwner ? '/' : '/owner/reviews'} 
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                onClick={(e) => { setShowMobileMenu(false); if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
                  />
                </svg>
                <span>Ulasan</span>
              </Link>
              
              <Link 
                href={isRejectedOwner ? '/' : '/owner/notifications'} 
                className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                onClick={(e) => { setShowMobileMenu(false); if (isRejectedOwner) { e.preventDefault(); router.push('/'); } }}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                    />
                  </svg>
                  <span>Notifikasi</span>
                </div>
                {unreadCount > 0 && !isRejectedOwner && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                    />
                  </svg>
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}