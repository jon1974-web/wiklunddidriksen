import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db, auth } from './firebase';
import { SpondEvent, SpondGroup, SpondConfig, SpondMember } from '../types';

const SPOND_PROXY_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/spondProxy';
const SPOND_TOKEN_KEY = 'spond_cached_token';

let cachedToken: string | null = null;

const getPersistedToken = (): string | null => {
  if (cachedToken) return cachedToken;
  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem(SPOND_TOKEN_KEY);
      if (stored) {
        cachedToken = stored;
        return stored;
      }
    } catch {}
  }
  return null;
};

const persistToken = (token: string): void => {
  cachedToken = token;
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(SPOND_TOKEN_KEY, token);
    } catch {}
  }
};

const clearPersistedToken = (): void => {
  cachedToken = null;
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(SPOND_TOKEN_KEY);
    } catch {}
  }
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const currentUser = auth.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  return headers;
};

const proxyCall = async (body: Record<string, any>): Promise<any> => {
  const headers = await getAuthHeaders();
  const response = await fetch(SPOND_PROXY_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.error || 'Spond API-feil.');
  }
  return result;
};

export const loginSpond = async (email: string, password: string): Promise<string> => {
  const result = await proxyCall({ action: 'login', email, password });
  const accessToken = result?.accessToken?.token;
  if (!accessToken) {
    throw new Error('Spond innlogging feilet. Ingen token mottatt.');
  }
  persistToken(accessToken);
  return accessToken;
};

const getToken = async (email: string, password: string): Promise<string> => {
  const existing = getPersistedToken();
  if (existing) return existing;
  return await loginSpond(email, password);
};

export const getSpondGroups = async (email: string, password: string): Promise<SpondGroup[]> => {
  const token = await getToken(email, password);
  try {
    const groups = await proxyCall({ action: 'groups', token });
    return (groups || []).map((g: any) => ({ id: g.id, name: g.name, logoUrl: g.logoUrl || g.imageUrl || g.image || undefined }));
  } catch {
    clearPersistedToken();
    const newToken = await loginSpond(email, password);
    const groups = await proxyCall({ action: 'groups', token: newToken });
    return (groups || []).map((g: any) => ({ id: g.id, name: g.name, logoUrl: g.logoUrl || g.imageUrl || g.image || undefined }));
  }
};

export const getSpondEvents = async (
  email: string,
  password: string,
  groupIds: string[]
): Promise<SpondEvent[]> => {
  const token = await getToken(email, password);
  let events: any[];
  try {
    events = await proxyCall({ action: 'events', token, groupIds });
  } catch {
    clearPersistedToken();
    const newToken = await loginSpond(email, password);
    events = await proxyCall({ action: 'events', token: newToken, groupIds });
  }
  return (events || []).map((e: any) => mapSpondEvent(e));
};

const mapSpondEvent = (e: any): SpondEvent => ({
  id: e.id,
  heading: e.heading || 'Spond arrangement',
  description: e.description || undefined,
  startTimestamp: e.startTimestamp || '',
  endTimestamp: e.endTimestamp || undefined,
  address: e.location?.address || e.location?.name || e.location?.feature || undefined,
  groupName: undefined,
  groupId: e._groupId || undefined,
  responses: e.responses
    ? {
        acceptedIds: e.responses.acceptedIds || [],
        declinedIds: e.responses.declinedIds || [],
        unansweredIds: e.responses.unansweredIds || [],
      }
    : undefined,
});

export const getSpondMembers = async (
  email: string,
  password: string,
  groupId: string
): Promise<SpondMember[]> => {
  const token = await getToken(email, password);
  try {
    const members = await proxyCall({ action: 'members', token, groupId });
    return members || [];
  } catch {
    clearPersistedToken();
    const newToken = await loginSpond(email, password);
    const members = await proxyCall({ action: 'members', token: newToken, groupId });
    return members || [];
  }
};

export const changeSpondResponse = async (
  email: string,
  password: string,
  eventId: string,
  memberId: string,
  accepted: boolean
): Promise<void> => {
  const token = await getToken(email, password);
  try {
    await proxyCall({ action: 'changeResponse', token, eventId, memberId, accepted });
  } catch {
    clearPersistedToken();
    const newToken = await loginSpond(email, password);
    await proxyCall({ action: 'changeResponse', token: newToken, eventId, memberId, accepted });
  }
};

export const saveSpondConfig = async (familyId: string, config: SpondConfig): Promise<void> => {
  await setDoc(doc(db, 'families', familyId, 'config', 'spond'), config);
};

export const getSpondConfig = async (familyId: string): Promise<SpondConfig | null> => {
  const snap = await getDoc(doc(db, 'families', familyId, 'config', 'spond'));
  if (!snap.exists()) return null;
  return snap.data() as SpondConfig;
};

export const clearSpondToken = (): void => {
  clearPersistedToken();
};

export const saveSpondResponse = async (familyId: string, eventId: string, accepted: boolean): Promise<void> => {
  await setDoc(doc(db, 'spondResponses', `${familyId}_${eventId}`), {
    familyId,
    eventId,
    response: accepted,
    updatedAt: new Date().toISOString(),
  });
};

export const getSpondResponses = async (familyId: string): Promise<Record<string, boolean>> => {
  const q = query(collection(db, 'spondResponses'), where('familyId', '==', familyId));
  const snap = await getDocs(q);
  const responses: Record<string, boolean> = {};
  snap.forEach((doc) => {
    const data = doc.data();
    responses[data.eventId] = data.response;
  });
  return responses;
};
