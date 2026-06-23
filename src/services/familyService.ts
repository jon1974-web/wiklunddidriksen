import { db, auth } from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { UserProfile, Family, FamilyMember } from '../types';

const FUNCTIONS_BASE = 'https://us-central1-familiesenter-837bb.cloudfunctions.net';

async function callFunction(name: string, data: Record<string, unknown> = {}): Promise<any> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Ikke innlogget');
  const idToken = await currentUser.getIdToken();
  const response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Serverfeil');
  return result;
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
      familyRole: null,
      calendarId: null,
      calendarEmail: null,
      calendarProvider: null,
      avatarUrl: null,
      notificationsEnabled: true,
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

export const getFamilyById = async (familyId: string): Promise<Family | null> => {
  const familyRef = doc(db, 'families', familyId);
  const snapshot = await getDoc(familyRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Family;
  }
  return null;
};

export const getFamilyMembers = async (familyId: string): Promise<UserProfile[]> => {
  const family = await getFamilyById(familyId);
  if (!family || !family.members) return [];
  const uids = Object.keys(family.members);
  if (uids.length === 0) return [];
  const profiles = await Promise.all(
    uids.map(async (uid) => {
      const profile = await getUserProfile(uid);
      return profile;
    })
  );
  return profiles.filter((p): p is UserProfile => p !== null);
};

export const getFamilyMembersWithRoles = async (familyId: string): Promise<{ profile: UserProfile; role: FamilyMember['role'] }[]> => {
  const family = await getFamilyById(familyId);
  if (!family || !family.members) return [];
  const entries = Object.entries(family.members);
  if (entries.length === 0) return [];
  const results = await Promise.all(
    entries.map(async ([uid, memberInfo]) => {
      const profile = await getUserProfile(uid);
      return profile ? { profile, role: memberInfo.role } : null;
    })
  );
  return results.filter((r): r is { profile: UserProfile; role: FamilyMember['role'] } => r !== null);
};

export const listenToFamily = (familyId: string, callback: (family: Family | null) => void) => {
  const familyRef = doc(db, 'families', familyId);
  return onSnapshot(familyRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Family);
    } else {
      callback(null);
    }
  });
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

export const searchFamilyByName = async (name: string): Promise<Family[]> => {
  const q = query(
    collection(db, 'families'),
    where('name', '>=', name),
    where('name', '<=', name + '\uf8ff')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Family));
};

// --- Cloud Function calls (all writes go through server) ---

export const createFamily = async (name: string, createdBy: string): Promise<string> => {
  const result = await callFunction('createFamily', { name });
  return result.familyId;
};

export const generateInviteCode = async (familyId: string): Promise<{ code: string; expiresAt: number; familyName: string }> => {
  const result = await callFunction('generateInviteCode', { familyId });
  return { code: result.code, expiresAt: result.expiresAt, familyName: result.familyName };
};

export const joinFamilyByInviteCode = async (code: string): Promise<{ familyId: string; familyName: string }> => {
  const result = await callFunction('joinFamilyByInviteCode', { code });
  return { familyId: result.familyId, familyName: result.familyName };
};

export const leaveFamily = async (uid: string): Promise<void> => {
  await callFunction('leaveFamily', {});
};

export const removeFamilyMember = async (familyId: string, targetUid: string): Promise<void> => {
  await callFunction('removeFamilyMember', { familyId, targetUid });
};

export const updateMemberRole = async (familyId: string, targetUid: string, newRole: 'admin' | 'member'): Promise<void> => {
  await callFunction('updateMemberRole', { familyId, targetUid, newRole });
};

export const notifyNewEvent = async (familyId: string, eventTitle: string, eventDate: string, eventTime: string, creatorName: string): Promise<void> => {
  await callFunction('notifyNewEvent', { familyId, eventTitle, eventDate, eventTime, creatorName });
};
