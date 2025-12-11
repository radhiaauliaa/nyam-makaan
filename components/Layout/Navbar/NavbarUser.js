import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext';
import { useState } from 'react';

export default function NavbarUser() {
  const { logout, unreadNotificationCount, notifications, markNotificationAsRead, refreshNotifications } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserDropdown(false);
      router.push('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/popular', label: 'Popular' },
    { href: '/promo', label: 'Promo' },
    { href: '/terdekat', label: 'Terdekat' },
  ];

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo dengan Gambar */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0 hover:opacity-90">
            <div className="relative w-12 h-12">
              <Image
                src="/images/logo.png"
                alt="NYAM! MAKAN Logo"
                width={112}
                height={112}
                className="rounded-lg object-contain"
                priority
              />
            </div>
            <div>
              <span className="text-xl font-bold text-orange-600">NYAM!</span>
              <span className="text-xl font-bold text-gray-800">MAKAN</span>
              <p className="text-xs text-gray-500">Food Discovery</p>
            </div>
          </Link>

          {/* Desktop Navigation with Search */}
          <div className="hidden md:flex items-center space-x-6 flex-1 mx-8">
            <nav className="flex space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${
                    router.pathname === link.href
                      ? 'text-orange-600 font-semibold'
                      : 'text-gray-700 hover:text-orange-600'
                  } font-medium transition-colors`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Cari restoran, makanan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full pl-4 pr-10 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-orange-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4 relative">
            {/* Notification Bell */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 text-gray-700 hover:text-orange-600 transition-colors hover:bg-orange-50 rounded-full"
                aria-label="Notifications"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C8.67 6.165 8 7.388 8 8.75V14.158c0 .538-.214 1.055-.595 1.437L6 17h5m4 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
                    <div className="px-4 pb-2 flex items-center justify-between">
                      <div className="font-semibold text-gray-700">Notifikasi</div>
                      <Link href="/user/notifications" className="text-xs text-orange-600 hover:underline" onClick={() => setShowNotifDropdown(false)}>
                        Lihat semua
                      </Link>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      {(notifications || []).slice(0, 5).map((notif) => (
                        <div key={notif.id} className={`px-4 py-3 hover:bg-gray-50 ${notif.read || notif.isRead ? 'opacity-80' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="pr-3">
                              <div className="text-sm font-medium text-gray-800">{notif.title || 'Notifikasi'}</div>
                              <div className="text-xs text-gray-600 mt-1">{notif.message}</div>
                              {notif.restaurantName && (
                                <div className="text-xs text-gray-500 mt-1">{notif.restaurantName}</div>
                              )}
                            </div>
                            {!(notif.read || notif.isRead) && (
                              <button
                                className="text-xs text-orange-600 hover:underline flex-shrink-0"
                                onClick={async () => {
                                  await markNotificationAsRead(notif.id);
                                  await refreshNotifications();
                                }}
                              >
                                Tandai dibaca
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {(notifications || []).length === 0 && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">Belum ada notifikasi</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-600 hover:text-orange-600 p-2"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              {showUserDropdown ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            {/* Desktop Profile Icon with Dropdown */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 transition-colors p-2 hover:bg-orange-50 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                    <Link
                      href="/user/profile"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <div className="font-medium">Profil Saya</div>
                      <div className="text-gray-500 text-xs mt-1">Lihat dan kelola profil</div>
                    </Link>
                    <Link
                      href="/user/reservations"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <div className="font-medium">Reservasi</div>
                      <div className="text-gray-500 text-xs mt-1">Lihat riwayat reservasi</div>
                    </Link>
                    <Link
                      href="/user/reviews"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <div className="font-medium">Ulasan Saya</div>
                      <div className="text-gray-500 text-xs mt-1">Lihat ulasan yang diberikan</div>
                    </Link>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <div className="font-medium">Keluar</div>
                      <div className="text-red-500 text-xs mt-1">Keluar dari akun Anda</div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showUserDropdown && (
          <div className="md:hidden border-t border-gray-200 py-4">
            {/* Navigation Links */}
            <nav className="space-y-1 mb-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${
                    router.pathname === link.href
                      ? 'bg-orange-50 text-orange-600 border-r-4 border-orange-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  } block px-4 py-3 font-medium transition-colors`}
                  onClick={() => setShowUserDropdown(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Notifications Shortcut */}
            <div className="px-4 mb-2">
              <Link href="/user/notifications" className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg" onClick={() => setShowUserDropdown(false)}>
                <div className="relative mr-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C8.67 6.165 8 7.388 8 8.75V14.158c0 .538-.214 1.055-.595 1.437L6 17h5m4 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {unreadNotificationCount}
                    </span>
                  )}
                </div>
                <span>Notifikasi</span>
              </Link>
            </div>

            {/* Mobile Search Bar */}
            <form onSubmit={handleSearch} className="px-4 mb-4">
              <input
                type="text"
                placeholder="Cari restoran..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </form>

            {/* User Menu Items */}
            <div className="border-t border-gray-200 pt-4">
              <Link
                href="/user/profile"
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowUserDropdown(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profil Saya</span>
              </Link>
              <Link
                href="/user/reservations"
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowUserDropdown(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Reservasi</span>
              </Link>
              <Link
                href="/user/reviews"
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50"
                onClick={() => setShowUserDropdown(false)}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>Ulasan Saya</span>
              </Link>
              <hr className="my-2 border-gray-200" />
              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left px-4 py-3 text-red-600 hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}