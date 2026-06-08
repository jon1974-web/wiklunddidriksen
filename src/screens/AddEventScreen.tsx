import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { DatePickerModal } from '../components/DatePickerModal';
import { db } from '../services/firebase';
import { useUserStore } from '../store/userStore';
import { useTheme } from '../theme/ThemeContext';
import { scheduleEventReminder } from '../services/notificationService';
import { getUserProfile } from '../services/familyService';
import { syncEventToCalendar } from '../services/calendarService';
import { REMINDER_OPTIONS, END_DATE_OPTIONS, END_TIME_OPTIONS, TIME_OPTIONS } from '../constants/eventOptions';
import { LOCALE, DATE_PICKER_RANGE_DAYS } from '../constants/limits';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { getTodayLocal } from '../utils/dateUtils';
import { EVENT_ICONS } from '../constants/eventIcons';

interface AddEventScreenProps {
  navigation: any;
  route?: any;
}

export const AddEventScreen: React.FC<AddEventScreenProps> = ({ navigation, route }) => {
  const prefill = route?.params?.prefill;
  const [title, setTitle] = useState(prefill?.title || '');
  const [description, setDescription] = useState(prefill?.description || '');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(prefill?.date || getTodayLocal());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [endDateDays, setEndDateDays] = useState<number | null>(null);
  const [customEndDate, setCustomEndDate] = useState(prefill?.endDate || '');
  const [showEndDate, setShowEndDate] = useState(!!prefill?.endDate);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [time, setTime] = useState(prefill?.time || '12:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [endTime, setEndTime] = useState('');
  const [showEndTime, setShowEndTime] = useState(!!prefill?.endTime);
  const [customEndTime, setCustomEndTime] = useState(prefill?.endTime || '');
  const [showCustomEndTimePicker, setShowCustomEndTimePicker] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(prefill?.reminderMinutes || 120);
  const [icon, setIcon] = useState(prefill?.icon || '');
  const user = useUserStore((state) => state.user);
  const { colors } = useTheme();

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Vennligst skriv en tittel');
      return;
    }

    try {
      const eventData: any = {
        title: sanitizeInput(title),
        description: description.trim() ? sanitizeInput(description) : null,
        address: address.trim() ? sanitizeInput(address, 200) : null,
        date,
        time,
        reminderMinutes,
        createdBy: user?.uid,
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
      }

      const docRef = await addDoc(collection(db, 'events'), eventData);

      const [hours, mins] = time.split(':').map(Number);
      const eventDate = new Date(date);
      eventDate.setHours(hours, mins, 0, 0);

      const notificationId = await scheduleEventReminder(
        sanitizeInput(title),
        description.trim() ? sanitizeInput(description) : `Arrangement starter om ${reminderMinutes} minutter`,
        eventDate,
        reminderMinutes
      );

      if (notificationId) {
        await updateDoc(doc(db, 'events', docRef.id), { notificationId });
      }

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

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    }
  }, [title, description, address, date, time, reminderMinutes, user, showEndDate, customEndDate, endDateDays, showEndTime, endTime, customEndTime, icon, navigation]);

  const handleDateConfirm = () => {
    setDate(tempDate.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  const handleEndDateConfirm = () => {
    setCustomEndDate(tempEndDate.toISOString().split('T')[0]);
    setShowEndDatePicker(false);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Nytt arrangement</Text>

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
        <Text style={[styles.label, { color: colors.text }]}>Tittel</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={title}
          onChangeText={setTitle}
          placeholder="F.eks. Familiemiddag"
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Beskrivelse</Text>
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
        <Text style={[styles.label, { color: colors.text }]}>Adresse</Text>
        <GooglePlacesInput
          value={address}
          onChangeText={setAddress}
          placeholder="Søk etter adresse..."
          onSelect={setAddress}
        />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Start dato</Text>
        <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => { setTempDate(new Date(date)); setShowDatePicker(true); }}>
          <Text style={[styles.dateText, { color: colors.text }]}>{date}</Text>
        </TouchableOpacity>
      </View>

      {!showEndDate ? (
        <TouchableOpacity onPress={() => setShowEndDate(true)}>
          <Text style={[styles.addLink, { color: colors.accent }]}>+ Legg til sluttdato</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Varighet</Text>
          <View style={styles.reminderOptions}>
            {END_DATE_OPTIONS.map((option) => (
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
              onPress={() => { setTempEndDate(new Date(date)); setShowEndDatePicker(true); }}
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
            <Text style={[styles.removeLink, { color: colors.danger }]}>Fjern sluttdato</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Starttid</Text>
        <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setShowTimePicker(true)}>
          <Text style={[styles.dateText, { color: colors.text }]}>{time}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showTimePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg tid</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {TIME_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.dateOption, { borderBottomColor: colors.border }, time === option.value && { backgroundColor: colors.accent }]}
                      onPress={() => { setTime(option.value); setShowTimePicker(false); }}
                    >
                      <Text style={[styles.dateOptionText, { color: time === option.value ? '#fff' : colors.text }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {!showEndTime ? (
        <TouchableOpacity onPress={() => setShowEndTime(true)}>
          <Text style={[styles.addLink, { color: colors.accent }]}>+ Legg til sluttid</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Varighet</Text>
          <View style={styles.reminderOptions}>
            {END_TIME_OPTIONS.map((option) => (
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
            onPress={() => { setShowCustomEndTimePicker(true); setEndTime(''); }}
          >
            <Text style={[styles.reminderText, { color: customEndTime && !endTime ? '#fff' : colors.textSecondary }]}>
              {customEndTime || 'Velg tidspunkt'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowEndTime(false); setEndTime(''); setCustomEndTime(''); }}>
            <Text style={[styles.removeLink, { color: colors.danger }]}>Fjern sluttid</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Påminnelse</Text>
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

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleSave}>
        <Text style={styles.buttonText}>Lagre</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={() => navigation.goBack()}>
        <Text style={[styles.buttonText, { color: colors.text }]}>Avbryt</Text>
      </TouchableOpacity>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg dato</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {Array.from({ length: 365 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = d.toISOString().split('T')[0];
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateOption, { borderBottomColor: colors.border }, date === dateStr && { backgroundColor: colors.accent }]}
                        onPress={() => { setDate(dateStr); setShowDatePicker(false); }}
                      >
                        <Text style={[styles.dateOptionText, { color: date === dateStr ? '#fff' : colors.text }]}>
                          {d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={showEndDatePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowEndDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg sluttdato</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {Array.from({ length: 365 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i);
                    const dateStr = d.toISOString().split('T')[0];
                    return (
                      <TouchableOpacity
                        key={dateStr}
                        style={[styles.dateOption, { borderBottomColor: colors.border }, customEndDate === dateStr && { backgroundColor: colors.accent }]}
                        onPress={() => { setCustomEndDate(dateStr); setShowEndDatePicker(false); }}
                      >
                        <Text style={[styles.dateOptionText, { color: customEndDate === dateStr ? '#fff' : colors.text }]}>
                          {d.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowEndDatePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={showCustomEndTimePicker} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowCustomEndTimePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.datePickerTitle, { color: colors.text, borderBottomColor: colors.border }]}>Velg sluttid</Text>
                <ScrollView style={styles.datePickerScroll}>
                  {TIME_OPTIONS.map((option) => {
                    const [startHour, startMin] = time.split(':').map(Number);
                    const [endHour, endMin] = option.value.split(':').map(Number);
                    const startMins = startHour * 60 + startMin;
                    const endMins = endHour * 60 + endMin;
                    const isAfter = endMins > startMins;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.dateOption, { borderBottomColor: colors.border }, customEndTime === option.value && { backgroundColor: colors.accent }]}
                        onPress={() => { setCustomEndTime(option.value); setShowCustomEndTimePicker(false); }}
                      >
                        <Text style={[styles.dateOptionText, { color: customEndTime === option.value ? '#fff' : colors.text }]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={[styles.datePickerClose, { borderTopColor: colors.border }]} onPress={() => setShowCustomEndTimePicker(false)}>
                  <Text style={[styles.datePickerCloseText, { color: colors.accent }]}>Lukk</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  datePickerScroll: {
    maxHeight: 400,
  },
  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  dateOptionText: {
    fontSize: 16,
  },
  datePickerClose: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  datePickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
