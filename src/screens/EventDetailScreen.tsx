import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, TouchableWithoutFeedback, Platform, Linking } from 'react-native';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { DatePickerModal } from '../components/DatePickerModal';
import { db } from '../services/firebase';
import { Event } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { scheduleEventReminder, cancelNotification } from '../services/notificationService';
import { getUserProfile } from '../services/familyService';
import { syncEventToCalendar, updateCalendarEvent, deleteCalendarEvent } from '../services/calendarService';
import { useUserStore } from '../store/userStore';
import { REMINDER_OPTIONS, END_DATE_OPTIONS, END_TIME_OPTIONS, TIME_OPTIONS } from '../constants/eventOptions';
import { LOCALE, DATE_PICKER_RANGE_DAYS } from '../constants/limits';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { EVENT_ICONS } from '../constants/eventIcons';

interface EventDetailScreenProps {
  navigation: any;
  route: any;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({ navigation, route }) => {
  const { event } = route.params as { event: Event };
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  
  const getInitialEndDateDays = () => {
    if (!event.endDate) return null;
    const start = new Date(event.date);
    const end = new Date(event.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 1 && diffDays <= 4) return diffDays;
    return null;
  };

  const getInitialEndTimeDuration = () => {
    if (!event.endTime) return '';
    const [startHour, startMin] = event.time.split(':').map(Number);
    const [endHour, endMin] = event.endTime.split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;
    const duration = endMins - startMins;
    if (duration > 0 && [30, 60, 90, 120].includes(duration)) {
      return String(duration);
    }
    return '';
  };

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [address, setAddress] = useState(event.address || '');
  const [date, setDate] = useState(event.date);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [endDateDays, setEndDateDays] = useState<number | null>(getInitialEndDateDays());
  const [customEndDate, setCustomEndDate] = useState(event.endDate && !getInitialEndDateDays() ? event.endDate : '');
  const [showEndDate, setShowEndDate] = useState(!!event.endDate);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [time, setTime] = useState(event.time);
  const [endTime, setEndTime] = useState(getInitialEndTimeDuration());
  const [showEndTime, setShowEndTime] = useState(!!event.endTime);
  const [customEndTime, setCustomEndTime] = useState(event.endTime && !getInitialEndTimeDuration() ? event.endTime : '');
  const [showCustomEndTimePicker, setShowCustomEndTimePicker] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(event.reminderMinutes);
  const [userCalendarEmail, setUserCalendarEmail] = useState<string | null>(null);
  const [userCalendarProvider, setUserCalendarProvider] = useState<'google' | 'outlook' | null>(null);
  const [icon, setIcon] = useState(event.icon || '');

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then((profile) => {
        if (profile?.calendarEmail && profile?.calendarProvider) {
          setUserCalendarEmail(profile.calendarEmail);
          setUserCalendarProvider(profile.calendarProvider);
        }
      });
    }
  }, [user?.uid]);

  const handleUpdate = useCallback(async () => {
    if (!title.trim()) {
      crossAlert('Error', 'Vennligst skriv en tittel');
      return;
    }

    try {
      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        date,
        time,
        reminderMinutes,
        icon: icon || null,
      };

      if (showEndDate) {
        if (customEndDate) {
          updateData.endDate = customEndDate;
        } else if (endDateDays) {
          const start = new Date(date);
          start.setDate(start.getDate() + endDateDays);
          updateData.endDate = start.toISOString().split('T')[0];
        } else {
          updateData.endDate = null;
        }
      } else {
        updateData.endDate = null;
      }

      if (showEndTime) {
        if (endTime) {
          const [hours, mins] = time.split(':').map(Number);
          const addMins = parseInt(endTime);
          const totalMins = hours * 60 + mins + addMins;
          const endHour = Math.floor(totalMins / 60);
          const endMin = totalMins % 60;
          updateData.endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
        } else if (customEndTime) {
          updateData.endTime = customEndTime;
        } else {
          updateData.endTime = null;
        }
      } else {
        updateData.endTime = null;
      }

      await updateDoc(doc(db, 'events', event.id), updateData);

      if (event.notificationId) {
        await cancelNotification(event.notificationId);
      }

      const [hours, mins] = time.split(':').map(Number);
      const eventDate = new Date(date);
      eventDate.setHours(hours, mins, 0, 0);

      const newNotificationId = await scheduleEventReminder(
        title.trim(),
        description.trim() || `Arrangement starter om ${reminderMinutes} minutter`,
        eventDate,
        reminderMinutes
      );

      if (newNotificationId) {
        await updateDoc(doc(db, 'events', event.id), { notificationId: newNotificationId });
      }

      if (user?.uid) {
        const profile = await getUserProfile(user.uid);
        if (profile?.calendarId) {
          const [hours, mins] = time.split(':').map(Number);
          const startDate = new Date(date);
          startDate.setHours(hours, mins, 0, 0);
          let endDate: Date | undefined;
          if (updateData.endDate) {
            const endParsed = new Date(updateData.endDate);
            endParsed.setHours(hours, mins, 0, 0);
            endDate = endParsed;
          }
          if (updateData.endTime) {
            const [eH, eM] = updateData.endTime.split(':').map(Number);
            const endBase = endDate || new Date(startDate);
            endBase.setHours(eH, eM, 0, 0);
            endDate = endBase;
          }
          const syncParams = {
            title: title.trim(),
            description: description.trim() || undefined,
            address: address.trim() || undefined,
            startDate,
            endDate,
            reminderMinutes,
          };
          if (event.calendarEventId) {
            await updateCalendarEvent(event.calendarEventId, syncParams);
          } else {
            const calEventId = await syncEventToCalendar(profile.calendarId, syncParams);
            if (calEventId) {
              await updateDoc(doc(db, 'events', event.id), { calendarEventId: calEventId });
            }
          }
        }
      }

      navigation.goBack();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [title, description, address, date, time, reminderMinutes, user, showEndDate, customEndDate, endDateDays, showEndTime, endTime, customEndTime, icon, event, navigation]);

  const handleDelete = useCallback(() => {
    crossAlert('Slett arrangement', 'Er du sikker på at du vil slette dette?', [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          try {
            if (event.notificationId) {
              await cancelNotification(event.notificationId);
            }
            if (event.calendarEventId) {
              await deleteCalendarEvent(event.calendarEventId);
            }
            await deleteDoc(doc(db, 'events', event.id));
            navigation.goBack();
          } catch (error) {
            crossAlert('Error', getErrorMessage(error));
          }
        },
      },
    ]);
  }, [event, navigation]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 8 }}>
        <Text style={{ color: colors.accent, fontSize: 20 }}>←</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.text }]}>Rediger arrangement</Text>

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
        <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setShowDatePicker(true)}>
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
              onPress={() => setShowEndDatePicker(true)}
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

      <TouchableOpacity style={[styles.updateButton, { backgroundColor: colors.accent }]} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Oppdater</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.surface, borderColor: colors.danger }]} onPress={handleDelete}>
        <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Slett</Text>
      </TouchableOpacity>

      {Platform.OS === 'web' && (
        <View style={{ marginTop: 16 }}>
          {userCalendarProvider && userCalendarEmail ? (
            <TouchableOpacity
              style={[styles.calendarWebButton, { backgroundColor: userCalendarProvider === 'google' ? '#4285F4' : '#0078D4' }]}
              onPress={() => {
                const [h, m] = time.split(':').map(Number);
                const start = new Date(date);
                start.setHours(h, m, 0, 0);

                let end: Date;
                if (event.endDate && event.endTime) {
                  const [eh, em] = event.endTime.split(':').map(Number);
                  end = new Date(event.endDate);
                  end.setHours(eh, em, 0, 0);
                } else if (event.endTime) {
                  const [eh, em] = event.endTime.split(':').map(Number);
                  end = new Date(date);
                  end.setHours(eh, em, 0, 0);
                } else if (event.endDate) {
                  end = new Date(event.endDate);
                  end.setHours(h, m, 0, 0);
                } else {
                  end = new Date(start.getTime() + 60 * 60 * 1000);
                }
                if (userCalendarProvider === 'google') {
                  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(address)}`;
                  Linking.openURL(url);
                } else {
                  const fmt = (d: Date) => d.toISOString();
                  const url = `https://outlook.live.com/calendar/0/action/compose?subject=${encodeURIComponent(title)}&startdt=${fmt(start)}&enddt=${fmt(end)}&body=${encodeURIComponent(description)}&location=${encodeURIComponent(address)}`;
                  Linking.openURL(url);
                }
              }}
            >
              <Text style={styles.calendarWebButtonText}>
                Legg til i {userCalendarProvider === 'google' ? 'Google' : 'Outlook'} Calendar
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.sectionLabel, { color: colors.textDisabled, textAlign: 'center' }]}>
              Lagre kalender-e-post i Profil for å legge til arrangementer direkte.
            </Text>
          )}
        </View>
      )}

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
                  {TIME_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[styles.dateOption, { borderBottomColor: colors.border }, customEndTime === option.value && { backgroundColor: colors.accent }]}
                      onPress={() => { setCustomEndTime(option.value); setShowCustomEndTimePicker(false); }}
                    >
                      <Text style={[styles.dateOptionText, { color: customEndTime === option.value ? '#fff' : colors.text }]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
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
  updateButton: {
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
  deleteButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  calendarWebButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  calendarWebButtonText: {
    color: '#fff',
    fontSize: 16,
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
