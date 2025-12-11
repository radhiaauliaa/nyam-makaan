import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getUnreadSystemNotificationsCount } from '../../../lib/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

export default function NavbarAdmin() {
  const { userData, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    if (userData?.role === 'admin') {
      loadUnreadCount();
      // Refresh every 30 seconds untuk update notifikasi
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [userData]);

  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadSystemNotificationsCount();
      if (result.success) {
        setUnreadCount(result.count);
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

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo dan Brand */}
          <div className="flex items-center">
            <Link href="/admin/dashboard" className="flex items-center space-x-3">
              {/* Logo Image */}
              <div className="relative w-10 h-10">
                <Image
                  src="/images/logo.png" // Pastikan file ini ada di public/images/logo.png
                  alt="NYAMI MAKAN Logo"
                  width={96}
                  height={96}
                  className="rounded-lg"
                  priority
                />
              </div>
              <div>
                <span className="text-xl font-bold text-orange-600 hidden md:block">
                  NYAM! MAKAN
                </span>
                <span className="text-xs text-gray-500 hidden md:block">Admin Panel</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/admin/dashboard" 
              className={`text-gray-700 hover:text-orange-600 font-medium ${router.pathname === '/admin/dashboard' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/admin/users" 
              className={`text-gray-700 hover:text-orange-600 font-medium ${router.pathname === '/admin/users' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Kelola User
            </Link>
            <Link 
              href="/admin/restaurants" 
              className={`text-gray-700 hover:text-orange-600 font-medium ${router.pathname === '/admin/restaurants' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Kelola Resto
            </Link>
            <Link 
              href="/admin/reports" 
              className={`text-gray-700 hover:text-orange-600 font-medium ${router.pathname === '/admin/reports' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Laporan Ulasan
            </Link>
            <Link 
              href="/admin/notifications" 
              className={`text-gray-700 hover:text-orange-600 font-medium ${router.pathname === '/admin/notifications' ? 'text-orange-600 border-b-2 border-orange-600' : ''}`}
            >
              Notifikasi
            </Link>
          </div>

          {/* User Menu dengan Notification Bell */}
          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <Link 
              href="/admin/notifications" 
              className="relative p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                />
              </svg>
              
              {/* Notification Badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform bg-red-600 rounded-full min-w-5 h-5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User Info & Logout */}
            <div className="hidden md:flex items-center space-x-3">
              <div className="text-right">
                <span className="text-orange-600 font-medium block">
                  {userData?.displayName || userData?.email || 'Admin'}
                </span>
                <span className="text-xs text-gray-500">Admin</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">
                  {userData?.displayName?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium transition-colors"
              >
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
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
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2 px-2">
              <Link 
                href="/admin/dashboard" 
                className="block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg"
                onClick={() => setShowMobileMenu(false)}
              >
                Dashboard
              </Link>
              <Link 
                href="/admin/users" 
                className="block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg"
                onClick={() => setShowMobileMenu(false)}
              >
                Kelola User
              </Link>
              <Link 
                href="/admin/restaurants" 
                className="block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg"
                onClick={() => setShowMobileMenu(false)}
              >
                Kelola Resto
              </Link>
              <Link 
                href="/admin/reports" 
                className="block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg"
                onClick={() => setShowMobileMenu(false)}
              >
                Laporan Ulasan
              </Link>
              <Link 
                href="/admin/notifications" 
                className="block px-4 py-2 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg"
                onClick={() => setShowMobileMenu(false)}
              >
                Notifikasi
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-sm">
                        {userData?.displayName?.charAt(0)?.toUpperCase() || 'A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-orange-600 font-medium block">
                        {userData?.displayName || userData?.email || 'Admin'}
                      </span>
                      <span className="text-xs text-gray-500">Admin</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium text-sm"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}