import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SpondEvent, SpondGroup, SpondConfig } from '../types';

const SPOND_PROXY_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/spondProxy';

let cachedToken: string | null = null;

const proxyCall = async (body: Record<string, any>): Promise<any> => {
  const response = await fetch(SPOND_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  cachedToken = accessToken;
  return accessToken;
};

const getToken = async (email: string, password: string): Promise<string> => {
  if (cachedToken) return cachedToken;
  return await loginSpond(email, password);
};

export const getSpondGroups = async (email: string, password: string): Promise<SpondGroup[]> => {
  const token = await getToken(email, password);
  try {
    const groups = await proxyCall({ action: 'groups', token });
    return (groups || []).map((g: any) => ({ id: g.id, name: g.name }));
  } catch {
    cachedToken = null;
    const newToken = await loginSpond(email, password);
    const groups = await proxyCall({ action: 'groups', token: newToken });
    return (groups || []).map((g: any) => ({ id: g.id, name: g.name }));
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
    cachedToken = null;
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
  address: e.location?.address || undefined,
  groupName: undefined,
});

export const saveSpondConfig = async (familyId: string, config: SpondConfig): Promise<void> => {
  await setDoc(doc(db, 'families', familyId, 'config', 'spond'), config);
};

export const getSpondConfig = async (familyId: string): Promise<SpondConfig | null> => {
  const snap = await getDoc(doc(db, 'families', familyId, 'config', 'spond'));
  if (!snap.exists()) return null;
  return snap.data() as SpondConfig;
};

export const clearSpondToken = (): void => {
  cachedToken = null;
};
