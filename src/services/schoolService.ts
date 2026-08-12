import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where, limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { SchoolChild, SchoolYear, SchoolContact, SchoolSchedule } from '../types';

// Children
export async function getSchoolChildren(familyId: string): Promise<SchoolChild[]> {
  const q = query(collection(db, 'schoolChildren'), where('familyId', '==', familyId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SchoolChild));
}

export async function addSchoolChild(data: Omit<SchoolChild, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'schoolChildren'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateSchoolChild(childId: string, data: Partial<SchoolChild>): Promise<void> {
  await updateDoc(doc(db, 'schoolChildren', childId), data);
}

export async function deleteSchoolChild(childId: string): Promise<void> {
  await deleteDoc(doc(db, 'schoolChildren', childId));
}

// School Years
export async function getSchoolYears(familyId: string, childId: string): Promise<SchoolYear[]> {
  const q = query(collection(db, 'schoolYears'), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as SchoolYear))
    .filter((y) => y.childId === childId);
}

export async function addSchoolYear(data: Omit<SchoolYear, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'schoolYears'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateSchoolYear(yearId: string, data: Partial<SchoolYear>): Promise<void> {
  await updateDoc(doc(db, 'schoolYears', yearId), data);
}

export async function deleteSchoolYear(yearId: string): Promise<void> {
  await deleteDoc(doc(db, 'schoolYears', yearId));
}

// Contacts (teachers + classmates)
export async function getSchoolContacts(familyId: string, yearId: string, childId?: string): Promise<SchoolContact[]> {
  let q = query(collection(db, 'schoolContacts'), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as SchoolContact))
    .filter((c) => c.yearId === yearId && (!childId || c.childId === childId));
}

export async function addSchoolContact(data: Omit<SchoolContact, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'schoolContacts'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateSchoolContact(contactId: string, data: Partial<SchoolContact>): Promise<void> {
  await updateDoc(doc(db, 'schoolContacts', contactId), data);
}

export async function deleteSchoolContact(contactId: string): Promise<void> {
  await deleteDoc(doc(db, 'schoolContacts', contactId));
}

// Schedules
export async function getSchoolSchedules(familyId: string, yearId: string): Promise<SchoolSchedule[]> {
  const q = query(collection(db, 'schoolSchedules'), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as SchoolSchedule))
    .filter((s) => s.yearId === yearId);
}

export async function addSchoolSchedule(data: Omit<SchoolSchedule, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'schoolSchedules'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateSchoolSchedule(scheduleId: string, data: Partial<SchoolSchedule>): Promise<void> {
  await updateDoc(doc(db, 'schoolSchedules', scheduleId), data);
}

export async function deleteSchoolSchedule(scheduleId: string): Promise<void> {
  await deleteDoc(doc(db, 'schoolSchedules', scheduleId));
}
