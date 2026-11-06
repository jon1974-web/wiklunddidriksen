import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator, Modal, ScrollView, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { storage } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { ChatMessage, MessageReaction, Conversation, ConversationType, ConversationMessageData } from '../types';
import { MessageBubble } from '../components/MessageBubble';
import { useTheme } from '../theme/ThemeContext';
import { useDesktopLayout } from '../hooks/useDesktopLayout';
import { useTranslation } from 'react-i18next';
import { MAX_MESSAGE_LENGTH, IMAGE_QUALITY, SCROLL_DELAY_MS, LOCALE, HISTORY_PAGE_SIZE, CHAT_MESSAGE_LIMIT } from '../constants/limits';
import { MODULE_COLORS } from '../constants/moduleColors';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { uriToBlob } from '../utils/upload';
import { getUserProfile, getFamilyMembers } from '../services/familyService';
import { getHomes } from '../services/homeService';
import { getSchoolChildren } from '../services/schoolService';
import { getKindergartenChildren } from '../services/kindergartenService';
import { getPets } from '../services/petService';
import {
  listenToMessages,
  sendMessage,
  markConversationRead,
  toggleReaction,
  getConversation,
  editMessage,
  deleteMessage,
  refreshLastMessage,
  fetchOlderMessages,
  listenToConversation,
  signalTyping,
  clearTyping,
  deleteVoiceFile,
  getActiveTypingUids,
} from '../services/chatService';
import {
  fetchChatSummary,
  fetchSmartReplies,
  translateChatMessage,
  transcribeVoiceMessage,
} from '../services/chatAI';
import { useAIAssistantStore } from '../store/aiAssistantStore';
import { ChatGroupInfoSheet } from '../components/ChatGroupInfoSheet';
import { ActionModal } from '../components/ActionModal';
import { HelpCenter } from '../components/HelpCenter';
import { AppIcon } from '../components/AppIcon';
import { useChatStore } from '../store/chatStore';
import * as Clipboard from 'expo-clipboard';
import i18n from '../i18n';

// Web-only style (removes the browser focus outline); not part of RN's TextStyle typings.
const WEB_NO_OUTLINE = { outlineStyle: 'none' } as unknown as TextStyle;

export interface ChatThreadParams {
  conversationId: string;
  conversationType: ConversationType;
  conversationTitle: string;
}

