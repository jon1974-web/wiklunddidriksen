import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Pet, PetVetVisit, PetMedication, PetFood, PetGrooming, PetVaccination, PetInsurance } from '../types';

const PETS_COLLECTION = 'pets';

function getSubcollection(familyId: string, petId: string, subcollection: string) {
  return collection(db, PETS_COLLECTION, familyId, petId, subcollection);
}

// Pets
export async function getPets(familyId: string): Promise<Pet[]> {
  const q = query(collection(db, PETS_COLLECTION, familyId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Pet));
}

export async function addPet(familyId: string, data: Omit<Pet, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, PETS_COLLECTION, familyId), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePet(familyId: string, petId: string, data: Partial<Pet>): Promise<void> {
  await updateDoc(doc(db, PETS_COLLECTION, familyId, petId), data);
}

export async function deletePet(familyId: string, petId: string): Promise<void> {
  await deleteDoc(doc(db, PETS_COLLECTION, familyId, petId));
}

// Vet Visits
export async function getVetVisits(familyId: string, petId: string): Promise<PetVetVisit[]> {
  const q = query(getSubcollection(familyId, petId, 'vetVisits'), orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetVetVisit));
}

export async function addVetVisit(familyId: string, petId: string, data: Omit<PetVetVisit, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getSubcollection(familyId, petId, 'vetVisits'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateVetVisit(familyId: string, petId: string, visitId: string, data: Partial<PetVetVisit>): Promise<void> {
  await updateDoc(doc(db, PETS_COLLECTION, familyId, petId, 'vetVisits', visitId), data);
}

export async function deleteVetVisit(familyId: string, petId: string, visitId: string): Promise<void> {
  await deleteDoc(doc(db, PETS_COLLECTION, familyId, petId, 'vetVisits', visitId));
}

// Medications
export async function getPetMedications(familyId: string, petId: string): Promise<PetMedication[]> {
  const q = query(getSubcollection(familyId, petId, 'medications'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetMedication));
}

export async function addPetMedication(familyId: string, petId: string, data: Omit<PetMedication, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getSubcollection(familyId, petId, 'medications'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetMedication(familyId: string, petId: string, medId: string, data: Partial<PetMedication>): Promise<void> {
  await updateDoc(doc(db, PETS_COLLECTION, familyId, petId, 'medications', medId), data);
}

export async function deletePetMedication(familyId: string, petId: string, medId: string): Promise<void> {
  await deleteDoc(doc(db, PETS_COLLECTION, familyId, petId, 'medications', medId));
}

// Food
export async function getPetFood(familyId: string, petId: string): Promise<PetFood[]> {
  const q = query(getSubcollection(familyId, petId, 'food'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetFood));
}

export async function addPetFood(familyId: string, petId: string, data: Omit<PetFood, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getSubcollection(familyId, petId, 'food'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetFood(familyId: string, petId: string, foodId: string, data: Partial<PetFood>): Promise<void> {
  await updateDoc(doc(db, PETS_COLLECTION, familyId, petId, 'food', foodId), data);
}

export async function deletePetFood(familyId: string, petId: string, foodId: string): Promise<void> {
  await deleteDoc(doc(db, PETS_COLLECTION, familyId, petId, 'food', foodId));
}

// Grooming
export async function getPetGrooming(familyId: string, petId: string): Promise<PetGrooming[]> {
  const q = query(getSubcollection(familyId, petId, 'grooming'), orderBy('lastDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetGrooming));
}

export async function addPetGrooming(familyId: string, petId: string, data: Omit<PetGrooming, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getSubcollection(familyId, petId, 'grooming'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetGrooming(familyId: string, petId: string, groomingId: string, data: Partial<PetGrooming>): Promise<void> {
  await updateDoc(doc(db, PETS_COLLECTION, familyId, petId, 'grooming', groomingId), data);
}

export async function deletePetGrooming(familyId: string, petId: string, groomingId: string): Promise<void> {
  await deleteDoc(doc(db, PETS_COLLECTION, familyId, petId, 'grooming', groomingId));
}

// Vaccinations
export async function getPetVaccinations(familyId: string, petId: string): Promise<PetVaccination[]> {
  const q = query(getSubcollection(familyId, petId, 'vaccinations'), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetVaccination));
}

export async function addPetVaccination(familyId: string, petId: string, data: Omit<PetVaccination, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getSubcollection(familyId, petId, 'vaccinations'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetVaccination(familyId: string, petId: string, vaccId: string, data: Partial<PetVaccination>): Promise<void> {
  await updateDoc(doc(db, PETS_COLLECTION, familyId, petId, 'vaccinations', vaccId), data);
}

export async function deletePetVaccination(familyId: string, petId: string, vaccId: string): Promise<void> {
  await deleteDoc(doc(db, PETS_COLLECTION, familyId, petId, 'vaccinations', vaccId));
}

// Insurance
export async function getPetInsurance(familyId: string, petId: string): Promise<PetInsurance[]> {
  const q = query(getSubcollection(familyId, petId, 'insurance'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetInsurance));
}

export async function addPetInsurance(familyId: string, petId: string, data: Omit<PetInsurance, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(getSubcollection(familyId, petId, 'insurance'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetInsurance(familyId: string, petId: string, insId: string, data: Partial<PetInsurance>): Promise<void> {
  await updateDoc(doc(db, PETS_COLLECTION, familyId, petId, 'insurance', insId), data);
}

export async function deletePetInsurance(familyId: string, petId: string, insId: string): Promise<void> {
  await deleteDoc(doc(db, PETS_COLLECTION, familyId, petId, 'insurance', insId));
}
