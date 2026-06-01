import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  getDocs,
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  familyId: string | null;
  familyName: string | null;
  calendarId: string | null;
  avatarUrl: string | null;
  createdAt: number;
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  members: string[];
  createdAt: number;
}

export const createOrUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
  const userRef = doc(db, 'users', uid);
  const existing = await getDoc(userRef);
  
  if (existing.exists()) {
    await updateDoc(userRef, data);
  } else {
    await setDoc(userRef, {
      uid,
      email: data.email || '',
      displayName: data.displayName || 'User',
      familyId: null,
      familyName: null,
      calendarId: null,
      avatarUrl: null,
      createdAt: Date.now(),
      ...data,
    });
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return snapshot.data() as UserProfile;
  }
  return null;
};

export const updateDisplayName = async (uid: string, displayName: string) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { displayName });
};

export const createFamily = async (name: string, createdBy: string): Promise<string> => {
  const familyRef = doc(collection(db, 'families'));
  await setDoc(familyRef, {
    name,
    createdBy,
    members: [createdBy],
    createdAt: Date.now(),
  });
  
  await updateDoc(doc(db, 'users', createdBy), {
    familyId: familyRef.id,
    familyName: name,
  });
  
  return familyRef.id;
};

export const joinFamily = async (familyId: string, uid: string): Promise<boolean> => {
  const familyRef = doc(db, 'families', familyId);
  const familySnap = await getDoc(familyRef);
  
  if (!familySnap.exists()) {
    return false;
  }
  
  const family = familySnap.data() as Family;
  if (family.members.includes(uid)) {
    return true;
  }
  
  await updateDoc(familyRef, {
    members: arrayUnion(uid),
  });
  
  await updateDoc(doc(db, 'users', uid), {
    familyId,
    familyName: family.name,
  });
  
  return true;
};

export const leaveFamily = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return;
  
  const userData = userSnap.data() as UserProfile;
  if (!userData.familyId) return;
  
  const familyRef = doc(db, 'families', userData.familyId);
  await updateDoc(familyRef, {
    members: arrayRemove(uid),
  });
  
  await updateDoc(userRef, {
    familyId: null,
    familyName: null,
  });
};

export const getFamilyById = async (familyId: string): Promise<Family | null> => {
  const familyRef = doc(db, 'families', familyId);
  const snapshot = await getDoc(familyRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Family;
  }
  return null;
};

export const ADMIN_EMAIL = 'jon@wiklunddidriksen.com';
export const AUTO_FAMILY_ID = 'AVCUsb8X6GdRM3f0EBf0';

export const isAdmin = (email: string | null | undefined): boolean => {
  return email === ADMIN_EMAIL;
};

export const autoJoinFamily = async (uid: string): Promise<void> => {
  try {
    await joinFamily(AUTO_FAMILY_ID, uid);
  } catch {
    // silent fail
  }
};

export const searchFamilyByName = async (name: string): Promise<Family[]> => {
  const q = query(
    collection(db, 'families'),
    where('name', '>=', name),
    where('name', '<=', name + '\uf8ff')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Family));
};

export const listenToUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserProfile);
    } else {
      callback(null);
    }
  });
};
