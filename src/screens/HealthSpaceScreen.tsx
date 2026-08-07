import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { DatePickerModal } from '../components/DatePickerModal';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { crossAlert } from '../utils/alert';
import { getErrorMessage } from '../utils/validation';
import { scheduleEventReminder } from '../services/notificationService';
import { notifyHealthItem } from '../services/familyService';
import { getStaticMapUrl, getGoogleMapsUrl } from '../utils/maps';
import {
  getHealthMedications, addHealthMedication, updateHealthMedication, deleteHealthMedication,
  getHealthAppointments, addHealthAppointment, updateHealthAppointment, deleteHealthAppointment,
  getHealthVaccinations, addHealthVaccination, updateHealthVaccination, deleteHealthVaccination,
  getHealthAllergies, addHealthAllergy, updateHealthAllergy, deleteHealthAllergy,
  getHealthGrowth, addHealthGrowth, updateHealthGrowth, deleteHealthGrowth,
} from '../services/healthService';
import { HealthMedication, HealthAppointment, HealthVaccination, HealthAllergy, HealthGrowth } from '../types';
import { ActionModal } from '../components/ActionModal';
import { HelpCenter } from '../components/HelpCenter';
import { getFamilyMembersWithRoles } from '../services/familyService';

type SectionType = 'medications' | 'appointments' | 'vaccinations' | 'allergies' | 'growth';

interface HealthSpaceScreenProps {
  navigation: any;
}

