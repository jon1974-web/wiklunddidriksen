import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addHealthAppointment } from '../services/healthService';
import { addVetVisit } from '../services/petService';
import { addSchoolActivity } from '../services/schoolService';
import { addKindergartenActivity } from '../services/kindergartenService';
import { addHomeService } from '../services/homeService';
import { addTrip } from '../services/tripService';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { auth } from '../services/firebase';
import { getFamilyMembersWithRoles } from '../services/familyService';
import { REMINDER_OPTIONS } from '../constants/reminderOptions';
import { MODULE_COLORS } from '../constants/moduleColors';
import { DatePickerModal } from '../components/DatePickerModal';
import { GooglePlacesInput } from '../components/GooglePlacesInput';

type ActivityType = 'healthAppointment' | 'vetVisit' | 'schoolActivity' | 'kindergartenActivity' | 'homeService' | 'trip';

interface VoiceActivityScreenProps {
  navigation: any;
  route: { params: { type: ActivityType; moduleColor: string; petId?: string; childId?: string; yearId?: string; homeId?: string; home?: any } };
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
  note?: string;
  reminder: number;
  activityType?: 'tur' | 'aktivitet' | 'møte';
  frequency?: string;
}

const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/voiceToEvent';

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  healthAppointment: 'helseavtale',
  vetVisit: 'veterinærbesøk',
  schoolActivity: 'skoleaktivitet',
  kindergartenActivity: 'barnehageaktivitet',
  homeService: 'serviceavtale',
  trip: 'reise',
};

const ACTIVITY_EXAMPLE_KEYS: Record<ActivityType, string> = {
  healthAppointment: 'voiceActivity.voiceHealthExample',
  vetVisit: 'voiceActivity.voiceVetExample',
  schoolActivity: 'voiceActivity.voiceSchoolExample',
  kindergartenActivity: 'voiceActivity.voiceKindergartenExample',
  homeService: 'voiceActivity.voiceServiceExample',
  trip: 'voiceActivity.voiceTripExample',
};

