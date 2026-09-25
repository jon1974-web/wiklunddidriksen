import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { GooglePlacesInput } from './GooglePlacesInput';
import { DatePickerModal } from './DatePickerModal';
import { ScheduleModal } from './ScheduleModal';
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
import { DocumentUpload } from './DocumentUpload';
import { AppIcon } from './AppIcon';
import { REMINDER_OPTIONS } from '../constants/reminderOptions';
import { getFamilyMembersWithRoles } from '../services/familyService';
import { MODULE_COLORS } from '../constants/moduleColors';

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
  prefill?: {
    id?: string;
    title?: string;
    address?: string;
    date?: string;
    endDate?: string;
    time?: string;
    endTime?: string;
    description?: string;
    reminderMinutes?: number;
    icon?: string;
    documents?: { url: string; fileName: string; type: 'image' | 'document' }[];
    selectedPersons?: string[];
  };
}

const addOneHour = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export const AddEventModal: React.FC<AddEventModalProps> = ({ visible, onClose, onSaved, prefill }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(prefill?.title || '');
  const [address, setAddress] = useState(prefill?.address || '');
  const [dateFrom, setDateFrom] = useState(prefill?.date || getTodayLocal());
  const [dateTo, setDateTo] = useState(prefill?.endDate || prefill?.date || getTodayLocal());
  const [time, setTime] = useState(prefill?.time || '10:00');
  const [endTime, setEndTime] = useState(prefill?.endTime || addOneHour(prefill?.time || '10:00'));
  const [note, setNote] = useState(prefill?.description || '');
  const [reminderMinutes, setReminderMinutes] = useState(prefill?.reminderMinutes || 60);
  const [icon, setIcon] = useState(prefill?.icon || '');
  const [documents, setDocuments] = useState<{ url: string; fileName: string; type: 'image' | 'document' }[]>(prefill?.documents || []);
  const [saving, setSaving] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<{ days: number[]; weeks: number; weekType: string; groupId: string } | null>(null);
  const user = useUserStore((state) => state.user);
  const familyId = useUserStore((state) => state.familyId);
  const { colors } = useTheme();
  const [persons, setPersons] = useState<string[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);

  type AddPickerField = 'dateFrom' | 'dateTo' | 'time' | 'endTime' | null;
  const [activePicker, setActivePicker] = useState<AddPickerField>(null);

  useEffect(() => {
    if (familyId) {
      getFamilyMembersWithRoles(familyId).then((members) => {
        setPersons(members.map(m => m.profile.displayName?.split(' ')[0] || 'Medlem'));
      }).catch(() => {});
    }
  }, [familyId]);

  useEffect(() => {
    if (visible && prefill) {
      setTitle(prefill.title || '');
      setAddress(prefill.address || '');
      setDateFrom(prefill.date || getTodayLocal());
      setDateTo(prefill.endDate || prefill.date || getTodayLocal());
      setTime(prefill.time || '10:00');
      setEndTime(prefill.endTime || addOneHour(prefill.time || '10:00'));
      setNote(prefill.description || '');
      setReminderMinutes(prefill.reminderMinutes || 60);
      setIcon(prefill.icon || '');
      setDocuments(prefill.documents || []);
      setScheduleConfig(null);
      setSelectedPersons(prefill.selectedPersons || []);
    } else if (visible) {
      setTitle('');
      setAddress('');
      setDateFrom(getTodayLocal());
      setDateTo(getTodayLocal());
      setTime('10:00');
      setEndTime('11:00');
      setNote('');
      setReminderMinutes(60);
      setIcon('');
      setDocuments([]);
      setScheduleConfig(null);
      setSelectedPersons([]);
    }
  }, [visible]);

  const handlePickerSelect = (value: string) => {
    if (activePicker === 'dateFrom') {
      setDateFrom(value);
      if (!dateTo || dateTo < value) setDateTo(value);
    } else if (activePicker === 'dateTo') {
      if (value >= dateFrom) setDateTo(value);
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
    if (selectedPersons.length === 0) {
      crossAlert('Error', t('health.personRequired'));
      return;
    }

    setSaving(true);
    try {
      if (scheduleConfig) {
        const startDate = new Date(dateFrom);
        const eventsToCreate: any[] = [];

        for (let w = 0; w < scheduleConfig.weeks; w++) {
          const weekNum = getWeekNumber(startDate) + w;
          if (scheduleConfig.weekType === 'odd' && weekNum % 2 === 0) continue;
          if (scheduleConfig.weekType === 'even' && weekNum % 2 !== 0) continue;

          for (let d = 0; d < 7; d++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + w * 7 + d);

            if (scheduleConfig.days.includes(date.getDay())) {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const [h, m] = time.split(':').map(Number);
              const eventStart = new Date(dateStr);
              eventStart.setHours(h, m, 0, 0);
              const reminderAt = new Date(eventStart.getTime() - reminderMinutes * 60 * 1000);

              eventsToCreate.push({
                title: sanitizeInput(title),
                description: note.trim() ? sanitizeInput(note) : null,
                address: address.trim() ? sanitizeInput(address, 200) : null,
                date: dateStr,
                endDate: null,
                time,
                endTime,
                reminderMinutes,
                reminderAt: reminderAt.toISOString(),
                createdBy: user?.uid,
                familyId: familyId || null,
                createdAt: Date.now(),
                icon: icon || null,
                documents: documents.length > 0 ? documents : [],
                scheduleGroupId: scheduleConfig.groupId,
                selectedPersons,
              });
            }
          }
        }

        if (eventsToCreate.length > 0) {
          for (const evt of eventsToCreate) {
            await addDoc(collection(db, 'events'), evt);
          }
        }
      } else {
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
          documents: documents.length > 0 ? documents : [],
          selectedPersons,
        };

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
      }

      onSaved?.();
      onClose();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [title, address, dateFrom, dateTo, time, endTime, note, reminderMinutes, user, icon, documents, familyId, onClose, onSaved, saving, scheduleConfig, selectedPersons]);

  const handleScheduleConfirm = useCallback((config: { days: number[]; weeks: number; weekType: string; groupId: string }) => {
    setScheduleConfig(config);
    setShowSchedule(false);
  }, []);

  const DAY_NAMES = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

  const schedulePreview = useMemo(() => {
    if (!scheduleConfig) return null;
    const dayLabels = scheduleConfig.days.map(d => DAY_NAMES[d]).join(', ');
    const weekLabel = scheduleConfig.weeks === 1 ? '1 uke' : `${scheduleConfig.weeks} uker`;
    return `${dayLabels} i ${weekLabel}`;
  }, [scheduleConfig]);

  return (
    <>
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHandleBar} />
              <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>
                <Text style={[styles.title, { color: colors.text }]}>Ny avtale</Text>

                {/* Icon section */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>Ikon</Text>
                  <View style={styles.iconGrid}>
                    {EVENT_ICONS.map((item) => {
                      const isSelected = icon === item.icon;
                      return (
                        <TouchableOpacity
                          key={item.icon}
                          style={[styles.iconOption, { backgroundColor: colors.surface, borderColor: colors.border }, isSelected && { backgroundColor: colors.accent, borderColor: colors.accent }]}
                          onPress={() => setIcon(isSelected ? '' : item.icon)}
                        >
                          <View style={styles.iconEmoji}>
                            <AppIcon name={item.icon} size={22} color={isSelected ? '#fff' : colors.textSecondary} />
                          </View>
                          <Text style={[styles.iconLabel, { color: isSelected ? '#fff' : colors.textSecondary }]}>{item.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
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

                {/* Person selector */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('health.personLabel')}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {persons.map(p => {
                      const isSelected = selectedPersons.includes(p);
                      return (
                        <TouchableOpacity key={p} style={[styles.personChip, { backgroundColor: isSelected ? MODULE_COLORS.health : colors.surface, borderColor: isSelected ? MODULE_COLORS.health : colors.border, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 }]} onPress={() => {
                          setSelectedPersons(prev => isSelected ? prev.filter(x => x !== p) : [...prev, p]);
                        }}>
                          <Text style={{ color: isSelected ? '#fff' : colors.text, fontSize: 13 }}>{p}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selectedPersons.length === 0 && (
                    <Text style={{ color: '#E53935', fontSize: 12, marginTop: 4 }}>{t('health.personRequired')}</Text>
                  )}
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

                {/* Schedule */}
                <View style={styles.field}>
                  {schedulePreview ? (
                    <View style={{ padding: 12, borderRadius: 10, backgroundColor: colors.accent + '15', borderWidth: 1, borderColor: colors.accent + '40' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <AppIcon name="schedule" size={18} color={colors.accent} />
                        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '700' }}>Gjentakelse</Text>
                      </View>
                      <Text style={{ color: colors.text, fontSize: 13, marginBottom: 8 }}>{schedulePreview}</Text>
                      <TouchableOpacity onPress={() => { setScheduleConfig(null); }}>
                        <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '600' }}>Fjern gjentakelse</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
                      onPress={() => setShowSchedule(true)}
                    >
                      <AppIcon name="schedule" size={18} color={colors.accent} />
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{t('schedule.title')}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 'auto' }}>›</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Save & Cancel */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, flex: 1 }]} onPress={onClose}>
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
              </ScrollView>

              <DatePickerModal
                visible={activePicker !== null}
                title={activePicker === 'dateFrom' ? t('kindergarten.holidayDateFrom') : activePicker === 'dateTo' ? t('kindergarten.holidayDateTo') : activePicker === 'time' ? t('kindergarten.holidayTimeFrom') : t('kindergarten.holidayTimeTo')}
                mode={isTimePicker ? 'time' : 'date'}
                dateOffset={isTimePicker ? 0 : -30}
                dateCount={isTimePicker ? 48 : 760}
                selectedValue={activePicker === 'dateFrom' ? dateFrom : activePicker === 'dateTo' ? dateTo : activePicker === 'time' ? time : endTime}
                onSelect={handlePickerSelect}
                onClose={() => setActivePicker(null)}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>

    <ScheduleModal
      visible={showSchedule}
      onClose={() => setShowSchedule(false)}
      onConfirm={handleScheduleConfirm}
      startDate={dateFrom}
      moduleColor={colors.accent}
    />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHandleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginTop: 8, marginBottom: 4 },
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
  iconEmoji: { fontSize: 22, alignItems: 'center', justifyContent: 'center' },
  iconLabel: { fontSize: 9, marginTop: 2, fontWeight: '600' },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderOption: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  reminderText: { fontSize: 13, fontWeight: '600' },
  personChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
});
