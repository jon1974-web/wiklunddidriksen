import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Linking, Image } from 'react-native';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { db } from '../services/firebase';
import { Event } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { cancelNotification } from '../services/notificationService';
import { getUserProfile } from '../services/familyService';
import { syncEventToCalendar, updateCalendarEvent, deleteCalendarEvent } from '../services/calendarService';
import { DocumentUpload } from '../components/DocumentUpload';
import { useUserStore } from '../store/userStore';
import { getReminderOptions } from '../constants/eventOptions';
import { getErrorMessage } from '../utils/validation';
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
  const [editDocuments, setEditDocuments] = useState<{ url: string; fileName: string; type: 'image' | 'document' }[]>(event.documents || []);
  const canDelete = eventData.createdBy === user?.uid || familyRole === 'owner' || familyRole === 'admin';
  
  const addOneHour = (t: string): string => {
    const [h, m] = t.split(':').map(Number);
    const total = h * 60 + m + 60;
    return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  };

  const REMINDER_OPTIONS = [
    { label: '30 min', value: 30 },
    { label: '1 time', value: 60 },
    { label: '2 timer', value: 120 },
    { label: '1 dag', value: 1440 },
    { label: '1 uke', value: 10080 },
  ];

  const [editTitle, setEditTitle] = useState(event.title);
  const [editAddress, setEditAddress] = useState(event.address || '');
  const [editDateFrom, setEditDateFrom] = useState(event.date);
  const [editDateTo, setEditDateTo] = useState(event.endDate || event.date);
  const [editTime, setEditTime] = useState(event.time);
  const [editEndTime, setEditEndTime] = useState(event.endTime || addOneHour(event.time));
  const [editNote, setEditNote] = useState(event.description || '');
  const [editReminderMinutes, setEditReminderMinutes] = useState(event.reminderMinutes);
  const [editIcon, setEditIcon] = useState(event.icon || '');
  const [userCalendarEmail, setUserCalendarEmail] = useState<string | null>(null);
  const [userCalendarProvider, setUserCalendarProvider] = useState<'google' | 'outlook' | null>(null);
  const [showFullNote, setShowFullNote] = useState(false);

  type EditPickerField = 'dateFrom' | 'dateTo' | 'time' | 'endTime' | null;
  const [editActivePicker, setEditActivePicker] = useState<EditPickerField>(null);

  const isTimePicker = editActivePicker === 'time' || editActivePicker === 'endTime';

  const handlePickerSelect = (value: string) => {
    if (editActivePicker === 'dateFrom') {
      setEditDateFrom(value);
      if (!editDateTo || editDateTo === editDateFrom) setEditDateTo(value);
    } else if (editActivePicker === 'dateTo') {
      setEditDateTo(value);
    } else if (editActivePicker === 'time') {
      setEditTime(value);
      setEditEndTime(addOneHour(value));
    } else if (editActivePicker === 'endTime') {
      setEditEndTime(value);
    }
    setEditActivePicker(null);
  };

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
    if (!editTitle.trim()) {
      crossAlert('Error', 'Vennligst skriv en tittel');
      return;
    }

    try {
      const [hours, mins] = editTime.split(':').map(Number);
      const eventStartDate = new Date(editDateFrom);
      eventStartDate.setHours(hours, mins, 0, 0);
      const reminderAt = new Date(eventStartDate.getTime() - editReminderMinutes * 60 * 1000);

      const updateData: any = {
        title: editTitle.trim(),
        description: editNote.trim() || null,
        address: editAddress.trim() || null,
        date: editDateFrom,
        time: editTime,
        endDate: editDateTo,
        endTime: editEndTime,
        reminderMinutes: editReminderMinutes,
        reminderAt: reminderAt.toISOString(),
        icon: editIcon || null,
        documents: editDocuments.length > 0 ? editDocuments : [],
      };

      await updateDoc(doc(db, 'events', event.id), updateData);

      if (user?.uid) {
        const profile = await getUserProfile(user.uid);
        if (profile?.calendarId) {
          const [eH, eM] = editEndTime.split(':').map(Number);
          const endDate = new Date(editDateTo);
          endDate.setHours(eH, eM, 0, 0);
          const syncParams = {
            title: editTitle.trim(),
            description: editNote.trim() || undefined,
            address: editAddress.trim() || undefined,
            startDate: eventStartDate,
            endDate,
            reminderMinutes: editReminderMinutes,
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
  }, [editTitle, editAddress, editDateFrom, editDateTo, editTime, editEndTime, editNote, editReminderMinutes, editIcon, editDocuments, user, event]);

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
        <View style={[styles.detailCard, { borderLeftWidth: 4, borderLeftColor: '#3b5a75', marginBottom: 10 }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ width: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}>
              <View style={{ height: 16, backgroundColor: '#3b5a75', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{dayName}</Text>
              </View>
              <Text style={{ fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 30, marginTop: 2, color: colors.text }}>{dayNum}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 4 }}>{monthStr}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, flex: 1 }}>{eventData.title}</Text>
                {eventData.documents && eventData.documents.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                    <AppIcon name="file" size={12} color="#1976D2" />
                    <Text style={{ fontSize: 10, fontWeight: '600', color: '#1976D2' }}>{eventData.documents.length}</Text>
                  </View>
                )}
              </View>
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
        <View style={[styles.detailCard, { borderLeftWidth: 4, borderLeftColor: '#3b5a75' }]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b5a75', marginBottom: 8 }}>Detaljer</Text>
          {eventData.address && (
            <View style={styles.viewDetailRow}>
              <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>📍</Text>
              <Text style={[styles.viewDetailValue, { color: colors.text }]} numberOfLines={2}>{eventData.address}</Text>
            </View>
          )}
          <View style={styles.viewDetailRow}>
            <Text style={[styles.viewDetailLabel, { color: colors.textSecondary }]}>🔔</Text>
            <Text style={[styles.viewDetailValue, { color: colors.text }]}>
              {getReminderOptions().find((o) => o.value === eventData.reminderMinutes)?.label || `${eventData.reminderMinutes} min`}
            </Text>
          </View>
          {eventData.description && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: 14 }}>📝</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b5a75' }}>Notat</Text>
              </View>
              <View style={{ paddingLeft: 22 }}>
                <Text style={{ fontSize: 14, color: colors.text }} numberOfLines={showFullNote ? undefined : 2}>
                  {eventData.description}
                </Text>
                {eventData.description.length > 60 && (
                  <TouchableOpacity onPress={() => setShowFullNote(!showFullNote)}>
                    <Text style={{ fontSize: 12, color: '#3b5a75', fontWeight: '600', marginTop: 4 }}>
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
          <View style={[styles.detailCard, { padding: 0, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: '#3b5a75' }]}>
            <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(eventData.address!))} style={{ width: '100%', height: 140 }}>
              <Image source={{ uri: mapUrl }} style={{ width: '100%', height: 140, borderRadius: 0 }} resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL(getGoogleMapsUrl(eventData.address!))} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#3b5a75', fontWeight: '600' }}>Åpne i Google Maps →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Documents */}
        {eventData.documents && eventData.documents.length > 0 && (
          <View style={[styles.detailCard, { borderLeftWidth: 4, borderLeftColor: '#3b5a75' }]}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#3b5a75', marginBottom: 8 }}>📎 Dokumenter ({eventData.documents.length})</Text>
            {eventData.documents.map((doc, i) => (
              <TouchableOpacity key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < (eventData.documents?.length || 0) - 1 ? 1 : 0, borderBottomColor: colors.border }} onPress={() => Linking.openURL(doc.url)}>
                {doc.type === 'image' ? (
                  <Image source={{ uri: doc.url }} style={{ width: 48, height: 48, borderRadius: 8 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>📄</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }} numberOfLines={1}>{doc.fileName}</Text>
                  <Text style={{ fontSize: 12, color: '#3b5a75' }}>{t('documents.open')} →</Text>
                </View>
              </TouchableOpacity>
            ))}
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

      {/* Icon */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>Ikon</Text>
        <View style={styles.iconGrid}>
          {EVENT_ICONS.map((item) => (
            <TouchableOpacity
              key={item.emoji}
              style={[styles.iconOption, { backgroundColor: colors.surface, borderColor: colors.border }, editIcon === item.emoji && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => setEditIcon(editIcon === item.emoji ? '' : item.emoji)}
            >
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
              <Text style={[styles.iconLabel, { color: editIcon === item.emoji ? '#fff' : colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Title */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.title')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={editTitle}
          onChangeText={setEditTitle}
          placeholder="F.eks. Familiemiddag"
          placeholderTextColor={colors.textDisabled}
        />
      </View>

      {/* Date from / Date to */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('kindergarten.holidayDateFrom')}</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setEditActivePicker('dateFrom')}>
            <Text style={[styles.dateText, { color: colors.text }]}>{editDateFrom}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('kindergarten.holidayDateTo')}</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setEditActivePicker('dateTo')}>
            <Text style={[styles.dateText, { color: colors.text }]}>{editDateTo}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time from / Time to */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('kindergarten.holidayTimeFrom')}</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setEditActivePicker('time')}>
            <Text style={[styles.dateText, { color: colors.text }]}>{editTime}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={[styles.label, { color: colors.text }]}>{t('kindergarten.holidayTimeTo')}</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: colors.surface }]} onPress={() => setEditActivePicker('endTime')}>
            <Text style={[styles.dateText, { color: colors.text }]}>{editEndTime}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.address')}</Text>
        <GooglePlacesInput
          value={editAddress}
          onChangeText={setEditAddress}
          placeholder="Søk etter adresse..."
          onSelect={setEditAddress}
        />
      </View>

      {/* Note */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: colors.text }]}>{t('common.notes')}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }, styles.textArea]}
          value={editNote}
          onChangeText={setEditNote}
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
              style={[styles.reminderOption, { backgroundColor: colors.surface, borderColor: colors.border }, editReminderMinutes === option.value && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              onPress={() => setEditReminderMinutes(option.value)}
            >
              <Text style={[styles.reminderText, { color: editReminderMinutes === option.value ? '#fff' : colors.textSecondary }]}>
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
          storagePath={`events/${eventData.familyId || 'general'}/${Date.now()}`}
          onUploaded={(doc) => setEditDocuments((prev) => [...prev, doc])}
          accentColor={colors.accent}
        />
        {editDocuments.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {editDocuments.map((doc, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>{doc.type === 'image' ? '🖼️' : '📄'} {doc.fileName}</Text>
                <TouchableOpacity onPress={() => setEditDocuments((prev) => prev.filter((_, idx) => idx !== i))}>
                  <Text style={{ color: colors.danger, fontSize: 12 }}>{t('common.delete')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Save */}
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleUpdate}>
        <Text style={styles.buttonText}>{t('common.save')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setIsEditing(false)}>
        <Text style={[styles.buttonText, { color: colors.text }]}>{t('common.cancel')}</Text>
      </TouchableOpacity>

      <DatePickerModal
        visible={editActivePicker !== null}
        title={editActivePicker === 'dateFrom' ? t('kindergarten.holidayDateFrom') : editActivePicker === 'dateTo' ? t('kindergarten.holidayDateTo') : editActivePicker === 'time' ? t('kindergarten.holidayTimeFrom') : t('kindergarten.holidayTimeTo')}
        mode={isTimePicker ? 'time' : 'date'}
        dateOffset={isTimePicker ? 0 : -365}
        dateCount={isTimePicker ? 48 : 730}
        selectedValue={editActivePicker === 'dateFrom' ? editDateFrom : editActivePicker === 'dateTo' ? editDateTo : editActivePicker === 'time' ? editTime : editEndTime}
        onSelect={handlePickerSelect}
        onClose={() => setEditActivePicker(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
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
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  viewDetailLabel: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  viewDetailValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'left',
    marginLeft: 4,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  iconEmoji: {
    fontSize: 22,
  },
  iconLabel: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  reminderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
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
