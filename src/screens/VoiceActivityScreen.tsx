import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addHealthAppointment } from '../services/healthService';
import { addVetVisit } from '../services/petService';
import { addSchoolActivity } from '../services/schoolService';
import { addKindergartenActivity } from '../services/kindergartenService';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { auth } from '../services/firebase';

type ActivityType = 'healthAppointment' | 'vetVisit' | 'schoolActivity' | 'kindergartenActivity';

interface VoiceActivityScreenProps {
  navigation: any;
  route: { params: { type: ActivityType; moduleColor: string } };
}

interface ParsedData {
  title: string;
  person?: string;
  doctor?: string;
  dateFrom: string;
  dateTo?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  reminder?: string;
  activityType?: 'tur' | 'aktivitet' | 'møte';
}

const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/voiceToEvent';

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  healthAppointment: 'helseavtale',
  vetVisit: 'veterinærbesøk',
  schoolActivity: 'skoleaktivitet',
  kindergartenActivity: 'barnehageaktivitet',
};

const ACTIVITY_TYPE_OPTIONS: Array<{ value: 'tur' | 'aktivitet' | 'møte'; label: string }> = [
  { value: 'tur', label: 'Tur' },
  { value: 'aktivitet', label: 'Aktivitet' },
  { value: 'møte', label: 'Møte' },
];

