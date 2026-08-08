import {
  collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, where, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Birthday, GiftIdea } from '../types';

const BIRTHDAYS_COLLECTION = 'birthdays';
const GIFTS_COLLECTION = 'gifts';

// Birthdays
export async function getBirthdays(familyId: string): Promise<Birthday[]> {
  const q = query(collection(db, BIRTHDAYS_COLLECTION), where('familyId', '==', familyId), orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Birthday));
}

export async function addBirthday(data: Omit<Birthday, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, BIRTHDAYS_COLLECTION), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateBirthday(id: string, data: Partial<Birthday>): Promise<void> {
  await updateDoc(doc(db, BIRTHDAYS_COLLECTION, id), data);
}

export async function deleteBirthday(id: string): Promise<void> {
  await deleteDoc(doc(db, BIRTHDAYS_COLLECTION, id));
}

// Gift Ideas (flat collection with familyId)
export async function getGiftIdeas(familyId: string, birthdayId: string): Promise<GiftIdea[]> {
  const q = query(collection(db, GIFTS_COLLECTION), where('familyId', '==', familyId), where('birthdayId', '==', birthdayId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GiftIdea));
}

export async function addGiftIdea(data: Omit<GiftIdea, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, GIFTS_COLLECTION), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateGiftIdea(id: string, data: Partial<GiftIdea>): Promise<void> {
  await updateDoc(doc(db, GIFTS_COLLECTION, id), data);
}

export async function deleteGiftIdea(id: string): Promise<void> {
  await deleteDoc(doc(db, GIFTS_COLLECTION, id));
}
