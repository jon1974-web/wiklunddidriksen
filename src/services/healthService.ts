import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { HealthMedication, HealthAppointment, HealthVaccination, HealthAllergy, HealthGrowth } from '../types';

const HEALTH_COLLECTION = 'health';

function getHealthCollection(familyId: string, subcollection: string) {
  return collection(db, HEALTH_COLLECTION, familyId, subcollection);
}

// Medications
export async function getHealthMedications(familyId: string): Promise<HealthMedication[]> {
  const q = query(getHealthCollection(familyId, 'medications'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HealthMedication));
}

export async function addHealthMedication(familyId: string, data: Omit<HealthMedication, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getHealthCollection(familyId, 'medications'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHealthMedication(familyId: string, id: string, data: Partial<HealthMedication>): Promise<void> {
  await updateDoc(doc(db, HEALTH_COLLECTION, familyId, 'medications', id), data);
}

export async function deleteHealthMedication(familyId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, HEALTH_COLLECTION, familyId, 'medications', id));
}

// Appointments
export async function getHealthAppointments(familyId: string): Promise<HealthAppointment[]> {
  const q = query(getHealthCollection(familyId, 'appointments'), orderBy('dateFrom', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HealthAppointment));
}

export async function addHealthAppointment(familyId: string, data: Omit<HealthAppointment, 'id' | 'createdAt'>, createdBy?: string): Promise<string> {
  const docRef = await addDoc(getHealthCollection(familyId, 'appointments'), { ...data, createdBy: createdBy || null, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHealthAppointment(familyId: string, id: string, data: Partial<HealthAppointment>): Promise<void> {
  await updateDoc(doc(db, HEALTH_COLLECTION, familyId, 'appointments', id), data);
}

export async function deleteHealthAppointment(familyId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, HEALTH_COLLECTION, familyId, 'appointments', id));
}

// Vaccinations
export async function getHealthVaccinations(familyId: string): Promise<HealthVaccination[]> {
  const q = query(getHealthCollection(familyId, 'vaccinations'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HealthVaccination));
}

export async function addHealthVaccination(familyId: string, data: Omit<HealthVaccination, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getHealthCollection(familyId, 'vaccinations'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHealthVaccination(familyId: string, id: string, data: Partial<HealthVaccination>): Promise<void> {
  await updateDoc(doc(db, HEALTH_COLLECTION, familyId, 'vaccinations', id), data);
}

export async function deleteHealthVaccination(familyId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, HEALTH_COLLECTION, familyId, 'vaccinations', id));
}

// Allergies
export async function getHealthAllergies(familyId: string): Promise<HealthAllergy[]> {
  const q = query(getHealthCollection(familyId, 'allergies'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HealthAllergy));
}

export async function addHealthAllergy(familyId: string, data: Omit<HealthAllergy, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getHealthCollection(familyId, 'allergies'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHealthAllergy(familyId: string, id: string, data: Partial<HealthAllergy>): Promise<void> {
  await updateDoc(doc(db, HEALTH_COLLECTION, familyId, 'allergies', id), data);
}

export async function deleteHealthAllergy(familyId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, HEALTH_COLLECTION, familyId, 'allergies', id));
}

// Growth
export async function getHealthGrowth(familyId: string): Promise<HealthGrowth[]> {
  const q = query(getHealthCollection(familyId, 'growth'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HealthGrowth));
}

export async function addHealthGrowth(familyId: string, data: Omit<HealthGrowth, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getHealthCollection(familyId, 'growth'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHealthGrowth(familyId: string, id: string, data: Partial<HealthGrowth>): Promise<void> {
  await updateDoc(doc(db, HEALTH_COLLECTION, familyId, 'growth', id), data);
}

export async function deleteHealthGrowth(familyId: string, id: string): Promise<void> {
  await deleteDoc(doc(db, HEALTH_COLLECTION, familyId, 'growth', id));
}
