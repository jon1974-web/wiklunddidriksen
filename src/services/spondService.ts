import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SpondEvent, SpondGroup, SpondConfig } from '../types';

const SPOND_API_BASE = 'https://api.spond.com/core/v1';

let cachedToken: string | null = null;

export const loginSpond = async (email: string, password: string): Promise<string> => {
  const response = await fetch(`${SPOND_API_BASE}/auth2/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Spond innlogging feilet. Sjekk e-post og passord.');
  }

  const result = await response.json();
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
  const response = await fetch(`${SPOND_API_BASE}/groups/`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    cachedToken = null;
    const newToken = await loginSpond(email, password);
    const retryResponse = await fetch(`${SPOND_API_BASE}/groups/`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newToken}`,
      },
    });
    if (!retryResponse.ok) throw new Error('Kunne ikke hente Spond-grupper.');
    const groups = await retryResponse.json();
    return (groups || []).map((g: any) => ({ id: g.id, name: g.name }));
  }

  const groups = await response.json();
  return (groups || []).map((g: any) => ({ id: g.id, name: g.name }));
};

export const getSpondEvents = async (
  email: string,
  password: string,
  groupIds: string[]
): Promise<SpondEvent[]> => {
  const token = await getToken(email, password);
  const allEvents: SpondEvent[] = [];

  for (const groupId of groupIds) {
    try {
      const response = await fetch(
        `${SPOND_API_BASE}/sponds/?groupId=${groupId}&max=100`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          cachedToken = null;
          const newToken = await loginSpond(email, password);
          const retryResponse = await fetch(
            `${SPOND_API_BASE}/sponds/?groupId=${groupId}&max=100`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newToken}`,
              },
            }
          );
          if (!retryResponse.ok) continue;
          const events = await retryResponse.json();
          const mapped = (events || []).map((e: any) => mapSpondEvent(e));
          allEvents.push(...mapped);
        }
        continue;
      }

      const events = await response.json();
      const mapped = (events || []).map((e: any) => mapSpondEvent(e));
      allEvents.push(...mapped);
    } catch {
      continue;
    }
  }

  return allEvents;
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
