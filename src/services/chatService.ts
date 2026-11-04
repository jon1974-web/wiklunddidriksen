import {
  db,
} from './firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  arrayUnion,
} from 'firebase/firestore';
import { UserProfile, Conversation, ConversationListItem, ConversationMessageData, MessageReaction } from '../types';
import { getUserProfile, getFamilyById } from './familyService';
import { CHAT_MESSAGE_LIMIT } from '../constants/limits';

const conversationsRef = () => collection(db, 'conversations');

// --- IDs ---

export const dmConversationId = (uidA: string, uidB: string): string => {
  const [a, b] = [uidA, uidB].sort();
  return `dm_${a}_${b}`;
};

// --- Conversations ---

export async function getOrCreateFamilyConversation(
  familyId: string,
  familyName: string,
  createdBy: string
): Promise<Conversation> {
  const existing = await getFamilyConversation(familyId);
  if (existing) return existing;
  return createGroupConversation(familyId, familyName, 'family', createdBy, 'family');
}

export async function getOrCreateDmConversation(
  familyId: string,
  uidA: string,
  uidB: string
): Promise<Conversation> {
  const id = dmConversationId(uidA, uidB);
  const ref = doc(db, 'conversations', id);
  // Reading a missing document is denied by the membership rules, so treat any
  // error as "not created yet" and fall through to the deterministic create.
  let existing: Conversation | null = null;
  try {
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      existing = { id: snapshot.id, ...snapshot.data() } as Conversation;
    }
  } catch {
    existing = null;
  }
  if (existing) return existing;
  const now = Date.now();
  const data = {
    type: 'dm' as const,
    familyId,
    memberIds: [uidA, uidB],
    members: {
      [uidA]: { role: 'member' as const, joinedAt: now },
      [uidB]: { role: 'member' as const, joinedAt: now },
    },
    lastRead: {} as Record<string, number>,
    createdBy: uidA,
    createdAt: now,
  };
  await setDoc(ref, data);
  return { id, ...data };
}

export async function createGroupConversation(
  familyId: string,
  title: string,
  icon: string,
  createdBy: string,
  type: 'group' | 'family' = 'group',
  invitedUids: string[] = [],
  tripId?: string
): Promise<Conversation> {
  const now = Date.now();
  const memberUids = type === 'family'
    ? [...new Set([createdBy, ...invitedUids])]
    : [createdBy, ...invitedUids];
  const members: Conversation['members'] = {};
  const memberIds = memberUids.map((uid) => {
    members[uid] = {
      role: uid === createdBy ? ('admin' as const) : ('member' as const),
      joinedAt: now,
      addedBy: uid === createdBy ? undefined : createdBy,
    };
    return uid;
  });
  const data = {
    type,
    familyId,
    title,
    icon,
    memberIds,
    members,
    lastRead: {} as Record<string, number>,
    createdBy,
    createdAt: now,
    ...(tripId && { tripId }),
  };
  const docRef = await addDoc(conversationsRef(), data);
  return { id: docRef.id, ...data };
}

/**
 * Chat group linked to a Trip: one group per trip, name/icon = trip,
 * and every family member is a participant.
 * The caller guards against duplicates by checking Trip.chatId first.
 */
export async function createTripGroupConversation(
  familyId: string,
  trip: { id: string; title: string; icon?: string },
  createdBy: string
): Promise<Conversation> {
  const family = await getFamilyById(familyId);
  const memberUids = family?.members ? Object.keys(family.members) : [createdBy];
  return createGroupConversation(
    familyId,
    trip.title,
    trip.icon || '✈️',
    createdBy,
    'group',
    memberUids,
    trip.id
  );
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const snapshot = await getDoc(doc(db, 'conversations', conversationId));
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Conversation;
  }
  return null;
}

export function listenToConversations(
  familyId: string,
  uid: string,
  callback: (conversations: ConversationListItem[]) => void
): () => void {
  // NOTE: no orderBy on the server — conversations created without a
  // lastMessage (empty DMs/groups) would be silently excluded by the index.
  // Sorting happens client-side below.
  const q = query(
    conversationsRef(),
    where('memberIds', 'array-contains', uid),
    where('familyId', '==', familyId),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const conversations = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as ConversationListItem
    );
    // Pinned family chat first, then by latest activity (lastMessage or createdAt)
    const family = conversations.filter((c) => c.type === 'family');
    const rest = conversations
      .filter((c) => c.type !== 'family')
      .sort(
        (a, b) =>
          (b.lastMessage?.timestamp || b.createdAt) - (a.lastMessage?.timestamp || a.createdAt)
      );
    callback([...family, ...rest]);
  });
}

