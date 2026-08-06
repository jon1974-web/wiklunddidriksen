import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  where,
  query,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Trip, TripRestaurant, TripActivity, TripDocument, TripLink, TripHotel, TripFlight } from '../types';

const TRIPS_COLLECTION = 'trips';

export const getTrips = async (familyId: string): Promise<Trip[]> => {
  const q = query(collection(db, TRIPS_COLLECTION), where('familyId', '==', familyId), orderBy('startDate', 'desc'), limit(100));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
};

export const addTrip = async (data: Omit<Trip, 'id' | 'createdAt'>, familyId: string): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION), {
    ...data,
    familyId,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTrip = async (id: string, data: Partial<Trip>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, id), data);
};

export const deleteTrip = async (id: string): Promise<void> => {
  const subcollections = ['restaurants', 'activities', 'documents', 'links', 'hotels', 'transport', 'packingLists'];
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

// Hotels
export const getTripHotels = async (tripId: string): Promise<TripHotel[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'hotels'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripHotel));
};

export const addTripHotel = async (tripId: string, data: Omit<TripHotel, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'hotels'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTripHotel = async (tripId: string, hotelId: string, data: Partial<TripHotel>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'hotels', hotelId), data);
};

export const deleteTripHotel = async (tripId: string, hotelId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'hotels', hotelId));
};

// Update functions
export const updateTripRestaurant = async (tripId: string, restaurantId: string, data: Partial<TripRestaurant>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'restaurants', restaurantId), data);
};

export const updateTripActivity = async (tripId: string, activityId: string, data: Partial<TripActivity>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'activities', activityId), data);
};

export const updateTripDocument = async (tripId: string, documentId: string, data: Partial<TripDocument>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'documents', documentId), data);
};

export const updateTripLink = async (tripId: string, linkId: string, data: Partial<TripLink>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'links', linkId), data);
};

// Transport (unified for all types: fly, tog, bil, boat, ferry, taxi)
export const getTripFlights = async (tripId: string): Promise<TripFlight[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'transport'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripFlight));
};

export const addTripFlight = async (tripId: string, data: Omit<TripFlight, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'transport'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTripFlight = async (tripId: string, flightId: string, data: Partial<TripFlight>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'transport', flightId), data);
};

export const deleteTripFlight = async (tripId: string, flightId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'transport', flightId));
};

// Packing Lists
export const getTripPackingLists = async (tripId: string): Promise<any[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'packingLists'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const addTripPackingList = async (tripId: string, data: { title: string; items: any[]; createdBy: string }): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'packingLists'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTripPackingList = async (tripId: string, listId: string, data: any): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'packingLists', listId), data);
};

export const deleteTripPackingList = async (tripId: string, listId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'packingLists', listId));
};
