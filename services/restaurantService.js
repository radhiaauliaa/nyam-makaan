import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';

export const createRestaurant = async (restaurantData) => {
  try {
    console.log('Creating restaurant with data:', restaurantData);
    
    const docRef = await addDoc(collection(db, 'restaurants'), {
      ...restaurantData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Restaurant created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating restaurant:', error);
    throw error;
  }
};

export const getRestaurantById = async (id) => {
  try {
    const docRef = doc(db, 'restaurants', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting restaurant:', error);
    throw error;
  }
};

export const getRestaurantsByOwner = async (ownerId) => {
  try {
    const q = query(collection(db, 'restaurants'), where('ownerId', '==', ownerId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting owner restaurants:', error);
    throw error;
  }
};