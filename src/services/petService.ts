import {
  collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where,
} from 'firebase/firestore';
import { db } from './firebase';
import { Pet, PetVetVisit, PetMedication, PetFood, PetGrooming, PetVaccination, PetInsurance } from '../types';

// Pets (flat collection with familyId field)
export async function getPets(familyId: string): Promise<Pet[]> {
  const q = query(collection(db, 'pets'), where('familyId', '==', familyId), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Pet));
}

export async function addPet(data: Omit<Pet, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'pets'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePet(petId: string, data: Partial<Pet>): Promise<void> {
  await updateDoc(doc(db, 'pets', petId), data);
}

export async function deletePet(petId: string): Promise<void> {
  await deleteDoc(doc(db, 'pets', petId));
}

// Vet Visits
export async function getVetVisits(petId: string): Promise<PetVetVisit[]> {
  const q = query(collection(db, 'petVetVisits'), where('petId', '==', petId), orderBy('date', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetVetVisit));
}

export async function addVetVisit(data: Omit<PetVetVisit, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'petVetVisits'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updateVetVisit(visitId: string, data: Partial<PetVetVisit>): Promise<void> {
  await updateDoc(doc(db, 'petVetVisits', visitId), data);
}

export async function deleteVetVisit(visitId: string): Promise<void> {
  await deleteDoc(doc(db, 'petVetVisits', visitId));
}

// Medications
export async function getPetMedications(petId: string): Promise<PetMedication[]> {
  const q = query(collection(db, 'petMedications'), where('petId', '==', petId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetMedication));
}

export async function addPetMedication(data: Omit<PetMedication, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'petMedications'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetMedication(medId: string, data: Partial<PetMedication>): Promise<void> {
  await updateDoc(doc(db, 'petMedications', medId), data);
}

export async function deletePetMedication(medId: string): Promise<void> {
  await deleteDoc(doc(db, 'petMedications', medId));
}

// Food
export async function getPetFood(petId: string): Promise<PetFood[]> {
  const q = query(collection(db, 'petFood'), where('petId', '==', petId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetFood));
}

export async function addPetFood(data: Omit<PetFood, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'petFood'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetFood(foodId: string, data: Partial<PetFood>): Promise<void> {
  await updateDoc(doc(db, 'petFood', foodId), data);
}

export async function deletePetFood(foodId: string): Promise<void> {
  await deleteDoc(doc(db, 'petFood', foodId));
}

// Grooming
export async function getPetGrooming(petId: string): Promise<PetGrooming[]> {
  const q = query(collection(db, 'petGrooming'), where('petId', '==', petId), orderBy('lastDate', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetGrooming));
}

export async function addPetGrooming(data: Omit<PetGrooming, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'petGrooming'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetGrooming(groomId: string, data: Partial<PetGrooming>): Promise<void> {
  await updateDoc(doc(db, 'petGrooming', groomId), data);
}

export async function deletePetGrooming(groomId: string): Promise<void> {
  await deleteDoc(doc(db, 'petGrooming', groomId));
}

// Vaccinations
export async function getPetVaccinations(petId: string): Promise<PetVaccination[]> {
  const q = query(collection(db, 'petVaccinations'), where('petId', '==', petId), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetVaccination));
}

export async function addPetVaccination(data: Omit<PetVaccination, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'petVaccinations'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetVaccination(vaccId: string, data: Partial<PetVaccination>): Promise<void> {
  await updateDoc(doc(db, 'petVaccinations', vaccId), data);
}

export async function deletePetVaccination(vaccId: string): Promise<void> {
  await deleteDoc(doc(db, 'petVaccinations', vaccId));
}

// Insurance
export async function getPetInsurance(petId: string): Promise<PetInsurance[]> {
  const q = query(collection(db, 'petInsurance'), where('petId', '==', petId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as PetInsurance));
}

export async function addPetInsurance(data: Omit<PetInsurance, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'petInsurance'), { ...data, createdAt: Date.now() });
  return docRef.id;
}

export async function updatePetInsurance(insId: string, data: Partial<PetInsurance>): Promise<void> {
  await updateDoc(doc(db, 'petInsurance', insId), data);
}

export async function deletePetInsurance(insId: string): Promise<void> {
  await deleteDoc(doc(db, 'petInsurance', insId));
}
