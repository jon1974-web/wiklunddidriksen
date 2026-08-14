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
import { getReminderOptions, getEndDateOptions, getEndTimeOptions } from '../constants/eventOptions';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { getTodayLocal } from '../utils/dateUtils';
import { EVENT_ICONS } from '../constants/eventIcons';
import { crossAlert } from '../utils/alert';
import { useTranslation } from 'react-i18next';

interface AddEventScreenProps {
  navigation: any;
  route?: any;
}

export const AddEventScreen: React.FC<AddEventScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const prefill = route?.params?.prefill;
  const [title, setTitle] = useState(prefill?.title || '');
  const [description, setDescription] = useState(prefill?.description || '');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(prefill?.date || getTodayLocal());
  const [endDateDays, setEndDateDays] = useState<number | null>(null);
  const [customEndDate, setCustomEndDate] = useState(prefill?.endDate || '');
  const [showEndDate, setShowEndDate] = useState(!!prefill?.endDate);
  const [time, setTime] = useState(prefill?.time || '12:00');
  const [endTime, setEndTime] = useState(prefill?.endTime ? String(Math.round((parseInt(prefill.endTime.split(':')[0]) * 60 + parseInt(prefill.endTime.split(':')[1]) - (parseInt(prefill.time?.split(':')[0] || '12') * 60 + parseInt(prefill.time?.split(':')[1] || '0'))) / 15) * 15) : '60');
  const [showEndTime, setShowEndTime] = useState(true);
  const [customEndTime, setCustomEndTime] = useState(prefill?.endTime || '');
  const [reminderMinutes, setReminderMinutes] = useState(prefill?.reminderMinutes || 120);
  const [icon, setIcon] = useState(prefill?.icon || '');
  const [saving, setSaving] = useState(false);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { colors } = useTheme();

  type AddPickerField = 'date' | 'time' | 'endDate' | 'endTime' | null;
  const [activePicker, setActivePicker] = useState<AddPickerField>(null);

  const getPickerTitle = () => {
    const titles: Record<string, string> = { date: t('common.pickDate'), time: t('common.pickTime'), endDate: t('common.pickEndDate'), endTime: t('common.pickEndTime') };
    return activePicker ? titles[activePicker] : '';
  };

  const getPickerValue = () => {
    const values: Record<string, string> = { date, time, endDate: customEndDate, endTime: customEndTime };
    return activePicker ? values[activePicker] || '' : '';
  };

  const handlePickerSelect = (value: string) => {
    if (activePicker === 'date') setDate(value);
    else if (activePicker === 'time') setTime(value);
    else if (activePicker === 'endDate') setCustomEndDate(value);
    else if (activePicker === 'endTime') setCustomEndTime(value);
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
      const eventStartDate = new Date(date);
      eventStartDate.setHours(hours, mins, 0, 0);
      const reminderAt = new Date(eventStartDate.getTime() - reminderMinutes * 60 * 1000);

      const eventData: any = {
        title: sanitizeInput(title),
        description: description.trim() ? sanitizeInput(description) : null,
        address: address.trim() ? sanitizeInput(address, 200) : null,
        date,
        time,
        reminderMinutes,
        reminderAt: reminderAt.toISOString(),
        createdBy: user?.uid,
        familyId: familyId || null,
        createdAt: Date.now(),
        icon: icon || null,
      };

      if (showEndDate) {
        if (customEndDate) {
          eventData.endDate = customEndDate;
        } else if (endDateDays) {
          const start = new Date(date);
          start.setDate(start.getDate() + endDateDays);
          eventData.endDate = start.toISOString().split('T')[0];
        }
      }

      if (showEndTime) {
        if (endTime) {
          const [hours, mins] = time.split(':').map(Number);
          const addMins = parseInt(endTime);
          const totalMins = hours * 60 + mins + addMins;
          const endHour = Math.floor(totalMins / 60);
          const endMin = totalMins % 60;
          eventData.endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
        } else if (customEndTime) {
          eventData.endTime = customEndTime;
        }
      } else {
        // Always set a default endTime (1 hour after start)
        const [hours, mins] = time.split(':').map(Number);
        const totalMins = hours * 60 + mins + 60;
        const endHour = Math.floor(totalMins / 60);
        const endMin = totalMins % 60;
        eventData.endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      }

      const docRef = await addDoc(collection(db, 'events'), eventData);

      if (user?.uid) {
        const profile = await getUserProfile(user.uid);
        if (profile?.calendarId) {
          const [hours, mins] = time.split(':').map(Number);
          const startDate = new Date(date);
          startDate.setHours(hours, mins, 0, 0);
          let endDate: Date | undefined;
          if (eventData.endDate) {
            const endParsed = new Date(eventData.endDate);
            endParsed.setHours(hours, mins, 0, 0);
            endDate = endParsed;
          }
          if (eventData.endTime) {
            const [eH, eM] = eventData.endTime.split(':').map(Number);
            const endBase = endDate || new Date(startDate);
            endBase.setHours(eH, eM, 0, 0);
            endDate = endBase;
          }
          const calEventId = await syncEventToCalendar(profile.calendarId, {
            title: sanitizeInput(title),
            description: description.trim() ? sanitizeInput(description) : undefined,
            address: address.trim() ? sanitizeInput(address, 200) : undefined,
            startDate,
            endDate,
            reminderMinutes,
          });
          if (calEventId) {
            await updateDoc(doc(db, 'events', docRef.id), { calendarEventId: calEventId });
          }
        }
      }

      if (familyId && user) {
        notifyNewEvent(familyId, sanitizeInput(title), date, time, user.displayName || 'En i familien').catch(() => {});
      }

      navigation.goBack();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [title, description, address, date, time, reminderMinutes, user, showEndDate, customEndDate, endDateDays, showEndTime, endTime, customEndTime, icon, navigation, familyId]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('events.addEvent')}</Text>

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

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Legg til en beskrivelse..."
          placeholderTextColor={colors.textDisabled}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
        <GooglePlacesInput
          value={address}
          onChangeText={setAddress}
          placeholder="Søk etter adresse..."
          onSelect={setAddress}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Start dato</Text>
        <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('date')}>
          <Text style={[styles.dateText, { color: colors.text }]}>{date}</Text>
        </TouchableOpacity>
      </View>

      {!showEndDate ? (
        <TouchableOpacity onPress={() => setShowEndDate(true)}>
          <Text style={[styles.addLink, { color: colors.accent }]}>+ {t('events.addEndDate')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Varighet</Text>
          <View style={styles.reminderOptions}>
            {getEndDateOptions().map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, endDateDays === option.value && !customEndDate && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => { setEndDateDays(option.value); setCustomEndDate(''); }}
              >
                <Text style={[styles.reminderText, { color: endDateDays === option.value && !customEndDate ? '#fff' : colors.textSecondary }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, customEndDate && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => setActivePicker('endDate')}
            >
              <Text style={[styles.reminderText, { color: customEndDate ? '#fff' : colors.textSecondary }]}>
                Velg dato
              </Text>
            </TouchableOpacity>
          </View>
          {customEndDate && (
            <Text style={[styles.selectedDate, { color: colors.textSecondary }]}>Valgt: {customEndDate}</Text>
          )}
          <TouchableOpacity onPress={() => { setShowEndDate(false); setEndDateDays(null); setCustomEndDate(''); }}>
            <Text style={[styles.removeLink, { color: colors.danger }]}>{t('events.removeEndDate')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Starttid</Text>
        <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setActivePicker('time')}>
          <Text style={[styles.dateText, { color: colors.text }]}>{time}</Text>
        </TouchableOpacity>
      </View>

      {!showEndTime ? (
        <TouchableOpacity onPress={() => setShowEndTime(true)}>
          <Text style={[styles.addLink, { color: colors.accent }]}>+ {t('events.addEndTime')}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Varighet</Text>
          <View style={styles.reminderOptions}>
            {getEndTimeOptions().map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, endTime === String(option.value) && !customEndTime && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => { setEndTime(String(option.value)); setCustomEndTime(''); }}
              >
                <Text style={[styles.reminderText, { color: endTime === String(option.value) && !customEndTime ? '#fff' : colors.textSecondary }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity 
            style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, customEndTime && !endTime && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => { setActivePicker('endTime'); setEndTime(''); }}
          >
            <Text style={[styles.reminderText, { color: customEndTime && !endTime ? '#fff' : colors.textSecondary }]}>
              {customEndTime || t('pickers.pickTime')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowEndTime(false); setEndTime(''); setCustomEndTime(''); }}>
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

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent, opacity: saving ? 0.5 : 1 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>{saving ? '...' : t('common.save')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={() => navigation.goBack()}>
        <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
      </TouchableOpacity>

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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 72,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 24,
  },
  iconLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  input: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: 16,
  },
  addLink: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  removeLink: {
    fontSize: 14,
    marginTop: 8,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  reminderText: {
    fontSize: 14,
  },
  selectedDate: {
    marginTop: 8,
    fontSize: 14,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
