import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator, TextStyle } from 'react-native';
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
import { MAX_MESSAGE_LENGTH, IMAGE_QUALITY, SCROLL_DELAY_MS, LOCALE } from '../constants/limits';
import { getErrorMessage } from '../utils/validation';
import { uriToBlob } from '../utils/upload';
import { getUserProfile } from '../services/familyService';
import {
  listenToMessages,
  sendMessage,
  markConversationRead,
  toggleReaction,
  getConversation,
} from '../services/chatService';
import { ChatGroupInfoSheet } from '../components/ChatGroupInfoSheet';
import { AppIcon } from '../components/AppIcon';
import { useChatStore } from '../store/chatStore';

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
  const flatListRef = useRef<FlatList>(null);
  const lastReadTsRef = useRef<number>(0);
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

  // Real-time message listener (messages subcollection)
  useEffect(() => {
    const unsubscribe = listenToMessages(
      conversationId,
      (messagesData) => {
        setMessages(messagesData as ChatMessage[]);
        // Mark conversation read (own messages bump lastRead implicitly via sendMessage)
        const last = messagesData[messagesData.length - 1];
        if (last && last.timestamp > lastReadTsRef.current) {
          lastReadTsRef.current = last.timestamp;
          if (user && last.senderId !== user.uid) {
            markConversationRead(conversationId, user.uid).catch(() => undefined);
          }
        }
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, SCROLL_DELAY_MS);
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
          return { uid, avatarUrl: profile?.avatarUrl || '' };
        } catch {
          return { uid, avatarUrl: '' };
        }
      }));
      const updates: Record<string, string> = {};
      profiles.forEach(({ uid, avatarUrl }) => { updates[uid] = avatarUrl; });
      setUserAvatars((prev) => ({ ...prev, ...updates }));
    })();
  }, [messages]);

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

  const handleSend = useCallback(async () => {
    if ((!newMessage.trim() && !selectedImage) || !user) return;

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
      };
      await sendMessage(conversationId, message);

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
  }, [newMessage, selectedImage, user, conversationId]);

  const canSend = newMessage.trim() || selectedImage;

  const handleReaction = useCallback(async (messageId: string, reactionType: MessageReaction['type']) => {
    if (!user) return;
    try {
      await toggleReaction(conversationId, messageId, user.uid, reactionType);
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  }, [user, conversationId]);

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

  type ChatListItem = { type: 'message'; message: ChatMessage; key: string } | { type: 'date'; date: string; key: string };

  const chatData = useMemo<ChatListItem[]>(() => {
    const items: ChatListItem[] = [];
    let lastDateKey = '';
    for (const msg of messages) {
      const d = new Date(msg.timestamp);
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        items.push({ type: 'date', date: formatDateSeparator(msg.timestamp), key: `date-${dateKey}` });
      }
      items.push({ type: 'message', message: msg, key: msg.id });
    }
    return items;
  }, [messages, formatDateSeparator]);

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
      />
    );
  }, [user?.uid, handleReaction, userAvatars, colors]);

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
          </View>
        </View>

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
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('chat.noMessages')}</Text>
          }
        />

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

        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {inputFocused && (
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
            </>
          )}
          <View style={[styles.inputWrapper, { borderColor: colors.border }, inputFocused && styles.inputWrapperFocused]}>
            <TextInput
              style={[styles.input, { color: colors.text }, WEB_NO_OUTLINE]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={t('chat.sendMessage')}
              placeholderTextColor={colors.textDisabled}
              maxLength={MAX_MESSAGE_LENGTH}
              multiline
              onFocus={() => setInputFocused(true)}
              onBlur={() => { if (!newMessage.trim()) setInputFocused(false); }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.accent }, (!canSend || uploading) && styles.sendBtnHidden]}
              onPress={handleSend}
              disabled={!canSend || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
