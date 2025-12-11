// =======================================================================
// FIRESTORE IMPORTS
// =======================================================================
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, addDoc, onSnapshot, writeBatch,
  serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";

// Helper
const asDate = (v) => v?.toDate?.() || v;

// =======================================================================
// ============================= ADMIN HELPERS ============================
// =======================================================================

// Get users with approved reports aggregated by userId
export const getUsersWithApprovedReports = async (minCount = 1) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('status', '==', 'approved')
    );
    const snap = await getDocs(q);

    const counts = new Map();
    const lastCreatedAt = new Map();
    const byUser = new Map();

    snap.forEach((d) => {
      const data = d.data();
      const uid = data.userId;
      if (!uid) return;
      counts.set(uid, (counts.get(uid) || 0) + 1);
      const created = asDate(data.createdAt);
      const prev = lastCreatedAt.get(uid);
      if (!prev || (created && created > prev)) lastCreatedAt.set(uid, created);
      byUser.set(uid, true);
    });

    const results = [];
    for (const uid of byUser.keys()) {
      const count = counts.get(uid) || 0;
      if (count >= minCount) {
        // fetch user minimal profile
        const userSnap = await getDoc(doc(db, 'users', uid));
        const user = userSnap.exists() ? userSnap.data() : {};
        results.push({
          userId: uid,
          count,
          lastReportAt: lastCreatedAt.get(uid) || null,
          displayName: user.displayName || user.name || '',
          email: user.email || ''
        });
      }
    }

    // sort by count desc
    results.sort((a, b) => b.count - a.count);
    return { success: true, data: results };
  } catch (err) {
    console.error('❌ [Firestore] getUsersWithApprovedReports error:', err);
    return { success: false, error: err.message, data: [] };
  }
};

// Get users who posted negative reviews repeatedly for the same restaurant
export const getUsersWithRepeatedNegativeReviews = async (threshold = 10) => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('rating', '<=', 2)
    );
    const snap = await getDocs(q);

    const keyCounts = new Map(); // key = `${userId}_${restaurantId}`
    const lastAt = new Map();

    snap.forEach((d) => {
      const data = d.data();
      const uid = data.userId;
      const rid = data.restaurantId;
      if (!uid || !rid) return;
      const key = `${uid}_${rid}`;
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      const created = asDate(data.createdAt);
      const prev = lastAt.get(key);
      if (!prev || (created && created > prev)) lastAt.set(key, created);
    });

    const results = [];
    for (const [key, count] of keyCounts.entries()) {
      if (count >= threshold) {
        const [userId, restaurantId] = key.split('_');
        const userSnap = await getDoc(doc(db, 'users', userId));
        const user = userSnap.exists() ? userSnap.data() : {};
        const restSnap = await getDoc(doc(db, 'restaurants', restaurantId));
        const restaurant = restSnap.exists() ? restSnap.data() : {};
        results.push({
          userId,
          restaurantId,
          count,
          lastAt: lastAt.get(key) || null,
          userName: user.displayName || user.name || '',
          userEmail: user.email || '',
          restaurantName: restaurant.name || ''
        });
      }
    }

    // sort by count desc
    results.sort((a, b) => b.count - a.count);
    return { success: true, data: results };
  } catch (err) {
    console.error('❌ [Firestore] getUsersWithRepeatedNegativeReviews error:', err);
    return { success: false, error: err.message, data: [] };
  }
};

// Get low-rated restaurants
export const getLowRatedRestaurants = async (threshold = 2) => {
  try {
    const q = query(
      collection(db, 'restaurants'),
      where('rating', '<', threshold)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, data };
  } catch (err) {
    console.error('❌ [Firestore] getLowRatedRestaurants error:', err);
    return { success: false, error: err.message, data: [] };
  }
};

