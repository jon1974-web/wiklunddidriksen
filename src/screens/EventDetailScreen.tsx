import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Linking, Image } from 'react-native';
import { doc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { db } from '../services/firebase';
import { Event } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { cancelNotification } from '../services/notificationService';
import { getUserProfile } from '../services/familyService';
import { syncEventToCalendar, updateCalendarEvent, deleteCalendarEvent } from '../services/calendarService';
import { useUserStore } from '../store/userStore';
import { getReminderOptions, getEndDateOptions, getEndTimeOptions } from '../constants/eventOptions';
import { sanitizeInput, getErrorMessage } from '../utils/validation';
import { crossAlert } from '../utils/alert';
import { EVENT_ICONS } from '../constants/eventIcons';
import { AppIcon } from '../components/AppIcon';
import { DatePickerModal } from '../components/DatePickerModal';
import { formatDate, formatTime } from '../utils/dateUtils';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import { useTranslation } from 'react-i18next';

interface EventDetailScreenProps {
  navigation: any;
  route: any;
}

export const EventDetailScreen: React.FC<EventDetailScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { event } = route.params as { event: Event };
  const { colors } = useTheme();
  const user = useUserStore((state) => state.user);
  const familyRole = useUserStore((state) => state.familyRole);
  const [isEditing, setIsEditing] = useState(false);
  const [eventData, setEventData] = useState(event);
  const canDelete = eventData.createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin';
  
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
  const [endDateDays, setEndDateDays] = useState<number | null>(getInitialEndDateDays());
  const [customEndDate, setCustomEndDate] = useState(event.endDate && !getInitialEndDateDays() ? event.endDate : '');
  const [showEndDate, setShowEndDate] = useState(!!event.endDate);
  const [time, setTime] = useState(event.time);
  const [endTime, setEndTime] = useState(getInitialEndTimeDuration());
  const [showEndTime, setShowEndTime] = useState(!!event.endTime);
  const [customEndTime, setCustomEndTime] = useState(event.endTime && !getInitialEndTimeDuration() ? event.endTime : '');
  const [reminderMinutes, setReminderMinutes] = useState(event.reminderMinutes);
  const [userCalendarEmail, setUserCalendarEmail] = useState<string | null>(null);
  const [userCalendarProvider, setUserCalendarProvider] = useState<'google' | 'outlook' | null>(null);
  const [icon, setIcon] = useState(event.icon || '');
  const [showFullNote, setShowFullNote] = useState(false);

  type DetailPickerField = 'date' | 'time' | 'endDate' | 'endTime' | null;
  const [activePicker, setActivePicker] = useState<DetailPickerField>(null);

  const getPickerTitle = () => {
    const titles: Record<string, string> = { date: 'Velg dato', time: 'Velg tid', endDate: 'Velg sluttdato', endTime: 'Velg sluttid' };
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
      const [hours, mins] = time.split(':').map(Number);
      const eventStartDate = new Date(date);
      eventStartDate.setHours(hours, mins, 0, 0);
      const reminderAt = new Date(eventStartDate.getTime() - reminderMinutes * 60 * 1000);

      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        address: address.trim() || null,
        date,
        time,
        reminderMinutes,
        reminderAt: reminderAt.toISOString(),
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
          // Samme dag - end date equals start date
          updateData.endDate = date;
        }
      } else {
        // Default to same day
        updateData.endDate = date;
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
        }
      } else {
        // Always set a default endTime (1 hour after start)
        const [hours, mins] = time.split(':').map(Number);
        const totalMins = hours * 60 + mins + 60;
        const endHour = Math.floor(totalMins / 60);
        const endMin = totalMins % 60;
        updateData.endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      }

      await updateDoc(doc(db, 'events', event.id), updateData);

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

      setEventData({
        ...eventData,
        ...updateData,
        notificationId: eventData.notificationId,
      });
      setIsEditing(false);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [title, description, address, date, time, reminderMinutes, user, showEndDate, customEndDate, endDateDays, showEndTime, endTime, customEndTime, icon, event, navigation]);

  const handleCopy = useCallback(() => {
    navigation.navigate('AddEvent', {
      prefill: {
        title: eventData.title,
        description: eventData.description || '',
        date: eventData.date,
        time: eventData.time,
        endDate: eventData.endDate || '',
        endTime: eventData.endTime || '',
        reminderMinutes: eventData.reminderMinutes || 120,
        icon: eventData.icon || '',
      },
    });
  }, [eventData, navigation]);

  const handleDelete = useCallback(() => {
    crossAlert(t('events.deleteTitle'), t('events.deleteConfirm'), [
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

  const dateText = eventData.endDate
    ? `${formatDate(eventData.date)} - ${formatDate(eventData.endDate)}`
    : formatDate(eventData.date);
  const timeText = eventData.endTime
    ? `${formatTime(eventData.time)} - ${formatTime(eventData.endTime)}`
    : formatTime(eventData.time);
  const eventIcon = eventData.icon || '📅';
  const mapUrl = eventData.address
    ? getStaticMapUrl(eventData.address, 15, '600x300')
    : null;

  if (!isEditing) {
    const d = eventData.date ? new Date(eventData.date) : null;
    const DAY_NAMES = ['SØN', 'MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR'];
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];
    const dayName = d ? DAY_NAMES[d.getDay()] : '';
    const dayNum = d ? d.getDate() : '';
    const monthStr = d ? MONTHS[d.getMonth()] : '';

    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.accent, fontSize: 16 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleCopy} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <AppIcon name="links" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Top card with calendar icon */}
        <View style={[styles.detailCard, { borderLeftWidth: 4, borderLeftColor: '#0097A7', marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 52, borderRadius: 12, overflow: 'hidden', flexShrink: 0, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <View style={{ height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: '700', color: '#fff', backgroundColor: '#0097A7' }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#fff' }}>{dayName}</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 26, marginTop: 1, color: colors.text }}>{dayNum}</Text>
              <Text style={{ fontSize: 9, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 2 }}>{monthStr}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{eventData.title}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', marginTop: 2 }}>{timeText}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#E8F5E9' }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#43A047' }}>Avtale</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Detail card */}
        <View style={[styles.detailCard, { borderLeftWidth: 4, borderLeftColor: '#0097A7' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#0097A7', marginBottom: 8 }}>Detaljer</Text>
          {eventData.address && (
            <View style={styles.viewDetailRow}>
              <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📍</Text>
              <Text style={[styles.viewDetailValue, { color: colors.text }]} numberOfLines={2}>{eventData.address}</Text>
            </View>
          )}
          <View style={styles.viewDetailRow}>
            <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>🔔</Text>
            <Text style={[styles.viewDetailValue, { color: colors.text }]}>
              {getReminderOptions().find((o) => o.value === reminderMinutes)?.label || `${reminderMinutes} min`}
            </Text>
          </View>
          {eventData.description && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 14 }}>📝</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0097A7' }}>Notat</Text>
              </View>
              <View style={{ paddingLeft: 22 }}>
                <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={showFullNote ? undefined : 2}>
                  {eventData.description}
                </Text>
                {eventData.description.length > 60 && (
                  <TouchableOpacity onPress={() => setShowFullNote(!showFullNote)}>
                    <Text style={{ fontSize: 12, color: '#0097A7', fontWeight: '600', marginTop: 4 }}>
                      {showFullNote ? 'Vis mindre' : 'Les mer'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Map */}
        {mapUrl && (
          <View style={[styles.detailCard, { padding: 0, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: '#0097A7' }]}>
            <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(eventData.address!))} style={{ width: '100%', height: 140 }}>
              <Image source={{ uri: mapUrl }} style={{ width: '100%', height: 140, borderRadius: 0 }} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(eventData.address!))} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#0097A7', fontWeight: '600' }}>Åpne i Google Maps →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Button box */}
        <View style={[styles.detailCard, { marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent, flex: 1 }]} onPress={() => setIsEditing(true)}>
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Rediger</Text>
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#fff', borderColor: colors.danger, borderWidth: 1.5, flex: 1 }]} onPress={handleDelete}>
                <Text style={[styles.actionButtonText, { color: colors.danger }]}>Slett</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity onPress={() => setIsEditing(false)} style={{ marginBottom: 8 }}>
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
          <Text style={[styles.addLink, { color: colors.accent }]}>+ Legg til sluttdato</Text>
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
            <Text style={[styles.removeLink, { color: colors.danger }]}>Fjern sluttdato</Text>
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
          <Text style={[styles.addLink, { color: colors.accent }]}>+ Legg til sluttid</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>Varighet</Text>
          <View style={styles.reminderOptions}>
            {getEndTimeOptions().map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, endTime === String(option.value) && !customEndTime && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => { setShowEndTime(true); setEndTime(String(option.value)); setCustomEndTime(''); }}
              >
                <Text style={[styles.reminderText, { color: endTime === String(option.value) && !customEndTime ? '#fff' : colors.textSecondary }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>Standardvarighet er 1 time hvis ingen varighet velges</Text>
          <TouchableOpacity
            style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, customEndTime && !endTime && { backgroundColor: colors.accent, borderColor: colors.accent }]}
            onPress={() => { setActivePicker('endTime'); setEndTime(''); }}
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

      <TouchableOpacity style={[styles.updateButton, { backgroundColor: colors.accent }]} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Oppdater</Text>
      </TouchableOpacity>

      {canDelete && (
        <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.surface, borderColor: colors.danger }]} onPress={handleDelete}>
          <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Slett</Text>
        </TouchableOpacity>
      )}

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
    padding: 12,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  viewCard: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  viewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  viewDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
  },
  viewDivider: {
    height: 1,
    marginBottom: 16,
  },
  viewDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  viewDetailLabel: {
    fontSize: 14,
    flex: 1,
  },
  viewDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  viewMapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewMapImage: {
    width: '100%',
    height: 200,
  },
  viewMapLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
  },
  editButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  hintText: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
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
  copyButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  copyButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  avbrytLink: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  avbrytLinkText: {
    fontSize: 16,
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
});
