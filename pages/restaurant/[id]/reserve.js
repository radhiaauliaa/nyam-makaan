import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Layout from '../../../components/Layout/Layout';
import { 
  doc, 
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { createReservationNotification, getPromosByRestaurantId } from '../../../lib/firestore';

// 🔥 NONAKTIFKAN CONSOLE.LOG UNTUK MENCEGAH FAST REFRESH
const debug = true; // Diubah ke true untuk debugging

export default function ReservationPage() {
  const router = useRouter();
  const { id } = router.query;
  const { currentUser, userData } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [promos, setPromos] = useState([]);
  const [activeMenuPromoMap, setActiveMenuPromoMap] = useState({}); // menuId -> promo
  const [activeRestaurantPromos, setActiveRestaurantPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [reservationData, setReservationData] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    area: 'indoor',
    guests: 1,
    specialRequests: ''
  });
  const [selectedMenuItems, setSelectedMenuItems] = useState([]);
  
  // 🔥 REF UNTUK MENCEGAH DOUBLE CLICK
  const clickTimers = useRef({});

  useEffect(() => {
    if (id) {
      fetchRestaurantData();
    }
  }, [id]);

  const fetchRestaurantData = async () => {
    try {
      if (!id) return;
      
      debug && console.log('🔍 [Reservation] Fetching restaurant data for ID:', id);
      
      const restaurantDoc = await getDoc(doc(db, 'restaurants', id));
      if (restaurantDoc.exists()) {
        const restaurantData = { 
          id: restaurantDoc.id, 
          ...restaurantDoc.data() 
        };
        debug && console.log('✅ [Reservation] Restaurant data loaded:', restaurantData);
        setRestaurant(restaurantData);

        try {
          debug && console.log('🔍 [Reservation] Loading menus from subcollection...');
          const menusRef = collection(db, 'restaurants', id, 'menus');
          const menusQuery = query(menusRef, where('available', '==', true));
          
          const menuSnapshot = await getDocs(menusQuery);
          debug && console.log('🔍 [Reservation] Raw menus found:', menuSnapshot.size);

          const menuData = menuSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || 'No Name',
              price: data.price || 0,
              category: data.category || 'Lainnya',
              description: data.description || '',
              image: data.image || null,
              available: data.available !== false,
              ...data
            };
          });

          debug && console.log('✅ [Reservation] Final menus count:', menuData.length);
          setMenuItems(menuData);
          
          // Load promos for this restaurant
          try {
            const allPromos = await getPromosByRestaurantId(id);
            const now = new Date();
            const isActive = (p) => (
              (p.status === 'active') &&
              (!p.startDate || p.startDate <= now) &&
              (!p.endDate || p.endDate >= now)
            );
            const active = (allPromos || []).filter(isActive);
            setPromos(active);

            // Build menu promo map (choose strongest per menu)
            const map = {};
            active.filter(p => Array.isArray(p.menuIds) && p.menuIds.length > 0)
              .forEach((p) => {
                p.menuIds.forEach((mid) => {
                  const existing = map[mid];
                  if (!existing) {
                    map[mid] = p;
                  } else {
                    // choose promo with higher nominal impact for a single unit (rough heuristic)
                    const asAmount = (promo, price) => promo.discountType === 'percentage' 
                      ? (price * (Number(promo.discountValue) || 0) / 100)
                      : (Number(promo.discountValue) || 0);
                    const price = (menuData.find(m => m.id === mid)?.price) || 0;
                    if (asAmount(p, price) > asAmount(existing, price)) map[mid] = p;
                  }
                });
              });
            setActiveMenuPromoMap(map);

            // Restaurant-level promos (no menuIds)
            const restPromos = active.filter(p => !Array.isArray(p.menuIds) || p.menuIds.length === 0);
            setActiveRestaurantPromos(restPromos);
          } catch (promoErr) {
            debug && console.error('❌ [Reservation] Error loading promos:', promoErr);
            setPromos([]);
            setActiveMenuPromoMap({});
            setActiveRestaurantPromos([]);
          }
          
        } catch (menuError) {
          debug && console.error('❌ [Reservation] Error loading menus:', menuError);
          try {
            const menusRef = collection(db, 'restaurants', id, 'menus');
            const menuSnapshot = await getDocs(menusRef);
            const menuData = menuSnapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data().name || 'No Name',
              price: doc.data().price || 0,
              category: doc.data().category || 'Lainnya',
              description: doc.data().description || '',
              image: doc.data().image || null,
              available: doc.data().available !== false,
              ...doc.data()
            }));
            setMenuItems(menuData);
          } catch (fallbackError) {
            debug && console.error('❌ [Reservation] Fallback error:', fallbackError);
            setMenuItems([]);
          }
        }
      } else {
        debug && console.error('❌ [Reservation] Restaurant not found');
      }
      setLoading(false);
    } catch (error) {
      debug && console.error('❌ [Reservation] Error fetching restaurant:', error);
      setLoading(false);
    }
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    const category = item.category || 'Lainnya';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReservationData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 🔥 FUNGSI BARU DENGAN DEBOUNCING
  const addMenuItem = (item) => {
    const now = Date.now();
    const lastClick = clickTimers.current[item.id + '_add'] || 0;
    
    // Cegah double click dalam 500ms
    if (now - lastClick < 500) {
      debug && console.log('⏱️ [addMenuItem] Double click prevented for', item.name);
      return;
    }
    
    clickTimers.current[item.id + '_add'] = now;
    
    debug && console.log(`[addMenuItem] Adding ${item.name}`);
    setSelectedMenuItems(prev => {
      const existingIndex = prev.findIndex(i => i.id === item.id);
      if (existingIndex >= 0) {
        const newItems = [...prev];
        newItems[existingIndex].quantity += 1;
        return newItems;
      } else {
        return [...prev, { ...item, quantity: 1 }];
      }
    });
  };

  const removeMenuItem = (item) => {
    const now = Date.now();
    const lastClick = clickTimers.current[item.id + '_remove'] || 0;
    
    // Cegah double click dalam 500ms
    if (now - lastClick < 500) {
      debug && console.log('⏱️ [removeMenuItem] Double click prevented for', item.name);
      return;
    }
    
    clickTimers.current[item.id + '_remove'] = now;
    
    debug && console.log(`[removeMenuItem] Removing ${item.name}`);
    setSelectedMenuItems(prev => {
      const existingIndex = prev.findIndex(i => i.id === item.id);
      if (existingIndex >= 0) {
        const newItems = [...prev];
        if (newItems[existingIndex].quantity > 1) {
          newItems[existingIndex].quantity -= 1;
          return newItems;
        } else {
          return newItems.filter(i => i.id !== item.id);
        }
      }
      return prev;
    });
  };

  const removeAllMenuItem = (item) => {
    debug && console.log(`[removeAllMenuItem] Removing all ${item.name}`);
    setSelectedMenuItems(prev => prev.filter(i => i.id !== item.id));
  };

  const getMenuItemQuantity = (menuItemId) => {
    const item = selectedMenuItems.find(item => item.id === menuItemId);
    return item ? item.quantity : 0;
  };

  const calculateTotalPrice = () => {
    return selectedMenuItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  // Calculate discount and totals using active promos
  const calculateTotalsWithPromo = () => {
    const subtotal = calculateTotalPrice();
    if (subtotal <= 0) return { subtotal: 0, discount: 0, total: 0, applied: [] };

    // Item-level promos
    let itemDiscount = 0;
    const appliedItemPromos = [];
    selectedMenuItems.forEach((item) => {
      const promo = activeMenuPromoMap[item.id];
      if (!promo) return;
      // enforce minPurchase if present (on order subtotal)
      if (promo.minPurchase && subtotal < Number(promo.minPurchase)) return;
      const perItem = promo.discountType === 'percentage'
        ? (item.price * (Number(promo.discountValue) || 0) / 100)
        : (Number(promo.discountValue) || 0);
      const discountForItem = Math.min(perItem * item.quantity, item.price * item.quantity);
      if (discountForItem > 0) {
        itemDiscount += discountForItem;
        appliedItemPromos.push({ type: 'menu', promoId: promo.id, name: promo.name, amount: discountForItem });
      }
    });

    // Restaurant-level best promo (choose max discount)
    let bestRest = null;
    let bestRestAmount = 0;
    activeRestaurantPromos.forEach((p) => {
      if (p.minPurchase && subtotal < Number(p.minPurchase)) return;
      const amount = p.discountType === 'percentage'
        ? (subtotal * (Number(p.discountValue) || 0) / 100)
        : (Number(p.discountValue) || 0);
      const capped = Math.min(amount, subtotal);
      if (capped > bestRestAmount) {
        bestRestAmount = capped;
        bestRest = p;
      }
    });

    // Choose better between sum of item promos vs best restaurant promo (avoid stacking for simplicity)
    let discount = itemDiscount;
    let applied = appliedItemPromos;
    if (bestRestAmount > itemDiscount) {
      discount = bestRestAmount;
      applied = bestRest ? [{ type: 'restaurant', promoId: bestRest.id, name: bestRest.name, amount: discount }] : [];
    }

    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total, applied };
  };

  const handleSubmitReservation = async () => {
    if (!currentUser) {
      router.push('/auth/login');
      return;
    }

    if (!reservationData.date || !reservationData.time) {
      alert('Harap pilih tanggal dan waktu reservasi');
      return;
    }

    try {
      const totals = calculateTotalsWithPromo();
      const totalPrice = totals.total;
      const downPayment = totalPrice * 0.5;

      debug && console.log('📝 [handleSubmitReservation] Starting reservation creation...');
      debug && console.log('📊 [handleSubmitReservation] Restaurant data:', restaurant);
      debug && console.log('👤 [handleSubmitReservation] Current user:', currentUser.uid);
      debug && console.log('🏪 [handleSubmitReservation] Owner ID:', restaurant?.ownerId);

      // 1. Simpan reservasi ke database
      const reservationDataToSave = {
        restaurantId: id,
        restaurantName: restaurant.name,
        restaurantOwnerId: restaurant.ownerId,
        userId: currentUser.uid,
        userName: reservationData.name || userData?.displayName || 'User',
        userEmail: currentUser.email,
        userPhone: reservationData.phone || userData?.phone || '',
        date: reservationData.date,
        time: reservationData.time,
        area: reservationData.area,
        guests: parseInt(reservationData.guests),
        menuItems: selectedMenuItems,
        specialRequests: reservationData.specialRequests,
        totalBeforeDiscount: totals.subtotal,
        discount: Math.round(totals.discount),
        promoApplied: totals.applied,
        totalPrice: Math.round(totalPrice),
        downPayment: Math.round(downPayment),
        status: 'pending_approval',
        paymentStatus: 'unpaid',
        paymentMethod: '',
        paymentProof: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      debug && console.log('💾 [handleSubmitReservation] Saving reservation:', reservationDataToSave);

      const reservationDoc = await addDoc(collection(db, 'reservations'), reservationDataToSave);
      
      debug && console.log('✅ [handleSubmitReservation] Reservation created with ID:', reservationDoc.id);
      debug && console.log('👑 [handleSubmitReservation] Owner ID for notification:', restaurant.ownerId);

      // 2. BUAT NOTIFIKASI UNTUK OWNER
      if (restaurant.ownerId) {
        try {
          debug && console.log('🔔 [handleSubmitReservation] Creating notification for owner...');
          
          const notificationData = {
            id: reservationDoc.id,
            restaurantId: id,
            restaurantName: restaurant.name,
            customerName: reservationData.name || userData?.displayName || 'User',
            guestCount: parseInt(reservationData.guests),
            date: reservationData.date,
            time: reservationData.time,
            phone: reservationData.phone || userData?.phone || '',
            totalPrice: Math.round(totalPrice),
            downPayment: Math.round(downPayment),
            menuItems: selectedMenuItems
          };

          debug && console.log('📤 [handleSubmitReservation] Notification data:', notificationData);

          const notificationResult = await createReservationNotification(
            restaurant.ownerId, 
            notificationData
          );

          if (notificationResult.success) {
            debug && console.log('✅ [handleSubmitReservation] Notification created successfully');
          } else {
            debug && console.error('❌ [handleSubmitReservation] Failed to create notification:', notificationResult.error);
          }
        } catch (notificationError) {
          debug && console.error('❌ [handleSubmitReservation] Error creating notification:', notificationError);
          // Jangan gagalkan proses reservasi karena notifikasi gagal
        }
      } else {
        debug && console.error('❌ [handleSubmitReservation] Owner ID not found for restaurant');
      }

      alert('Reservasi berhasil diajukan! Menunggu persetujuan restoran.');
      router.push(`/user/reservations/${reservationDoc.id}`);
      
    } catch (error) {
      debug && console.error('❌ [handleSubmitReservation] Error creating reservation:', error);
      alert('Gagal mengajukan reservasi: ' + error.message);
    }
  };

  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const generateStarRating = (rating) => {
    if (!rating) return '☆☆☆☆☆';
    
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
      stars += '★';
    }
    if (halfStar) {
      stars += '½';
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars += '☆';
    }
    
    return stars;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Memuat data restoran...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!restaurant) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Restoran tidak ditemukan</h2>
            <button 
              onClick={() => router.push('/')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <button 
              onClick={() => router.back()}
              className="flex items-center text-orange-600 hover:text-orange-700 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Kembali
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Reservasi di {restaurant.name}</h1>
            <p className="text-gray-600 mt-2">Lengkapi data reservasi dan pilih menu</p>

            {/* Restaurant-level promo banner */}
            {activeRestaurantPromos && activeRestaurantPromos.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-900 font-semibold">Promo Restoran Aktif</p>
                    <p className="text-green-800 text-sm">
                      {activeRestaurantPromos[0].name || 'Promo'} — {activeRestaurantPromos[0].discountType === 'percentage' 
                        ? `${Number(activeRestaurantPromos[0].discountValue) || 0}%`
                        : `Rp ${(Number(activeRestaurantPromos[0].discountValue) || 0).toLocaleString('id-ID')}`}
                      {activeRestaurantPromos[0].minPurchase ? ` • Min. beli Rp ${Number(activeRestaurantPromos[0].minPurchase).toLocaleString('id-ID')}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { step: 1, label: 'Data Reservasi', active: activeStep >= 1 },
                { step: 2, label: 'Pilih Menu', active: activeStep >= 2 },
                { step: 3, label: 'Konfirmasi', active: activeStep >= 3 }
              ].map((stepInfo) => (
                <div key={stepInfo.step} className="flex items-center">
                  <div className={`flex items-center ${stepInfo.active ? 'text-orange-600' : 'text-gray-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      stepInfo.active ? 'bg-orange-600 text-white' : 'bg-gray-200'
                    }`}>
                      {stepInfo.step}
                    </div>
                    <span className="ml-2 font-medium hidden sm:block">{stepInfo.label}</span>
                  </div>
                  {stepInfo.step < 3 && (
                    <div className={`flex-1 h-1 mx-4 w-16 ${stepInfo.active ? 'bg-orange-600' : 'bg-gray-200'}`}></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Step 1: Data Reservasi */}
              {activeStep === 1 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Reservasi</h2>
                  
                  <div className="space-y-6">
                    {/* Informasi Pribadi */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pribadi</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Lengkap *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={reservationData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Masukkan nama lengkap"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nomor Telepon *
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={reservationData.phone}
                            onChange={handleInputChange}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                            placeholder="Masukkan nomor telepon"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Detail Reservasi */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Reservasi</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tanggal *
                          </label>
                          <input
                            type="date"
                            name="date"
                            value={reservationData.date}
                            onChange={handleInputChange}
                            required
                            min={getCurrentDate()}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Waktu *
                          </label>
                          <input
                            type="time"
                            name="time"
                            value={reservationData.time}
                            onChange={handleInputChange}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Area *
                          </label>
                          <select
                            name="area"
                            value={reservationData.area}
                            onChange={handleInputChange}
                            required
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="indoor">Indoor</option>
                            <option value="outdoor">Outdoor</option>
                            <option value="vip">VIP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Jumlah Orang *
                          </label>
                          <input
                            type="number"
                            name="guests"
                            value={reservationData.guests}
                            onChange={handleInputChange}
                            required
                            min="1"
                            max="20"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Permintaan Khusus */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Permintaan Khusus (Opsional)
                      </label>
                      <textarea
                        name="specialRequests"
                        value={reservationData.specialRequests}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Contoh: Meja dekat jendela, alergi seafood, ulang tahun, dll."
                      />
                    </div>

                    {/* Next Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setActiveStep(2)}
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
                      >
                        Lanjut ke Pilih Menu
                        <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Pilih Menu - VERSI SANGAT SEDERHANA */}
              {activeStep === 2 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Pilih Menu Pre-Order</h2>
                    <button
                      onClick={() => setActiveStep(1)}
                      className="text-orange-600 hover:text-orange-700 flex items-center text-sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                      Kembali ke Data Reservasi
                    </button>
                  </div>

                  {Object.keys(groupedMenuItems).length > 0 ? (
                    Object.entries(groupedMenuItems).map(([category, items]) => (
                      <div key={category} className="mb-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                          {category} ({items.length} menu)
                        </h3>
                        <div className="space-y-4">
                          {items.map((item) => {
                            const quantity = getMenuItemQuantity(item.id);
                            
                            return (
                              <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h4 className="font-semibold text-gray-900 text-lg">{item.name}</h4>
                                        {item.description && (
                                          <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2 ml-4">
                                        <span className="text-orange-600 font-bold text-lg">
                                          Rp {item.price?.toLocaleString('id-ID') || '0'}
                                        </span>
                                        {activeMenuPromoMap[item.id] && (
                                          <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                            {activeMenuPromoMap[item.id].discountType === 'percentage' 
                                              ? `-${Number(activeMenuPromoMap[item.id].discountValue) || 0}%`
                                              : `-Rp ${(Number(activeMenuPromoMap[item.id].discountValue) || 0).toLocaleString('id-ID')}`}
                                          </span>
                                        )}
                                        {!item.available && (
                                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                                            Habis
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-20 h-20 object-cover rounded-lg ml-4 flex-shrink-0"
                                    />
                                  )}
                                </div>
                                
                                <div className="flex justify-between items-center mt-4">
                                  <div className="flex items-center space-x-3">
                                    <button 
                                      type="button"
                                      onClick={() => removeMenuItem(item)}
                                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      disabled={quantity === 0}
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/>
                                      </svg>
                                    </button>
                                    
                                    <span className="text-lg font-semibold text-gray-900 w-8 text-center">
                                      {quantity}
                                    </span>
                                    
                                    <button 
                                      type="button"
                                      onClick={() => addMenuItem(item)}
                                      className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                                      </svg>
                                    </button>
                                  </div>
                                  
                                  {quantity > 0 && (
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        // Hapus semua
                                        setSelectedMenuItems(prev => 
                                          prev.filter(i => i.id !== item.id)
                                        );
                                      }}
                                      className="text-red-600 hover:text-red-700 font-medium flex items-center text-sm"
                                    >
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                      </svg>
                                      Hapus Semua
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-6xl mb-4">🍽️</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Menu Belum Tersedia</h3>
                      <p className="text-gray-500 mb-4">
                        Restoran ini belum menambahkan menu atau menu sedang tidak tersedia.
                      </p>
                      <div className="text-left bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-yellow-800 text-sm">
                          <strong>Tips:</strong><br/>
                          • Pastikan menu memiliki status "Tersedia" di halaman owner<br/>
                          • Cek struktur database di Firebase Console<br/>
                          • Refresh halaman untuk memuat ulang data
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={() => setActiveStep(3)}
                      disabled={selectedMenuItems.length === 0}
                      className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Lanjut ke Konfirmasi
                      <svg className="w-5 h-5 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Konfirmasi */}
              {activeStep === 3 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Konfirmasi Reservasi</h2>
                    <button
                      onClick={() => setActiveStep(2)}
                      className="text-orange-600 hover:text-orange-700 flex items-center text-sm"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                      </svg>
                      Ubah Menu
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Data Reservasi */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Reservasi</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                        <div>
                          <p className="text-sm text-gray-600">Nama</p>
                          <p className="font-medium">{reservationData.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Telepon</p>
                          <p className="font-medium">{reservationData.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Tanggal</p>
                          <p className="font-medium">
                            {reservationData.date ? new Date(reservationData.date).toLocaleDateString('id-ID', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Waktu</p>
                          <p className="font-medium">{reservationData.time || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Jumlah Orang</p>
                          <p className="font-medium">{reservationData.guests} orang</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Area</p>
                          <p className="font-medium capitalize">{reservationData.area}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu yang Dipilih */}
                    {selectedMenuItems.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Menu Pre-Order</h3>
                        <div className="space-y-3">
                          {selectedMenuItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center border-b border-gray-200 pb-3">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                <p className="text-sm text-gray-600">Rp {item.price.toLocaleString('id-ID')} x {item.quantity}</p>
                              </div>
                              <span className="font-medium text-gray-900">
                                Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Permintaan Khusus */}
                    {reservationData.specialRequests && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Permintaan Khusus</h3>
                        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{reservationData.specialRequests}</p>
                      </div>
                    )}

                    {/* Informasi Proses */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Proses Reservasi</h4>
                      <ol className="text-sm text-blue-800 space-y-2">
                        <li className="flex items-start">
                          <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">1</span>
                          <span>Ajukan reservasi (status: <strong>Pending Approval</strong>)</span>
                        </li>
                        <li className="flex items-start">
                          <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">2</span>
                          <span>Pemilik restoran akan meninjau dan menyetujui</span>
                        </li>
                        <li className="flex items-start">
                          <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">3</span>
                          <span>Setelah disetujui, Anda akan mendapatkan instruksi pembayaran DP 50%</span>
                        </li>
                        <li className="flex items-start">
                          <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">4</span>
                          <span>Upload bukti pembayaran untuk konfirmasi akhir</span>
                        </li>
                      </ol>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6 border-t border-gray-200">
                      <button
                        onClick={() => setActiveStep(2)}
                        className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
                      >
                        Kembali
                      </button>
                      <button
                        onClick={handleSubmitReservation}
                        className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        Ajukan Reservasi
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan</h3>
                
                {/* Info Restoran */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900">{restaurant.name}</h4>
                  <p className="text-sm text-gray-600">{restaurant.address}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-yellow-400 text-sm">
                      {generateStarRating(restaurant.rating)}
                    </span>
                    <span className="text-gray-500 text-sm ml-1">
                      {restaurant.rating ? restaurant.rating.toFixed(1) : '0.0'} 
                      {restaurant.reviewCount ? ` (${restaurant.reviewCount})` : ' (0)'}
                    </span>
                  </div>
                </div>

                {/* Detail Reservasi */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tanggal</span>
                    <span className="text-gray-900">
                      {reservationData.date ? new Date(reservationData.date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Waktu</span>
                    <span className="text-gray-900">{reservationData.time || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Jumlah Orang</span>
                    <span className="text-gray-900">{reservationData.guests} orang</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Area</span>
                    <span className="text-gray-900 capitalize">{reservationData.area}</span>
                  </div>
                </div>

                {/* Total Pembayaran */}
                {selectedMenuItems.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="space-y-2 mb-3">
                      {selectedMenuItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="flex-1">{item.name} x{item.quantity}</span>
                          <span className="ml-2">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-gray-200 pt-3">
                      {/* Subtotal */}
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span>Rp {calculateTotalsWithPromo().subtotal.toLocaleString('id-ID')}</span>
                      </div>
                      {/* Discount if any */}
                      {calculateTotalsWithPromo().discount > 0 && (
                        <div className="flex justify-between text-sm text-green-700 mt-1">
                          <span>Diskon Promo</span>
                          <span>- Rp {calculateTotalsWithPromo().discount.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      {/* Total after discount */}
                      <div className="flex justify-between font-semibold text-lg mt-1">
                        <span>Total:</span>
                        <span>Rp {calculateTotalsWithPromo().total.toLocaleString('id-ID')}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm text-gray-600 mt-2">
                        <span>DP 50% nanti:</span>
                        <span>Rp {(calculateTotalsWithPromo().total * 0.5).toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center mb-2">
                        <div className={`w-3 h-3 rounded-full ${activeStep >= 1 ? 'bg-orange-600' : 'bg-gray-300'} mr-2`}></div>
                        <span className="text-sm text-orange-800">Data Reservasi</span>
                      </div>
                      <div className="flex items-center mb-2">
                        <div className={`w-3 h-3 rounded-full ${activeStep >= 2 ? 'bg-orange-600' : 'bg-gray-300'} mr-2`}></div>
                        <span className="text-sm text-orange-800">Pilih Menu ({selectedMenuItems.length})</span>
                      </div>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${activeStep >= 3 ? 'bg-orange-600' : 'bg-gray-300'} mr-2`}></div>
                        <span className="text-sm text-orange-800">Konfirmasi</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Informasi */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Perhatian:</strong> Pembayaran DP 50% dilakukan setelah reservasi disetujui oleh restoran.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}