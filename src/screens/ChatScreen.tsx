import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { CHAT_MESSAGE_LIMIT, MAX_MESSAGE_LENGTH, IMAGE_MAX_DIMENSION, IMAGE_QUALITY, SCROLL_DELAY_MS } from '../constants/limits';
import { getErrorMessage } from '../utils/validation';
import { uriToBlob } from '../utils/upload';
import { getUserProfile } from '../services/familyService';
import { AppIcon } from '../components/AppIcon';

export const ChatScreen: React.FC = () => {
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
      Alert.alert('Error', getErrorMessage(error));
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
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, SCROLL_DELAY_MS);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
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

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble
      message={item}
      isOwnMessage={item.senderId === user?.uid}
      currentUserId={user?.uid}
      onReaction={handleReaction}
      liveAvatarUrl={item.senderId ? userAvatars[item.senderId] : undefined}
    />
  ), [user?.uid, handleReaction, userAvatars]);

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
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
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
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Skriv en melding..."
          placeholderTextColor={colors.textDisabled}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.accent }, !canSend && { backgroundColor: colors.textDisabled }]}
          onPress={handleSend}
          disabled={!canSend || uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
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
    padding: 12,
    paddingBottom: 50,
    borderTopWidth: 1,
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconText: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