const ACTIVITY_TITLE_KEYS: Record<ActivityType, string> = {
  healthAppointment: 'voiceActivity.voiceHealthTitle',
  vetVisit: 'voiceActivity.voiceVetTitle',
  schoolActivity: 'voiceActivity.voiceSchoolTitle',
  kindergartenActivity: 'voiceActivity.voiceKindergartenTitle',
  homeService: 'voiceActivity.voiceServiceTitle',
  trip: 'voiceActivity.voiceTripTitle',
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
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const [persons, setPersons] = useState<string[]>([]);

  useEffect(() => {
    if (!familyId) return;
    getFamilyMembersWithRoles(familyId).then((members) => {
      setPersons(members.map(m => m.profile.displayName?.split(' ')[0] || 'Medlem'));
    }).catch(() => {});
  }, [familyId]);

  // Fuzzy match spoken name to closest family member
  const findClosestMatch = useCallback((spokenName: string, names: string[]): string[] => {
    if (!spokenName || names.length === 0) return [];
    const lower = spokenName.toLowerCase();
    const matches = names.filter(n => n.toLowerCase().includes(lower) || lower.includes(n.toLowerCase()));
    if (matches.length > 0) return matches;
    return names.filter(n => {
      const nameLower = n.toLowerCase();
      let i = 0;
      for (const char of lower) {
        const idx = nameLower.indexOf(char, i);
        if (idx === -1) return false;
        i = idx + 1;
      }
      return true;
    });
  }, []);

  const showPerson = type === 'healthAppointment' || type === 'vetVisit' || type === 'homeService';
  const showActivityType = type === 'schoolActivity' || type === 'kindergartenActivity';
  const showDoctor = type === 'healthAppointment' || type === 'vetVisit';
  const isHomeService = type === 'homeService';

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
      // Auto-match person to family members if available
      if (type === 'healthAppointment' && data.data.person && persons.length > 0) {
        const matches = findClosestMatch(data.data.person, persons);
        if (matches.length > 0) {
          data.data.person = matches.join(', ');
        }
      }
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

  const handlePickerSelect = useCallback((value: string) => {
    if (!activePicker || !parsedData) return;
    handleFieldChange(activePicker as keyof ParsedData, value);
    setActivePicker(null);
  }, [activePicker, parsedData, handleFieldChange]);

  const isTimePicker = activePicker?.includes('time') || activePicker === 'endTime';
  const getPickerTitle = () => {
    if (activePicker === 'dateFrom') return t('common.startDate');
    if (activePicker === 'dateTo') return t('common.endDate');
    if (activePicker === 'startTime') return t('common.startTime');
    if (activePicker === 'endTime') return t('common.endTime');
    return '';
  };
  const getPickerValue = () => {
    if (!parsedData || !activePicker) return '';
    if (activePicker === 'dateFrom') return parsedData.dateFrom;
    if (activePicker === 'dateTo') return parsedData.dateTo || '';
    if (activePicker === 'startTime') return parsedData.startTime;
    if (activePicker === 'endTime') return parsedData.endTime || '';
    return '';
  };

  const FREQUENCY_OPTIONS = [
    { value: 'once', label: t('home.oneTime') },
    { value: 'monthly', label: t('home.monthly') },
    { value: 'quarterly', label: t('home.quarterly') },
    { value: 'yearly', label: t('home.yearly') },
  ];

  const handleCreate = useCallback(async () => {
    if (!parsedData || !user || creating) return;
    if (showPerson && (!parsedData.person || parsedData.person.trim() === '')) {
      crossAlert(t('common.error'), t('health.personRequired'));
      return;
    }
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
          note: parsedData.note || '',
          reminder: parsedData.reminder,
          addToCalendar: true,
          status: 'planned',
        }, user.uid);
      } else if (type === 'vetVisit') {
        await addVetVisit({
          petId: route.params?.petId || '',
          familyId: familyId || '',
          title: parsedData.title,
          doctor: parsedData.doctor,
          dateFrom: parsedData.dateFrom,
          dateTo: parsedData.dateTo,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          location: parsedData.location,
          note: parsedData.note || '',
          reminder: parsedData.reminder,
          addToCalendar: true,
          status: 'planned',
        }, user.uid);
      } else if (type === 'schoolActivity') {
        await addSchoolActivity({
          familyId: familyId || '',
          childId: route.params?.childId || '',
          yearId: route.params?.yearId || '',
          title: parsedData.title,
          activityType: parsedData.activityType || 'aktivitet',
          dateFrom: parsedData.dateFrom,
          dateTo: parsedData.dateTo,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          location: parsedData.location,
          note: parsedData.note || '',
          reminder: parsedData.reminder,
          createdBy: user.uid,
        });
      } else if (type === 'kindergartenActivity') {
        await addKindergartenActivity({
          familyId: familyId || '',
          childId: route.params?.childId || '',
          yearId: route.params?.yearId || '',
          title: parsedData.title,
          activityType: parsedData.activityType || 'aktivitet',
          dateFrom: parsedData.dateFrom,
          dateTo: parsedData.dateTo,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          location: parsedData.location,
          note: parsedData.note || '',
          reminder: parsedData.reminder,
          createdBy: user.uid,
        });
      } else if (type === 'homeService') {
        await addHomeService({
          homeId: route.params?.homeId || '',
          title: parsedData.title,
          description: parsedData.note || '',
          dateFrom: parsedData.dateFrom,
          startTime: parsedData.startTime,
          reminder: parsedData.reminder,
          frequency: parsedData.frequency || 'once',
          status: 'planned',
          familyId: familyId || '',
        });
      } else if (type === 'trip') {
        await addTrip({
          title: parsedData.title,
          city: parsedData.location || '',
          country: '',
          startDate: parsedData.dateFrom,
          endDate: parsedData.dateTo || parsedData.dateFrom,
          startTime: parsedData.startTime,
          endTime: parsedData.endTime,
          familyId: familyId || '',
          createdBy: user.uid,
        }, familyId || '');
      }

      crossAlert(t('common.success'), `"${parsedData.title}" ${t('common.saved')}!`);

      if (type === 'homeService' && route.params?.home) {
        navigation.navigate('HomeMaintenance', { home: route.params.home });
      } else if (route.params?.returnTo) {
        // Navigate back to the source screen (e.g., SchoolActivities)
        navigation.navigate(route.params.returnTo, { child: route.params.child, selectedYear: route.params.selectedYear });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      crossAlert(t('common.error'), getErrorMessage(error));
      setCreating(false);
    }
  }, [parsedData, user, navigation, creating, type, familyId, route.params]);

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t(ACTIVITY_TITLE_KEYS[type])}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={[styles.helperSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('voice.instruction')}
        </Text>
        <Text style={[styles.helperExample, { color: colors.textDisabled }]}>
          {t(ACTIVITY_EXAMPLE_KEYS[type])}
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
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('health.personLabel')}</Text>
                  <View style={styles.personRow}>
                    {persons.map(p => {
                      const selectedPersons = (parsedData.person || '').split(',').map(s => s.trim()).filter(Boolean);
                      const isSelected = selectedPersons.includes(p);
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.personChip, { backgroundColor: isSelected ? MODULE_COLORS.health : colors.inputBackground }]}
                          onPress={() => {
                            const current = (parsedData.person || '').split(',').map(s => s.trim()).filter(Boolean);
                            const updated = isSelected ? current.filter(x => x !== p) : [...current, p];
                            handleFieldChange('person', updated.join(', '));
                          }}
                        >
                          <Text style={{ color: isSelected ? '#fff' : colors.text, fontSize: 13 }}>{p}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.dateFrom')}</Text>
                  <TouchableOpacity
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => setActivePicker('dateFrom')}
                  >
                    <Text style={[styles.dateText, { color: parsedData.dateFrom ? colors.text : colors.textDisabled }]}>{parsedData.dateFrom || t('common.pickDate')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.dateTo')}</Text>
                  <TouchableOpacity
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => setActivePicker('dateTo')}
                  >
                    <Text style={[styles.dateText, { color: parsedData.dateTo ? colors.text : colors.textDisabled }]}>{parsedData.dateTo || t('common.pickDate')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.startTime')}</Text>
                  <TouchableOpacity
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => setActivePicker('startTime')}
                  >
                    <Text style={[styles.dateText, { color: parsedData.startTime ? colors.text : colors.textDisabled }]}>{parsedData.startTime || t('common.pickTime')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.endTime')}</Text>
                  <TouchableOpacity
                    style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                    onPress={() => setActivePicker('endTime')}
                  >
                    <Text style={[styles.dateText, { color: parsedData.endTime ? colors.text : colors.textDisabled }]}>{parsedData.endTime || t('common.pickTime')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

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

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.location')}</Text>
              <GooglePlacesInput
                placeholder={t('common.location')}
                value={parsedData.location || ''}
                onChangeText={(v: string) => handleFieldChange('location', v)}
              />

              {type === 'homeService' ? (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.description')}</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                    value={parsedData.note || ''}
                    onChangeText={(v) => handleFieldChange('note', v)}
                    placeholder={t('common.description')}
                    placeholderTextColor={colors.textDisabled}
                    multiline
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.note')}</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.inputBackground }]}
                    value={parsedData.note || ''}
                    onChangeText={(v) => handleFieldChange('note', v)}
                    placeholder={t('common.note')}
                    placeholderTextColor={colors.textDisabled}
                    multiline
                  />
                </>
              )}

              {type === 'homeService' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('home.frequency')}</Text>
                  <View style={styles.personRow}>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.personChip, { backgroundColor: parsedData.frequency === opt.value ? accentColor : colors.inputBackground }]}
                        onPress={() => handleFieldChange('frequency', opt.value)}
                      >
                        <Text style={{ color: parsedData.frequency === opt.value ? '#fff' : colors.text, fontSize: 13 }}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('common.reminder')}</Text>
              <View style={styles.personRow}>
                {REMINDER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.personChip, { backgroundColor: parsedData.reminder === option.value ? accentColor : colors.inputBackground }]}
                    onPress={() => handleFieldChange('reminder', String(option.value))}
                  >
                    <Text style={{ color: parsedData.reminder === option.value ? '#fff' : colors.text, fontSize: 13 }}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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

      <DatePickerModal
        visible={activePicker !== null}
        title={getPickerTitle()}
        mode={isTimePicker ? 'time' : 'date'}
        dateOffset={isTimePicker ? 0 : -365}
        dateCount={isTimePicker ? 48 : 730}
        selectedValue={getPickerValue()}
        onSelect={handlePickerSelect}
        onClose={() => setActivePicker(null)}
      />
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
  personRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  personChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  dateText: {
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
