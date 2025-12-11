import { 
  useState, 
  useEffect, 
  createContext, 
  useContext 
} from 'react';

import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

import { 
  doc, 
  getDoc, 
  setDoc 
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔔 Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // 🔔 Load Notifications
  const loadNotifications = async (userId) => {
    if (!userId) {
      console.log('❌ loadNotifications: No userId provided');
      return;
    }

    try {
      const { getUserNotificationsOnce, getUnreadNotificationsCount } = await import('../lib/firestore');
      
      const result = await getUserNotificationsOnce(userId);
      console.log('📋 Notifications loaded:', result.success ? result.data.length : 'failed');
      
      if (result.success) {
        setNotifications(result.data);
      } else {
        console.error('❌ Failed to load notifications:', result.error);
        setNotifications([]);
      }

      const countResult = await getUnreadNotificationsCount(userId);
      console.log('🔢 Unread count:', countResult.success ? countResult.count : 'failed');
      
      if (countResult.success) {
        setUnreadNotificationCount(countResult.count);
      } else {
        console.error('❌ Failed to load unread count:', countResult.error);
        setUnreadNotificationCount(0);
      }
    } catch (error) {
      console.error("❌ Error loading notifications:", error);
      setNotifications([]);
      setUnreadNotificationCount(0);
    }
  };

  // ==============================
  // REGISTER
  // ==============================
  const register = async (email, password, userInfo) => {
    try {
      console.log('👤 Starting registration for:', email);
      
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      console.log('✅ User created, saving to Firestore...');

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email,
        displayName: userInfo.displayName,
        phone: userInfo.phone,
        role: userInfo.role || "customer",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ User data saved to Firestore');
      // Notify admin about new account registration
      try {
        const { createSystemNotification } = await import('../lib/firestore');
        const title = 'Pendaftaran Akun Baru';
        const message = `${userInfo.displayName || email} mendaftar sebagai ${userInfo.role || 'customer'}.`;
        await createSystemNotification(title, message, 'user_registration', user.uid);
      } catch (e) {
        console.warn('Failed to create admin notification for user registration:', e?.message || e);
      }
      return { success: true, user };
    } catch (error) {
      console.error("❌ Registration error:", error);
      return { success: false, error: error.message };
    }
  };

  // ==============================
  // LOGIN
  // ==============================
  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login for:', email);
      
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Login successful for:', email);
      return { success: true, user };

    } catch (error) {
      console.error("❌ Login error:", error);
      return { success: false, error: error.message };
    }
  };

  // ==============================
  // LOGOUT
  // ==============================
  const logout = async () => {
    try {
      console.log('🚪 Logging out user...');
      
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
      setNotifications([]);
      setUnreadNotificationCount(0);
      
      console.log('✅ Logout successful');
      return { success: true };
    } catch (error) {
      console.error("❌ Logout error:", error);
      return { success: false, error: error.message };
    }
  };

  // ==============================
  // RESET PASSWORD
  // ==============================
  const resetPassword = async (email) => {
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('❌ Reset password error:', error);
      return { success: false, error: error.message };
    }
  };

  // ==============================
  // LOAD USER DATA - DIPERBAIKI (NO REDIRECT)
  // ==============================
  const loadUserData = async (user) => {
    if (!user) {
      console.log('👤 No user, clearing data');
      setUserData(null);
      setNotifications([]);
      setUnreadNotificationCount(0);
      setLoading(false);
      return;
    }

    try {
      console.log('📥 Loading user data for:', user.uid);
      
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ User data found:', userData.role);
        setUserData(userData);

        // 🔔 Load Notifications
        loadNotifications(user.uid).catch(error => {
          console.error('❌ Failed to load notifications:', error);
        });

      } else {
        console.log("❌ No user document found in Firestore");
        setUserData(null);
      }

    } catch (error) {
      console.error("❌ Error loading user data:", error);
      setUserData(null);
    } finally {
      setLoading(false);
      console.log('🏁 User data loading completed');
    }
  };

  // ==============================
  // AUTH LISTENER
  // ==============================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(false);
        
        // Fetch additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData({ id: userDoc.id, ...userDoc.data() });
        } else {
          setUserData(null);
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ==============================
  // REFRESH NOTIFICATIONS FUNCTION
  // ==============================
  const refreshNotifications = async () => {
    if (currentUser) {
      console.log('🔄 Manually refreshing notifications...');
      await loadNotifications(currentUser.uid);
    }
  };

  // ==============================
  // MARK NOTIFICATION AS READ
  // ==============================
  const markNotificationAsRead = async (notificationId) => {
    try {
      const { markNotificationAsRead } = await import('../lib/firestore');
      const result = await markNotificationAsRead(notificationId);
      
      if (result.success) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        );
        setUnreadNotificationCount(prev => Math.max(0, prev - 1));
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return { success: false, error: error.message };
    }
  };

  // ==============================
  // MARK ALL NOTIFICATIONS AS READ
  // ==============================
  const markAllNotificationsAsRead = async () => {
    if (!currentUser) {
      return { success: false, error: 'No user logged in' };
    }

    try {
      const { markAllNotificationsAsRead } = await import('../lib/firestore');
      const result = await markAllNotificationsAsRead(currentUser.uid);
      
      if (result.success) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
        setUnreadNotificationCount(0);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  };

  // ==============================
  // GET OWNER RESTAURANT INFO
  // ==============================
  const getOwnerRestaurantInfo = async () => {
    if (!currentUser || userData?.role !== 'owner') {
      return { success: false, error: 'User is not an owner' };
    }

    try {
      const { getRestaurantsByOwner } = await import('../lib/firestore');
      const restaurants = await getRestaurantsByOwner(currentUser.uid);
      return { success: true, restaurants };
    } catch (error) {
      console.error('❌ Error getting owner restaurants:', error);
      return { success: false, error: error.message };
    }
  };

  // ==============================
  // CONTEXT VALUE
  // ==============================
  const value = {
    currentUser,
    userData,
    register,
    login,
    logout,
    resetPassword,
    loading,

    // 🔔 Notifications
    notifications,
    unreadNotificationCount,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,

    // Owner functions
    getOwnerRestaurantInfo,

    // Helper functions
    isOwner: userData?.role === 'owner',
    isCustomer: userData?.role === 'customer',
    getUserRole: () => userData?.role || 'customer'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