export const HealthSpaceScreen: React.FC<HealthSpaceScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const familyId = useUserStore((state) => state.familyId);

  const [medications, setMedications] = useState<HealthMedication[]>([]);
  const [appointments, setAppointments] = useState<HealthAppointment[]>([]);
  const [vaccinations, setVaccinations] = useState<HealthVaccination[]>([]);
  const [allergies, setAllergies] = useState<HealthAllergy[]>([]);
  const [growth, setGrowth] = useState<HealthGrowth[]>([]);
  const [persons, setPersons] = useState<string[]>([]);

  const [activeSection, setActiveSection] = useState<SectionType | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string; section: SectionType } | null>(null);
  const [actionModal, setActionModal] = useState<{ visible: boolean; id: string; title: string; section: SectionType }>({ visible: false, id: '', title: '', section: 'medications' });
  const [detailModal, setDetailModal] = useState<{ visible: boolean; item: any; section: SectionType }>({ visible: false, item: null, section: 'medications' });
  const [showHelp, setShowHelp] = useState(false);
  const [activePicker, setActivePicker] = useState<string | null>(null);

  // Form states
  const [medForm, setMedForm] = useState({ name: '', person: '', dosage: '', frequency: '', dateFrom: '', dateTo: '', note: '' });
  const [apptForm, setApptForm] = useState({ title: '', person: '', date: '', startTime: '', endTime: '', location: '', note: '', reminder: '' });
  const [vaccForm, setVaccForm] = useState({ name: '', person: '', date: '', nextDue: '', reminder: '', location: '', note: '' });
  const [allergyForm, setAllergyForm] = useState({ allergen: '', person: '', severity: 'mild' as 'mild' | 'moderate' | 'severe', note: '' });
  const [growthForm, setGrowthForm] = useState({ person: '', height: '', weight: '', date: '', note: '' });

  const loadData = useCallback(async () => {
    if (!familyId) return;
    try {
      const [meds, appts, vaccs, alls, grow] = await Promise.all([
        getHealthMedications(familyId),
        getHealthAppointments(familyId),
        getHealthVaccinations(familyId),
        getHealthAllergies(familyId),
        getHealthGrowth(familyId),
      ]);
      setMedications(meds);
      setAppointments(appts);
      setVaccinations(vaccs);
      setAllergies(alls);
      setGrowth(grow);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [familyId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!familyId) return;
    getFamilyMembersWithRoles(familyId).then((members) => {
      setPersons(members.map(m => m.profile.displayName?.split(' ')[0] || 'Medlem'));
    }).catch(() => {});
  }, [familyId]);

  const today = new Date().toISOString().split('T')[0];
  const upcomingAppointments = appointments.filter(a => a.date >= today).slice(0, 3);

  const handleAdd = async () => {
    if (!familyId) return;
    try {
      const isEditing = editingItem !== null;
      if (activeSection === 'medications') {
        if (!medForm.name.trim()) { crossAlert('Error', t('health.enterName')); return; }
        if (isEditing) await updateHealthMedication(familyId, editingItem.id, medForm);
        else await addHealthMedication(familyId, medForm);
        setMedForm({ name: '', person: persons[0] || '', dosage: '', frequency: '', dateFrom: '', dateTo: '', note: '' });
      } else if (activeSection === 'appointments') {
        if (!apptForm.title.trim() || !apptForm.date) { crossAlert('Error', t('health.enterTitleAndDate')); return; }
        let savedAppt;
        if (isEditing) {
          await updateHealthAppointment(familyId, editingItem.id, apptForm);
          savedAppt = { ...apptForm, id: editingItem.id };
        } else {
          const id = await addHealthAppointment(familyId, apptForm);
          savedAppt = { ...apptForm, id };
        }
        // Schedule notification if reminder is set
        if (apptForm.reminder && savedAppt) {
          const reminderMinutes = apptForm.reminder.includes('1 ' + t('health.reminder1Day').split(' ')[1]) ? 1440 :
                                  apptForm.reminder.includes('3') ? 4320 : 10080;
          const eventDate = new Date(`${apptForm.date}T${apptForm.startTime || '09:00'}:00`);
          const notifId = await scheduleEventReminder(
            `${t('health.appointments')}: ${apptForm.title}`,
            `${apptForm.person} — ${apptForm.date} ${apptForm.startTime}${apptForm.location ? ' (' + apptForm.location + ')' : ''}`,
            eventDate,
            reminderMinutes
          );
          if (notifId && savedAppt.id) {
            await updateHealthAppointment(familyId, savedAppt.id, { notificationId: notifId });
          }
        }
        // Send push notification to family members
        if (!isEditing) {
          const user = useUserStore.getState().user;
          notifyHealthItem(familyId, apptForm.title, apptForm.date, apptForm.startTime, apptForm.location || '', 'appointment', user?.displayName || '', apptForm.person).catch(() => {});
        }
        setApptForm({ title: '', person: persons[0] || '', date: '', startTime: '', endTime: '', location: '', note: '', reminder: '' });
      } else if (activeSection === 'vaccinations') {
        if (!vaccForm.name.trim() || !vaccForm.date) { crossAlert('Error', t('health.enterNameAndDate')); return; }
        let savedVacc;
        if (isEditing) {
          await updateHealthVaccination(familyId, editingItem.id, vaccForm);
          savedVacc = { ...vaccForm, id: editingItem.id, status: 'pending' };
        } else {
          const id = await addHealthVaccination(familyId, { ...vaccForm, status: 'pending' });
          savedVacc = { ...vaccForm, id, status: 'pending' };
        }
        // Schedule notification if reminder is set
        if (vaccForm.reminder && savedVacc) {
          const reminderMinutes = vaccForm.reminder.includes('1 ' + t('health.reminder1Day').split(' ')[1]) ? 1440 :
                                  vaccForm.reminder.includes('3') ? 4320 : 10080;
          const vaccDate = new Date(`${vaccForm.date}T09:00:00`);
          const notifId = await scheduleEventReminder(
            `${t('health.vaccinations')}: ${vaccForm.name}`,
            `${vaccForm.person} — ${vaccForm.date}`,
            vaccDate,
            reminderMinutes
          );
          if (notifId && savedVacc.id) {
            await updateHealthVaccination(familyId, savedVacc.id, { notificationId: notifId });
          }
        }
        // Send push notification to family members
        if (!isEditing) {
          const user = useUserStore.getState().user;
          notifyHealthItem(familyId, vaccForm.name, vaccForm.date, '', vaccForm.location || '', 'vaccination', user?.displayName || '', vaccForm.person).catch(() => {});
        }
        setVaccForm({ name: '', person: persons[0] || '', date: '', nextDue: '', reminder: '', location: '', note: '' });
      } else if (activeSection === 'allergies') {
        if (!allergyForm.allergen.trim()) { crossAlert('Error', t('health.enterAllergen')); return; }
        if (isEditing) await updateHealthAllergy(familyId, editingItem.id, allergyForm);
        else await addHealthAllergy(familyId, allergyForm);
        setAllergyForm({ allergen: '', person: persons[0] || '', severity: 'mild', note: '' });
      } else if (activeSection === 'growth') {
        if (!growthForm.height || !growthForm.weight || !growthForm.date) { crossAlert('Error', t('health.enterHeightWeightDate')); return; }
        const growthData = { ...growthForm, height: Number(growthForm.height), weight: Number(growthForm.weight) };
        if (isEditing) await updateHealthGrowth(familyId, editingItem.id, growthData);
        else await addHealthGrowth(familyId, growthData);
        setGrowthForm({ person: persons[0] || '', height: '', weight: '', date: '', note: '' });
      }
      setEditingItem(null);
      setShowAddModal(false);
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!familyId || !actionModal.id || !actionModal.section) return;
    try {
      if (actionModal.section === 'medications') await deleteHealthMedication(familyId, actionModal.id);
      else if (actionModal.section === 'appointments') await deleteHealthAppointment(familyId, actionModal.id);
      else if (actionModal.section === 'vaccinations') await deleteHealthVaccination(familyId, actionModal.id);
      else if (actionModal.section === 'allergies') await deleteHealthAllergy(familyId, actionModal.id);
      else if (actionModal.section === 'growth') await deleteHealthGrowth(familyId, actionModal.id);
      setActionModal({ visible: false, id: '', title: '', section: 'medications' });
      loadData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleEdit = () => {
    if (!actionModal.id || !actionModal.section) return;
    setActionModal({ visible: false, id: '', title: '' });
    setActiveSection(actionModal.section);
    setEditingItem({ id: actionModal.id, section: actionModal.section });
    setShowAddModal(true);
  };

  const getDaysUntil = (dateStr: string): string => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return t('health.past');
    if (diff === 0) return t('health.today');
    if (diff === 1) return t('health.tomorrow');
    return t('health.inDays', { count: diff });
  };

  // Pre-fill form when editing
  useEffect(() => {
    if (!editingItem) return;
    const { id, section } = editingItem;
    if (section === 'medications') {
      const item = medications.find(m => m.id === id);
      if (item) setMedForm({ name: item.name, person: item.person, dosage: item.dosage, frequency: item.frequency, dateFrom: item.dateFrom || '', dateTo: item.dateTo || '', note: item.note || '' });
    } else if (section === 'appointments') {
      const item = appointments.find(a => a.id === id);
      if (item) setApptForm({ title: item.title, person: item.person, date: item.date, startTime: item.startTime, endTime: item.endTime || '', location: item.location || '', note: item.note || '', reminder: item.reminder || '' });
    } else if (section === 'vaccinations') {
      const item = vaccinations.find(v => v.id === id);
      if (item) setVaccForm({ name: item.name, person: item.person, date: item.date, nextDue: item.nextDue || '', reminder: item.reminder || '', location: item.location || '', note: item.note || '' });
    } else if (section === 'allergies') {
      const item = allergies.find(a => a.id === id);
      if (item) setAllergyForm({ allergen: item.allergen, person: item.person, severity: item.severity, note: item.note || '' });
    } else if (section === 'growth') {
      const item = growth.find(g => g.id === id);
      if (item) setGrowthForm({ person: item.person, height: String(item.height), weight: String(item.weight), date: item.date, note: item.note || '' });
    }
  }, [editingItem, medications, appointments, vaccinations, allergies, growth]);

  const renderSection = (title: string, icon: string, count: number, section: SectionType, children: React.ReactNode) => (
    <View style={[styles.section, { backgroundColor: colors.surface }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <AppIcon name={icon as any} size={18} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({count})</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          onPress={() => { setActiveSection(section); setEditingItem(null); setShowAddModal(true); }}
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 16, marginTop: 20 }}>
        <Text style={{ color: colors.accent, fontSize: 18 }}>←</Text>
      </TouchableOpacity>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
          <AppIcon name="transport" size={28} color="#E53935" />
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('spaces.health')}</Text>
          <TouchableOpacity style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }} onPress={() => setShowHelp(true)}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#0097A7', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>i</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Medications */}
        {renderSection(t('health.medications'), 'medication', medications.length, 'medications', (
          medications.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('health.noMedications')}</Text>
          ) : (
            medications.map(med => (
              <TouchableOpacity key={med.id} style={styles.item} onPress={() => setDetailModal({ visible: true, item: med, section: 'medications' })} onLongPress={() => setActionModal({ visible: true, id: med.id, title: med.name, section: 'medications' })}>
                <AppIcon name="medication" size={20} color={colors.accent} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{med.name}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{med.person} — {med.dosage} {med.frequency}</Text>
                </View>
              </TouchableOpacity>
            ))
          )
        ))}

        {/* Appointments */}
        {renderSection(t('health.appointments'), 'calendar', appointments.length, 'appointments', (
          appointments.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('health.noAppointments')}</Text>
          ) : (
            appointments.map(appt => (
              <TouchableOpacity key={appt.id} style={styles.item} onPress={() => setDetailModal({ visible: true, item: appt, section: 'appointments' })} onLongPress={() => setActionModal({ visible: true, id: appt.id, title: appt.title, section: 'appointments' })}>
                <AppIcon name="calendar" size={20} color={colors.accent} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{appt.title}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{appt.date} {appt.startTime} — {appt.location || appt.person}</Text>
                </View>
                {appt.date >= today && (
                  <Text style={[styles.badge, { backgroundColor: '#FFF3E0', color: '#FB8C00' }]}>{getDaysUntil(appt.date)}</Text>
                )}
              </TouchableOpacity>
            ))
          )
        ))}

        {/* Vaccinations */}
        {renderSection(t('health.vaccinations'), 'vaccination', vaccinations.length, 'vaccinations', (
          vaccinations.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('health.noVaccinations')}</Text>
          ) : (
            vaccinations.map(vacc => (
              <TouchableOpacity key={vacc.id} style={styles.item} onPress={() => setDetailModal({ visible: true, item: vacc, section: 'vaccinations' })} onLongPress={() => setActionModal({ visible: true, id: vacc.id, title: vacc.name, section: 'vaccinations' })}>
                <AppIcon name="vaccination" size={20} color={colors.accent} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{vacc.name}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{vacc.person} — {vacc.date}</Text>
                </View>
                <Text style={[styles.badge, { backgroundColor: vacc.status === 'completed' ? '#E8F5E9' : '#FFF3E0', color: vacc.status === 'completed' ? '#43A047' : '#FB8C00' }]}>
                  {vacc.status === 'completed' ? t('health.completed') : t('health.pending')}
                </Text>
              </TouchableOpacity>
            ))
          )
        ))}

        {/* Allergies */}
        {renderSection(t('health.allergies'), 'allergy', allergies.length, 'allergies', (
          allergies.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('health.noAllergies')}</Text>
          ) : (
            allergies.map(allergy => (
              <TouchableOpacity key={allergy.id} style={styles.item} onPress={() => setDetailModal({ visible: true, item: allergy, section: 'allergies' })} onLongPress={() => setActionModal({ visible: true, id: allergy.id, title: allergy.allergen, section: 'allergies' })}>
                <AppIcon name="allergy" size={20} color={allergy.severity === 'severe' ? '#E53935' : allergy.severity === 'moderate' ? '#FB8C00' : colors.accent} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{allergy.allergen}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{allergy.person}</Text>
                </View>
                <Text style={[styles.badge, { backgroundColor: allergy.severity === 'severe' ? '#FFEBEE' : allergy.severity === 'moderate' ? '#FFF3E0' : '#E8F5E9', color: allergy.severity === 'severe' ? '#E53935' : allergy.severity === 'moderate' ? '#FB8C00' : '#43A047' }]}>
                  {allergy.severity === 'severe' ? t('health.severe') : allergy.severity === 'moderate' ? t('health.moderate') : t('health.mild')}
                </Text>
              </TouchableOpacity>
            ))
          )
        ))}

        {/* Growth */}
        {renderSection(t('health.growth'), 'growth', growth.length, 'growth', (
          growth.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('health.noGrowth')}</Text>
          ) : (
            growth.map(g => (
              <TouchableOpacity key={g.id} style={styles.item} onPress={() => setDetailModal({ visible: true, item: g, section: 'growth' })} onLongPress={() => setActionModal({ visible: true, id: g.id, title: g.person, section: 'growth' })}>
                <AppIcon name="growth" size={20} color={colors.accent} />
                <View style={styles.itemText}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{g.person}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{g.height} cm / {g.weight} kg — {g.date}</Text>
                </View>
              </TouchableOpacity>
            ))
          )
        ))}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {activeSection === 'medications' ? t('health.addMedication') :
               activeSection === 'appointments' ? t('health.addAppointment') :
               activeSection === 'vaccinations' ? t('health.addVaccination') :
               activeSection === 'allergies' ? t('health.addAllergy') :
               t('health.addGrowth')}
            </Text>
            <ScrollView>
              {/* Medication form */}
              {activeSection === 'medications' && (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.medicationName')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={medForm.name} onChangeText={(v) => setMedForm(f => ({ ...f, name: v }))} placeholder={t('health.medicationNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.person')}</Text>
                    <View style={styles.personRow}>
                      {persons.map(p => (
                        <TouchableOpacity key={p} style={[styles.personChip, { backgroundColor: medForm.person === p ? colors.accent : colors.inputBackground }]} onPress={() => setMedForm(f => ({ ...f, person: p }))}>
                          <Text style={{ color: medForm.person === p ? '#fff' : colors.text, fontSize: 13 }}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.dosage')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={medForm.dosage} onChangeText={(v) => setMedForm(f => ({ ...f, dosage: v }))} placeholder={t('health.dosagePlaceholder')} placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.frequency')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={medForm.frequency} onChangeText={(v) => setMedForm(f => ({ ...f, frequency: v }))} placeholder={t('health.frequencyPlaceholder')} placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.dateFrom')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('medDateFrom')}>
                        <Text style={{ color: medForm.dateFrom ? colors.text : colors.textDisabled, fontSize: 16 }}>{medForm.dateFrom || 'Velg dato'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.dateTo')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('medDateTo')}>
                        <Text style={{ color: medForm.dateTo ? colors.text : colors.textDisabled, fontSize: 16 }}>{medForm.dateTo || 'Velg dato'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.note')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={medForm.note} onChangeText={(v) => setMedForm(f => ({ ...f, note: v }))} placeholder={t('health.notePlaceholder')} placeholderTextColor={colors.textDisabled} />
                  </View>
                </>
              )}

              {/* Appointment form */}
              {activeSection === 'appointments' && (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.appointmentTitle')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={apptForm.title} onChangeText={(v) => setApptForm(f => ({ ...f, title: v }))} placeholder={t('health.appointmentTitlePlaceholder')} placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.person')}</Text>
                    <View style={styles.personRow}>
                      {persons.map(p => (
                        <TouchableOpacity key={p} style={[styles.personChip, { backgroundColor: apptForm.person === p ? colors.accent : colors.inputBackground }]} onPress={() => setApptForm(f => ({ ...f, person: p }))}>
                          <Text style={{ color: apptForm.person === p ? '#fff' : colors.text, fontSize: 13 }}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.date')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('apptDate')}>
                      <Text style={{ color: apptForm.date ? colors.text : colors.textDisabled, fontSize: 16 }}>{apptForm.date || 'Velg dato'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.startTime')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('apptStartTime')}>
                        <Text style={{ color: apptForm.startTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{apptForm.startTime || 'Velg tid'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.endTime')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('apptEndTime')}>
                        <Text style={{ color: apptForm.endTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{apptForm.endTime || 'Velg tid'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.location')}</Text>
                    <GooglePlacesInput
                      value={apptForm.location}
                      onChangeText={(v) => setApptForm(f => ({ ...f, location: v }))}
                      placeholder={t('health.locationPlaceholder')}
                      onSelect={(v) => setApptForm(f => ({ ...f, location: v }))}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.note')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={apptForm.note} onChangeText={(v) => setApptForm(f => ({ ...f, note: v }))} placeholder={t('health.notePlaceholder')} placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.reminder')}</Text>
                    <View style={styles.personRow}>
                      {['', t('health.reminder1Day'), t('health.reminder3Days'), t('health.reminder1Week')].map((r, i) => (
                        <TouchableOpacity key={i} style={[styles.personChip, { backgroundColor: apptForm.reminder === r ? colors.accent : colors.inputBackground }]} onPress={() => setApptForm(f => ({ ...f, reminder: r }))}>
                          <Text style={{ color: apptForm.reminder === r ? '#fff' : colors.text, fontSize: 13 }}>{r || t('health.noReminder')}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Vaccination form */}
              {activeSection === 'vaccinations' && (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.vaccinationName')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={vaccForm.name} onChangeText={(v) => setVaccForm(f => ({ ...f, name: v }))} placeholder={t('health.vaccinationNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.person')}</Text>
                    <View style={styles.personRow}>
                      {persons.map(p => (
                        <TouchableOpacity key={p} style={[styles.personChip, { backgroundColor: vaccForm.person === p ? colors.accent : colors.inputBackground }]} onPress={() => setVaccForm(f => ({ ...f, person: p }))}>
                          <Text style={{ color: vaccForm.person === p ? '#fff' : colors.text, fontSize: 13 }}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.date')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('vaccDate')}>
                      <Text style={{ color: vaccForm.date ? colors.text : colors.textDisabled, fontSize: 16 }}>{vaccForm.date || 'Velg dato'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.nextDue')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('vaccNextDue')}>
                      <Text style={{ color: vaccForm.nextDue ? colors.text : colors.textDisabled, fontSize: 16 }}>{vaccForm.nextDue || 'Velg dato'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.reminder')}</Text>
                    <View style={styles.personRow}>
                      {['', t('health.reminder1Day'), t('health.reminder3Days'), t('health.reminder1Week')].map((r, i) => (
                        <TouchableOpacity key={i} style={[styles.personChip, { backgroundColor: vaccForm.reminder === r ? colors.accent : colors.inputBackground }]} onPress={() => setVaccForm(f => ({ ...f, reminder: r }))}>
                          <Text style={{ color: vaccForm.reminder === r ? '#fff' : colors.text, fontSize: 13 }}>{r || t('health.noReminder')}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.location')}</Text>
                    <GooglePlacesInput
                      value={vaccForm.location}
                      onChangeText={(v) => setVaccForm(f => ({ ...f, location: v }))}
                      placeholder={t('health.locationPlaceholder')}
                      onSelect={(v) => setVaccForm(f => ({ ...f, location: v }))}
                    />
                  </View>
                </>
              )}

              {/* Allergy form */}
              {activeSection === 'allergies' && (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.allergen')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={allergyForm.allergen} onChangeText={(v) => setAllergyForm(f => ({ ...f, allergen: v }))} placeholder={t('health.allergenPlaceholder')} placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.person')}</Text>
                    <View style={styles.personRow}>
                      {persons.map(p => (
                        <TouchableOpacity key={p} style={[styles.personChip, { backgroundColor: allergyForm.person === p ? colors.accent : colors.inputBackground }]} onPress={() => setAllergyForm(f => ({ ...f, person: p }))}>
                          <Text style={{ color: allergyForm.person === p ? '#fff' : colors.text, fontSize: 13 }}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.severity')}</Text>
                    <View style={styles.personRow}>
                      {(['mild', 'moderate', 'severe'] as const).map(s => (
                        <TouchableOpacity key={s} style={[styles.personChip, { backgroundColor: allergyForm.severity === s ? (s === 'severe' ? '#E53935' : s === 'moderate' ? '#FB8C00' : '#43A047') : colors.inputBackground }]} onPress={() => setAllergyForm(f => ({ ...f, severity: s }))}>
                          <Text style={{ color: allergyForm.severity === s ? '#fff' : colors.text, fontSize: 13 }}>{t(`health.${s}`)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              {/* Growth form */}
              {activeSection === 'growth' && (
                <>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.person')}</Text>
                    <View style={styles.personRow}>
                      {persons.map(p => (
                        <TouchableOpacity key={p} style={[styles.personChip, { backgroundColor: growthForm.person === p ? colors.accent : colors.inputBackground }]} onPress={() => setGrowthForm(f => ({ ...f, person: p }))}>
                          <Text style={{ color: growthForm.person === p ? '#fff' : colors.text, fontSize: 13 }}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.height')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={growthForm.height} onChangeText={(v) => setGrowthForm(f => ({ ...f, height: v }))} placeholder="cm" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('health.weight')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={growthForm.weight} onChangeText={(v) => setGrowthForm(f => ({ ...f, weight: v }))} placeholder="kg" placeholderTextColor={colors.textDisabled} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.date')}</Text>
                    <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('growthDate')}>
                      <Text style={{ color: growthForm.date ? colors.text : colors.textDisabled, fontSize: 16 }}>{growthForm.date || 'Velg dato'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => setShowAddModal(false)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={handleAdd}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation */}
      <ActionModal
        visible={actionModal.visible}
        title={actionModal.title}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCancel={() => setActionModal({ visible: false, id: '', title: '', section: 'medications' })}
      />

      {/* Detail Modal */}
      <Modal visible={detailModal.visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
                {detailModal.section === 'medications' ? t('health.medications') :
                 detailModal.section === 'appointments' ? t('health.appointments') :
                 detailModal.section === 'vaccinations' ? t('health.vaccinations') :
                 detailModal.section === 'allergies' ? t('health.allergies') :
                 t('health.growth')}
              </Text>
              <TouchableOpacity onPress={() => setDetailModal({ visible: false, item: null, section: 'medications' })}>
                <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {detailModal.item && detailModal.section === 'medications' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.medicationName')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.person')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.person}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.dosage')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.dosage}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.frequency')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.frequency}</Text>
                  </View>
                  {detailModal.item.dateFrom && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.dateFrom')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.dateFrom}</Text>
                    </View>
                  )}
                  {detailModal.item.dateTo && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.dateTo')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.dateTo}</Text>
                    </View>
                  )}
                  {detailModal.item.note && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.note')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                    </View>
                  )}
                </>
              )}
              {detailModal.item && detailModal.section === 'appointments' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.appointmentTitle')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.title}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.person')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.person}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.date')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.date}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.startTime')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.startTime}{detailModal.item.endTime ? ` - ${detailModal.item.endTime}` : ''}</Text>
                  </View>
                  {detailModal.item.location && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.location')}</Text>
                      <Text style={[styles.detailValue, { color: colors.accent }]}>{detailModal.item.location}</Text>
                    </View>
                  )}
                  {detailModal.item.note && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.note')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                    </View>
                  )}
                  {detailModal.item.location && (() => {
                    const mapUrl = getStaticMapUrl(detailModal.item.location);
                    return mapUrl ? (
                      <TouchableOpacity style={{ marginTop: 12 }} onPress={() => Linking.openURL(getGoogleMapsUrl(detailModal.item.location))}>
                        <Image source={{ uri: mapUrl }} style={{ width: '100%', height: 150, borderRadius: 12 }} resizeMode="cover" />
                      </TouchableOpacity>
                    ) : null;
                  })()}
                </>
              )}
              {detailModal.item && detailModal.section === 'vaccinations' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.vaccinationName')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.name}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.person')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.person}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.date')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.date}</Text>
                  </View>
                  {detailModal.item.nextDue && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.nextDue')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.nextDue}</Text>
                    </View>
                  )}
                  {detailModal.item.location && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.location')}</Text>
                      <Text style={[styles.detailValue, { color: colors.accent }]}>{detailModal.item.location}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.status')}</Text>
                    <Text style={[styles.detailValue, { color: detailModal.item.status === 'completed' ? '#43A047' : '#FB8C00' }]}>{detailModal.item.status === 'completed' ? t('health.completed') : t('health.pending')}</Text>
                  </View>
                  {detailModal.item.location && (() => {
                    const mapUrl = getStaticMapUrl(detailModal.item.location);
                    return mapUrl ? (
                      <TouchableOpacity style={{ marginTop: 12 }} onPress={() => Linking.openURL(getGoogleMapsUrl(detailModal.item.location))}>
                        <Image source={{ uri: mapUrl }} style={{ width: '100%', height: 150, borderRadius: 12 }} resizeMode="cover" />
                      </TouchableOpacity>
                    ) : null;
                  })()}
                </>
              )}
              {detailModal.item && detailModal.section === 'allergies' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.allergen')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.allergen}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.person')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.person}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.severity')}</Text>
                    <Text style={[styles.detailValue, { color: detailModal.item.severity === 'severe' ? '#E53935' : detailModal.item.severity === 'moderate' ? '#FB8C00' : '#43A047' }]}>{detailModal.item.severity === 'severe' ? t('health.severe') : detailModal.item.severity === 'moderate' ? t('health.moderate') : t('health.mild')}</Text>
                  </View>
                  {detailModal.item.note && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.note')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                    </View>
                  )}
                </>
              )}
              {detailModal.item && detailModal.section === 'growth' && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.person')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.person}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.height')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.height} cm</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.weight')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.weight} kg</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.date')}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.date}</Text>
                  </View>
                  {detailModal.item.note && (
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t('health.note')}</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{detailModal.item.note}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => setDetailModal({ visible: false, item: null, section: 'medications' })}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accent }]} onPress={() => {
                const item = detailModal.item;
                const section = detailModal.section;
                setDetailModal({ visible: false, item: null, section: 'medications' });
                setActiveSection(section);
                setEditingItem({ id: item.id, section });
                setShowAddModal(true);
              }}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.edit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Center */}
      <HelpCenter
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('health.helpTitle')}
        sections={[
          { icon: '🏥', title: t('health.helpWhat'), text: t('health.helpWhatText') },
          { icon: '💊', title: t('health.helpMedications'), text: t('health.helpMedicationsText') },
          { icon: '📅', title: t('health.helpAppointments'), text: t('health.helpAppointmentsText') },
          { icon: '👉', title: t('health.helpHow'), text: t('health.helpHowText'), tip: t('health.helpTip') },
        ]}
      />

      <DatePickerModal
        visible={activePicker !== null}
        title={activePicker?.includes('Date') || activePicker?.includes('date') || activePicker?.includes('Due') ? t('health.date') : t('health.startTime')}
        mode={activePicker?.includes('Time') || activePicker?.includes('time') ? 'time' : 'date'}
        selectedValue={
          activePicker === 'medDateFrom' ? medForm.dateFrom :
          activePicker === 'medDateTo' ? medForm.dateTo :
          activePicker === 'apptDate' ? apptForm.date :
          activePicker === 'apptStartTime' ? apptForm.startTime :
          activePicker === 'apptEndTime' ? apptForm.endTime :
          activePicker === 'vaccDate' ? vaccForm.date :
          activePicker === 'vaccNextDue' ? vaccForm.nextDue :
          activePicker === 'growthDate' ? growthForm.date : ''
        }
        onSelect={(value) => {
          if (activePicker === 'medDateFrom') setMedForm(f => ({ ...f, dateFrom: value }));
          else if (activePicker === 'medDateTo') setMedForm(f => ({ ...f, dateTo: value }));
          else if (activePicker === 'apptDate') setApptForm(f => ({ ...f, date: value }));
          else if (activePicker === 'apptStartTime') setApptForm(f => ({ ...f, startTime: value }));
          else if (activePicker === 'apptEndTime') setApptForm(f => ({ ...f, endTime: value }));
          else if (activePicker === 'vaccDate') setVaccForm(f => ({ ...f, date: value }));
          else if (activePicker === 'vaccNextDue') setVaccForm(f => ({ ...f, nextDue: value }));
          else if (activePicker === 'growthDate') setGrowthForm(f => ({ ...f, date: value }));
          setActivePicker(null);
        }}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  screenTitle: { fontSize: 28, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  section: { borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionCount: { fontSize: 12 },
  addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 10 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12 },
  badge: { fontSize: 11, fontWeight: '600', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderRadius: 10, padding: 14, fontSize: 16 },
  personRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '600' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailLabel: { fontSize: 14, fontWeight: '600' },
  detailValue: { fontSize: 14, flex: 1, textAlign: 'right' },
});
