import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Home, HomePaintColor, HomeProject, HomeInstruction, HomeService, HomeShoppingItem, HomeOffer } from '../types';

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
export async function getHomePaintColors(familyId: string, homeId: string, projectId?: string): Promise<HomePaintColor[]> {
  const q = query(collection(db, 'homePaintColors'), where('familyId', '==', familyId), where('homeId', '==', homeId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const allColors = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HomePaintColor));
  if (projectId) {
    return allColors.filter((c) => c.projectId === projectId);
  }
  return allColors;
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

// Instructions
export async function getHomeInstructions(familyId: string, homeId: string): Promise<HomeInstruction[]> {
  const q = query(collection(db, 'homeInstructions'), where('familyId', '==', familyId), where('homeId', '==', homeId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HomeInstruction));
}

export async function addHomeInstruction(data: Omit<HomeInstruction, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'homeInstructions'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHomeInstruction(instructionId: string, data: Partial<HomeInstruction>): Promise<void> {
  await updateDoc(doc(db, 'homeInstructions', instructionId), data);
}

export async function deleteHomeInstruction(instructionId: string): Promise<void> {
  await deleteDoc(doc(db, 'homeInstructions', instructionId));
}

// Service appointments
export async function getHomeServices(familyId: string, homeId: string): Promise<HomeService[]> {
  const q = query(collection(db, 'homeServices'), where('familyId', '==', familyId), where('homeId', '==', homeId), orderBy('dateFrom', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HomeService));
}

export async function addHomeService(data: Omit<HomeService, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'homeServices'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHomeService(serviceId: string, data: Partial<HomeService>): Promise<void> {
  await updateDoc(doc(db, 'homeServices', serviceId), data);
}

export async function deleteHomeService(serviceId: string): Promise<void> {
  await deleteDoc(doc(db, 'homeServices', serviceId));
}

// Shopping items
export async function getHomeShoppingItems(familyId: string, projectId: string): Promise<HomeShoppingItem[]> {
  const q = query(collection(db, 'homeShoppingItems'), where('familyId', '==', familyId), where('projectId', '==', projectId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HomeShoppingItem));
}

export async function addHomeShoppingItem(data: Omit<HomeShoppingItem, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'homeShoppingItems'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHomeShoppingItem(itemId: string, data: Partial<HomeShoppingItem>): Promise<void> {
  await updateDoc(doc(db, 'homeShoppingItems', itemId), data);
}

export async function deleteHomeShoppingItem(itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'homeShoppingItems', itemId));
}

// Offers
export async function getHomeOffers(familyId: string, projectId: string): Promise<HomeOffer[]> {
  const q = query(collection(db, 'homeOffers'), where('familyId', '==', familyId), where('projectId', '==', projectId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as HomeOffer));
}

export async function addHomeOffer(data: Omit<HomeOffer, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'homeOffers'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateHomeOffer(offerId: string, data: Partial<HomeOffer>): Promise<void> {
  await updateDoc(doc(db, 'homeOffers', offerId), data);
}

export async function deleteHomeOffer(offerId: string): Promise<void> {
  await deleteDoc(doc(db, 'homeOffers', offerId));
}
