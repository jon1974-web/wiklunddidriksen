import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where, limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { KindergartenChild, KindergartenYear, KindergartenContact, KindergartenSchedule, SchoolHoliday } from '../types';

// Children
export async function getKindergartenChildren(familyId: string): Promise<KindergartenChild[]> {
  const q = query(collection(db, 'kindergartenChildren'), where('familyId', '==', familyId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as KindergartenChild));
}

export async function addKindergartenChild(data: Omit<KindergartenChild, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'kindergartenChildren'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateKindergartenChild(childId: string, data: Partial<KindergartenChild>): Promise<void> {
  await updateDoc(doc(db, 'kindergartenChildren', childId), data);
}

export async function deleteKindergartenChild(childId: string): Promise<void> {
  await deleteDoc(doc(db, 'kindergartenChildren', childId));
}

// Kindergarten Years
export async function getKindergartenYears(familyId: string, childId: string): Promise<KindergartenYear[]> {
  const q = query(collection(db, 'kindergartenYears'), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as KindergartenYear))
    .filter((y) => y.childId === childId);
}

export async function addKindergartenYear(data: Omit<KindergartenYear, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'kindergartenYears'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateKindergartenYear(yearId: string, data: Partial<KindergartenYear>): Promise<void> {
  await updateDoc(doc(db, 'kindergartenYears', yearId), data);
}

export async function deleteKindergartenYear(yearId: string): Promise<void> {
  await deleteDoc(doc(db, 'kindergartenYears', yearId));
}

// Contacts (teachers + classmates)
export async function getKindergartenContacts(familyId: string, yearId: string, childId?: string): Promise<KindergartenContact[]> {
  let q = query(collection(db, 'kindergartenContacts'), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as KindergartenContact))
    .filter((c) => c.yearId === yearId && (!childId || c.childId === childId));
}

export async function addKindergartenContact(data: Omit<KindergartenContact, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'kindergartenContacts'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateKindergartenContact(contactId: string, data: Partial<KindergartenContact>): Promise<void> {
  await updateDoc(doc(db, 'kindergartenContacts', contactId), data);
}

export async function deleteKindergartenContact(contactId: string): Promise<void> {
  await deleteDoc(doc(db, 'kindergartenContacts', contactId));
}

// Schedules
export async function getKindergartenSchedules(familyId: string, yearId: string): Promise<KindergartenSchedule[]> {
  const q = query(collection(db, 'kindergartenSchedules'), where('familyId', '==', familyId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as KindergartenSchedule))
    .filter((s) => s.yearId === yearId);
}

export async function addKindergartenSchedule(data: Omit<KindergartenSchedule, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'kindergartenSchedules'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateKindergartenSchedule(scheduleId: string, data: Partial<KindergartenSchedule>): Promise<void> {
  await updateDoc(doc(db, 'kindergartenSchedules', scheduleId), data);
}

export async function deleteKindergartenSchedule(scheduleId: string): Promise<void> {
  await deleteDoc(doc(db, 'kindergartenSchedules', scheduleId));
}

// Holidays
export async function getKindergartenHolidays(familyId: string, yearId: string, childId?: string): Promise<SchoolHoliday[]> {
  let q = query(collection(db, 'kindergartenHolidays'), where('familyId', '==', familyId), where('yearId', '==', yearId));
  if (childId) q = query(collection(db, 'kindergartenHolidays'), where('familyId', '==', familyId), where('yearId', '==', yearId), where('childId', '==', childId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SchoolHoliday));
}

export async function addKindergartenHoliday(data: Omit<SchoolHoliday, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'kindergartenHolidays'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateKindergartenHoliday(holidayId: string, data: Partial<SchoolHoliday>): Promise<void> {
  await updateDoc(doc(db, 'kindergartenHolidays', holidayId), data);
}

export async function deleteKindergartenHoliday(holidayId: string): Promise<void> {
  await deleteDoc(doc(db, 'kindergartenHolidays', holidayId));
}
