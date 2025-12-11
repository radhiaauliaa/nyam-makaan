import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where, getDoc } from 'firebase/firestore';

export const createReservation = async (reservationData) => {
  try {
    const docRef = await addDoc(collection(db, 'reservations'), {
      ...reservationData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create owner notification
    try {
      if (reservationData.restaurantId) {
        const restSnap = await getDoc(doc(db, 'restaurants', reservationData.restaurantId));
        const restaurant = restSnap.exists() ? restSnap.data() : null;
        const ownerId = restaurant?.ownerId;

        if (ownerId) {
          await addDoc(collection(db, 'notifications'), {
            ownerId,
            type: 'new_reservation',
            title: 'Reservasi Baru',
            message: `${reservationData.userName || reservationData.contactName || 'Tamu'} membuat reservasi untuk ${reservationData.guests || reservationData.guestCount || 1} orang`,
            restaurantId: reservationData.restaurantId,
            restaurantName: restaurant?.name || reservationData.restaurantName || '',
            reservationId: docRef.id,
            customerName: reservationData.userName || reservationData.contactName || '',
            guestCount: reservationData.guests || reservationData.guestCount || 1,
            date: reservationData.date,
            time: reservationData.time,
            isRead: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (notifyErr) {
      // Log only; do not fail reservation creation if notification fails
      console.error('Error creating owner notification:', notifyErr);
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating reservation:', error);
    throw error;
  }
};

export const getReservationsByUser = async (userId) => {
  try {
    const q = query(collection(db, 'reservations'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user reservations:', error);
    throw error;
  }
};