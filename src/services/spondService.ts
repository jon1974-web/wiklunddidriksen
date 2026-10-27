import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db, auth } from './firebase';
import { SpondEvent, SpondGroup, SpondConfig, SpondMember } from '../types';

const SPOND_PROXY_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/spondProxy';
const SPOND_CONFIG_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/spondConfig';
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

type SpondErrorCode = 'PASSWORD_REQUIRED' | 'NOT_CONNECTED';

// Either typed credentials (used while connecting) or the family's stored credentials,
// which the server resolves for any family member. The password never reaches the client in family mode.
export type SpondCreds = { email: string; password: string } | { familyId: string };

const credsBody = (creds: SpondCreds): Record<string, string> =>
  'familyId' in creds ? { familyId: creds.familyId } : { email: creds.email, password: creds.password };

const isCredentialError = (error: unknown): boolean => {
  const code = (error as { code?: SpondErrorCode }).code;
  return code === 'PASSWORD_REQUIRED' || code === 'NOT_CONNECTED';
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
    const error = new Error(result?.error || 'Spond API-feil.') as Error & { code?: string };
    error.code = result?.code;
    throw error;
  }
  return result;
};

const loginWith = async (creds: SpondCreds): Promise<string> => {
  const result = await proxyCall({ action: 'login', ...credsBody(creds) });
  const accessToken = result?.accessToken?.token;
  if (!accessToken) {
    throw new Error('Spond innlogging feilet. Ingen token mottatt.');
  }
  persistToken(accessToken);
  return accessToken;
};

const getToken = async (creds: SpondCreds): Promise<string> => {
  const existing = getPersistedToken();
  if (existing) return existing;
  return await loginWith(creds);
};

// Runs a proxy action with a cached token; on any non-credential failure, logs in again once.
const withToken = async <T>(creds: SpondCreds, run: (token: string) => Promise<T>): Promise<T> => {
  const token = await getToken(creds);
  try {
    return await run(token);
  } catch (error) {
    if (isCredentialError(error)) throw error;
    clearPersistedToken();
    const newToken = await loginWith(creds);
    return await run(newToken);
  }
};

export const loginSpond = async (email: string, password: string): Promise<string> =>
  loginWith({ email, password });

const groupsWith = async (creds: SpondCreds): Promise<SpondGroup[]> => {
  const groups = await withToken(creds, (token) => proxyCall({ action: 'groups', token, ...(('familyId' in creds) ? { familyId: creds.familyId } : {}) }));
  return (groups || []).map((g: any) => ({ id: g.id, name: g.name, logoUrl: g.logoUrl || g.imageUrl || g.image || undefined }));
};

const eventsWith = async (creds: SpondCreds, groupIds: string[]): Promise<SpondEvent[]> => {
  const events = await withToken(creds, (token) => proxyCall({ action: 'events', token, groupIds, ...(('familyId' in creds) ? { familyId: creds.familyId } : {}) }));
  return (events || []).map((e: any) => mapSpondEvent(e));
};

const membersWith = async (creds: SpondCreds, groupId: string): Promise<SpondMember[]> => {
  const members = await withToken(creds, (token) => proxyCall({ action: 'members', token, groupId, ...(('familyId' in creds) ? { familyId: creds.familyId } : {}) }));
  return members || [];
};

const changeResponseWith = async (creds: SpondCreds, eventId: string, memberId: string, accepted: boolean): Promise<void> => {
  await withToken(creds, (token) => proxyCall({ action: 'changeResponse', token, eventId, memberId, accepted, ...(('familyId' in creds) ? { familyId: creds.familyId } : {}) }));
};

// Typed-credentials variants (used during connect in the profile)
export const getSpondGroups = (email: string, password: string) => groupsWith({ email, password });
export const getSpondEvents = (email: string, password: string, groupIds: string[]) => eventsWith({ email, password }, groupIds);
export const getSpondMembers = (email: string, password: string, groupId: string) => membersWith({ email, password }, groupId);
export const changeSpondResponse = (email: string, password: string, eventId: string, memberId: string, accepted: boolean) =>
  changeResponseWith({ email, password }, eventId, memberId, accepted);

// Family-mode variants: the server uses the family's stored credentials
export const getFamilySpondGroups = (familyId: string) => groupsWith({ familyId });
export const getFamilySpondEvents = (familyId: string, groupIds: string[]) => eventsWith({ familyId }, groupIds);
export const getFamilySpondMembers = (familyId: string, groupId: string) => membersWith({ familyId }, groupId);
export const changeFamilySpondResponse = (familyId: string, eventId: string, memberId: string, accepted: boolean) =>
  changeResponseWith({ familyId }, eventId, memberId, accepted);

export const isSpondReconnectRequired = (error: unknown): boolean =>
  (error as { code?: string }).code === 'PASSWORD_REQUIRED';

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

// Spond config is stored server-side with the password encrypted (see spondConfig endpoint).
export const saveSpondConfig = async (familyId: string, config: SpondConfig): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(SPOND_CONFIG_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      familyId,
      email: config.email,
      password: config.password || undefined,
      groups: config.groups,
      respondents: config.respondents,
    }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result?.error || 'Could not save Spond settings') as Error & { code?: string };
    error.code = result?.code;
    throw error;
  }
};

// Removes the stored Spond config. Does not read the stored password, so it works even if
// the stored credential can no longer be decrypted.
export const disconnectSpondConfig = async (familyId: string): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(SPOND_CONFIG_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ familyId, action: 'disconnect' }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Could not disconnect Spond');
  }
};

export const getSpondConfig = async (familyId: string): Promise<SpondConfig | null> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${SPOND_CONFIG_URL}?familyId=${encodeURIComponent(familyId)}`, { headers });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Could not load Spond settings');
  }
  const { config } = await response.json();
  return config as SpondConfig | null;
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
    const data = doc.data() as { eventId: string; response: boolean };
    responses[data.eventId] = data.response;
  });
  return responses;
};
