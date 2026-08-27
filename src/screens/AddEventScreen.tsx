import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { DatePickerModal } from '../components/DatePickerModal';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { getUserProfile, notifyNewEvent } from '../services/familyService';
import { syncEventToCalendar } from '../services/calendarService';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { getTodayLocal } from '../utils/dateUtils';
import { EVENT_ICONS } from '../constants/eventIcons';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';
import { DocumentUpload } from '../components/DocumentUpload';

interface AddEventScreenProps {
  navigation: any;
  route?: any;
}

const REMINDER_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 time', value: 60 },
  { label: '2 timer', value: 120 },
  { label: '1 dag', value: 1440 },
  { label: '1 uke', value: 10080 },
];

const addOneHour = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const AddEventScreen: React.FC<AddEventScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const prefill = route?.params?.prefill;
  const [title, setTitle] = useState(prefill?.title || '');
  const [address, setAddress] = useState(prefill?.address || '');
  const [dateFrom, setDateFrom] = useState(prefill?.date || getTodayLocal());
  const [dateTo, setDateTo] = useState(prefill?.endDate || prefill?.date || getTodayLocal());
  const [time, setTime] = useState(prefill?.time || '09:00');
  const [endTime, setEndTime] = useState(prefill?.endTime || addOneHour(prefill?.time || '09:00'));
  const [note, setNote] = useState(prefill?.description || '');
  const [reminderMinutes, setReminderMinutes] = useState(prefill?.reminderMinutes || 60);
  const [icon, setIcon] = useState(prefill?.icon || '');
  const [documents, setDocuments] = useState<{ url: string; fileName: string; type: 'image' | 'document' }[]>(prefill?.documents || []);
  const [saving, setSaving] = useState(false);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { colors } = useTheme();

  type AddPickerField = 'dateFrom' | 'dateTo' | 'time' | 'endTime' | null;
  const [activePicker, setActivePicker] = useState<AddPickerField>(null);

  const handlePickerSelect = (value: string) => {
    if (activePicker === 'dateFrom') {
      setDateFrom(value);
      if (!dateTo || dateTo === dateFrom) setDateTo(value);
    } else if (activePicker === 'dateTo') {
      setDateTo(value);
    } else if (activePicker === 'time') {
      setTime(value);
      setEndTime(addOneHour(value));
    } else if (activePicker === 'endTime') {
      setEndTime(value);
    }
    setActivePicker(null);
  };

  const isTimePicker = activePicker === 'time' || activePicker === 'endTime';

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!title.trim()) {
      crossAlert('Error', 'Vennligst skriv en tittel');
      return;
    }

    setSaving(true);
    try {
      const [hours, mins] = time.split(':').map(Number);
      const eventStartDate = new Date(dateFrom);
      eventStartDate.setHours(hours, mins, 0, 0);
      const reminderAt = new Date(eventStartDate.getTime() - reminderMinutes * 60 * 1000);

      const eventData: any = {
        title: sanitizeInput(title),
        description: note.trim() ? sanitizeInput(note) : null,
        address: address.trim() ? sanitizeInput(address, 200) : null,
        date: dateFrom,
        time,
        reminderMinutes,
        reminderAt: reminderAt.toISOString(),
        createdBy: user?.uid,
        familyId: familyId || null,
        createdAt: Date.now(),
        icon: icon || null,
        documents: documents.length > 0 ? documents : undefined,
      };

      // Set endDate and endTime
      eventData.endDate = dateTo;
      eventData.endTime = endTime;

      const docRef = await addDoc(collection(db, 'events'), eventData);

      if (user?.uid) {
        const profile = await getUserProfile(user.uid);
        if (profile?.calendarId) {
          const [eH, eM] = endTime.split(':').map(Number);
          const endDate = new Date(dateTo);
          endDate.setHours(eH, eM, 0, 0);
          const calEventId = await syncEventToCalendar(profile.calendarId, {
            title: sanitizeInput(title),
            description: note.trim() ? sanitizeInput(note) : undefined,
            address: address.trim() ? sanitizeInput(address, 200) : undefined,
            startDate: eventStartDate,
            endDate,
            reminderMinutes,
          });
          if (calEventId) {
            await updateDoc(doc(db, 'events', docRef.id), { calendarEventId: calEventId });
          }
        }
      }

      if (familyId && user) {
        notifyNewEvent(familyId, sanitizeInput(title), dateFrom, time, user.displayName || 'En i familien').catch(() => {});
      }

      navigation.goBack();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [title, address, dateFrom, dateTo, time, endTime, note, reminderMinutes, user, icon, documents, navigation, familyId]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Ny avtale</Text>

      {/* Icon section */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Ikon</Text>
        <View style={styles.iconGrid}>
          {EVENT_ICONS.map((item) => (
            <TouchableOpacity
              key={item.emoji}
              style={[styles.iconOption, { backgroundColor: colors.surface, borderColor: colors.border }, icon === item.emoji && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => setIcon(icon === item.emoji ? '' : item.emoji)}
            >
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
              <Text style={[styles.iconLabel, { color: icon === item.emoji ? '#fff' : colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Title */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.title')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={title}
          onChangeText={setTitle}
          placeholder="F.eks. Familiemiddag"
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      {/* Date from / Date to */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('kindergarten.holidayDateFrom')}</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('dateFrom')}>
            <Text style={[styles.dateText, { color: colors.text }]}>{dateFrom}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('kindergarten.holidayDateTo')}</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('dateTo')}>
            <Text style={[styles.dateText, { color: colors.text }]}>{dateTo}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time from / Time to */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('kindergarten.holidayTimeFrom')}</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('time')}>
            <Text style={[styles.dateText, { color: colors.text }]}>{time}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('kindergarten.holidayTimeTo')}</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('endTime')}>
            <Text style={[styles.dateText, { color: colors.text }]}>{endTime}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
        <GooglePlacesInput
          value={address}
          onChangeText={setAddress}
          placeholder="Søk etter adresse..."
          onSelect={setAddress}
        />
      </View>

      {/* Note */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, styles.textArea]}
          value={note}
          onChangeText={setNote}
          placeholder="Legg til en beskrivelse..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Reminders */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('events.reminder')}</Text>
        <View style={styles.reminderOptions}>
          {REMINDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, reminderMinutes === option.value && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => setReminderMinutes(option.value)}
            >
              <Text style={[styles.reminderText, { color: reminderMinutes === option.value ? '#fff' : colors.textSecondary }]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Documents */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('school.activityDocuments')}</Text>
        <DocumentUpload
          storagePath={`events/${familyId || 'general'}/${Date.now()}`}
          onUploaded={(doc) => setDocuments((prev) => [...prev, doc])}
          accentColor={colors.accent}
        />
        {documents.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {documents.map((doc, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{doc.type === 'image' ? '🖼️' : '📄'} {doc.fileName}</Text>
                <TouchableOpacity onPress={() => setDocuments((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Text style={{ color: colors.danger, fontSize: 12 }}>{t('common.delete')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Save & Cancel */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={() => navigation.goBack()}>
          <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, opacity: saving ? 0.5 : 1, flex: 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? '...' : t('common.save')}</Text>
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={activePicker !== null}
        title={activePicker === 'dateFrom' ? t('kindergarten.holidayDateFrom') : activePicker === 'dateTo' ? t('kindergarten.holidayDateTo') : activePicker === 'time' ? t('kindergarten.holidayTimeFrom') : t('kindergarten.holidayTimeTo')}
        mode={isTimePicker ? 'time' : 'date'}
        dateOffset={isTimePicker ? 0 : -365}
        dateCount={isTimePicker ? 48 : 730}
        selectedValue={activePicker === 'dateFrom' ? dateFrom : activePicker === 'dateTo' ? dateTo : activePicker === 'time' ? time : endTime}
        onSelect={handlePickerSelect}
        onClose={() => setActivePicker(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dateText: { fontSize: 16, color: '#333' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: { width: 60, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  iconEmoji: { fontSize: 22 },
  iconLabel: { fontSize: 9, marginTop: 2, fontWeight: '600' },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderOption: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  reminderText: { fontSize: 13, fontWeight: '600' },
});
