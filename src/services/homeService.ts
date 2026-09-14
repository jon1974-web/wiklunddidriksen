import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Home } from '../types';

export async function getHomes(familyId: string): Promise<Home[]> {
  const q = query(collection(db, 'homes'), where('familyId', '==', familyId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Home));
}

export async function addHome(data: Omit<Home, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'homes'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHome(homeId: string, data: Partial<Home>): Promise<void> {
  await updateDoc(doc(db, 'homes', homeId), data);
}

export async function deleteHome(homeId: string): Promise<void> {
  await deleteDoc(doc(db, 'homes', homeId));
}
