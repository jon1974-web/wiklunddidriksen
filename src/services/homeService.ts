import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Home, HomePaintColor, HomeProject } from '../types';

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

// Paint Colors
export async function getHomePaintColors(familyId: string, homeId: string): Promise<HomePaintColor[]> {
  const q = query(collection(db, 'homePaintColors'), where('familyId', '==', familyId), where('homeId', '==', homeId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HomePaintColor));
}

export async function addHomePaintColor(data: Omit<HomePaintColor, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'homePaintColors'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHomePaintColor(colorId: string, data: Partial<HomePaintColor>): Promise<void> {
  await updateDoc(doc(db, 'homePaintColors', colorId), data);
}

export async function deleteHomePaintColor(colorId: string): Promise<void> {
  await deleteDoc(doc(db, 'homePaintColors', colorId));
}

// Projects
export async function getHomeProjects(familyId: string, homeId: string): Promise<HomeProject[]> {
  const q = query(collection(db, 'homeProjects'), where('familyId', '==', familyId), where('homeId', '==', homeId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HomeProject));
}

export async function addHomeProject(data: Omit<HomeProject, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'homeProjects'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHomeProject(projectId: string, data: Partial<HomeProject>): Promise<void> {
  await updateDoc(doc(db, 'homeProjects', projectId), data);
}

export async function deleteHomeProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'homeProjects', projectId));
}
