import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { scheduleEventReminder } from '../services/notificationService';
import { getUserProfile, notifyNewEvent } from '../services/familyService';
import { syncEventToCalendar } from '../services/calendarService';
import { getReminderOptions } from '../constants/eventOptions';
import { EVENT_ICONS } from '../constants/eventIcons';
import { getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { DatePickerModal } from '../components/DatePickerModal';
import { ActionModal } from '../components/ActionModal';
import { sanitizeInput } from '../utils/validation';
import { IMAGE_QUALITY } from '../constants/limits';

interface PhotoEventScreenProps {
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

interface EditableEvent extends ParsedEvent {
  icon: string;
  address: string;
  showEndDate: boolean;
  showEndTime: boolean;
  checked: boolean;
}

const CLOUD_FUNCTION_URL = 'https://us-central1-familiesenter-837bb.cloudfunctions.net/photoToData';

export const PhotoEventScreen: React.FC<PhotoEventScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [events, setEvents] = useState<EditableEvent[]>([]);
  const [creating, setCreating] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [activePicker, setActivePicker] = useState<{ eventIndex: number; field: 'date' | 'time' | 'endDate' | 'endTime' } | null>(null);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; subtitle: string }>({ visible: false, title: '', subtitle: '' });

  const toEditableEvent = (e: ParsedEvent): EditableEvent => ({
    ...e,
    icon: '',
    address: '',
    showEndDate: !!e.endDate,
    showEndTime: !!e.endTime,
    checked: true,
  });

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      sendToCloud(result.assets[0].base64 || null);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      crossAlert('Tilgang', 'Kameratilgang er nødvendig for å ta bilder.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: IMAGE_QUALITY,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      sendToCloud(result.assets[0].base64 || null);
    }
  }, []);

  const sendToCloud = useCallback(async (base64: string | null) => {
    if (!base64) {
      crossAlert('Error', t('photoEvent.error'));
      return;
    }

    setProcessing(true);
    setEvents([]);
    setExpandedIndex(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const currentUser = auth.currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const apiResponse = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageBase64: base64, type: 'event' }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Server error');
      }

      const data = await apiResponse.json();
      const parsed: ParsedEvent[] = data.events || [];

      if (parsed.length === 0) {
        crossAlert(t('photoEvent.title'), t('photoEvent.noEvents'));
        setImageUri(null);
        return;
      }

      const editable = parsed.map(toEditableEvent);
      setEvents(editable);
      setExpandedIndex(editable.length === 1 ? 0 : null);
    } catch (error: any) {
      const msg = error?.name === 'AbortError'
        ? 'Tidsavbrudd. Bildet kan være for stort eller nettverket er tregt.'
        : error?.message?.includes('Failed to fetch')
        ? 'Kunne ikke koble til serveren. Cloud Function kan mangle.'
        : getErrorMessage(error);
      crossAlert('Error', msg);
    } finally {
      setProcessing(false);
    }
  }, [t]);

  const handleCreateEvent = useCallback(async (event: EditableEvent, showSuccess = false) => {
    if (!user || creating) return;
    setCreating(true);

    try {
      const eventStartDate = new Date(`${event.date}T${event.time}`);
      const reminderAt = new Date(eventStartDate.getTime() - event.reminderMinutes * 60 * 1000);

      const eventData: any = {
        title: sanitizeInput(event.title),
        description: event.description ? sanitizeInput(event.description) : null,
        address: event.address ? sanitizeInput(event.address, 200) : null,
        date: event.date,
        time: event.time,
        reminderMinutes: event.reminderMinutes,
        reminderAt: reminderAt.toISOString(),
        createdBy: user.uid,
        familyId: familyId || null,
        createdAt: Date.now(),
        icon: event.icon || null,
      };

      if (event.showEndDate && event.endDate) {
        eventData.endDate = event.endDate;
      }

      if (event.showEndTime && event.endTime) {
        eventData.endTime = event.endTime;
      }

      const docRef = await addDoc(collection(db, 'events'), eventData);

      try {
        const notifId = await scheduleEventReminder(
          eventData.title,
          eventData.description || 'Arrangement starter snart',
          eventStartDate,
          eventData.reminderMinutes
        );
        if (notifId) {
          const { updateDoc, doc: docFn } = await import('firebase/firestore');
          await updateDoc(docFn(db, 'events', docRef.id), { notificationId: notifId });
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
            endDate: eventData.endDate,
            endTime: eventData.endTime,
            calendarId: profile.calendarId,
          });
          if (calEventId) {
            const { updateDoc, doc: docFn } = await import('firebase/firestore');
            await updateDoc(docFn(db, 'events', docRef.id), { calendarEventId: calEventId });
          }
        }
      } catch {}

      if (familyId && user) {
        notifyNewEvent(familyId, eventData.title, eventData.date, eventData.time, user.displayName || 'En i familien').catch(() => {});
      }

      if (showSuccess) {
        setSuccessModal({
          visible: true,
          title: t('common.success'),
          subtitle: `"${eventData.title}" ${t('events.addEvent')}!`,
        });
      }
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  }, [user, familyId, creating, t]);

  const handleCreateSelected = useCallback(async () => {
    const selected = events.filter(e => e.checked);
    if (selected.length === 0) return;

    for (const event of selected) {
      await handleCreateEvent(event);
    }

    setSuccessModal({
      visible: true,
      title: t('common.success'),
      subtitle: `${selected.length} ${selected.length === 1 ? t('photoEvent.singleEvent') : t('photoEvent.eventsFound')}!`,
    });
  }, [events, handleCreateEvent, t]);

  const handleEditManually = useCallback((event: EditableEvent) => {
    navigation.navigate('AddEvent', {
      prefill: {
        title: event.title,
        description: event.description,
        date: event.date,
        endDate: event.endDate,
        time: event.time,
        endTime: event.endTime,
        reminderMinutes: event.reminderMinutes,
      },
    });
  }, [navigation]);

  const handleReset = useCallback(() => {
    setImageUri(null);
    setEvents([]);
    setExpandedIndex(null);
  }, []);

  const updateEvent = useCallback((index: number, updates: Partial<EditableEvent>) => {
    setEvents(prev => prev.map((e, i) => i === index ? { ...e, ...updates } : e));
  }, []);

  const toggleAllEvents = useCallback(() => {
    const allChecked = events.every(e => e.checked);
    setEvents(prev => prev.map(e => ({ ...e, checked: !allChecked })));
  }, [events]);

  const getPickerTitle = () => {
    if (!activePicker) return '';
    const titles: Record<string, string> = {
      date: t('common.pickDate'),
      time: t('common.pickTime'),
      endDate: t('common.pickEndDate'),
      endTime: t('common.pickEndTime'),
    };
    return titles[activePicker.field];
  };

  const getPickerValue = () => {
    if (!activePicker) return '';
    const event = events[activePicker.eventIndex];
    const values: Record<string, string> = {
      date: event.date,
      time: event.time,
      endDate: event.endDate || '',
      endTime: event.endTime || '',
    };
    return values[activePicker.field];
  };

  const handlePickerSelect = (value: string) => {
    if (!activePicker) return;
    const { eventIndex, field } = activePicker;
    const event = events[eventIndex];
    if (field === 'date') updateEvent(eventIndex, { date: value });
    else if (field === 'time') updateEvent(eventIndex, { time: value });
    else if (field === 'endDate') updateEvent(eventIndex, { endDate: value });
    else if (field === 'endTime') updateEvent(eventIndex, { endTime: value });
    setActivePicker(null);
  };

  const isTimePicker = activePicker?.field === 'time' || activePicker?.field === 'endTime';

  const renderExpandedCard = (event: EditableEvent, index: number) => (
    <View key={`expanded-${index}`} style={[styles.expandedCard, { backgroundColor: colors.surface }]}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Ikon</Text>
        <View style={styles.iconGrid}>
          {EVENT_ICONS.map((item) => (
            <TouchableOpacity
              key={item.emoji}
              style={[styles.iconOption, { backgroundColor: colors.inputBackground, borderColor: colors.border }, event.icon === item.emoji && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => updateEvent(index, { icon: event.icon === item.emoji ? '' : item.emoji })}
            >
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.title')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          value={event.title}
          onChangeText={(text) => updateEvent(index, { title: text })}
          placeholder="Tittel"
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }, styles.textArea]}
          value={event.description}
          onChangeText={(text) => updateEvent(index, { description: text })}
          placeholder="Beskrivelse..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
          value={event.address}
          onChangeText={(text) => updateEvent(index, { address: text })}
          placeholder="Adresse..."
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Start dato</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBackground }]}
          onPress={() => setActivePicker({ eventIndex: index, field: 'date' })}
        >
          <Text style={[styles.dateText, { color: colors.text }]}>{event.date}</Text>
        </TouchableOpacity>
      </View>

      {!event.showEndDate ? (
        <TouchableOpacity onPress={() => updateEvent(index, { showEndDate: true })}>
          <Text style={[styles.addLink, { color: colors.accent }]}>+ {t('events.addEndDate')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Sluttdato</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.inputBackground }]}
            onPress={() => setActivePicker({ eventIndex: index, field: 'endDate' })}
          >
            <Text style={[styles.dateText, { color: colors.text }]}>{event.endDate || 'Velg dato'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => updateEvent(index, { showEndDate: false, endDate: null })}>
            <Text style={[styles.removeLink, { color: colors.danger }]}>{t('events.removeEndDate')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Starttid</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: colors.inputBackground }]}
          onPress={() => setActivePicker({ eventIndex: index, field: 'time' })}
        >
          <Text style={[styles.dateText, { color: colors.text }]}>{event.time}</Text>
        </TouchableOpacity>
      </View>

      {!event.showEndTime ? (
        <TouchableOpacity onPress={() => updateEvent(index, { showEndTime: true })}>
          <Text style={[styles.addLink, { color: colors.accent }]}>+ {t('events.addEndTime')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Sluttid</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: colors.inputBackground }]}
            onPress={() => setActivePicker({ eventIndex: index, field: 'endTime' })}
          >
            <Text style={[styles.dateText, { color: colors.text }]}>{event.endTime || 'Velg tid'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => updateEvent(index, { showEndTime: false, endTime: null })}>
            <Text style={[styles.removeLink, { color: colors.danger }]}>{t('events.removeEndTime')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('events.reminder')}</Text>
        <View style={styles.reminderOptions}>
          {getReminderOptions().map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.reminderOption, { backgroundColor: colors.inputBackground, borderColor: colors.border }, event.reminderMinutes === option.value && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => updateEvent(index, { reminderMinutes: option.value })}
            >
              <Text style={[styles.reminderText, { color: event.reminderMinutes === option.value ? '#fff' : colors.textSecondary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.expandedActions}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: creating ? 0.6 : 1 }]}
          onPress={() => handleCreateEvent(event, true)}
          disabled={creating}
        >
          <Text style={styles.primaryButtonText}>{creating ? t('photoEvent.creating') : t('photoEvent.createEvent')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
          onPress={() => handleEditManually(event)}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{t('photoEvent.editManually')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSummaryCard = (event: EditableEvent, index: number) => (
    <View key={`summary-${index}`} style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.summaryHeader}
        onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
      >
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: colors.border }, event.checked && { backgroundColor: colors.accent, borderColor: colors.accent }]}
          onPress={() => updateEvent(index, { checked: !event.checked })}
        >
          {event.checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        <View style={styles.summaryInfo}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>{event.title || t('common.title')}</Text>
          <Text style={[styles.summaryDetail, { color: colors.textSecondary }]}>
            📅 {event.date}  🕐 {event.time}
          </Text>
        </View>
        <Text style={[styles.expandIcon, { color: colors.textSecondary }]}>
          {expandedIndex === index ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      {expandedIndex === index && renderExpandedCard(event, index)}
    </View>
  );

  const selectedCount = events.filter(e => e.checked).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>

      <View style={[styles.helperSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('photoEvent.instruction')}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {!imageUri && !processing && events.length === 0 && (
          <View style={styles.pickContainer}>
            <TouchableOpacity style={[styles.pickButton, { backgroundColor: colors.accent }]} onPress={takePhoto}>
              <Text style={styles.pickIcon}>📷</Text>
              <Text style={styles.pickButtonText}>{t('photoEvent.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickButton, { backgroundColor: colors.inputBackground, borderColor: colors.border, borderWidth: 1 }]} onPress={pickImage}>
              <Text style={styles.pickIcon}>🖼️</Text>
              <Text style={[styles.pickButtonText, { color: colors.text }]}>{t('photoEvent.pickImage')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.processingText, { color: colors.textSecondary }]}>
              {t('photoEvent.processing')}
            </Text>
          </View>
        )}

        {events.length > 0 && !processing && (
          <View style={styles.resultsContainer}>
            {events.length > 1 && (
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: colors.text }]}>
                  {events.length} {t('photoEvent.eventsFound')}
                </Text>
                <TouchableOpacity onPress={toggleAllEvents}>
                  <Text style={[styles.toggleAll, { color: colors.accent }]}>
                    {events.every(e => e.checked) ? t('photoEvent.deselectAll') : t('photoEvent.selectAll')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {events.map((event, index) => (
              events.length === 1
                ? <View key={index}>{renderExpandedCard(event, index)}</View>
                : renderSummaryCard(event, index)
            ))}

            {events.length > 1 && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: selectedCount === 0 || creating ? 0.5 : 1 }]}
                onPress={handleCreateSelected}
                disabled={selectedCount === 0 || creating}
              >
                <Text style={styles.primaryButtonText}>
                  {creating ? t('photoEvent.creating') : `${t('photoEvent.createSelected')} (${selectedCount})`}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={[styles.resetButtonText, { color: colors.accent }]}>{t('photoEvent.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <DatePickerModal
        visible={activePicker !== null}
        title={getPickerTitle()}
        mode={isTimePicker ? 'time' : 'date'}
        selectedValue={getPickerValue()}
        onSelect={handlePickerSelect}
        onClose={() => setActivePicker(null)}
      />

      <ActionModal
        visible={successModal.visible}
        title={successModal.title}
        subtitle={successModal.subtitle}
        onCancel={() => { setSuccessModal({ visible: false, title: '', subtitle: '' }); navigation.goBack(); }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  helperSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  subtitle: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pickContainer: {
    gap: 16,
    marginTop: 40,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  pickIcon: {
    fontSize: 28,
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 16,
  },
  processingText: {
    fontSize: 16,
  },
  resultsContainer: {
    gap: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
  },
  expandedCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 20,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: 16,
  },
  addLink: {
    fontSize: 14,
    marginBottom: 16,
    fontWeight: '600',
  },
  removeLink: {
    fontSize: 13,
    marginTop: 6,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  reminderText: {
    fontSize: 13,
  },
  expandedActions: {
    gap: 10,
    marginTop: 8,
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
  resetButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
