import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, runTransaction } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { ChatMessage, MessageReaction } from '../types';
import { MessageBubble } from '../components/MessageBubble';
import { useTheme } from '../theme/ThemeContext';
import { CHAT_MESSAGE_LIMIT, MAX_MESSAGE_LENGTH, IMAGE_MAX_DIMENSION, IMAGE_QUALITY, SCROLL_DELAY_MS, LOCALE } from '../constants/limits';
import { getErrorMessage } from '../utils/validation';

export const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const user = useUserStore((state) => state.user);
  const { colors } = useTheme();

  useEffect(() => {
    const q = query(
      collection(db, 'chat'),
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
  }, []);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Tillatelse', 'Vi trenger tilgang til bildebiblioteket for å dele bilder.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      maxWidth: IMAGE_MAX_DIMENSION,
      maxHeight: IMAGE_MAX_DIMENSION,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
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
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `chat/${Date.now()}_${Math.random().toString(36).substr(2)}`;
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
        imageUrl = await uploadImage(selectedImage);
      }

      await addDoc(collection(db, 'chat'), {
        text: newMessage.trim() || '',
        senderId: user.uid,
        senderName: user.displayName,
        ...(user.avatarUrl && { senderAvatarUrl: user.avatarUrl }),
        timestamp: Date.now(),
        ...(imageUrl && { imageUrl }),
      });

      setNewMessage('');
      setSelectedImage(null);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, SCROLL_DELAY_MS);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  }, [newMessage, selectedImage, user]);

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
    />
  ), [user?.uid, handleReaction]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Familiechat</Text>
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
          style={[styles.iconButton, { backgroundColor: colors.inputBackground }]}
          onPress={handlePickImage}
          disabled={uploading}
        >
          <Text style={[styles.iconText, { color: colors.text }]}>🖼</Text>
        </TouchableOpacity>
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.inputBackground }]}
            onPress={handleTakePhoto}
            disabled={uploading}
          >
            <Text style={[styles.iconText, { color: colors.text }]}>📷</Text>
          </TouchableOpacity>
        )}
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
    borderTopWidth: 1,
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    minWidth: 60,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