export async function getFamilyConversation(familyId: string): Promise<Conversation | null> {
  const q = query(
    conversationsRef(),
    where('familyId', '==', familyId),
    where('type', '==', 'family'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Conversation;
}

export async function ensureFamilyConversation(familyId: string, uid: string): Promise<Conversation | null> {
  try {
    const existing = await getFamilyConversation(familyId);
    if (existing) return existing;
    const family = await getFamilyById(familyId);
    if (!family?.members) return null;
    const memberUids = Object.keys(family.members);
    if (memberUids.length === 0) return null;
    return await createGroupConversation(familyId, family.name || 'Family', 'family', uid, 'family', memberUids);
  } catch {
    // Transient errors must not break the conversation list
    return null;
  }
}

// --- Group management ---

export async function updateGroup(conversationId: string, updates: { title?: string; icon?: string }): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), updates);
}

export async function addGroupMembers(
  conversationId: string,
  uids: string[],
  addedBy: string
): Promise<void> {
  const now = Date.now();
  const members: Conversation['members'] = {};
  uids.forEach((uid) => {
    members[`members.${uid}`] = { role: 'member', joinedAt: now, addedBy };
  });
  const ref = doc(db, 'conversations', conversationId);
  await updateDoc(ref, {
    ...members,
    memberIds: arrayUnion(...uids),
  } as any);
}

export async function removeGroupMember(conversationId: string, uid: string): Promise<void> {
  const snapshot = await getDoc(doc(db, 'conversations', conversationId));
  if (!snapshot.exists()) return;
  const data = snapshot.data() as Conversation;
  const memberIds = (data.memberIds || []).filter((id) => id !== uid);
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`members.${uid}`]: null,
    memberIds,
  } as any);
}

export async function leaveGroup(conversationId: string, uid: string): Promise<void> {
  await removeGroupMember(conversationId, uid);
}

// --- Messages ---

export function listenToMessages(
  conversationId: string,
  callback: (messages: (ConversationMessageData & { id: string })[]) => void
): () => void {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('timestamp', 'desc'),
    limit(CHAT_MESSAGE_LIMIT)
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as ConversationMessageData & { id: string }
    );
    callback(messages.reverse());
  });
}

export async function sendMessage(
  conversationId: string,
  message: ConversationMessageData
): Promise<void> {
  const lastMessage = {
    text: message.text,
    senderId: message.senderId,
    senderName: message.senderName,
    timestamp: message.timestamp,
    hasImage: !!message.imageUrl,
  };
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), message);
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage,
    [`lastRead.${message.senderId}`]: message.timestamp,
  } as any);
}

export async function markConversationRead(conversationId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`lastRead.${uid}`]: Date.now(),
  } as any);
}

export async function toggleReaction(
  conversationId: string,
  messageId: string,
  uid: string,
  type: MessageReaction['type']
): Promise<void> {
  const ref = doc(db, 'conversations', conversationId, 'messages', messageId);
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) return;
    const reactions = (snapshot.data()?.reactions || []) as MessageReaction[];
    const existing = reactions.find((r) => r.userId === uid);
    const updated = existing && existing.type === type
      ? reactions.filter((r) => r.userId !== uid)
      : [...reactions.filter((r) => r.userId !== uid), { userId: uid, type }];
    tx.update(ref, { reactions: updated });
  });
}

// --- Helpers ---

export const hasUnreadConversation = (conv: ConversationListItem, uid: string): boolean => {
  if (!conv.lastMessage) return false;
  if (conv.lastMessage.senderId === uid) return false;
  return conv.lastMessage.timestamp > (conv.lastRead?.[uid] || 0);
};

export async function getMemberProfiles(
  memberIds: string[]
): Promise<Record<string, UserProfile>> {
  const profiles = await Promise.all(
    memberIds.map(async (uid) => [uid, await getUserProfile(uid)] as const)
  );
  const out: Record<string, UserProfile> = {};
  profiles.forEach(([uid, profile]) => {
    if (profile) out[uid] = profile;
  });
  return out;
}