export const VoiceActivityScreen: React.FC<VoiceActivityScreenProps> = ({ navigation, route }) => {
  const { type, moduleColor } = route.params;
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [creating, setCreating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);

  const showPerson = type === 'healthAppointment';
  const showActivityType = type === 'schoolActivity' || type === 'kindergartenActivity';
  const showDoctor = type === 'healthAppointment' || type === 'vetVisit';

  const accentColor = moduleColor;

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
        setParsedData(null);
      } else {
        const { Audio } = await import('expo-av');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          crossAlert(t('common.error'), t('voice.micPermission'));
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
        setParsedData(null);
      }
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
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
        'X-Type': type,
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
      setParsedData(data.data);
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  }, [recording, type]);

  const handleFieldChange = useCallback((field: keyof ParsedData, value: string) => {
    setParsedData((prev) => (prev ? { ...prev, [field]: value } : null));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!parsedData || !user || creating) return;
    setCreating(true);

    try {
      if (type === 'healthAppointment') {
        await addHealthAppointment(familyId || '', {
          title: parsedData.title,
          person: parsedData.person || '',
          doctor: parsedData.doctor,
          dateFrom: parsedData.dateFrom,
          dateTo: parsedData.dateTo,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          location: parsedData.location,
          note: '',
          reminder: parsedData.reminder,
          addToCalendar: true,
          status: 'planned',
        }, user.uid);
      } else if (type === 'vetVisit') {
        await addVetVisit({
          petId: '',
          familyId: familyId || '',
          title: parsedData.title,
          doctor: parsedData.doctor,
          dateFrom: parsedData.dateFrom,
          dateTo: parsedData.dateTo,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          location: parsedData.location,
          note: '',
          reminder: parsedData.reminder,
          addToCalendar: true,
          status: 'planned',
        }, user.uid);
      } else if (type === 'schoolActivity') {
        await addSchoolActivity({
          familyId: familyId || '',
          childId: '',
          yearId: '',
          title: parsedData.title,
          activityType: parsedData.activityType || 'aktivitet',
          dateFrom: parsedData.dateFrom,
          dateTo: parsedData.dateTo,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          location: parsedData.location,
          note: '',
          reminder: parsedData.reminder,
          createdBy: user.uid,
        });
      } else if (type === 'kindergartenActivity') {
        await addKindergartenActivity({
          familyId: familyId || '',
          childId: '',
          yearId: '',
          title: parsedData.title,
          activityType: parsedData.activityType || 'aktivitet',
          dateFrom: parsedData.dateFrom,
          dateTo: parsedData.dateTo,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          location: parsedData.location,
          note: '',
          reminder: parsedData.reminder,
          createdBy: user.uid,
        });
      }

      crossAlert(t('common.success'), `"${parsedData.title}" ${t('common.saved')}!`);
      navigation.goBack();
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
      setCreating(false);
    }
  }, [parsedData, user, navigation, creating, type, familyId]);

  const handleReset = useCallback(() => {
    setTranscript(null);
    setParsedData(null);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: accentColor }]}>
          <Text style={{ color: accentColor, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('voiceActivity.title')}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={[styles.helperSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('voice.instruction')}
        </Text>
        <Text style={[styles.helperExample, { color: colors.textDisabled }]}>
          {t('voice.activityExample', { type: ACTIVITY_LABELS[type] })}
        </Text>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.content}>
        {!parsedData && !processing && (
          <View style={styles.micContainer}>
            <TouchableOpacity
              style={[
                styles.micButton,
                { backgroundColor: recording ? colors.danger : accentColor },
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
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={[styles.processingText, { color: colors.textSecondary }]}>
              {t('voice.processing')}
            </Text>
            {transcript && (
              <Text style={[styles.transcriptPreview, { color: colors.text }]}>
                &quot;{transcript}&quot;
              </Text>
            )}
          </View>
        )}

        {parsedData && !processing && (
          <View style={styles.resultContainer}>
            <Text style={[styles.resultTitle, { color: colors.text }]}>{t('voice.suggestion')}</Text>

            {transcript && (
              <View style={[styles.transcriptCard, { backgroundColor: colors.inputBackground }]}>
                <Text style={[styles.transcriptLabel, { color: colors.textSecondary }]}>{t('voice.youSaid')}</Text>
                <Text style={[styles.transcriptText, { color: colors.text }]}>&quot;{transcript}&quot;</Text>
              </View>
            )}

            <View style={[styles.formCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.formCardLabel, { color: accentColor }]}>{t('voice.editBeforeSave')}</Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.title')}</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                value={parsedData.title}
                onChangeText={(v) => handleFieldChange('title', v)}
                placeholder={t('common.title')}
                placeholderTextColor={colors.textDisabled}
              />

              {showPerson && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('health.person')}</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                    value={parsedData.person || ''}
                    onChangeText={(v) => handleFieldChange('person', v)}
                    placeholder={t('health.person')}
                    placeholderTextColor={colors.textDisabled}
                  />
                </>
              )}

              {showDoctor && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{type === 'vetVisit' ? t('pet.veterinarian') : t('health.doctor')}</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                    value={parsedData.doctor || ''}
                    onChangeText={(v) => handleFieldChange('doctor', v)}
                    placeholder={type === 'vetVisit' ? t('pet.veterinarian') : t('health.doctor')}
                    placeholderTextColor={colors.textDisabled}
                  />
                </>
              )}

              {showActivityType && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.activityType')}</Text>
                  <View style={styles.activityTypeRow}>
                    {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.activityTypeButton,
                          {
                            backgroundColor: parsedData.activityType === opt.value ? accentColor : colors.inputBackground,
                            borderColor: parsedData.activityType === opt.value ? accentColor : colors.border,
                          },
                        ]}
                        onPress={() => handleFieldChange('activityType', opt.value)}
                      >
                        <Text style={[
                          styles.activityTypeButtonText,
                          { color: parsedData.activityType === opt.value ? '#fff' : colors.text },
                        ]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.dateFrom')}</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                value={parsedData.dateFrom}
                onChangeText={(v) => handleFieldChange('dateFrom', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.dateTo')}</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                value={parsedData.dateTo || ''}
                onChangeText={(v) => handleFieldChange('dateTo', v)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.startTime')}</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                value={parsedData.startTime}
                onChangeText={(v) => handleFieldChange('startTime', v)}
                placeholder="HH:MM"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.endTime')}</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                value={parsedData.endTime || ''}
                onChangeText={(v) => handleFieldChange('endTime', v)}
                placeholder="HH:MM"
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.location')}</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                value={parsedData.location || ''}
                onChangeText={(v) => handleFieldChange('location', v)}
                placeholder={t('common.location')}
                placeholderTextColor={colors.textDisabled}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.reminder')}</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                value={parsedData.reminder || ''}
                onChangeText={(v) => handleFieldChange('reminder', v)}
                placeholder={t('common.reminder')}
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: accentColor, opacity: creating ? 0.6 : 1 }]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Text style={styles.primaryButtonText}>{creating ? t('common.creating') : t('common.save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.textButton]}
                onPress={handleReset}
              >
                <Text style={[styles.textButtonText, { color: accentColor }]}>{t('voice.tryAgain')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  helperSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  helperExample: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
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
  formCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  activityTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  activityTypeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  activityTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  textButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  textButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
