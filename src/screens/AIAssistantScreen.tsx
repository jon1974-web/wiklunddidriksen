import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, TouchableWithoutFeedback } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { auth } from '../services/firebase';
import Svg, { Line } from 'react-native-svg';

const HOME_COLOR = MODULE_COLORS.home;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: any[];
  timestamp: number;
}

interface AIAssistantScreenProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({ visible, onClose, navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmActions, setConfirmActions] = useState<any[]>([]);
  const [correctionMsgId, setCorrectionMsgId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [correctionQuery, setCorrectionQuery] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const messagesRef = useRef<Message[]>([]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    if (!familyId) {
      crossAlert(t('common.error'), 'Ingen familie valgt');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => {
      const updated = [...prev, userMsg];
      messagesRef.current = updated;
      return updated;
    });
    setInput('');
    setLoading(true);

    try {
      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/aiAssistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          familyId,
          history: messagesRef.current.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (data.error) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Beklager, det oppstod en feil: ${data.error}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        actions: data.actions || [],
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const updated = [...prev, assistantMsg];
        messagesRef.current = updated;
        return updated;
      });

      const allActions = data.actions || [];
      const navigateActions = allActions.filter((a: any) => a.type === 'navigate');
      const confirmableActions = allActions.filter((a: any) => a.type !== 'navigate');

      for (const nav of navigateActions) {
        if (nav.screen) {
          const screenConfig = nav.screen;
          const targetScreen = screenConfig.screen;
          onClose();
          setTimeout(() => {
            if (targetScreen === 'SchoolSpace') {
              navigation.navigate('Trips', { screen: 'SchoolSpace', params: { childId: screenConfig.childId } });
            } else if (targetScreen === 'KindergartenSpace') {
              navigation.navigate('Trips', { screen: 'KindergartenSpace', params: { childId: screenConfig.childId } });
            } else if (targetScreen === 'PetSpace') {
              navigation.navigate('Trips', { screen: 'PetSpace', params: { petId: screenConfig.petId } });
            } else if (targetScreen === 'HomeSpace') {
              navigation.navigate('Trips', { screen: 'HomeSpace', params: { homeId: screenConfig.homeId } });
            } else if (targetScreen === 'HealthSpace') {
              navigation.navigate('Trips', { screen: 'HealthSpace' });
            } else if (targetScreen === 'Events') {
              navigation.navigate('Events');
            } else if (targetScreen === 'Trips') {
              navigation.navigate('Trips', { screen: 'SpacesList' });
            } else if (targetScreen === 'HomeMaintenance' && screenConfig.home) {
              navigation.navigate('Trips', { screen: 'HomeMaintenance', params: { home: screenConfig.home } });
            } else {
              navigation.navigate('Trips', { screen: targetScreen });
            }
          }, 300);
          return;
        }
      }

      if (confirmableActions.length > 0) {
        setConfirmMessage(data.reply);
        setConfirmActions(allActions);
        setShowConfirm(true);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Beklager, det oppstod en feil. Prøv igjen senere.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [familyId, loading, navigation, onClose]);

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);

    try {
      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/aiAssistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '__CONFIRM__',
          actions: confirmActions,
          familyId,
          history: messagesRef.current.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      const confirmMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Handlinger utført.',
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const updated = [...prev, confirmMsg];
        messagesRef.current = updated;
        return updated;
      });

      const navAction = confirmActions.find((a: any) => a.screen);
      if (navAction?.screen) {
        const screenConfig = navAction.screen;
        onClose();
        setTimeout(() => {
          if (screenConfig.screen === 'SchoolSpace') {
            navigation.navigate('Trips', { screen: 'SchoolSpace', params: { childId: screenConfig.childId } });
          } else if (screenConfig.screen === 'KindergartenSpace') {
            navigation.navigate('Trips', { screen: 'KindergartenSpace', params: { childId: screenConfig.childId } });
          } else if (screenConfig.screen === 'PetSpace') {
            navigation.navigate('Trips', { screen: 'PetSpace', params: { petId: screenConfig.petId } });
          } else if (screenConfig.screen === 'HomeSpace') {
            navigation.navigate('Trips', { screen: 'HomeSpace', params: { homeId: screenConfig.homeId } });
          } else if (screenConfig.screen === 'HealthSpace') {
            navigation.navigate('Trips', { screen: 'HealthSpace' });
          } else if (screenConfig.screen === 'Events') {
            navigation.navigate('Events');
          } else if (screenConfig.screen === 'Trips') {
            navigation.navigate('Trips', { screen: 'SpacesList' });
          } else if (screenConfig.screen === 'HomeMaintenance' && screenConfig.home) {
            navigation.navigate('Trips', { screen: 'HomeMaintenance', params: { home: screenConfig.home } });
          } else {
            navigation.navigate('Trips', { screen: screenConfig.screen });
          }
        }, 300);
      }
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Beklager, det oppstod en feil under utførelsen.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setConfirmActions([]);
    }
  };

  const startVoiceInput = useCallback(async () => {
    if (recording || transcribing) return;
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        chunksRef.current = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setRecording(true);
      } else {
        const { Audio } = await import('expo-av');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          crossAlert(t('common.error'), 'Mikrofontilgang er nødvendig');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        (globalThis as any).__aiRecording = newRecording;
        (globalThis as any).__aiAudio = Audio;
        setRecording(true);
      }
    } catch (error) {
      crossAlert(t('common.error'), 'Kunne ikke starte opptak');
      setRecording(false);
    }
  }, [recording, transcribing, t]);

  const stopAndTranscribe = useCallback(async () => {
    if (!recording) return;
    setRecording(false);
    setTranscribing(true);

    try {
      let audioBlob: Blob;

      if (Platform.OS === 'web') {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) throw new Error('No MediaRecorder');
        await new Promise<void>((resolve) => {
          mediaRecorder.onstop = () => resolve();
          mediaRecorder.stop();
        });
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        audioBlob = new Blob(chunksRef.current, { type: mimeType });
      } else {
        const Audio = (globalThis as any).__aiAudio;
        const rec = (globalThis as any).__aiRecording;
        await rec.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = rec.getURI();
        const response = await fetch(uri);
        audioBlob = await response.blob();
      }

      const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
      const headers: Record<string, string> = {
        'Content-Type': audioBlob.type || 'audio/webm',
        'X-Filename': `recording.${ext}`,
      };
      const idToken = await auth.currentUser?.getIdToken();
      if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

      const res = await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/voiceToEvent', {
        method: 'POST',
        headers,
        body: audioBlob,
      });
      const data = await res.json();
      if (data.text) {
        setInput(data.text);
      } else {
        crossAlert(t('common.error'), 'Kunne ikke transkribere');
      }
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setTranscribing(false);
    }
  }, [recording, t]);

  const sendCorrection = useCallback(async (originalQuery: string, correctAnswer: string) => {
    if (!familyId || !correctAnswer.trim()) return;
    setCorrectionMsgId(null);
    setCorrectionText('');
    setCorrectionQuery('');
    setLoading(true);

    try {
      const { auth } = await import('../services/firebase');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      await fetch('https://us-central1-familiesenter-837bb.cloudfunctions.net/aiAssistant', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '__CORRECTION__',
          originalQuery,
          correctAnswer,
          familyId,
        }),
      });

      const thanksMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Takk! Jeg har lært dette for fremtiden. 🧠',
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const updated = [...prev, thanksMsg];
        messagesRef.current = updated;
        return updated;
      });
    } catch (error) {
      console.log('Correction error:', error);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: colors.textSecondary }]}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth="2.5" strokeLinecap="round">
                <Line x1="18" y1="6" x2="6" y2="18"/>
                <Line x1="6" y1="6" x2="18" y2="18"/>
              </Svg>
            </TouchableOpacity>
            <AppIcon name="ai" size={24} color={HOME_COLOR} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>{t('aiAssistant.title')}</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <AppIcon name="ai" size={48} color={HOME_COLOR} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('aiAssistant.greetingTitle')}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{t('aiAssistant.greetingSubtitle')}</Text>
                <Text style={[styles.emptyHint, { color: colors.textDisabled }]}>{t('aiAssistant.greetingHint')}</Text>
              </View>
            )}

            {messages.map((msg) => (
              <View key={msg.id}>
                <View style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble, { backgroundColor: msg.role === 'user' ? colors.accent : colors.surface }]}>
                  {msg.role === 'assistant' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <AppIcon name="ai" size={14} color={HOME_COLOR} />
                      <Text style={{ fontSize: 10, color: HOME_COLOR, fontWeight: '600' }}>{t('aiAssistant.title')}</Text>
                    </View>
                  )}
                  <Text style={{ fontSize: 14, color: msg.role === 'user' ? '#fff' : colors.text, lineHeight: 20 }}>{msg.content}</Text>
                </View>
                {msg.role === 'assistant' && !loading && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginBottom: 4, gap: 6 }}>
                    {correctionMsgId !== msg.id && (
                      <TouchableOpacity
                        onPress={() => {
                          setCorrectionMsgId(msg.id);
                          const userMsg = messages.find((m, i) => {
                            const msgIndex = messages.indexOf(msg);
                            return i < msgIndex && m.role === 'user';
                          });
                          setCorrectionQuery(userMsg?.content || '');
                        }}
                        style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                      >
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{t('aiAssistant.wasCorrect')}</Text>
                      </TouchableOpacity>
                    )}
                    {correctionMsgId === msg.id && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                        <TextInput
                          style={{ flex: 1, fontSize: 13, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: colors.inputBackground, color: colors.text }}
                          value={correctionText}
                          onChangeText={setCorrectionText}
                          placeholder={t('aiAssistant.writeCorrectAnswer')}
                          placeholderTextColor={colors.textDisabled}
                        />
                        <TouchableOpacity
                          onPress={() => sendCorrection(correctionQuery, correctionText)}
                          style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: HOME_COLOR }}
                        >
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '600' }}>OK</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => { setCorrectionMsgId(null); setCorrectionText(''); }}
                          style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}
                        >
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}

            {loading && (
              <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <AppIcon name="ai" size={14} color={HOME_COLOR} />
                  <Text style={{ fontSize: 10, color: HOME_COLOR, fontWeight: '600' }}>{t('aiAssistant.title')}</Text>
                </View>
                <ActivityIndicator size="small" color={HOME_COLOR} />
              </View>
            )}
          </ScrollView>

          {showConfirm && (
            <View style={styles.confirmOverlay}>
              <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
                <AppIcon name="ai" size={32} color={HOME_COLOR} />
                <Text style={[styles.confirmTitle, { color: colors.text }]}>{confirmMessage}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowConfirm(false); setConfirmActions([]); }}>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: HOME_COLOR, flex: 1 }]} onPress={handleConfirm}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('common.confirm')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              {recording || transcribing ? (
                <TouchableOpacity
                  style={[styles.micRecordingBtn]}
                  onPress={stopAndTranscribe}
                >
                  <AppIcon name="microphone" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>
                    {transcribing ? t('aiAssistant.transcribing') : t('aiAssistant.tapToStop')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.micBtn, { backgroundColor: colors.inputBackground }]}
                    onPress={startVoiceInput}
                  >
                    <AppIcon name="microphone" size={20} color={HOME_COLOR} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
                    value={input}
                    onChangeText={setInput}
                    placeholder={t('aiAssistant.writeMessage')}
                    placeholderTextColor={colors.textDisabled}
                    onSubmitEditing={() => sendMessage(input)}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[styles.sendBtn, { backgroundColor: input.trim() ? HOME_COLOR : colors.textDisabled }]}
                    onPress={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                  >
                    <AppIcon name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { flex: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  messagesContainer: { flex: 1 },
  emptyState: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyTitle: { fontSize: 22, fontWeight: '700' },
  emptySubtitle: { fontSize: 16, color: '#666' },
  emptyHint: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 16 },
  messageBubble: { padding: 12, borderRadius: 16, marginBottom: 8, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  confirmOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 20, justifyContent: 'flex-end' },
  confirmBox: { borderRadius: 16, padding: 20, alignItems: 'center', gap: 8 },
  confirmTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  confirmBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1 },
  micBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  micRecordingBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E53935', paddingVertical: 12, borderRadius: 20 },
  textInput: { flex: 1, padding: 12, borderRadius: 12, fontSize: 16 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
