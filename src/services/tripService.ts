import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, TripRestaurant, TripActivity, TripDocument, TripLink } from '../types';

const TRIPS_COLLECTION = 'trips';

export const getTrips = async (): Promise<Trip[]> => {
  const q = query(collection(db, TRIPS_COLLECTION), orderBy('startDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
};

export const addTrip = async (data: Omit<Trip, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTrip = async (id: string, data: Partial<Trip>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, id), data);
};

export const deleteTrip = async (id: string): Promise<void> => {
  const subcollections = ['restaurants', 'activities', 'documents', 'links'];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, TRIPS_COLLECTION, id, sub));
    for (const d of snap.docs) {
      await deleteDoc(doc(db, TRIPS_COLLECTION, id, sub, d.id));
    }
  }
  await deleteDoc(doc(db, TRIPS_COLLECTION, id));
};

// Restaurants
export const getTripRestaurants = async (tripId: string): Promise<TripRestaurant[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'restaurants'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripRestaurant));
};

export const addTripRestaurant = async (tripId: string, data: Omit<TripRestaurant, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'restaurants'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const deleteTripRestaurant = async (tripId: string, restaurantId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'restaurants', restaurantId));
};

// Activities
export const getTripActivities = async (tripId: string): Promise<TripActivity[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'activities'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripActivity));
};

export const addTripActivity = async (tripId: string, data: Omit<TripActivity, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'activities'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const deleteTripActivity = async (tripId: string, activityId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'activities', activityId));
};

// Documents
export const getTripDocuments = async (tripId: string): Promise<TripDocument[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'documents'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripDocument));
};

export const addTripDocument = async (tripId: string, data: Omit<TripDocument, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'documents'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const deleteTripDocument = async (tripId: string, documentId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'documents', documentId));
};

// Links
export const getTripLinks = async (tripId: string): Promise<TripLink[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'links'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripLink));
};

export const addTripLink = async (tripId: string, data: Omit<TripLink, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'links'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const deleteTripLink = async (tripId: string, linkId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'links', linkId));
};
