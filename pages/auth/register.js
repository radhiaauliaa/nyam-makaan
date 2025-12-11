import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout/Layout';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' // default sebagai pengguna
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Password tidak cocok');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, {
        displayName: formData.name
      });

      // Create user document in Firestore dengan role
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: formData.name,
        role: formData.role,
        createdAt: new Date(),
        // Additional fields based on role
        ...(formData.role === 'owner' && {
          restaurantId: null,
          hasRestaurant: false
        })
      });

      // Redirect based on role
      if (formData.role === 'owner') {
        router.push('/owner/dashboard');
      } else {
        router.push('/user/profile');
      }

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar');
      } else if (error.code === 'auth/weak-password') {
        setError('Password terlalu lemah');
      } else if (error.code === 'auth/invalid-email') {
        setError('Format email tidak valid');
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Daftar Akun Baru
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Pilih peran Anda dalam platform kami
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Saya ingin mendaftar sebagai:
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* User Role Card */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.role === 'user' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setFormData({...formData, role: 'user'})}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.role === 'user' ? 'border-orange-500 bg-orange-500' : 'border-gray-400'
                      }`}>
                        {formData.role === 'user' && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Pengguna</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Cari & pesan di restoran
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Owner Role Card */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.role === 'owner' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => setFormData({...formData, role: 'owner'})}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        formData.role === 'owner' ? 'border-orange-500 bg-orange-500' : 'border-gray-400'
                      }`}>
                        {formData.role === 'owner' && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Pemilik Resto</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Kelola restoran Anda
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder={formData.role === 'owner' ? "Nama pemilik restoran" : "Nama lengkap Anda"}
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Email Anda"
                  value={formData.email}
                  onChange={handleChange}
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Minimal 6 karakter"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Konfirmasi Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Ulangi password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {loading ? 'Mendaftarkan...' : `Daftar sebagai ${formData.role === 'owner' ? 'Pemilik Resto' : 'Pengguna'}`}
              </button>
            </div>

            <div className="text-center">
              <Link href="/auth/login" className="text-orange-600 hover:text-orange-500">
                Sudah punya akun? Masuk di sini
              </Link>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}