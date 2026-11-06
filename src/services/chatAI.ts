import { auth } from './firebase';

const FUNCTIONS_BASE = 'https://us-central1-familiesenter-837bb.cloudfunctions.net';

async function chatAIRequest<T = any>(name: string, data: Record<string, unknown> = {}): Promise<T> {
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
  return result as T;
}

/** AI catch-up summary of messages since the given timestamp. */
export const fetchChatSummary = async (
  conversationId: string,
  sinceTimestamp?: number,
  locale?: string
): Promise<string> => {
  const result = await chatAIRequest<{ summary: string }>('chatSummary', {
    conversationId,
    sinceTimestamp,
    locale,
  });
  return result.summary || '';
};

/** 2–3 suggested short replies based on the newest messages. */
export const fetchSmartReplies = async (
  conversationId: string,
  locale?: string
): Promise<string[]> => {
  const result = await chatAIRequest<{ suggestions: string[] }>('chatSmartReplies', {
    conversationId,
    locale,
  });
  return result.suggestions || [];
};

/** Translate a message to the target locale (cached server-side on the message). */
export const translateChatMessage = async (
  conversationId: string,
  messageId: string,
  targetLocale?: string
): Promise<string> => {
  const result = await chatAIRequest<{ translated: string }>('chatTranslateMessage', {
    conversationId,
    messageId,
    targetLocale,
  });
  return result.translated || '';
};

/** Raw binary upload (mirrors voiceToEvent: Content-Type + X-Filename). */
export const transcribeVoiceMessage = async (
  audioBlob: Blob,
  filename: string
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Ikke innlogget');
  const idToken = await currentUser.getIdToken();
  const response = await fetch(`${FUNCTIONS_BASE}/chatVoiceTranscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': audioBlob.type || 'audio/webm',
      'X-Filename': filename,
      Authorization: `Bearer ${idToken}`,
    },
    body: audioBlob,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Serverfeil');
  return (result.transcript || '').trim();
};

/** Parse a message into a prefilled event. Returns null when there is no event. */
export const chatMessageToEvent = async (
  conversationId: string,
  messageText: string,
  locale?: string
): Promise<Record<string, any> | null> => {
  const result = await chatAIRequest<{ event: Record<string, any> | null }>('chatMessageToEvent', {
    conversationId,
    messageText,
    locale,
  });
  return result.event || null;
};
