import { useAuth } from '../../contexts/AuthContext';
import NavbarAdmin from './Navbar/NavbarAdmin';
import NavbarOwner from './Navbar/NavbarOwner';
import NavbarUser from './Navbar/NavbarUser';
import NavbarGuest from './Navbar/NavbarGuest'; // Buat juga untuk guest jika perlu

export default function Layout({ children }) {
  const { userData, authLoading } = useAuth();

  // Tampilkan loading jika auth masih loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Tentukan navbar mana yang akan ditampilkan berdasarkan role user
  const renderNavbar = () => {
    if (!userData) {
      return <NavbarGuest />; // Buat komponen NavbarGuest untuk pengunjung
    }

    switch (userData.role) {
      case 'admin':
        return <NavbarAdmin />;
      case 'owner':
        return <NavbarOwner />;
      case 'user':
        return <NavbarUser />;
      default:
        return <NavbarGuest />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavbar()}
      <main className="pb-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} NYAMI MAKAN. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Sistem reservasi restoran terbaik di Indonesia
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}