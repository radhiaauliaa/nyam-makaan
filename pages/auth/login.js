import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout/Layout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser, userData, authLoading } = useAuth();
  const router = useRouter();

  // ✅ Redirect otomatis jika sudah login
  useEffect(() => {
    if (currentUser && userData && !authLoading) {
      console.log('🔄 User data after login:', userData);
      
      // Beri delay kecil untuk memastikan semua state sudah update
      const timer = setTimeout(() => {
        if (userData.role === 'owner') {
          console.log('➡️ Redirecting to owner dashboard');
          router.replace('/owner/dashboard');
        } else if (userData.role === 'admin') {
          console.log('➡️ Redirecting to admin dashboard');
          router.replace('/admin/dashboard');
        } else {
          console.log('➡️ Redirecting to user profile');
          router.replace('/user/profile');
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [currentUser, userData, authLoading, router]);

  // ✅ Redirect jika sudah login saat pertama kali buka halaman
  useEffect(() => {
    if (!authLoading && currentUser && userData) {
      console.log('🔄 User already logged in:', userData);
      
      if (userData.role === 'owner') {
        router.replace('/owner/dashboard');
      } else if (userData.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/user/profile');
      }
    }
  }, [currentUser, userData, authLoading, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      console.log('🔑 Login result:', result);
      
      if (result.success) {
        console.log('✅ Login successful');
        // Setelah login berhasil, tunggu beberapa saat untuk userData terupdate
        setTimeout(() => {
          if (userData) {
            console.log('📊 User data available:', userData);
            // Redirect akan di-handle oleh useEffect di atas
          }
        }, 1000);
      } else {
        console.log('❌ Login failed:', result.error);
        // User-friendly error messages
        const errorMessage = result.error;
        if (errorMessage.includes('user-not-found')) {
          setError('Email tidak terdaftar');
        } else if (errorMessage.includes('wrong-password')) {
          setError('Password salah');
        } else if (errorMessage.includes('invalid-email')) {
          setError('Format email tidak valid');
        } else if (errorMessage.includes('too-many-requests')) {
          setError('Terlalu banyak percobaan. Coba lagi nanti.');
        } else if (errorMessage.includes('user-disabled')) {
          setError('Akun dinonaktifkan. Silakan hubungi admin.');
        } else {
          setError('Terjadi kesalahan. Silakan coba lagi.');
        }
      }
    } catch (error) {
      console.error('🔥 Login error:', error);
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Tampilkan loading jika auth sedang loading
  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memeriksa status login...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ✅ Jika sudah login, tampilkan loading redirect
  if (currentUser && userData && !authLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
            <p className="text-gray-600 mb-2">Login berhasil!</p>
            <p className="text-gray-600 text-sm">
              Mengarahkan ke dashboard {userData.role}...
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Jika tidak otomatis redirect,{' '}
              <button
                onClick={() => {
                  if (userData.role === 'owner') {
                    router.push('/owner/dashboard');
                  } else if (userData.role === 'admin') {
                    router.push('/admin/dashboard');
                  } else {
                    router.push('/user/profile');
                  }
                }}
                className="text-orange-600 hover:text-orange-700 underline"
              >
                klik di sini
              </button>
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Masuk ke Akun Anda
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sistem akan otomatis mengarahkan Anda berdasarkan peran akun
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="Email Anda"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all ${
                  loading ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Memproses...
                  </div>
                ) : (
                  'Masuk'
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-4">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Ingat saya
              </label>
            </div>
              
              <div>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  Lupa password?
                </Link>
              </div>
            </div>

            {/* Info tentang role */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Info Peran Akun:
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Pengguna:</strong> Bisa mencari & pesan restoran</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Pemilik Resto:</strong> Kelola restoran & reservasi</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span><strong>Admin:</strong> Kelola verifikasi & sistem</span>
                </li>
                <li className="flex items-start mt-2 pt-2 border-t border-blue-100">
                  <span className="mr-2">📢</span>
                  <span>Sistem otomatis mendeteksi peran Anda setelah login</span>
                </li>
              </ul>
            </div>

            {/* Demo credentials (untuk development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-800 mb-2">Demo Credentials:</h4>
                <div className="space-y-2 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Admin:</span> admin@demo.com / admin123
                  </div>
                  <div>
                    <span className="font-medium">Owner:</span> owner@demo.com / owner123
                  </div>
                  <div>
                    <span className="font-medium">User:</span> user@demo.com / user123
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
}