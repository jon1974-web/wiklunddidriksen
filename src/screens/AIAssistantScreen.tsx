import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';

const HOME_COLOR = MODULE_COLORS.home;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: any[];
  timestamp: number;
}

interface AIAssistantScreenProps {
  navigation: any;
  route?: { params?: { title?: string } };
}

export const AIAssistantScreen: React.FC<AIAssistantScreenProps> = ({ navigation }) => {
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
      setMessages((prev) => [...prev, assistantMsg]);

      if (data.actions && data.actions.length > 0) {
        setConfirmMessage(data.reply);
        setConfirmActions(data.actions);
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
  }, [familyId, loading]);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: colors.accent }]}>
          <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <AppIcon name="ai" size={28} color={HOME_COLOR} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>AI-assistent</Text>
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
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Hei! 👋</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Hva kan jeg hjelpe deg med?</Text>
            <Text style={[styles.emptyHint, { color: colors.textDisabled }]}>Prøv: "Når er neste tannlegetime?" eller "Legg til fotballtrening for Mina på fredag"</Text>
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageBubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble, { backgroundColor: msg.role === 'user' ? colors.accent : colors.surface }]}>
            {msg.role === 'assistant' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <AppIcon name="ai" size={14} color={HOME_COLOR} />
                <Text style={{ fontSize: 10, color: HOME_COLOR, fontWeight: '600' }}>AI-assistent</Text>
              </View>
            )}
            <Text style={{ fontSize: 14, color: msg.role === 'user' ? '#fff' : colors.text, lineHeight: 20 }}>{msg.content}</Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <AppIcon name="ai" size={14} color={HOME_COLOR} />
              <Text style={{ fontSize: 10, color: HOME_COLOR, fontWeight: '600' }}>AI-assistent</Text>
            </View>
            <ActivityIndicator size="small" color={HOME_COLOR} />
          </View>
        )}
      </ScrollView>

      {/* Confirm modal */}
      {showConfirm && (
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface }]}>
            <AppIcon name="ai" size={32} color={HOME_COLOR} />
            <Text style={[styles.confirmTitle, { color: colors.text }]}>{confirmMessage}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => { setShowConfirm(false); setConfirmActions([]); }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: HOME_THEME, flex: 1 }]} onPress={handleConfirm}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Skriv en melding..."
            placeholderTextColor={colors.textDisabled}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() ? HOME_THEME : colors.textDisabled }]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <AppIcon name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
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
  textInput: { flex: 1, padding: 12, borderRadius: 12, fontSize: 16 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});