export const ChatScreen: React.FC<{ route: { params: ChatThreadParams } }> = ({ route }) => {
  const { t } = useTranslation();
  const { conversationId, conversationType, conversationTitle } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [convMeta, setConvMeta] = useState<{ title: string; icon?: string } | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [actionTarget, setActionTarget] = useState<ChatMessage | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [copiedHint, setCopiedHint] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [summaryModal, setSummaryModal] = useState<{ visible: boolean; text: string; loading: boolean }>({ visible: false, text: '', loading: false });
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [smartRepliesLoading, setSmartRepliesLoading] = useState(false);
  const [showSmartReplies, setShowSmartReplies] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [localTranslations, setLocalTranslations] = useState<Record<string, string>>({});
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const flatListRef = useRef<FlatList>(null);
  const lastReadTsRef = useRef<number>(0);
  const lastMsgTsRef = useRef<number>(0);
  const historyLenRef = useRef<number>(0);
  const typingSentAtRef = useRef<number>(0);
  const mediaRecorderRef = useRef<any>(null);
  const micChunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef<number>(0);
  const nativeRecordingRef = useRef<any>(null);
  const [translatingMessageId, setTranslatingMessageId] = useState<string | null>(null);
  // History pagination (older than the newest live window)
  const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const user = useUserStore((state) => state.user);
  const familyName = useUserStore((state) => state.familyName);
  const { colors } = useTheme();
  const { isDesktop } = useDesktopLayout();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const setInputFocused = useChatStore((state) => state.setInputFocused);
  const inputFocused = useChatStore((state) => state.inputFocused);

  // Load conversation metadata (icon/title/member count for header)
  const loadConversation = useCallback(async () => {
    try {
      const conv = await getConversation(conversationId);
      if (conv) {
        setConversation(conv);
        setConvMeta({ title: conv.title || '', icon: conv.icon || undefined });
        setMemberCount((conv.memberIds || []).length);
      }
      return conv;
    } catch (error) {
      console.error('Failed to load conversation:', error);
      return null;
    }
  }, [conversationId]);

  useEffect(() => {
    if (!user) return;
    loadConversation();
  }, [conversationId, user, loadConversation]);

  // Re-check membership when the group info sheet closes (member removed / left)
  const handleGroupInfoClose = useCallback(async () => {
    setShowGroupInfo(false);
    const conv = await loadConversation();
    if (conv && user && !(conv.memberIds || []).includes(user.uid)) {
      navigation.goBack();
    }
  }, [loadConversation, user, navigation]);

  // Live conversation doc: typing indicator + membership changes
  useEffect(() => {
    const unsubscribe = listenToConversation(conversationId, (conv) => {
      setConversation(conv);
      setConvMeta({ title: conv.title || '', icon: conv.icon || undefined });
      setMemberCount((conv.memberIds || []).length);
    });
    return unsubscribe;
  }, [conversationId]);

  // Real-time message listener (messages subcollection)
  useEffect(() => {
    // Reset history when switching conversations
    setHistoryMessages([]);
    setHasMoreHistory(true);
    historyLenRef.current = 0;
    const unsubscribe = listenToMessages(
      conversationId,
      (messagesData) => {
        setMessages(messagesData as ChatMessage[]);
        // "Load older" only makes sense when the live window is full:
        // a partially-filled window means the whole conversation is visible.
        if (historyLenRef.current === 0) {
          setHasMoreHistory(messagesData.length >= CHAT_MESSAGE_LIMIT);
        }
        // Scroll only when a message was actually added (not on reaction edits etc.)
        const last = messagesData[messagesData.length - 1];
        if (last) {
          if (last.timestamp > lastMsgTsRef.current) {
            lastMsgTsRef.current = last.timestamp;
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, SCROLL_DELAY_MS);
          }
          // Mark conversation read (own messages bump lastRead implicitly via sendMessage)
          if (last.timestamp > lastReadTsRef.current) {
            lastReadTsRef.current = last.timestamp;
            if (user && last.senderId !== user.uid) {
              markConversationRead(conversationId, user.uid).catch(() => undefined);
            }
          }
        }
      }
    );
    return unsubscribe;
  }, [conversationId, user?.uid]);

  useEffect(() => {
    if (messages.length === 0) return;
    const uniqueSenderIds = [...new Set(messages.map((m) => m.senderId).filter(Boolean))];
    const missing = uniqueSenderIds.filter((id) => !(id in userAvatars));
    if (missing.length === 0) return;
    (async () => {
      const profiles = await Promise.all(missing.map(async (uid) => {
        try {
          const profile = await getUserProfile(uid);
          return { uid, avatarUrl: profile?.avatarUrl || '', displayName: profile?.displayName || '' };
        } catch {
          return { uid, avatarUrl: '', displayName: '' };
        }
      }));
      const updates: Record<string, string> = {};
      const nameUpdates: Record<string, string> = {};
      profiles.forEach(({ uid, avatarUrl, displayName }) => {
        updates[uid] = avatarUrl;
        nameUpdates[uid] = displayName;
      });
      setUserAvatars((prev) => ({ ...prev, ...updates }));
      setUserNames((prev) => ({ ...prev, ...nameUpdates }));
    })();
  }, [messages]);

  // Typing indicator: names of other members that are still typing
  const typingNames = useMemo(() => {
    if (!conversation) return [] as string[];
    const uids = getActiveTypingUids(conversation.typing).filter((uid) => uid !== user?.uid);
    return uids.map((uid) => userNames[uid] || uid.slice(0, 6));
  }, [conversation, userNames, user?.uid]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setSelectedImageBase64(result.assets[0].base64 || null);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('chat.cameraPermissionTitle'), t('chat.cameraPermissionBody'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setSelectedImageBase64(result.assets[0].base64 || null);
    }
  }, []);

  const uploadImage = async (uri: string, base64Data: string | null): Promise<string> => {
    let blob: Blob;
    if (base64Data && Platform.OS === 'web') {
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([ab], { type: 'image/jpeg' });
    } else {
      blob = await uriToBlob(uri);
    }
    const filename = `chat/${Date.now()}_${Math.random().toString(36).substr(2)}`;
    if (Platform.OS === 'web') {
      const { webUploadFile } = await import('../services/webStorage');
      return await webUploadFile(filename, blob);
    }
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  // Text change: signal "typing" (throttled) while composing
  const handleMessageChange = useCallback((text: string) => {
    setNewMessage(text);
    if (!user) return;
    if (text.trim() && Date.now() - typingSentAtRef.current > 6000 && !editingMessage) {
      typingSentAtRef.current = Date.now();
      signalTyping(conversationId, user.uid).catch(() => undefined);
    }
    if (!text.trim() && typingSentAtRef.current > 0) {
      typingSentAtRef.current = 0;
      clearTyping(conversationId, user.uid);
    }
  }, [user, conversationId, editingMessage]);

  const stopTypingSignal = useCallback(() => {
    if (user && typingSentAtRef.current > 0) {
      typingSentAtRef.current = 0;
      clearTyping(conversationId, user.uid);
    }
  }, [user, conversationId]);

  const handleSend = useCallback(async () => {
    if (!user) return;
    stopTypingSignal();

    // Edit mode: save the changed text on the existing message
    if (editingMessage) {
      const newText = newMessage.trim();
      if (!newText && !editingMessage.imageUrl) return; // pure text message cannot be emptied
      if (newText === editingMessage.text) {
        // no change — just exit edit mode
        setEditingMessage(null);
        setNewMessage('');
        setInputFocused(false);
        return;
      }
      setUploading(true);
      try {
        await editMessage(conversationId, editingMessage.id, newText, editingMessage.timestamp);
        // Optimistic update — the bubble reflects the change immediately,
        // the listener reconciles with the server copy.
        const patchMessage = (m: ChatMessage) =>
          m.id === editingMessage.id ? { ...m, text: newText, edited: true } : m;
        setMessages((prev) => prev.map(patchMessage));
        setHistoryMessages((prev) => prev.map(patchMessage));
        setEditingMessage(null);
        setNewMessage('');
        setSelectedImage(null);
        setSelectedImageBase64(null);
        setInputFocused(false);
        lastReadTsRef.current = Date.now();
      } catch (error) {
        Alert.alert(t('common.error'), getErrorMessage(error));
      } finally {
        setUploading(false);
      }
      return;
    }

    if ((!newMessage.trim() && !selectedImage)) return;

    setUploading(true);
    try {
      let imageUrl: string | undefined;

      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage, selectedImageBase64);
      }

      const message: ConversationMessageData = {
        text: newMessage.trim() || '',
        senderId: user.uid,
        senderName: user.displayName,
        ...(user.avatarUrl && { senderAvatarUrl: user.avatarUrl }),
        timestamp: Date.now(),
        ...(imageUrl && { imageUrl }),
        ...(replyTarget ? {
          replyTo: {
            messageId: replyTarget.id,
            senderId: replyTarget.senderId,
            senderName: replyTarget.senderName,
            text: replyTarget.text || '',
            hasImage: !!replyTarget.imageUrl,
          },
        } : {}),
      };
      await sendMessage(conversationId, message);
      setReplyTarget(null);
      setShowSmartReplies(false);
      setSmartReplies([]);

      setNewMessage('');
      setSelectedImage(null);
      setSelectedImageBase64(null);
      setInputFocused(false);
      lastReadTsRef.current = message.timestamp;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, SCROLL_DELAY_MS);
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }, [newMessage, selectedImage, user, conversationId, editingMessage]);

  const canSend = !!newMessage.trim() || !!selectedImage;
  const canSendEdit = !!editingMessage?.imageUrl || !!newMessage.trim();

  const handleReaction = useCallback(async (messageId: string, reactionType: MessageReaction['type']) => {
    if (!user) return;
    try {
      await toggleReaction(conversationId, messageId, user.uid, reactionType);
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  }, [user, conversationId]);

  // --- Message actions (long-press) ---

  const handleCopyMessage = useCallback(async (message: ChatMessage) => {
    if (!message.text) return;
    try {
      await Clipboard.setStringAsync(message.text);
      setCopiedHint(true);
      setTimeout(() => setCopiedHint(false), 1600);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  }, []);

  const handleDeleteMessage = useCallback(async () => {
    const message = deletingTarget;
    if (!message) return;
    try {
      // Voice audio lives in its own Storage object — clean it up too
      if (message.voiceUrl) {
        await deleteVoiceFile(message.voiceUrl);
      }
      await deleteMessage(conversationId, {
        id: message.id,
        imageUrl: message.imageUrl,
        timestamp: message.timestamp,
      });
      // Keep the chat-list preview fresh if the deleted message was the newest
      refreshLastMessage(conversationId, message.timestamp).catch(() => undefined);
      // If we were editing the deleted message, exit edit mode
      setEditingMessage((prev) => (prev?.id === message.id ? null : prev));
      if (editingMessage?.id === message.id) {
        setNewMessage('');
      }
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error));
    } finally {
      setDeletingTarget(null);
    }
  }, [deletingTarget, conversationId, editingMessage, t]);

  const beginEditMessage = useCallback((message: ChatMessage) => {
    setEditingMessage(message);
    setNewMessage(message.text || '');
    setSelectedImage(null);
    setSelectedImageBase64(null);
    setReplyTarget(null);
    setActionTarget(null);
  }, []);

  const cancelEditMessage = useCallback(() => {
    setEditingMessage(null);
    setNewMessage('');
    setInputFocused(false);
  }, []);

  // --- History pagination ---

  const handleLoadOlder = useCallback(async () => {
    if (historyLoading || !hasMoreHistory || !user) return;
    const oldestVisible = historyMessages.length > 0
      ? historyMessages[0]
      : messages[0];
    const beforeTimestamp = oldestVisible?.timestamp;
    if (!beforeTimestamp) return;
    setHistoryLoading(true);
    try {
      const older = await fetchOlderMessages(conversationId, beforeTimestamp, HISTORY_PAGE_SIZE);
      if (older.length === 0) {
        setHasMoreHistory(false);
        return;
      }
      setHistoryMessages((prev) => {
        const seen = new Set([...prev, ...messages].map((m) => m.id));
        const additions = older.filter((m) => !seen.has(m.id));
        const merged = [...additions, ...prev];
        historyLenRef.current = merged.length;
        return merged as ChatMessage[];
      });
      setHasMoreHistory(older.length >= HISTORY_PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load older messages:', error);
      Alert.alert(t('common.error'), getErrorMessage(error));
    } finally {
      setHistoryLoading(false);
    }
  }, [historyLoading, hasMoreHistory, historyMessages, messages, user, conversationId, t]);

  // --- Voice messages ---

  const startVoiceRecording = useCallback(async () => {
    if (recordingVoice || voiceUploading || editingMessage) return;
    stopTypingSignal();
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let mimeType = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(mimeType)) {
          // webm preferred
        } else if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        micChunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) micChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current = mediaRecorder;
        voiceStartedAtRef.current = Date.now();
        mediaRecorder.start();
        setRecordingVoice(true);
      } else {
        const { Audio } = await import('expo-av');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('chat.cameraPermissionTitle'), t('chat.micPermissionBody'));
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        nativeRecordingRef.current = { recording: newRecording, Audio };
        voiceStartedAtRef.current = Date.now();
        setRecordingVoice(true);
      }
    } catch (error) {
      console.error('Failed to start voice recording:', error);
      Alert.alert(t('common.error'), t('chat.voiceRecordError'));
      setRecordingVoice(false);
    }
  }, [recordingVoice, voiceUploading, editingMessage, t, stopTypingSignal]);

  const stopVoiceRecording = useCallback(async (send: boolean) => {
    if (!recordingVoice || !user) return;
    setRecordingVoice(false);
    if (!send) {
      // discard: stop stream without sending anything
      try {
        if (Platform.OS === 'web') {
          const mediaRecorder = mediaRecorderRef.current;
          if (mediaRecorder) {
            await new Promise<void>((resolve) => {
              mediaRecorder.onstop = () => resolve();
              mediaRecorder.stop();
            });
            mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
          }
        } else {
          const recWrapper = nativeRecordingRef.current;
          if (recWrapper) {
            await recWrapper.recording.stopAndUnloadAsync();
            await recWrapper.Audio.setAudioModeAsync({ allowsRecordingIOS: false });
          }
        }
      } catch {
        // discard errors on purpose
      }
      return;
    }

    setVoiceUploading(true);
    try {
      let audioBlob: Blob;
      if (Platform.OS === 'web') {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) throw new Error('No recorder');
        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => resolve();
          mediaRecorder.stop();
        });
        mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        audioBlob = new Blob(micChunksRef.current, { type: mimeType });
      } else {
        const recWrapper = nativeRecordingRef.current;
        await recWrapper.recording.stopAndUnloadAsync();
        await recWrapper.Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recWrapper.recording.getURI();
        const response = await fetch(uri);
        audioBlob = await response.blob();
      }

      const duration = Math.max(1, Math.round((Date.now() - voiceStartedAtRef.current) / 1000));
      const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const filename = `chat/voices/${Date.now()}_${Math.random().toString(36).substr(2)}.${ext}`;

      // 1) Transcribe via Whisper (chatVoiceTranscribe)
      let transcript = '';
      try {
        transcript = await transcribeVoiceMessage(audioBlob, `recording.${ext}`);
      } catch (error) {
        console.error('Voice transcription failed:', error);
      }

      // 2) Upload audio to Storage
      let voiceUrl = '';
      if (Platform.OS === 'web') {
        const { webUploadFile } = await import('../services/webStorage');
        voiceUrl = await webUploadFile(filename, audioBlob);
      } else {
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, audioBlob);
        voiceUrl = await getDownloadURL(storageRef);
      }

      if (!voiceUrl) throw new Error('AUDIO_UPLOAD_FAILED');

      const message: ConversationMessageData = {
        text: transcript || '',
        senderId: user.uid,
        senderName: user.displayName,
        ...(user.avatarUrl && { senderAvatarUrl: user.avatarUrl }),
        timestamp: Date.now(),
        voiceUrl,
        voiceDuration: duration,
      };
      await sendMessage(conversationId, message);
      lastReadTsRef.current = message.timestamp;
      setShowSmartReplies(false);
    } catch (error) {
      console.error('Failed to send voice message:', error);
      Alert.alert(t('common.error'), t('chat.voiceError'));
    } finally {
      setVoiceUploading(false);
      micChunksRef.current = [];
    }
  }, [recordingVoice, user, conversationId, t]);

  // --- AI actions ---

  const handleOpenSummary = useCallback(async () => {
    if (!user) return;
    setSummaryModal({ visible: true, text: '', loading: true });
    try {
      const text = await fetchChatSummary(conversationId, conversation?.lastRead?.[user.uid] || 0, i18n.language);
      setSummaryModal({ visible: true, text, loading: false });
    } catch (error) {
      setSummaryModal({ visible: true, text: '', loading: false });
      Alert.alert(t('common.error'), getErrorMessage(error));
    }
  }, [user, conversationId, conversation, t]);

  const handleToggleSmartReplies = useCallback(async () => {
    const next = !showSmartReplies;
    setShowSmartReplies(next);
    if (next) {
      setSmartRepliesLoading(true);
      setSmartReplies([]);
      try {
        const suggestions = await fetchSmartReplies(conversationId, i18n.language);
        setSmartReplies(suggestions);
      } catch (error) {
        console.error('Smart replies failed:', error);
      } finally {
        setSmartRepliesLoading(false);
      }
    }
  }, [showSmartReplies, conversationId]);

  const handleTranslateMessage = useCallback(async (message: ChatMessage) => {
    if (!message.text || translatingMessageId) return;
    setTranslatingMessageId(message.id);
    try {
      const targetLocale = (i18n.language || 'nb').slice(0, 2);
      const translated = await translateChatMessage(conversationId, message.id, targetLocale);
      if (translated) {
        const patch = (m: ChatMessage) =>
          m.id === message.id
            ? { ...m, translations: { ...(m.translations || {}), [targetLocale]: translated } }
            : m;
        setMessages((prev) => prev.map(patch));
        setHistoryMessages((prev) => prev.map(patch));
      }
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error));
    } finally {
      setTranslatingMessageId(null);
    }
  }, [conversationId, translatingMessageId, t]);

  // --- "Opprett arrangement": type chooser → seeds the AI assistant ---

  const EVENT_TYPES: { key: string; icon: React.ComponentProps<typeof AppIcon>['name']; color: string; labelKey: string }[] = [
    { key: 'event', icon: 'calendar', color: '#3b5a75', labelKey: 'quickCreate.moduleEvent' },
    { key: 'health', icon: 'medication', color: MODULE_COLORS.health, labelKey: 'quickCreate.moduleHealth' },
    { key: 'vet', icon: 'pet', color: MODULE_COLORS.pets, labelKey: 'quickCreate.moduleVet' },
    { key: 'school', icon: 'school', color: MODULE_COLORS.school, labelKey: 'quickCreate.moduleSchool' },
    { key: 'kindergarten', icon: 'kindergarten', color: MODULE_COLORS.kindergarten, labelKey: 'quickCreate.moduleKindergarten' },
    { key: 'homeService', icon: 'house', color: MODULE_COLORS.home, labelKey: 'quickCreate.moduleService' },
    { key: 'trip', icon: 'transport', color: MODULE_COLORS.trips, labelKey: 'quickCreate.moduleTrip' },
  ];

  const [eventChooserTarget, setEventChooserTarget] = useState<ChatMessage | null>(null);
  const [entityPicker, setEntityPicker] = useState<{ typeKey: string; messageText: string; loading: boolean; options: { id: string; name: string; sub?: string }[] } | null>(null);

  const handleSelectEventType = useCallback(async (typeKey: string) => {
    const message = eventChooserTarget;
    setEventChooserTarget(null);
    if (!message?.text) {
      crossAlert(t('common.error'), t('chat.noMessageText'));
      return;
    }

    // Types scoped to a specific home/child/pet/person need a target picker
    const entityKinds: Record<string, 'homes' | 'school' | 'kindergarten' | 'pets' | 'person'> = {
      homeService: 'homes',
      school: 'school',
      kindergarten: 'kindergarten',
      vet: 'pets',
      health: 'person',
    };
    const entityKind = entityKinds[typeKey];

    if (!entityKind) {
      const prompt = `${t(`chat.entryType.${typeKey}.prompt`)}, fra meldingen: «${message.text}»`;
      useAIAssistantStore.getState().openAssistant(prompt);
      return;
    }

    // The message text travels with the picker: eventChooserTarget is already cleared
    setEntityPicker({ typeKey, messageText: message.text, loading: true, options: [] });
    const familyId = useUserStore.getState().familyId;
    try {
      let options: { id: string; name: string; sub?: string }[] = [];
      if (!familyId) throw new Error('Ingen familie valgt');
      if (entityKind === 'homes') {
        const homes = await getHomes(familyId);
        options = homes.filter(Boolean).map((h) => ({ id: h.id, name: h.name, sub: h.address || '' }));
      } else if (entityKind === 'school') {
        const children = await getSchoolChildren(familyId);
        options = children.map((c) => ({ id: c.id, name: c.name || '', sub: c.school || '' }));
      } else if (entityKind === 'kindergarten') {
        const children = await getKindergartenChildren(familyId);
        options = children.map((c) => ({ id: c.id, name: c.name || '', sub: (c as any).kindergarten || '' }));
      } else if (entityKind === 'pets') {
        const pets = await getPets(familyId);
        options = pets.map((p) => ({ id: p.id, name: p.name, sub: p.type || '' }));
      } else {
        const members = await getFamilyMembers(familyId);
        options = members.map((m) => ({ id: m.uid, name: m.displayName || '', sub: '' }));
      }
      if (options.length === 0) {
        setEntityPicker(null);
        crossAlert(t('common.error'), t('chat.noTargetsFound'));
        return;
      }
      setEntityPicker({ typeKey, messageText: message.text, loading: false, options });
    } catch (error) {
      setEntityPicker(null);
      crossAlert(t('common.error'), getErrorMessage(error));
    }
  }, [eventChooserTarget, t]);

  const handleChooseEntity = useCallback((option: { id: string; name: string }) => {
    const picker = entityPicker;
    setEntityPicker(null);
    if (!picker) return;
    const text = picker.messageText || '';

    // ID fields are keyed by the entry TYPE (the same key used in handleSelectEventType)
    const idField: Record<string, string> = {
      homeService: 'homeId',
      vet: 'petId',
      school: 'childId',
      kindergarten: 'childId',
    };
    const nameField: Record<string, string> = {
      homeService: 'homeName',
      vet: 'petName',
      school: 'childName',
      kindergarten: 'childName',
    };
    const typeKey = picker.typeKey;

    let prompt: string;
    if (idField[typeKey] && nameField[typeKey]) {
      prompt = `${t(`chat.entryType.${typeKey}.prompt`)} for «${option.name}» fra meldingen: «${text}». Datasettet MÅ inneholde ${nameField[typeKey]}: "${option.name}" og ${idField[typeKey]}: "${option.id}".`;
    } else {
      // health: person name (string field on the appointment)
      prompt = `${t(`chat.entryType.${typeKey}.prompt`)} for «${option.name}» fra meldingen: «${text}». Datasettet MÅ inneholde person: "${option.name}".`;
    }
    useAIAssistantStore.getState().openAssistant(prompt);
  }, [entityPicker, t]);

  const formatDateSeparator = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('chat.today', 'I dag');
    if (diffDays === 1) return t('chat.yesterday', 'I går');
    return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }, [t]);

  type ChatListItem = { type: 'message'; message: ChatMessage; key: string; showHeader: boolean } | { type: 'date'; date: string; key: string };

  // Live window + fetched history, merged and deduped by id
  const allMessages = useMemo<ChatMessage[]>(() => {
    if (historyMessages.length === 0) return messages;
    const seen = new Set(messages.map((m) => m.id));
    const merged = [...historyMessages.filter((m) => !seen.has(m.id)), ...messages];
    merged.sort((a, b) => a.timestamp - b.timestamp);
    return merged;
  }, [messages, historyMessages]);

  const chatData = useMemo<ChatListItem[]>(() => {
    const items: ChatListItem[] = [];
    let lastDateKey = '';
    let lastSenderId = '';
    for (const msg of allMessages) {
      const d = new Date(msg.timestamp);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        lastSenderId = '';
        items.push({ type: 'date', date: formatDateSeparator(msg.timestamp), key: `date-${dateKey}` });
      }
      // Message grouping: avatar/name only on the first bubble of a run
      const showHeader = msg.senderId !== lastSenderId;
      lastSenderId = msg.senderId;
      items.push({ type: 'message', message: msg, key: msg.id, showHeader });
    }
    return items;
  }, [allMessages, formatDateSeparator]);

  // Newest timestamp any other member has read (for read receipts)
  const maxOtherReadTs = useMemo(() => {
    const lastRead = conversation?.lastRead || {};
    return Math.max(0, ...Object.entries(lastRead).filter(([uid]) => uid !== user?.uid).map(([, ts]) => ts || 0));
  }, [conversation, user?.uid]);

  const renderMessage = useCallback(({ item }: { item: ChatListItem }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={[styles.datePill, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[styles.datePillText, { color: colors.textSecondary }]}>{item.date}</Text>
          </View>
        </View>
      );
    }
    return (
      <MessageBubble
        message={item.message}
        isOwnMessage={item.message.senderId === user?.uid}
        currentUserId={user?.uid}
        onReaction={handleReaction}
        liveAvatarUrl={item.message.senderId ? userAvatars[item.message.senderId] : undefined}
        onRequestAction={setActionTarget}
        showHeader={item.showHeader}
        maxOtherReadTs={maxOtherReadTs}
      />
    );
  }, [user?.uid, handleReaction, userAvatars, colors, maxOtherReadTs]);

  // Header display info
  const headerTitle = conversationTitle || t('chat.familyChat');
  const headerSub = conversationType === 'dm'
    ? t('chat.directMessages')
    : memberCount
      ? `${memberCount} ${t('chat.members')}`
      : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Thread header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.backButton, { borderColor: colors.accent }]}
              accessibilityLabel={t('common.back')}
            >
              <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
            </TouchableOpacity>
            <View style={[styles.headerAvatar, { backgroundColor: colors.accent + '30' }]}>
              {conversationType === 'group' && (
                <Text style={{ fontSize: 18 }}>{convMeta?.icon || '👥'}</Text>
              )}
              {conversationType === 'family' && <AppIcon name="chat" size={18} color={colors.accent} />}
              {conversationType === 'dm' && (
                <Text style={[styles.headerAvatarText, { color: colors.accent }]}>
                  {(headerTitle.trim().slice(0, 2) || 'DM').toUpperCase()}
                </Text>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>{headerTitle}</Text>
              {headerSub ? <Text numberOfLines={1} style={[styles.headerSub, { color: colors.textSecondary }]}>{headerSub}</Text> : null}
            </View>
            {conversationType === 'group' && (
              <TouchableOpacity
                onPress={() => setShowGroupInfo(true)}
                style={[styles.infoButton, { borderColor: colors.accent }]}
                accessibilityLabel={t('chat.groupInfo')}
              >
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '800' }}>i</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleOpenSummary}
              style={[styles.infoButton, { borderColor: colors.accent, backgroundColor: colors.accent }]}
              accessibilityLabel={t('chat.summaryButton')}
            >
              <Text style={{ color: '#fff', fontSize: 14 }}>✨</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Typing indicator */}
        {typingNames.length > 0 && (
          <View style={[styles.typingBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={[styles.typingDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.typingText, { color: colors.textSecondary }]} numberOfLines={1}>
              {`${typingNames.join(', ')} ${t('chat.isTyping')}`}
            </Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={chatData}
          renderItem={renderMessage}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          ListHeaderComponent={
            hasMoreHistory && allMessages.length > 0 ? (
              <View style={styles.loadOlderWrap}>
                <TouchableOpacity
                  onPress={handleLoadOlder}
                  disabled={historyLoading}
                  style={[styles.loadOlderBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {historyLoading ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Text style={[styles.loadOlderText, { color: colors.accent }]}>{t('chat.loadOlder')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('chat.noMessages')}</Text>
          }
        />

        {copiedHint && (
          <View style={styles.copiedHintWrap} pointerEvents="none">
            <View style={[styles.copiedHint, { backgroundColor: colors.accent }]}>
              <Text style={styles.copiedHintText}>{t('chat.copied')}</Text>
            </View>
          </View>
        )}

        {/* Edit mode chip */}
        {editingMessage && !selectedImage && (
          <View style={[styles.editChipBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={[styles.editChip, { backgroundColor: colors.accent + '18' }]}>
              <Text style={[styles.editChipText, { color: colors.accent, flex: 1 }]} numberOfLines={2}>
                {t('chat.editing')} {editingMessage.text}
              </Text>
              <TouchableOpacity onPress={cancelEditMessage} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reply mode chip (replaces the image-preview strip slot) */}
        {replyTarget && !editingMessage && !selectedImage && (
          <View style={[styles.editChipBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={[styles.editChip, { backgroundColor: colors.accent + '18' }]}>
              <Text style={[styles.editChipText, { color: colors.accent, flex: 1 }]} numberOfLines={2}>
                ↩ {replyTarget.senderName}: {replyTarget.imageUrl && !replyTarget.text ? t('chat.photoMessage') : replyTarget.text}
              </Text>
              <TouchableOpacity onPress={() => setReplyTarget(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Voice recording state */}
        {recordingVoice && (
          <View style={[styles.editChipBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={[styles.editChip, { backgroundColor: colors.danger + '18' }]}>
              <View style={styles.recDot} />
              <Text style={[styles.editChipText, { color: colors.danger, flex: 1 }]}>
                {voiceUploading ? t('chat.voiceUploading') : t('chat.recordingVoice')}
              </Text>
              {!voiceUploading && (
                <TouchableOpacity onPress={() => stopVoiceRecording(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {selectedImage && (
          <View style={[styles.imagePreview, { backgroundColor: colors.surface }]}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity
              style={[styles.removeImageButton, { backgroundColor: colors.danger }]}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Smart reply suggestions */}
        {showSmartReplies && !editingMessage && !recordingVoice && (
          <View style={[styles.editChipBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={styles.smartRepliesRow}>
              {smartRepliesLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : smartReplies.length === 0 ? (
                <Text style={[styles.editChipText, { color: colors.textSecondary, flex: 1 }]}>{t('chat.noSuggestions')}</Text>
              ) : (
                smartReplies.map((suggestion, index) => (
                  <TouchableOpacity
                    key={`sr-${index}`}
                    style={[styles.smartReplyChip, { backgroundColor: colors.accent + '15', borderColor: colors.accent }]}
                    onPress={() => { handleMessageChange(suggestion); setShowSmartReplies(false); }}
                  >
                    <Text numberOfLines={1} style={[styles.smartReplyText, { color: colors.accent }]}>{suggestion}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: showSmartReplies ? colors.accent : colors.accent + '20' }]}
            onPress={handleToggleSmartReplies}
            disabled={editingMessage !== null || recordingVoice}
            accessibilityLabel={t('chat.smartReplies')}
          >
            <Text style={{ fontSize: 16 }}>✨</Text>
          </TouchableOpacity>
          {inputFocused && !editingMessage && (
            <>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.accent }]}
                onPress={handlePickImage}
                disabled={uploading}
              >
                <AppIcon name="image" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.accent }]}
                onPress={handleTakePhoto}
                disabled={uploading}
              >
                <AppIcon name="camera" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: recordingVoice ? colors.danger : colors.accent }]}
                onPress={() => (recordingVoice ? stopVoiceRecording(true) : startVoiceRecording())}
                disabled={uploading || voiceUploading}
                accessibilityLabel={t('chat.voiceMessage')}
              >
                <AppIcon name="microphone" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          <View style={[styles.inputWrapper, { borderColor: colors.border }, inputFocused && styles.inputWrapperFocused]}>
            <TextInput
              style={[styles.input, { color: colors.text }, WEB_NO_OUTLINE]}
              value={newMessage}
              onChangeText={handleMessageChange}
              placeholder={t('chat.sendMessage')}
              placeholderTextColor={colors.textDisabled}
              maxLength={MAX_MESSAGE_LENGTH}
              multiline
              onFocus={() => setInputFocused(true)}
              onBlur={() => { if (!newMessage.trim()) { setInputFocused(false); stopTypingSignal(); } }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.accent }, (uploading || voiceUploading || (editingMessage ? !canSendEdit : !canSend)) && styles.sendBtnHidden]}
              onPress={handleSend}
              disabled={uploading || voiceUploading || (editingMessage ? !canSendEdit : !canSend)}
            >
              {uploading || voiceUploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : editingMessage ? (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>✓</Text>
              ) : (
                <AppIcon name="send" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Group info / member management (groups only) */}
      {conversationType === 'group' && (
        <ChatGroupInfoSheet
          visible={showGroupInfo}
          conversation={conversation}
          currentUid={user?.uid || ''}
          onClose={handleGroupInfoClose}
        />
      )}

      {/* Long-press message actions: copy, reply, translate, event, edit/delete (own) */}
      <ActionModal
        visible={!!actionTarget}
        title={actionTarget?.text ? actionTarget.text : t('chat.messageMenu')}
        onCopy={!!actionTarget?.text ? () => handleCopyMessage(actionTarget) : undefined}
        onEdit={actionTarget && actionTarget.senderId === user?.uid ? () => beginEditMessage(actionTarget) : undefined}
        editText={t('chat.edit')}
        extraActions={[
          {
            label: t('chat.replyAction'),
            emoji: '↩️',
            onPress: () => { setReplyTarget(actionTarget); setShowSmartReplies(false); },
          },
          ...(actionTarget?.text ? [{
            label: t('chat.translateAction'),
            emoji: '🌐',
            onPress: () => handleTranslateMessage(actionTarget),
          }] : []),
          ...(actionTarget?.text ? [{
            label: t('chat.createEntry'),
            emoji: '📅',
            onPress: () => setEventChooserTarget(actionTarget),
          }] : []),
        ]}
        onDelete={actionTarget && actionTarget.senderId === user?.uid ? () => { setDeletingTarget(actionTarget); setActionTarget(null); } : undefined}
        confirmText={t('chat.deleteMessage')}
        confirmColor={colors.danger}
        onCancel={() => setActionTarget(null)}
      />

      {/* Delete confirmation */}
      <ActionModal
        visible={!!deletingTarget}
        title={t('chat.deleteMessageTitle')}
        subtitle={t('chat.deleteMessageBody')}
        onDelete={handleDeleteMessage}
        confirmText={t('chat.deleteMessage')}
        confirmColor={colors.danger}
        onCancel={() => setDeletingTarget(null)}
      />

      {/* "Opprett arrangement": type chooser (routes the message to the AI assistant) */}
      <Modal visible={!!eventChooserTarget} transparent animationType="slide" onRequestClose={() => setEventChooserTarget(null)}>
        <View style={styles.chooserOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEventChooserTarget(null)} />
          <View style={[styles.chooserSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.grabberBar, { backgroundColor: colors.border }]} />
            <Text style={[styles.chooserTitle, { color: colors.text }]}>{t('chat.createEntry')}</Text>
            <Text style={[styles.chooserDesc, { color: colors.textSecondary }]}>{t('chat.createEntryDesc')}</Text>
            {EVENT_TYPES.map(({ key, icon, color, labelKey }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chooserRow, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectEventType(key)}
              >
                <AppIcon name={icon} size={22} color={color} />
                <Text style={[styles.chooserRowText, { color: colors.text }]}>{t(labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Entity picker: which home/child/pet/person the entry belongs to */}
      <Modal visible={!!entityPicker} transparent animationType="slide" onRequestClose={() => setEntityPicker(null)}>
        <View style={styles.chooserOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEntityPicker(null)} />
          <View style={[styles.chooserSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.grabberBar, { backgroundColor: colors.border }]} />
            <Text style={[styles.chooserTitle, { color: colors.text }]}>{t('chat.pickTarget')}</Text>
            <Text style={[styles.chooserDesc, { color: colors.textSecondary }]}>{t('chat.pickTargetDesc')}</Text>
            {entityPicker?.loading ? (
              <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 24 }} />
            ) : (
              entityPicker?.options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.chooserRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleChooseEntity(option)}
                >
                  <Text style={{ fontSize: 17, color: colors.accent }}>›</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[styles.chooserRowText, { color: colors.text }]}>{option.name}</Text>
                    {option.sub ? (
                      <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textSecondary }}>{option.sub}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>

      {/* AI catch-up summary */}
      <Modal visible={summaryModal.visible} transparent animationType="fade" onRequestClose={() => setSummaryModal({ visible: false, text: '', loading: false })}>
        <View style={styles.summaryOverlay}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Image source={require('../../assets/icon.png')} style={styles.summaryLogo} />
            <Text style={[styles.summaryTitle, { color: colors.text }]}>{t('chat.summaryTitle')}</Text>
            {summaryModal.loading ? (
              <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 24 }} />
            ) : (
              <>
                <ScrollView style={[styles.summaryScroll, { borderColor: colors.border }]} nestedScrollEnabled>
                  <Text style={[styles.summaryText, { color: colors.text }]}>{summaryModal.text || t('chat.summaryEmpty')}</Text>
                </ScrollView>
                <TouchableOpacity
                  style={[styles.summaryCloseBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setSummaryModal({ visible: false, text: '', loading: false })}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{t('common.close')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  smartRepliesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  smartReplyChip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '45%',
  },
  smartReplyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D64545',
  },
  summaryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  summaryLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryScroll: {
    width: '100%',
    maxHeight: 260,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  summaryCloseBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  chooserOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  chooserSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '80%',
  },
  grabberBar: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 12,
  },
  chooserTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  chooserDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  chooserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  chooserRowText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  loadOlderWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loadOlderBtn: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  loadOlderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  copiedHintWrap: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    zIndex: 20,
  },
  copiedHint: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  copiedHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  editChipBar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  editChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    padding: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
  },
  messagesList: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
  imagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 20,
    paddingHorizontal: 14,
    maxWidth: 200,
    height: 36,
    backgroundColor: '#fff',
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    flex: 1,
    maxWidth: '100%',
    height: 'auto',
    minHeight: 36,
    maxHeight: 120,
    overflow: 'visible',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
    paddingHorizontal: 0,
    margin: 0,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    // Vertically centered in the input row for any input height
    alignSelf: 'center',
  },
  sendBtnHidden: {
    opacity: 0,
    width: 0,
    margin: 0,
    overflow: 'hidden',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
