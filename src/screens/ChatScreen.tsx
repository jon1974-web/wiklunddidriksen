import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { ChatMessage, MessageReaction } from '../types';
import { MessageBubble } from '../components/MessageBubble';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { CHAT_MESSAGE_LIMIT, MAX_MESSAGE_LENGTH, IMAGE_MAX_DIMENSION, IMAGE_QUALITY, SCROLL_DELAY_MS, LOCALE } from '../constants/limits';
import { getErrorMessage } from '../utils/validation';
import { uriToBlob } from '../utils/upload';
import { getUserProfile } from '../services/familyService';
import { AppIcon } from '../components/AppIcon';
import { useChatStore } from '../store/chatStore';

export const ChatScreen: React.FC = () => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const flatListRef = useRef<FlatList>(null);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const familyName = useUserStore((state) => state.familyName);
  const { colors } = useTheme();
  const setInputFocused = useChatStore((state) => state.setInputFocused);
  const inputFocused = useChatStore((state) => state.inputFocused);

  useEffect(() => {
    if (!familyId) return;
    const q = query(
      collection(db, 'chat'),
      where('familyId', '==', familyId),
      orderBy('timestamp', 'desc'),
      limit(CHAT_MESSAGE_LIMIT)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .reverse() as ChatMessage[];
      setMessages(messagesData);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, SCROLL_DELAY_MS);
    }, (error) => {
      Alert.alert(t('common.error'), getErrorMessage(error));
    });

    return () => unsubscribe();
  }, [familyId]);

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
      maxWidth: IMAGE_MAX_DIMENSION,
      maxHeight: IMAGE_MAX_DIMENSION,
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
      Alert.alert('Tillatelse', 'Vi trenger tilgang til kameraet for å ta bilder.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      maxWidth: IMAGE_MAX_DIMENSION,
      maxHeight: IMAGE_MAX_DIMENSION,
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

      await addDoc(collection(db, 'chat'), {
        text: newMessage.trim() || '',
        senderId: user.uid,
        senderName: user.displayName,
        ...(user.avatarUrl && { senderAvatarUrl: user.avatarUrl }),
        timestamp: Date.now(),
        ...(imageUrl && { imageUrl }),
        familyId: familyId || null,
      });

      setNewMessage('');
      setSelectedImage(null);
      setSelectedImageBase64(null);
      setInputFocused(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, SCROLL_DELAY_MS);
    } catch (error) {
      Alert.alert(t('common.error'), getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }, [newMessage, selectedImage, user, familyId]);

  const canSend = newMessage.trim() || selectedImage;

  const handleReaction = useCallback(async (messageId: string, reactionType: MessageReaction['type']) => {
    if (!user) return;
    try {
      const messageRef = doc(db, 'chat', messageId);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(messageRef);
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        const rawReactions = data?.reactions;
        const reactions: MessageReaction[] = Array.isArray(rawReactions) ? [...rawReactions] : [];
        const existingIndex = reactions.findIndex(
          (r: MessageReaction) => r.userId === user.uid && r.type === reactionType
        );

        if (existingIndex >= 0) {
          reactions.splice(existingIndex, 1);
        } else {
          reactions.push({ userId: user.uid, type: reactionType });
        }

        transaction.update(messageRef, { reactions });
      });
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  }, [user]);

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

  type ChatListItem = { type: 'message'; message: ChatMessage } | { type: 'date'; date: string; key: string };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AppIcon name="chat" size={28} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>{t('chat.title')}</Text>
          </View>
          <Image source={require('../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 9 }} />
        </View>
        {familyName ? <Text style={[styles.familySubtitle, { color: colors.textSecondary }]}>{familyName}</Text> : null}
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
            style={[styles.input, { color: colors.text, outlineStyle: 'none' }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={t('chat.sendMessage')}
            placeholderTextColor={colors.textDisabled}
            maxLength={500}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  familySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 36,
    marginTop: 2,
    marginBottom: 8,
  },
  messagesList: {
    paddingVertical: 8,
    flexGrow: 1,
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
  iconText: {
    fontSize: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 0,
    maxWidth: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    flex: 1,
    maxWidth: '100%',
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 34,
    minHeight: 34,
    maxHeight: 100,
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
