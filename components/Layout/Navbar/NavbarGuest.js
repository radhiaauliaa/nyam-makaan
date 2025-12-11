import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext';

export default function NavbarGuest() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      router.push('/');
    }
  };

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

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/" 
              className={`font-medium ${router.pathname === '/' ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'}`}
            >
              Home
            </Link>
            <Link 
              href="/guest/popular" 
              className={`font-medium ${router.pathname === '/guest/popular' ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'}`}
            >
              Popular
            </Link>
            <Link 
              href="/guest/promo" 
              className={`font-medium ${router.pathname === '/guest/promo' ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'}`}
            >
              Promo
            </Link>
            <Link 
              href="/guest/terdekat" 
              className={`font-medium ${router.pathname === '/guest/terdekat' ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'}`}
            >
              Terdekat
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <>
                <div className="hidden md:flex items-center space-x-3">
                  <span className="text-gray-700 text-sm font-medium">
                    Halo, {currentUser.displayName || 'User'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
                  >
                    Logout
                  </button>
                </div>
                <div className="md:hidden">
                  <button
                    onClick={handleLogout}
                    className="text-gray-700 hover:text-orange-600"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className="text-gray-700 hover:text-orange-600 font-medium"
                >
                  Login
                </Link>
                <Link 
                  href="/auth/register" 
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium hidden md:inline-block"
                >
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}