// Get reported users from reviewReports by status (default: pending)
export const getReportedUsersByStatus = async (status = 'pending') => {
  try {
    const q = query(
      collection(db, 'reviewReports'),
      where('reportStatus', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    // Map reviewId -> report createdAt
    const reviewIds = new Set();
    const createdMap = new Map();
    snap.forEach((d) => {
      const data = d.data();
      const reviewId = data.reviewId;
      if (reviewId) {
        reviewIds.add(reviewId);
        const created = asDate(data.createdAt);
        const prev = createdMap.get(reviewId);
        if (!prev || (created && created > prev)) createdMap.set(reviewId, created);
      }
    });

    // Fetch related reviews to resolve userId
    const reviewDocs = await Promise.all(
      Array.from(reviewIds).map((rid) => getDoc(doc(db, 'reviews', rid)))
    );

    const userCounts = new Map();
    const userLast = new Map();
    const userSet = new Set();
    reviewDocs.forEach((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const uid = data.userId;
      if (!uid) return;
      userSet.add(uid);
      userCounts.set(uid, (userCounts.get(uid) || 0) + 1);
      const last = userLast.get(uid);
      const created = createdMap.get(snap.id);
      if (!last || (created && created > last)) userLast.set(uid, created);
    });

    // Fetch minimal user profiles
    const users = await Promise.all(
      Array.from(userSet).map((uid) => getDoc(doc(db, 'users', uid)).then((d)=>({ uid, d })))
    );

    const results = users.map(({ uid, d }) => {
      const data = d.exists() ? d.data() : {};
      return {
        userId: uid,
        displayName: data.displayName || data.name || '',
        email: data.email || '',
        count: userCounts.get(uid) || 0,
        lastReportAt: userLast.get(uid) || null,
      };
    }).sort((a, b) => b.count - a.count);

    return { success: true, data: results };
  } catch (err) {
    console.error('❌ [Firestore] getReportedUsersByStatus error:', err);
    return { success: false, error: err.message, data: [] };
  }
};

// =======================================================================
// ============================ PROMO FUNCTIONS ==========================
// =======================================================================

// Add promo AND update restaurant
export const addPromoAndUpdateRestaurant = async (promoData) => {
  try {
    console.log('🔄 [Firestore] Adding promo and updating restaurant...');
    
    // 1. Add promo to promos collection
    const promoRef = await addDoc(collection(db, 'promos'), {
      ...promoData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 2. Update restaurant with promo data
    const restaurantRef = doc(db, 'restaurants', promoData.restaurantId);
    await updateDoc(restaurantRef, {
      isPromo: true,
      discount: promoData.discountValue,
      minPurchase: promoData.minPurchase || 50000,
      promoExpiry: promoData.endDate,
      promoTitle: promoData.name,
      promoDescription: promoData.description,
      promoText: `Diskon ${promoData.discountValue}% ${promoData.discountType === 'percentage' ? '' : 'Rp'}`,
      updatedAt: serverTimestamp()
    });

    console.log('✅ [Firestore] Promo added and restaurant updated successfully');
    return promoRef.id;
  } catch (error) {
    console.error('❌ [Firestore] Error adding promo and updating restaurant:', error);
    throw error;
  }
};

// Update existing addPromo function to also update restaurant
export const addPromo = async (promoData) => {
  try {
    // Use the new function that updates both
    return await addPromoAndUpdateRestaurant(promoData);
  } catch (error) {
    console.error('❌ [Firestore] Error in addPromo:', error);
    throw error;
  }
};

// Get active promos for restaurant
export const getActivePromosForRestaurant = async (restaurantId) => {
  try {
    console.log('🔍 [Firestore] Getting active promos for restaurant:', restaurantId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'promos'),
      where('restaurantId', '==', restaurantId),
      where('status', '==', 'active'),
      where('startDate', '<=', today),
      where('endDate', '>=', today)
    );
    
    const querySnapshot = await getDocs(q);
    const promos = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      promos.push({
        id: doc.id,
        ...data,
        startDate: asDate(data.startDate),
        endDate: asDate(data.endDate)
      });
    });
    
    console.log(`✅ [Firestore] Found ${promos.length} active promos for restaurant ${restaurantId}`);
    return promos;
  } catch (error) {
    console.error('❌ [Firestore] Error getting active promos:', error);
    return [];
  }
};

// =======================================================================
// ============================ MENUS & RESTAURANT =======================
// =======================================================================

// Get menu by restaurantId (UPDATED)
export const getMenusByRestaurantId = async (restaurantId) => {
  try {
    console.log('🔍 [Firestore] Searching menus in SUBCOLLECTION for restaurant:', restaurantId);
    
    // Query dari subcollection: restaurants/{restaurantId}/menus
    const menusRef = collection(db, 'restaurants', restaurantId, 'menus');
    const q = query(menusRef);
    
    const querySnapshot = await getDocs(q);
    const menus = [];
    
    querySnapshot.forEach((doc) => {
      const menuData = doc.data();
      console.log('📄 [Firestore] Menu document from subcollection:', doc.id, menuData);
      menus.push({
        id: doc.id,
        ...menuData,
        restaurantId: restaurantId
      });
    });
    
    console.log('✅ [Firestore] Found', menus.length, 'menus in subcollection');
    return menus;
  } catch (error) {
    console.error('❌ [Firestore] Error getting menus from subcollection:', error);
    
    // Fallback: coba dari collection menus yang lama (jika ada)
    try {
      console.log('🔄 [Firestore] Trying fallback: collection menus...');
      const fallbackQuery = query(
        collection(db, 'menus'),
        where('restaurantId', '==', restaurantId)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const fallbackMenus = [];
      
      fallbackSnapshot.forEach((doc) => {
        fallbackMenus.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ [Firestore] Fallback found:', fallbackMenus.length, 'menus');
      return fallbackMenus;
    } catch (fallbackError) {
      console.error('❌ [Firestore] Fallback also failed:', fallbackError);
      return [];
    }
  }
};

export const getActivePromosForMenu = async (menuId) => {
  try {
    console.log('🔍 [Firestore] Getting active promos for menu:', menuId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'promos'),
      where('menuIds', 'array-contains', menuId),
      where('status', '==', 'active'),
      where('startDate', '<=', today),
      where('endDate', '>=', today)
    );
    
    const querySnapshot = await getDocs(q);
    const promos = [];
    
    querySnapshot.forEach((doc) => {
      const promoData = doc.data();
      promos.push({
        id: doc.id,
        ...promoData,
        startDate: asDate(promoData.startDate),
        endDate: asDate(promoData.endDate)
      });
    });
    
    console.log(`✅ [Firestore] Found ${promos.length} active promos for menu ${menuId}`);
    return promos;
  } catch (error) {
    console.error('❌ [Firestore] Error getting active promos:', error);
    return [];
  }
};

// Get restaurant by ID (UPDATED)
export const getRestaurantById = async (restaurantId) => {
  try {
    const docRef = doc(db, 'restaurants', restaurantId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      };
    } else {
      throw new Error('Restaurant not found');
    }
  } catch (error) {
    console.error('❌ [Firestore] Error getting restaurant:', error);
    throw error;
  }
};

// Get restaurants by owner (UPDATED)
export const getRestaurantsByOwner = async (ownerId) => {
  try {
    const restaurantsRef = collection(db, 'restaurants');
    const q = query(
      restaurantsRef,
      where('ownerId', '==', ownerId)
    );

    const querySnapshot = await getDocs(q);
    const restaurants = [];

    querySnapshot.forEach((doc) => {
      restaurants.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return restaurants;
  } catch (error) {
    console.error('❌ [Firestore] Error getting restaurants:', error);
    throw error;
  }
};

// =======================================================================
// ============================ SYSTEM NOTIFICATIONS =====================
// =======================================================================

export const getSystemNotifications = async (limitCount = 20) => {
  try {
    const q = query(
      collection(db, "systemNotifications"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const snap = await getDocs(q);
    const result = [];

    snap.forEach((d) => {
      const data = d.data();
      result.push({
        id: d.id,
        ...data,
        createdAt: asDate(data.createdAt),
        readAt: asDate(data.readAt)
      });
    });

    return result;
  } catch (err) {
    console.error("❌ [Firestore] getSystemNotifications error:", err);
    throw err;
  }
};

export const getPendingRestaurantsCount = async () => {
  try {
    const q = query(
      collection(db, "restaurants"),
      where("status", "==", "pending")
    );

    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.error("❌ [Firestore] getPendingRestaurantsCount error:", err);
    throw err;
  }
};

export const createSystemNotification = async (title, message, type = "system", relatedId = null) => {
  try {
    const ref = doc(collection(db, "systemNotifications"));
    const data = {
      id: ref.id,
      title,
      message,
      type,
      relatedId,
      userId: "system",
      read: false,
      createdAt: serverTimestamp()
    };

    await setDoc(ref, data);
    return { success: true, id: ref.id };
  } catch (err) {
    console.error("❌ [Firestore] createSystemNotification error:", err);
    return { success: false, error: err.message };
  }
};

export const getUnreadSystemNotificationsCount = async () => {
  try {
    const q = query(
      collection(db, "systemNotifications"),
      where("read", "==", false),
      where("userId", "==", "system")
    );

    const snap = await getDocs(q);
    return { success: true, count: snap.size };
  } catch (err) {
    console.error("❌ [Firestore] getUnreadSystemNotificationsCount error:", err);
    return { success: false, count: 0 };
  }
};

export const markAllSystemNotificationsAsRead = async () => {
  try {
    const q = query(
      collection(db, "systemNotifications"),
      where("read", "==", false),
      where("userId", "==", "system")
    );

    const snap = await getDocs(q);
    const batch = writeBatch(db);

    snap.docs.forEach((docSnap) => {
      const ref = doc(db, "systemNotifications", docSnap.id);
      batch.update(ref, {
        read: true,
        readAt: serverTimestamp()
      });
    });

    await batch.commit();
    return {
      success: true,
      message: `${snap.size} notifikasi sistem ditandai sebagai dibaca`
    };
  } catch (err) {
    console.error("❌ [Firestore] markAllSystemNotificationsAsRead error:", err);
    return { success: false, error: err.message };
  }
};

export const markSystemNotificationAsRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, "systemNotifications", notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    console.error("❌ [Firestore] markSystemNotificationAsRead error:", err);
    return { success: false, error: err.message };
  }
};

// =======================================================================
// =============================== USER FUNCTIONS ========================
// =======================================================================

export const updateUser = async (userId, updateData) => {
  try {
    await updateDoc(doc(db, "users", userId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getAllUsers = async () => {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: asDate(d.data().createdAt)
    }));
  } catch (err) {
    console.error("❌ [Firestore] getAllUsers error:", err);
    throw err;
  }
};

// =======================================================================
// ============================== RESTAURANTS ============================
// =======================================================================

export const createRestaurant = async (restaurantData) => {
  try {
    const existingRestaurants = await getRestaurantsByOwner(restaurantData.ownerId);
    if (existingRestaurants.length > 0) {
      throw new Error('Anda sudah memiliki restoran. Setiap owner hanya boleh memiliki 1 restoran.');
    }

    const docRef = await addDoc(collection(db, 'restaurants'), {
      ...restaurantData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Notify admin about new restaurant registration
    try {
      const title = 'Pendaftaran Restoran Baru';
      const message = `${restaurantData.name || 'Restoran'} menunggu verifikasi admin.`;
      await createSystemNotification(title, message, 'restaurant_registration', docRef.id);
    } catch (e) {
      console.warn('Failed to create admin notification for restaurant registration:', e?.message || e);
    }
    return docRef.id;

  } catch (error) {
    console.error('❌ [Firestore] Error creating restaurant:', error);
    throw error;
  }
};

export const getAllRestaurants = async () => {
  try {
    const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const restaurants = [];
    querySnapshot.forEach((doc) => {
      restaurants.push({ id: doc.id, ...doc.data() });
    });
    return restaurants;
  } catch (error) {
    console.error('❌ [Firestore] Error getting restaurants:', error);
    throw error;
  }
};

export const updateRestaurantStatus = async (restaurantId, status, rejectionReason = null) => {
  try {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    const updateData = {
      status,
      updatedAt: serverTimestamp()
    };
    
    if (rejectionReason) {
      updateData.rejectionReason = rejectionReason;
      updateData.rejectionDate = serverTimestamp();
    }
    
    await updateDoc(restaurantRef, updateData);
  } catch (error) {
    console.error('❌ [Firestore] Error updating restaurant status:', error);
    throw error;
  }
};

export const updateRestaurant = async (restaurantId, data) => {
  try {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(restaurantRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    console.log('✅ [Firestore] Restaurant updated successfully:', restaurantId);
    return true;
  } catch (error) {
    console.error('❌ [Firestore] Error updating restaurant:', error);
    throw error;
  }
};

// =======================================================================
// ============================= RESERVATIONS ============================
// =======================================================================

export const getRestaurantReservations = async (restaurantId) => {
  try {
    const q = query(
      collection(db, "reservations"),
      where("restaurantId", "==", restaurantId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: asDate(d.data().createdAt),
      date: asDate(d.data().date),
    }));
  } catch (err) {
    console.error("❌ [Firestore] getRestaurantReservations error:", err);
    throw err;
  }
};

// =======================================================================
// =============================== FAVORITES =============================
// =======================================================================

export const isRestaurantFavorite = async (userId, restaurantId) => {
  try {
    const q = query(
      collection(db, "favorites"),
      where("userId", "==", userId),
      where("restaurantId", "==", restaurantId)
    );

    const querySnapshot = await getDocs(q);
    return { 
      success: true, 
      isFavorite: !querySnapshot.empty 
    };
  } catch (error) {
    console.error('❌ [Firestore] Error checking favorite:', error);
    return { 
      success: false, 
      error: error.message,
      isFavorite: false 
    };
  }
};

export const addToFavorites = async (userId, restaurantId, restaurantData) => {
  try {
    console.log('➕ [Firestore] Adding to favorites:', { userId, restaurantId });
    
    const docId = `${userId}_${restaurantId}`;
    const favoriteRef = doc(db, "favorites", docId);
    
    await setDoc(favoriteRef, {
      userId,
      restaurantId,
      restaurantData,
      addedAt: serverTimestamp()
    });
    
    console.log('✅ [Firestore] Successfully added to favorites');
    return { 
      success: true,
      message: 'Restoran berhasil ditambahkan ke favorit'
    };
  } catch (error) {
    console.error('❌ [Firestore] Error adding to favorites:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export const removeFromFavorites = async (userId, restaurantId) => {
  try {
    console.log('➖ [Firestore] Removing from favorites:', { userId, restaurantId });
    
    const docId = `${userId}_${restaurantId}`;
    const favoriteRef = doc(db, "favorites", docId);
    const favoriteSnap = await getDoc(favoriteRef);
    
    if (favoriteSnap.exists()) {
      await deleteDoc(favoriteRef);
      console.log('✅ [Firestore] Successfully removed from favorites');
      return { 
        success: true,
        message: 'Restoran berhasil dihapus dari favorit'
      };
    } else {
      console.log('⚠️ [Firestore] Favorite not found');
      return { 
        success: false, 
        error: 'Favorite not found' 
      };
    }
  } catch (error) {
    console.error('❌ [Firestore] Error removing from favorites:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export const getUserFavorites = async (userId) => {
  try {
    console.log('🔍 [Firestore] Getting favorites for user:', userId);
    
    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('✅ [Firestore] Found', querySnapshot.size, 'favorites');
    
    const favorites = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      
      let restaurantData = data.restaurantData;
      
      if (!restaurantData || Object.keys(restaurantData).length === 0) {
        console.log('⚠️ [Firestore] restaurantData is null for:', data.restaurantId);
        
        try {
          const restaurantDoc = await getDoc(doc(db, 'restaurants', data.restaurantId));
          if (restaurantDoc.exists()) {
            const restaurant = restaurantDoc.data();
            restaurantData = {
              name: restaurant.name || 'Restoran',
              image: restaurant.image || null,
              category: restaurant.category || 'Restoran',
              description: restaurant.description || '',
              rating: restaurant.rating || 0
            };
            
            await updateDoc(doc(db, 'favorites', docSnap.id), {
              restaurantData: restaurantData
            });
            
            console.log('🔄 [Firestore] Updated restaurantData for:', data.restaurantId);
          }
        } catch (fetchError) {
          console.error('❌ [Firestore] Error fetching restaurant:', fetchError);
          restaurantData = {
            name: 'Restoran',
            restaurantId: data.restaurantId
          };
        }
      }
      
      favorites.push({
        id: docSnap.id,
        restaurantId: data.restaurantId,
        userId: data.userId,
        restaurantData: restaurantData,
        addedAt: asDate(data.addedAt)
      });
    }
    
    console.log('📊 [Firestore] Returning', favorites.length, 'favorites');
    return { success: true, data: favorites };
  } catch (error) {
    console.error('❌ [Firestore] Error getting user favorites:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const toggleFavorite = async (userId, restaurantId, restaurantData = null) => {
  try {
    console.log('🔄 [ToggleFavorite] Toggling:', {
      userId,
      restaurantId,
      restaurantData: restaurantData ? 'exists' : 'null'
    });
    
    const docId = `${userId}_${restaurantId}`;
    const favoriteRef = doc(db, 'favorites', docId);
    const favoriteSnap = await getDoc(favoriteRef);
    
    if (favoriteSnap.exists()) {
      await deleteDoc(favoriteRef);
      return { 
        success: true, 
        action: 'removed',
        message: 'Restoran dihapus dari favorit',
        isFavorite: false
      };
    } else {
      let restData = restaurantData;
      
      if (!restData) {
        try {
          const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
          if (restaurantDoc.exists()) {
            const restaurant = restaurantDoc.data();
            restData = {
              name: restaurant.name || 'Restoran',
              image: restaurant.image || null,
              category: restaurant.category || 'Restoran',
              description: restaurant.description || '',
              rating: restaurant.rating || 0,
              priceRange: restaurant.priceRange || '',
              address: restaurant.address || ''
            };
            console.log('📦 [ToggleFavorite] Fetched restaurant data:', restData.name);
          }
        } catch (fetchError) {
          console.error('❌ [ToggleFavorite] Error fetching restaurant data:', fetchError);
          restData = {
            name: 'Restoran',
            restaurantId: restaurantId
          };
        }
      }
      
      await setDoc(favoriteRef, {
        userId,
        restaurantId,
        restaurantData: restData,
        addedAt: serverTimestamp()
      });
      
      console.log('✅ [ToggleFavorite] Added to favorites with data');
      return { 
        success: true, 
        action: 'added',
        message: 'Restoran ditambahkan ke favorit',
        isFavorite: true
      };
    }
  } catch (error) {
    console.error('❌ [ToggleFavorite] Error:', error);
    return { 
      success: false, 
      error: error.message,
      action: 'error'
    };
  }
};

// =======================================================================
// ============================ NOTIFICATIONS SYSTEM =====================
// =======================================================================

export const createNotification = async (notificationData) => {
  try {
    const notificationRef = await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, notificationId: notificationRef.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

export const getOwnerNotifications = (ownerId, callback) => {
  if (!ownerId) {
    console.error('Owner ID is required');
    callback([]);
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const notifications = [];
        querySnapshot.forEach((doc) => {
          notifications.push({ 
            id: doc.id, 
            ...doc.data() 
          });
        });
        console.log('Notifications fetched:', notifications.length); // Debug log
        callback(notifications);
      },
      (error) => {
        console.error('Error fetching notifications:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('Error setting up notifications listener:', error);
    callback([]);
    return () => {};
  }
};

export const getUnreadNotificationCount = async (ownerId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('ownerId', '==', ownerId),
      where('isRead', '==', false)
    );

    const querySnapshot = await getDocs(q);
    return { 
      success: true, 
      count: querySnapshot.size 
    };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return { success: false, error: error.message, count: 0 };
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

export const markAllNotificationsAsRead = async (ownerId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('ownerId', '==', ownerId),
      where('isRead', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    querySnapshot.forEach((docSnapshot) => {
      const notificationRef = doc(db, 'notifications', docSnapshot.id);
      batch.update(notificationRef, { isRead: true });
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
};

export const createReservation = async (reservationData) => {
  try {
    const reservationRef = await addDoc(collection(db, 'reservations'), {
      ...reservationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const reservationId = reservationRef.id;
    
    const restaurantRef = doc(db, 'restaurants', reservationData.restaurantId);
    const restaurantDoc = await getDoc(restaurantRef);
    
    if (restaurantDoc.exists()) {
      const restaurant = restaurantDoc.data();
      
      await createNotification({
        type: 'new_reservation',
        title: 'Reservasi Baru',
        message: `${reservationData.customerName} membuat reservasi untuk ${reservationData.guestCount} orang`,
        ownerId: restaurant.ownerId,
        restaurantId: reservationData.restaurantId,
        restaurantName: restaurant.name,
        reservationId: reservationId,
        customerName: reservationData.customerName,
        guestCount: reservationData.guestCount,
        date: reservationData.date,
        time: reservationData.time,
        status: 'pending'
      });
    }
    
    return { success: true, reservationId };
  } catch (error) {
    console.error('Error creating reservation:', error);
    return { success: false, error: error.message };
  }
};

export const deleteNotification = async (notificationId) => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAllOwnerNotifications = async (ownerId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('ownerId', '==', ownerId)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    return { success: false, error: error.message };
  }
};

export const getUserNotifications = (userId, callback) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        createdAt: asDate(d.data().createdAt)
      }));
      callback(notifications);
    });
  } catch (error) {
    console.error('Error setting up notifications listener:', error);
    return () => {};
  }
};

export const getUserNotificationsOnce = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: asDate(doc.data().createdAt)
    }));

    return { success: true, data: notifications };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return { success: false, error: error.message, data: [] };
  }
};

export const getUnreadNotificationsCount = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const querySnapshot = await getDocs(q);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return { success: false, error: error.message, count: 0 };
  }
};

// =======================================================================
// ================================ REVIEWS ==============================
// =======================================================================

export const addReview = async (reviewData) => {
  try {
    console.log('🔍 [Firestore] addReview called with data:', reviewData);

    const validatedData = {
      restaurantId: reviewData.restaurantId || '',
      restaurantName: reviewData.restaurantName || 'Restoran',
      rating: Number(reviewData.rating) || 0,
      comment: reviewData.comment || '',
      userId: reviewData.userId || '',
      userName: reviewData.userName || 'User',
      userEmail: reviewData.userEmail || '',
      createdAt: serverTimestamp(),
      hasOwnerReply: false,
      ownerReply: '',
      ownerId: '',
      ownerName: '',
      repliedAt: null
    };

    console.log('🔍 [Firestore] Validated data:', validatedData);

    if (!validatedData.restaurantId) {
      throw new Error('Restaurant ID is required');
    }
    if (!validatedData.userId) {
      throw new Error('User ID is required');
    }
    if (validatedData.rating === 0) {
      throw new Error('Rating is required');
    }

    const reviewRef = await addDoc(collection(db, 'reviews'), validatedData);
    
    console.log('✅ [Firestore] Review berhasil dibuat dengan ID:', reviewRef.id);
    
    // Create owner notification for new review (best-effort)
    try {
      const restId = validatedData.restaurantId;
      if (restId) {
        const restSnap = await getDoc(doc(db, 'restaurants', restId));
        const restaurant = restSnap.exists() ? restSnap.data() : null;
        const ownerId = restaurant?.ownerId;
        if (ownerId) {
          await addDoc(collection(db, 'notifications'), {
            ownerId,
            type: 'new_review',
            title: 'Ulasan Baru',
            message: `${validatedData.userName || 'User'} memberi rating ${validatedData.rating}/5`,
            restaurantId: restId,
            restaurantName: restaurant?.name || validatedData.restaurantName,
            reviewId: reviewRef.id,
            rating: validatedData.rating,
            isRead: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (notifyErr) {
      console.error('❌ [Firestore] Error creating review notification:', notifyErr);
    }

    // Recalculate restaurant rating so listing cards reflect new review
    try {
      await updateRestaurantRating(validatedData.restaurantId);
    } catch (e) {
      console.warn('Failed to update restaurant rating after addReview:', e?.message || e);
    }

    return { success: true, id: reviewRef.id };
    
  } catch (error) {
    console.error('❌ [Firestore] Error in addReview:', error);
    return { success: false, error: error.message };
  }
};

export const getRestaurantReviews = async (restaurantId) => {
  try {
    console.log('🔍 [Firestore] getRestaurantReviews - Fetching reviews for restaurant:', restaurantId);

    const q = query(
      collection(db, 'reviews'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    console.log('🔍 [Firestore] getRestaurantReviews - Raw reviews found:', querySnapshot.size);

    const reviews = [];

    querySnapshot.forEach(doc => {
      const reviewData = doc.data();
      const review = {
        id: doc.id,
        ...reviewData,
        ownerReply: reviewData.ownerReply || null,
        repliedAt: reviewData.repliedAt || null,
        ownerName: reviewData.ownerName || null,
        createdAt: asDate(reviewData.createdAt)
      };

      reviews.push(review);
    });

    console.log('✅ [Firestore] getRestaurantReviews - Final reviews:', reviews.length);
    return { success: true, data: reviews };

  } catch (error) {
    console.error('❌ [Firestore] getRestaurantReviews - Error:', error);
    return { success: false, error: error.message };
  }
};

export const updateReviewReply = async (reviewId, replyData) => {
  try {
    console.log('🔍 [Firestore] updateReviewReply - Updating reply for review:', reviewId);
    
    await updateDoc(doc(db, 'reviews', reviewId), {
      ownerReply: replyData.reply,
      ownerId: replyData.ownerId,
      ownerName: replyData.ownerName,
      repliedAt: serverTimestamp(),
      hasOwnerReply: true
    });
    
    console.log('✅ [Firestore] updateReviewReply - Reply updated successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ [Firestore] updateReviewReply - Error:', error);
    return { success: false, error: error.message };
  }
};

export const getOwnerRestaurants = async (ownerId) => {
  try {
    const q = query(
      collection(db, "restaurants"),
      where("ownerId", "==", ownerId)
    );

    const snap = await getDocs(q);

    return {
      success: true,
      data: snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const getOwnerReviews = async (ownerId) => {
  try {
    console.log('🔍 [Firestore] getOwnerReviews - Starting for owner:', ownerId);

    if (!ownerId) {
      console.error('❌ [Firestore] Owner ID is required');
      return { success: false, error: 'Owner ID is required' };
    }

    const restaurantsQuery = query(
      collection(db, 'restaurants'),
      where('ownerId', '==', ownerId)
    );
    const restaurantsSnapshot = await getDocs(restaurantsQuery);
    
    console.log('🔍 [Firestore] getOwnerReviews - Restaurants found:', restaurantsSnapshot.size);
    
    if (restaurantsSnapshot.empty) {
      console.log('⚠️ [Firestore] No restaurants found for this owner');
      return { success: true, data: [] };
    }

    const restaurantIds = [];
    const restaurantMap = {};
    
    restaurantsSnapshot.forEach(doc => {
      restaurantIds.push(doc.id);
      restaurantMap[doc.id] = doc.data().name;
      console.log(`🏪 [Firestore] Restaurant: ${doc.id} - ${doc.data().name}`);
    });

    console.log('🔍 [Firestore] Restaurant IDs to search:', restaurantIds);

    const reviewsQuery = query(
      collection(db, 'reviews'),
      orderBy('createdAt', 'desc')
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    console.log('🔍 [Firestore] Total reviews in database:', reviewsSnapshot.size);

    const reviews = [];

    reviewsSnapshot.forEach(doc => {
      const reviewData = doc.data();
      
      if (restaurantIds.includes(reviewData.restaurantId)) {
        const review = {
          id: doc.id,
          ...reviewData,
          restaurantName: restaurantMap[reviewData.restaurantId] || reviewData.restaurantName,
          createdAt: asDate(reviewData.createdAt),
          repliedAt: asDate(reviewData.repliedAt)
        };
        console.log('✅ [Firestore] Review belongs to owner:', review);
        reviews.push(review);
      }
    });

    console.log('✅ [Firestore] getOwnerReviews - Final reviews found:', reviews.length);
    
    return { success: true, data: reviews };

  } catch (error) {
    console.error('❌ [Firestore] getOwnerReviews - Error:', error);
    return { success: false, error: error.message };
  }
};

export const getUserReviews = async (userId) => {
  try {
    console.log('🔍 [Firestore] getUserReviews - Starting for user:', userId);

    if (!userId) {
      console.error('❌ [Firestore] User ID is required');
      return { success: false, error: 'User ID is required' };
    }

    const q = query(
      collection(db, 'reviews'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    console.log('🔍 [Firestore] getUserReviews - Raw reviews found:', querySnapshot.size);

    const reviews = [];

    querySnapshot.forEach(doc => {
      const reviewData = doc.data();
      const review = {
        id: doc.id,
        ...reviewData,
        ownerReply: reviewData.ownerReply || null,
        repliedAt: reviewData.repliedAt || null,
        createdAt: asDate(reviewData.createdAt)
      };

      reviews.push(review);
    });

    console.log('✅ [Firestore] getUserReviews - Final reviews count:', reviews.length);
    
    return { success: true, data: reviews };

  } catch (error) {
    console.error('❌ [Firestore] getUserReviews - Error:', error);
    return { success: false, error: error.message };
  }
};

export const updateRestaurantRating = async (restaurantId) => {
  try {
    console.log(`🔍 [Rating] START: Updating rating for restaurant: ${restaurantId}`);
    
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    const restaurantSnap = await getDoc(restaurantRef);
    const restaurantName = restaurantSnap.exists() ? restaurantSnap.data().name : 'Unknown';
    
    console.log(`📋 [Rating] Restaurant: ${restaurantName} (${restaurantId})`);
    
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('restaurantId', '==', restaurantId));
    const querySnapshot = await getDocs(q);
    
    console.log(`📊 [Rating] Found ${querySnapshot.size} total review documents`);
    
    if (querySnapshot.empty) {
      console.log(`❌ [Rating] No reviews found, setting to 0`);
      await updateDoc(restaurantRef, {
        rating: 0,
        reviewCount: 0,
        lastRatingUpdate: serverTimestamp()
      });
      return { success: true, rating: 0, count: 0 };
    }
    
    let totalRating = 0;
    let reviewCount = 0;
    
    querySnapshot.forEach((doc) => {
      const review = doc.data();
      
      if (review.rating && review.rating > 0) {
        totalRating += review.rating;
        reviewCount++;
      }
    });
    
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
    
    console.log(`🧮 [Rating] Calculation:`);
    console.log(`   - Valid reviews: ${reviewCount}/${querySnapshot.size}`);
    console.log(`   - Total rating: ${totalRating}`);
    console.log(`   - Average: ${averageRating.toFixed(1)}`);
    
    console.log(`💾 [Rating] Updating restaurant document...`);
    await updateDoc(restaurantRef, {
      rating: Number(averageRating.toFixed(1)),
      reviewCount: reviewCount,
      lastRatingUpdate: serverTimestamp()
    });
    
    console.log(`✅ [Rating] SUCCESS: Updated ${restaurantName} to rating ${averageRating.toFixed(1)} (${reviewCount} reviews)`);
    
    return {
      success: true,
      rating: averageRating,
      reviewCount: reviewCount
    };
    
  } catch (error) {
    console.error('❌ [Rating] ERROR:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserRole = async (userId, newRole) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });
    console.log(`User ${userId} role changed to ${newRole}`);
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan semua reports
// (Removed duplicate getReports; see consolidated version below that includes reviewId filter and timestamp normalization)

// Fungsi untuk menangguhkan akun user
export const suspendUserAccount = async (userId, reason) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Update status user
    await updateDoc(userRef, {
      status: 'suspended',
      suspensionReason: reason,
      suspendedAt: serverTimestamp()
    });
    
    // Log the suspension
    await addDoc(collection(db, 'suspension_logs'), {
      userId,
      reason,
      actionBy: 'admin',
      actionType: 'suspend',
      createdAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error suspending user:', error);
    return { success: false, error: error.message };
  }
};

// Fungsi untuk menangguhkan restoran
export const suspendRestaurantAccount = async (restaurantId, reason) => {
  try {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    
    // Update status restoran
    await updateDoc(restaurantRef, {
      status: 'suspended',
      suspensionReason: reason,
      suspendedAt: serverTimestamp()
    });
    
    // Log the suspension
    await addDoc(collection(db, 'suspension_logs'), {
      restaurantId,
      reason,
      actionBy: 'admin',
      actionType: 'suspend',
      createdAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error suspending restaurant:', error);
    return { success: false, error: error.message };
  }
};

// =======================================================================
// ======================== REAL-TIME RESERVATIONS =======================
// =======================================================================

export const subscribeToRestaurantReservations = (restaurantId, callback) => {
  try {
    const q = query(
      collection(db, 'reservations'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const reservations = [];
      querySnapshot.forEach((doc) => {
        reservations.push({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: asDate(doc.data().createdAt),
          date: asDate(doc.data().date)
        });
      });
      callback(reservations);
    });
  } catch (error) {
    console.error('❌ [Firestore] Error in subscribeToRestaurantReservations:', error);
    throw error;
  }
};

// =======================================================================
// =============================== MENU =================================
// =======================================================================

export const createMenu = async (menuData) => {
  try {
    const docRef = await addDoc(collection(db, 'menus'), {
      ...menuData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('❌ [Firestore] Error creating menu:', error);
    throw error;
  }
};

export const getMenusByRestaurant = async (restaurantId) => {
  try {
    const q = query(
      collection(db, 'menus'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const menus = [];
    querySnapshot.forEach((doc) => {
      menus.push({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: asDate(doc.data().createdAt)
      });
    });
    return menus;
  } catch (error) {
    console.error('❌ [Firestore] Error getting menus:', error);
    throw error;
  }
};

export const updateMenu = async (menuId, menuData) => {
  try {
    const menuRef = doc(db, 'menus', menuId);
    await updateDoc(menuRef, {
      ...menuData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('❌ [Firestore] Error updating menu:', error);
    throw error;
  }
};

export const deleteMenu = async (menuId) => {
  try {
    const menuRef = doc(db, 'menus', menuId);
    await deleteDoc(menuRef);
  } catch (error) {
    console.error('❌ [Firestore] Error deleting menu:', error);
    throw error;
  }
};

export const getMenuById = async (menuId) => {
  try {
    const menuRef = doc(db, 'menus', menuId);
    const menuSnap = await getDoc(menuRef);

    if (menuSnap.exists()) {
      return { id: menuSnap.id, ...menuSnap.data() };
    } else {
      throw new Error('Menu tidak ditemukan');
    }
  } catch (error) {
    console.error('❌ [Firestore] Error getting menu:', error);
    throw error;
  }
};

// =======================================================================
// =============================== PROMOS ================================
// =======================================================================

export const getPromosByRestaurantId = async (restaurantId) => {
  try {
    const promosRef = collection(db, 'promos');
    const q = query(
      promosRef,
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const promos = [];

    querySnapshot.forEach((doc) => {
      promos.push({
        id: doc.id,
        ...doc.data(),
        createdAt: asDate(doc.data().createdAt),
        startDate: asDate(doc.data().startDate),
        endDate: asDate(doc.data().endDate)
      });
    });

    return promos;
  } catch (error) {
    console.error('❌ [Firestore] Error getting promos:', error);
    throw error;
  }
};

export const updatePromo = async (promoId, promoData) => {
  try {
    const promoRef = doc(db, 'promos', promoId);
    await updateDoc(promoRef, {
      ...promoData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('❌ [Firestore] Error updating promo:', error);
    throw error;
  }
};

export const deletePromo = async (promoId) => {
  try {
    const promoRef = doc(db, 'promos', promoId);
    await deleteDoc(promoRef);
  } catch (error) {
    console.error('❌ [Firestore] Error deleting promo:', error);
    throw error;
  }
};

export const getPromoById = async (promoId) => {
  try {
    const promoRef = doc(db, 'promos', promoId);
    const promoSnap = await getDoc(promoRef);

    if (promoSnap.exists()) {
      return { id: promoSnap.id, ...promoSnap.data() };
    } else {
      throw new Error('Promo tidak ditemukan');
    }
  } catch (error) {
    console.error('❌ [Firestore] Error getting promo:', error);
    throw error;
  }
};

// =======================================================================
// ============================ RESTAURANT STATUS ========================
// =======================================================================

export const updateRestaurantOpenStatus = async (restaurantId, isOpen) => {
  try {
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(restaurantRef, {
      isOpen,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('❌ [Firestore] Error updating restaurant status:', error);
    throw error;
  }
};

// =======================================================================
// ============================ DASHBOARD STATS ==========================
// =======================================================================

export const getDashboardStats = async (ownerId) => {
  try {
    const restaurants = await getRestaurantsByOwner(ownerId);
    let totalPendingReservations = 0;
    let totalTodayReservations = 0;

    for (const restaurant of restaurants) {
      const reservations = await getRestaurantReservations(restaurant.id);
      totalPendingReservations += reservations.filter(r => r.status === 'pending').length;
      
      const today = new Date().toDateString();
      totalTodayReservations += reservations.filter(r => {
        const reservationDate = new Date(r.date).toDateString();
        return reservationDate === today;
      }).length;
    }

    return {
      totalRestaurants: restaurants.length,
      totalPendingReservations,
      totalTodayReservations
    };
  } catch (error) {
    console.error('❌ [Firestore] Error getting dashboard stats:', error);
    throw error;
  }
};

export const getRestaurantReviewsSummary = async (restaurantId) => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('restaurantId', '==', restaurantId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        averageRating: 0,
        reviewCount: 0,
        totalRating: 0
      };
    }
    
    let totalRating = 0;
    const reviews = [];
    
    querySnapshot.forEach((doc) => {
      const reviewData = doc.data();
      reviews.push({ id: doc.id, ...reviewData });
      totalRating += reviewData.rating || 0;
    });
    
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
    
    return {
      averageRating,
      reviewCount,
      totalRating,
      reviews
    };
  } catch (error) {
    console.error('Error getting restaurant reviews summary:', error);
    throw error;
  }
};

export const syncRestaurantRating = async (restaurantId) => {
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('restaurantId', '==', restaurantId));
    const querySnapshot = await getDocs(q);
    
    const reviewCount = querySnapshot.size;
    let totalRating = 0;
    
    querySnapshot.forEach((doc) => {
      const review = doc.data();
      if (review.rating && review.rating > 0) {
        totalRating += review.rating;
      }
    });
    
    const averageRating = reviewCount > 0 ? totalRating / reviewCount : 0;
    
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    await updateDoc(restaurantRef, {
      rating: Number(averageRating.toFixed(1)),
      reviewCount: reviewCount,
      lastRatingUpdate: serverTimestamp()
    });
    
    console.log(`✅ Synced rating for ${restaurantId}: ${averageRating.toFixed(1)} (${reviewCount} reviews)`);
    
    return {
      success: true,
      rating: averageRating,
      reviewCount: reviewCount
    };
    
  } catch (error) {
    console.error('❌ Error syncing rating:', error);
    return { success: false, error: error.message };
  }
};

// =======================================================================
// =========================== REPORT REVIEW =============================
// =======================================================================

export const reportReview = async (reportData) => {
  try {
    const reportRef = await addDoc(collection(db, 'reviewReports'), {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Update review dengan status report
    const reviewRef = doc(db, 'reviews', reportData.reviewId);
    await updateDoc(reviewRef, {
      reportStatus: 'pending',
      reportedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Notify admin (system notification)
    try {
      const title = 'Laporan Ulasan Baru';
      const restaurant = reportData.restaurantName || reportData.restaurantId || 'Restoran';
      const reason = reportData.reason || reportData.category || 'Alasan tidak tersedia';
      const message = `Ulasan dilaporkan pada ${restaurant}. Alasan: ${reason}.`;
      await createSystemNotification(title, message, 'review_report', reportRef.id);
    } catch (e) {
      console.warn('Failed to create admin notification for review report:', e?.message || e);
    }
    
    return { success: true, reportId: reportRef.id };
  } catch (error) {
    console.error('Error reporting review:', error);
    return { success: false, error: error.message };
  }
};

export const getReviewReports = async (status = 'pending') => {
  try {
    let q;
    if (status === 'all') {
      q = query(
        collection(db, 'reviewReports'),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'reviewReports'),
        where('reportStatus', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // keep createdAt as Firestore Timestamp for UI .toDate() usage
    }));

    return { success: true, data: reports };
  } catch (error) {
    console.error('Error getting review reports:', error);
    return { success: false, error: error.message };
  }
};

export const updateReportStatus = async (reportId, status, adminNotes = '') => {
  try {
    const reportRef = doc(db, 'reviewReports', reportId);
    await updateDoc(reportRef, {
      reportStatus: status,
      adminNotes,
      updatedAt: serverTimestamp(),
      resolvedAt: status !== 'pending' ? serverTimestamp() : null
    });
    
    if (status === 'approved') {
      const reportDoc = await getDoc(reportRef);
      const reportData = reportDoc.data();
      
      const reviewRef = doc(db, 'reviews', reportData.reviewId);
      await updateDoc(reviewRef, {
        reportStatus: 'approved',
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating report status:', error);
    return { success: false, error: error.message };
  }
};

export const createReservationNotification = async (ownerId, reservationData) => {
  try {
    console.log('📝 Membuat notifikasi untuk owner:', ownerId);
    console.log('📊 Data reservasi:', reservationData);

    if (!ownerId) {
      console.error('❌ Owner ID tidak ditemukan');
      return { success: false, error: 'Owner ID tidak ditemukan' };
    }

    const notificationData = {
      ownerId: ownerId,
      type: 'new_reservation',
      title: '🎉 Reservasi Baru!',
      message: `${reservationData.customerName} membuat reservasi untuk ${reservationData.guestCount} orang`,
      restaurantName: reservationData.restaurantName,
      customerName: reservationData.customerName,
      guestCount: reservationData.guestCount,
      reservationId: reservationData.id,
      restaurantId: reservationData.restaurantId,
      isRead: false,
      createdAt: serverTimestamp(),
      date: reservationData.date,
      time: reservationData.time,
      phone: reservationData.phone,
      totalPrice: reservationData.totalPrice,
      downPayment: reservationData.downPayment
    };

    console.log('📄 Data notifikasi yang akan disimpan:', notificationData);

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    
    console.log('✅ Notifikasi berhasil dibuat dengan ID:', docRef.id);
    return { 
      success: true, 
      id: docRef.id,
      message: 'Notifikasi berhasil dibuat' 
    };
    
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
};

export const getReports = async () => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('reviewId', '!=', null), // Hanya reports yang ada reviewId
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const reports = querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    
    // Convert timestamps
    return reports.map(report => ({
      ...report,
      createdAt: report.createdAt?.toDate ? report.createdAt.toDate() : report.createdAt,
      updatedAt: report.updatedAt?.toDate ? report.updatedAt.toDate() : report.updatedAt
    }));
  } catch (error) {
    console.error('Error getting reports:', error);
    return [];
  }
};

// Get user by ID
export const getUserById = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Get review by ID
export const getReviewById = async (reviewId) => {
  try {
    const reviewDoc = await getDoc(doc(db, 'reviews', reviewId));
    if (reviewDoc.exists()) {
      const data = reviewDoc.data();
      return { 
        id: reviewDoc.id, 
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting review:', error);
    return null;
  }
};

// Delete review
export const deleteReview = async (reviewId) => {
  try {
    // Fetch review to get restaurantId before deletion
    const reviewRef = doc(db, 'reviews', reviewId);
    const snap = await getDoc(reviewRef);
    const restaurantId = snap.exists() ? snap.data().restaurantId : null;

    // Delete review
    await deleteDoc(reviewRef);
    
    // Log deletion
    await addDoc(collection(db, 'review_deletions'), {
      reviewId,
      restaurantId: restaurantId || null,
      deletedAt: serverTimestamp(),
      deletedBy: 'admin',
      reason: 'Report approved'
    });

    // Recalculate restaurant rating so listing cards stay in sync
    if (restaurantId) {
      try {
        await updateRestaurantRating(restaurantId);
      } catch (e) {
        console.warn('Failed to update restaurant rating after deletion:', e?.message || e);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting review:', error);
    return { success: false, error: error.message };
  }
};

// Count user approved reports
export const countUserApprovedReports = async (userId) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('userId', '==', userId),
      where('status', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error counting user reports:', error);
    return 0;
  }
};



// Export semua fungsi
export default {
  // Promo Functions
  addPromo,
  addPromoAndUpdateRestaurant,
  getActivePromosForRestaurant,
  getActivePromosForMenu,
  getPromosByRestaurantId,
  updatePromo,
  deletePromo,
  getPromoById,
  
  // Menu & Restaurant Functions
  getMenusByRestaurantId,
  getRestaurantById,
  getRestaurantsByOwner,
  createRestaurant,
  getAllRestaurants,
  updateRestaurantStatus,
  updateRestaurant,
  updateRestaurantOpenStatus,
  
  // Notification Functions
  getSystemNotifications,
  createSystemNotification,
  getOwnerNotifications,
  getUserNotifications,
  getUserNotificationsOnce,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  deleteNotification,
  deleteAllOwnerNotifications,
  
  // Review Functions
  addReview,
  getRestaurantReviews,
  getOwnerReviews,
  getUserReviews,
  updateReviewReply,
  updateRestaurantRating,
  reportReview,
  getReviewReports,
  updateReportStatus,
  
  // Reservation Functions
  getRestaurantReservations,
  createReservation,
  subscribeToRestaurantReservations,
  
  // Favorite Functions
  isRestaurantFavorite,
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  toggleFavorite,
  
  // Other Functions
  getDashboardStats,
  updateUser,
  getAllUsers,
  updateUserRole
};

export const createUserReservationNotification = async (userId, reservationData) => {
  try {
    if (!userId) return { success: false, error: 'User ID tidak ditemukan' };
    const notificationData = {
      userId,
      type: 'reservation_confirmed',
      title: 'Reservasi Disetujui',
      message: `Reservasi Anda di ${reservationData.restaurantName} untuk ${reservationData.guestCount} orang telah dikonfirmasi`,
      reservationId: reservationData.id,
      restaurantId: reservationData.restaurantId,
      restaurantName: reservationData.restaurantName,
      date: reservationData.date,
      time: reservationData.time,
      totalPrice: reservationData.totalPrice,
      downPayment: reservationData.downPayment,
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error creating user reservation notification:', error);
    return { success: false, error: error.message };
  }
};