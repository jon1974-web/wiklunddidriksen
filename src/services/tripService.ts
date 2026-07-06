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
import { Trip, TripRestaurant, TripActivity, TripDocument, TripLink, TripHotel, TripFlight, TripBoat, TripTaxi, TripFerry } from '../types';

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
  const subcollections = ['restaurants', 'activities', 'documents', 'links', 'hotels', 'flights', 'boats', 'taxis', 'ferries'];
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

// Flights
export const getTripFlights = async (tripId: string): Promise<TripFlight[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'flights'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripFlight));
};

export const addTripFlight = async (tripId: string, data: Omit<TripFlight, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'flights'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTripFlight = async (tripId: string, flightId: string, data: Partial<TripFlight>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'flights', flightId), data);
};

export const deleteTripFlight = async (tripId: string, flightId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'flights', flightId));
};

// Boats
export const getTripBoats = async (tripId: string): Promise<TripBoat[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'boats'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripBoat));
};

export const addTripBoat = async (tripId: string, data: Omit<TripBoat, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'boats'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTripBoat = async (tripId: string, boatId: string, data: Partial<TripBoat>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'boats', boatId), data);
};

export const deleteTripBoat = async (tripId: string, boatId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'boats', boatId));
};

// Taxis
export const getTripTaxis = async (tripId: string): Promise<TripTaxi[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'taxis'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripTaxi));
};

export const addTripTaxi = async (tripId: string, data: Omit<TripTaxi, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'taxis'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTripTaxi = async (tripId: string, taxiId: string, data: Partial<TripTaxi>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'taxis', taxiId), data);
};

export const deleteTripTaxi = async (tripId: string, taxiId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'taxis', taxiId));
};

// Ferries
export const getTripFerries = async (tripId: string): Promise<TripFerry[]> => {
  const q = query(collection(db, TRIPS_COLLECTION, tripId, 'ferries'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TripFerry));
};

export const addTripFerry = async (tripId: string, data: Omit<TripFerry, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, TRIPS_COLLECTION, tripId, 'ferries'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
};

export const updateTripFerry = async (tripId: string, ferryId: string, data: Partial<TripFerry>): Promise<void> => {
  await updateDoc(doc(db, TRIPS_COLLECTION, tripId, 'ferries', ferryId), data);
};

export const deleteTripFerry = async (tripId: string, ferryId: string): Promise<void> => {
  await deleteDoc(doc(db, TRIPS_COLLECTION, tripId, 'ferries', ferryId));
};
