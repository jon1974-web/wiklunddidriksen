import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { scheduleEventReminder } from '../services/notificationService';
import { getUserProfile, notifyNewEvent } from '../services/familyService';
import { syncEventToCalendar } from '../services/calendarService';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';

interface VoiceEventScreenProps {
  navigation: any;
}

interface ParsedEvent {
  title: string;
  description: string;
  date: string;
  endDate: string | null;
  time: string;
  endTime: string | null;
  reminderMinutes: number;
}

const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/voiceToEvent';

export const VoiceEventScreen: React.FC<VoiceEventScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [parsedEvent, setParsedEvent] = useState<ParsedEvent | null>(null);
  const [creating, setCreating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);

  const startRecording = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setRecording(true);
        setTranscript(null);
        setParsedEvent(null);
      } else {
        const { Audio } = await import('expo-av');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          crossAlert('Tilgang', 'Mikrofontilgang er nødvendig for å ta opp lyd.');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        (globalThis as any).__voiceRecording = newRecording;
        (globalThis as any).__voiceAudio = Audio;
        setRecording(true);
        setTranscript(null);
        setParsedEvent(null);
      }
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return;

    try {
      setProcessing(true);
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
        const Audio = (globalThis as any).__voiceAudio;
        const rec = (globalThis as any).__voiceRecording;
        await rec.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = rec.getURI();
        const response = await fetch(uri);
        audioBlob = await response.blob();
      }

      setRecording(false);

      const ext = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';

      const headers: Record<string, string> = {
        'Content-Type': audioBlob.type || 'audio/webm',
        'X-Filename': `recording.${ext}`,
      };
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const apiResponse = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: audioBlob,
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Server error');
      }

      const data = await apiResponse.json();
      setTranscript(data.transcript);
      setParsedEvent(data.event);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  }, [recording]);

  const handleCreateEvent = useCallback(async () => {
    if (!parsedEvent || !user || creating) return;
    setCreating(true);

    try {
      const eventStartDate = new Date(`${parsedEvent.date}T${parsedEvent.time}`);
      const reminderAt = new Date(eventStartDate.getTime() - parsedEvent.reminderMinutes * 60 * 1000);

      const eventData = {
        title: parsedEvent.title,
        description: parsedEvent.description,
        date: parsedEvent.date,
        endDate: parsedEvent.endDate,
        time: parsedEvent.time,
        endTime: parsedEvent.endTime,
        reminderMinutes: parsedEvent.reminderMinutes,
        reminderAt: reminderAt.toISOString(),
        address: '',
        createdBy: user.uid,
        familyId: familyId || null,
        createdAt: Date.now(),
      };

      const docRef = await addDoc(collection(db, 'events'), eventData);

      let notificationId: string | undefined;
      try {
        const notifId = await scheduleEventReminder(
          eventData.title,
          eventData.description || 'Arrangement starter snart',
          eventStartDate,
          eventData.reminderMinutes
        );
        if (notifId) {
          notificationId = notifId;
          const { updateDoc, doc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'events', docRef.id), { notificationId });
        }
      } catch {}

      try {
        const profile = await getUserProfile(user.uid);
        if (profile?.calendarId) {
          const calEventId = await syncEventToCalendar({
            title: eventData.title,
            description: eventData.description,
            date: eventData.date,
            time: eventData.time,
            endDate: eventData.endDate || undefined,
            endTime: eventData.endTime || undefined,
            calendarId: profile.calendarId,
          });
          if (calEventId) {
            const { updateDoc, doc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'events', docRef.id), { calendarEventId: calEventId });
          }
        }
      } catch {}

      if (familyId && user) {
        notifyNewEvent(familyId, eventData.title, eventData.date, eventData.time, user.displayName || 'En i familien').catch(() => {});
      }

      crossAlert(t('common.success'), `"${eventData.title}" ${t('events.addEvent')}!`);
      navigation.goBack();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
      setCreating(false);
    }
  }, [parsedEvent, user, navigation, creating]);

  const handleEditManually = useCallback(() => {
    const prefillData = parsedEvent ? {
      title: parsedEvent.title,
      description: parsedEvent.description,
      date: parsedEvent.date,
      endDate: parsedEvent.endDate,
      time: parsedEvent.time,
      endTime: parsedEvent.endTime,
      reminderMinutes: parsedEvent.reminderMinutes,
    } : undefined;
    setParsedEvent(null);
    setTranscript(null);
    navigation.navigate('AddEvent', { prefill: prefillData });
  }, [parsedEvent, navigation]);

  const handleReset = useCallback(() => {
    setTranscript(null);
    setParsedEvent(null);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      <View style={[styles.helperSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('voice.instruction')}
        </Text>
        <Text style={[styles.helperExample, { color: colors.textDisabled }]}>
          {t('voice.example')}
        </Text>
      </View>

      <View style={styles.content}>
        {!parsedEvent && !processing && (
          <View style={styles.micContainer}>
            <TouchableOpacity
              style={[
                styles.micButton,
                { backgroundColor: recording ? colors.danger : colors.accent },
                recording && styles.micButtonActive,
              ]}
              onPress={recording ? stopRecording : startRecording}
            >
              <Text style={styles.micIcon}>{recording ? '⏹' : '🎙️'}</Text>
            </TouchableOpacity>
            <Text style={[styles.micLabel, { color: colors.textSecondary }]}>
              {recording ? t('voice.stopRecording') : t('voice.startRecording')}
            </Text>
          </View>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.processingText, { color: colors.textSecondary }]}>
              Behandler tale...
            </Text>
            {transcript && (
              <Text style={[styles.transcriptPreview, { color: colors.text }]}>
                &quot;{transcript}&quot;
              </Text>
            )}
          </View>
        )}

        {parsedEvent && !processing && (
          <View style={styles.resultContainer}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Forslag:</Text>

            {transcript && (
              <View style={[styles.transcriptCard, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.transcriptLabel, { color: colors.textSecondary }]}>Du sa:</Text>
                <Text style={[styles.transcriptText, { color: colors.text }]}>&quot;{transcript}&quot;</Text>
              </View>
            )}

            <View style={[styles.eventCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.eventTitle, { color: colors.text }]}>{parsedEvent.title}</Text>
              {parsedEvent.description ? (
                <Text style={[styles.eventDesc, { color: colors.textSecondary }]}>{parsedEvent.description}</Text>
              ) : null}
              <Text style={[styles.eventDetail, { color: colors.text }]}>
                📅 {parsedEvent.date}{parsedEvent.endDate ? ` → ${parsedEvent.endDate}` : ''}
              </Text>
              <Text style={[styles.eventDetail, { color: colors.text }]}>
                🕐 {parsedEvent.time}{parsedEvent.endTime ? ` → ${parsedEvent.endTime}` : ''}
              </Text>
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: creating ? 0.6 : 1 }]}
                onPress={handleCreateEvent}
                disabled={creating}
              >
                <Text style={styles.primaryButtonText}>{creating ? 'Oppretter...' : 'Opprett arrangement'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={handleEditManually}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Rediger manuelt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.textButton]}
                onPress={handleReset}
              >
                <Text style={[styles.textButtonText, { color: colors.accent }]}>Prøv igjen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  helperSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  helperExample: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  micContainer: {
    alignItems: 'center',
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  micButtonActive: {
    transform: [{ scale: 1.1 }],
  },
  micIcon: {
    fontSize: 48,
  },
  micLabel: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  processingText: {
    fontSize: 16,
  },
  transcriptPreview: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  resultContainer: {
    width: '100%',
    maxWidth: 400,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transcriptCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 14,
    marginBottom: 8,
  },
  eventDetail: {
    fontSize: 14,
    marginTop: 4,
  },
  resultActions: {
    gap: 12,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  textButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
