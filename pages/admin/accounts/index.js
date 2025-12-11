import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Layout from '../../../components/Layout/Layout';
import {
  getReportedUsersByStatus,
  getUsersWithRepeatedNegativeReviews,
  getLowRatedRestaurants,
  suspendUserAccount,
  suspendRestaurantAccount,
} from '../../../lib/firestore';

export default function AdminAccountsPage() {
  const { currentUser, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users'); // users | restaurants
  const [reportedUsers, setReportedUsers] = useState([]);
  const [repeatNegUsers, setRepeatNegUsers] = useState([]);
  const [lowRatedRestaurants, setLowRatedRestaurants] = useState([]);
  const [suspending, setSuspending] = useState(null);

  const isAdmin = userData?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      if (!isAdmin) return;
      setLoading(true);
      try {
        const [rep, repNeg, lowRest] = await Promise.all([
          getReportedUsersByStatus('pending'),
          getUsersWithRepeatedNegativeReviews(10),
          getLowRatedRestaurants(2),
        ]);
        setReportedUsers(rep.success ? rep.data : []);
        setRepeatNegUsers(repNeg.success ? repNeg.data : []);
        setLowRatedRestaurants(lowRest.success ? lowRest.data : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (!currentUser) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Silakan login sebagai admin.</p>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Akses ditolak. Halaman ini khusus admin.</p>
        </div>
      </Layout>
    );
  }

  const handleSuspendUser = async (userId, reason) => {
    try {
      setSuspending(`user:${userId}`);
      const res = await suspendUserAccount(userId, reason || 'Pelanggaran kebijakan');
      if (!res?.success) {
        alert(res?.error || 'Gagal menangguhkan user');
      } else {
        alert('User ditangguhkan');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSuspending(null);
    }
  };

  const handleSuspendRestaurant = async (restaurantId, reason) => {
    try {
      setSuspending(`rest:${restaurantId}`);
      const res = await suspendRestaurantAccount(restaurantId, reason || 'Rating rendah / masalah kualitas');
      if (!res?.success) {
        alert(res?.error || 'Gagal menangguhkan restoran');
      } else {
        alert('Restoran ditangguhkan');
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSuspending(null);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Kelola Akun & Restoran Bermasalah</h1>
            <p className="text-gray-600 mt-1">Pantau akun yang dilaporkan atau banyak ulasan negatif, serta restoran rating rendah.</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow p-2 mb-6">
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 rounded ${tab === 'users' ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setTab('users')}
              >
                Akun Bermasalah
              </button>
              <button
                className={`px-4 py-2 rounded ${tab === 'restaurants' ? 'bg-orange-100 text-orange-700' : 'text-gray-700 hover:bg-gray-100'}`}
                onClick={() => setTab('restaurants')}
              >
                Restoran Bermasalah
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto" />
              <p className="text-gray-600 mt-4">Memuat data...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {tab === 'users' && (
                <div className="space-y-8">
                  {/* Reported by owner */}
                  <section>
                    <h2 className="text-xl font-semibold mb-3">Akun Dilaporkan (Menunggu Tindakan)</h2>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">User</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Email</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Jumlah Report</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Terakhir</th>
                            <th className="px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportedUsers.length === 0 ? (
                            <tr><td className="px-4 py-4 text-gray-500" colSpan={5}>Tidak ada data</td></tr>
                          ) : reportedUsers.map((u) => (
                            <tr key={u.userId}>
                              <td className="px-4 py-3">{u.displayName || u.userId}</td>
                              <td className="px-4 py-3">{u.email || '-'}</td>
                              <td className="px-4 py-3">{u.count}</td>
                              <td className="px-4 py-3">{u.lastReportAt ? new Date(u.lastReportAt).toLocaleString('id-ID') : '-'}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleSuspendUser(u.userId, 'Terlapor oleh pemilik restoran')}
                                  disabled={suspending === `user:${u.userId}`}
                                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {suspending === `user:${u.userId}` ? 'Menangguhkan...' : 'Tangguhkan' }
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Repeated negative reviewers */}
                  <section>
                    <h2 className="text-xl font-semibold mb-3">Akun dengan 10x Ulasan Buruk pada Restoran Sama</h2>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">User</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Email</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Restoran</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Jumlah</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Terakhir</th>
                            <th className="px-4 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {repeatNegUsers.length === 0 ? (
                            <tr><td className="px-4 py-4 text-gray-500" colSpan={6}>Tidak ada data</td></tr>
                          ) : repeatNegUsers.map((r) => (
                            <tr key={`${r.userId}_${r.restaurantId}`}>
                              <td className="px-4 py-3">{r.userName || r.userId}</td>
                              <td className="px-4 py-3">{r.userEmail || '-'}</td>
                              <td className="px-4 py-3">{r.restaurantName || r.restaurantId}</td>
                              <td className="px-4 py-3">{r.count}</td>
                              <td className="px-4 py-3">{r.lastAt ? new Date(r.lastAt).toLocaleString('id-ID') : '-'}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleSuspendUser(r.userId, 'Ulasan buruk berulang pada restoran yang sama')}
                                  disabled={suspending === `user:${r.userId}`}
                                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  {suspending === `user:${r.userId}` ? 'Menangguhkan...' : 'Tangguhkan' }
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {tab === 'restaurants' && (
                <section>
                  <h2 className="text-xl font-semibold mb-3">Restoran dengan Rating &lt; 2</h2>
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Restoran</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Rating</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Owner</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lowRatedRestaurants.length === 0 ? (
                          <tr><td className="px-4 py-4 text-gray-500" colSpan={4}>Tidak ada data</td></tr>
                        ) : lowRatedRestaurants.map((r) => (
                          <tr key={r.id}>
                            <td className="px-4 py-3">{r.name || r.id}</td>
                            <td className="px-4 py-3">{typeof r.rating === 'number' ? r.rating.toFixed(1) : (r.rating || '-')}</td>
                            <td className="px-4 py-3">{r.ownerId || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleSuspendRestaurant(r.id, 'Rating rendah / masalah kualitas')}
                                disabled={suspending === `rest:${r.id}`}
                                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                {suspending === `rest:${r.id}` ? 'Menangguhkan...' : 'Tangguhkan' }
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
