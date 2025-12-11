import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import Link from 'next/link';
import Image from 'next/image';

export default function ResetPassword() {
  const router = useRouter();
  const { oobCode } = router.query;
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [codeValid, setCodeValid] = useState(true);
  const [email, setEmail] = useState('');

  // Verifikasi reset code saat komponen dimuat
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode) return;

      try {
        // Verifikasi kode reset password
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(verifiedEmail);
        setCodeValid(true);
      } catch (error) {
        console.error('Error verifying reset code:', error);
        setCodeValid(false);
        setError('Link reset password tidak valid atau sudah kadaluarsa');
      }
    };

    verifyCode();
  }, [oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Harap isi semua field');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Konfirmasi reset password
      await confirmPasswordReset(auth, oobCode, newPassword);
      
      setSuccess('Password berhasil direset!');
      
      // Redirect ke login setelah 3 detik
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
      
    } catch (error) {
      console.error('Error resetting password:', error);
      
      switch (error.code) {
        case 'auth/weak-password':
          setError('Password terlalu lemah. Gunakan kombinasi huruf dan angka');
          break;
        case 'auth/invalid-action-code':
          setError('Link reset password tidak valid atau sudah kadaluarsa');
          break;
        case 'auth/expired-action-code':
          setError('Link reset password sudah kadaluarsa');
          break;
        default:
          setError('Terjadi kesalahan. Silakan coba lagi');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!codeValid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative w-12 h-12">
                <Image
                  src="/images/logo.png"
                  alt="NYAM! MAKAN Logo"
                  width={48}
                  height={48}
                  className="rounded-lg"
                  priority
                />
              </div>
              <div>
                <span className="text-xl font-bold text-orange-600">NYAM!</span>
                <span className="text-xl font-bold text-gray-800">MAKAN</span>
              </div>
            </Link>
          </div>
          
          <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Link Tidak Valid</h3>
              <p className="mt-2 text-sm text-gray-600">
                Link reset password tidak valid atau sudah kadaluarsa.
              </p>
              <div className="mt-6">
                <Link
                  href="/auth/forgot-password"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  Minta Link Baru
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/" className="flex items-center space-x-3">
            <div className="relative w-12 h-12">
              <Image
                src="/images/logo.png"
                alt="NYAM! MAKAN Logo"
                width={48}
                height={48}
                className="rounded-lg"
                priority
              />
            </div>
            <div>
              <span className="text-xl font-bold text-orange-600">NYAM!</span>
              <span className="text-xl font-bold text-gray-800">MAKAN</span>
            </div>
          </Link>
        </div>

        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Buat password baru untuk akun Anda
        </p>
        {email && (
          <p className="text-center text-sm text-gray-600">
            Email: <span className="font-medium">{email}</span>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 rounded-md bg-green-50 border border-green-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                  <p className="mt-1 text-sm text-green-700">
                    Mengalihkan ke halaman login...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Password Baru
              </label>
              <div className="mt-1">
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Minimal 6 karakter"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Konfirmasi Password Baru
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Ketik ulang password"
                />
              </div>
            </div>

            {/* Password Requirements */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Persyaratan Password:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className={newPassword.length >= 6 ? 'text-green-600' : ''}>
                  • Minimal 6 karakter {newPassword.length >= 6 && '✓'}
                </li>
                <li className={newPassword.match(/[A-Z]/) ? 'text-green-600' : ''}>
                  • Mengandung huruf besar {newPassword.match(/[A-Z]/) && '✓'}
                </li>
                <li className={newPassword.match(/[a-z]/) ? 'text-green-600' : ''}>
                  • Mengandung huruf kecil {newPassword.match(/[a-z]/) && '✓'}
                </li>
                <li className={newPassword.match(/\d/) ? 'text-green-600' : ''}>
                  • Mengandung angka {newPassword.match(/\d/) && '✓'}
                </li>
              </ul>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !codeValid}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Kembali ke</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div>
                <Link
                  href="/auth/login"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Login
                </Link>
              </div>
              <div>
                <Link
                  href="/auth/forgot-password"
                  className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700"
                >
                  Lupa Password
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}