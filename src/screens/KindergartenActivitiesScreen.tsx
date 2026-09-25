import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { KindergartenChild, KindergartenYear, KindergartenActivity } from '../types';
import { useUserStore } from '../store/userStore';
import { getKindergartenActivities, addKindergartenActivity, updateKindergartenActivity } from '../services/kindergartenService';
import { formatDate, getTodayLocal } from '../utils/dateUtils';
import { crossAlert } from '../utils/alert';
import { REMINDER_OPTIONS } from '../constants/reminderOptions';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import { DatePickerModal } from '../components/DatePickerModal';
import { getFamilyMembersWithRoles } from '../services/familyService';

const KG_THEME = MODULE_COLORS.kindergarten;

interface Props {
  navigation: any;
  route: { params: { child: KindergartenChild; selectedYear: KindergartenYear | null; editActivityId?: string; editActivityData?: any; openAddSection?: string } };
}

export const KindergartenActivitiesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child, selectedYear } = route.params;
  const familyId = useUserStore((state) => state.familyId);
  const user = useUserStore((state) => state.user);
  const [activities, setActivities] = useState<KindergartenActivity[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [persons, setPersons] = useState<string[]>([]);
  const [selectedPersons, setSelectedPersons] = useState<string[]>([]);
  const [activityForm, setActivityForm] = useState({
    title: '', activityType: 'tur' as 'tur' | 'aktivitet' | 'møte',
    dateFrom: getTodayLocal(), dateTo: getTodayLocal(),
    startTime: '10:00', endTime: '11:00',
    location: '', note: '', reminder: 0,
    documents: [] as { url: string; fileName: string; type: 'image' | 'document' }[],
  });

  const loadActivities = useCallback(async () => {
    if (!familyId || !child) return;
    const data = await getKindergartenActivities(familyId, child.id);
    setActivities(data);
  }, [familyId, child]);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  useEffect(() => {
    if (familyId) {
      getFamilyMembersWithRoles(familyId).then((members) => {
        setPersons(members.map(m => m.profile.displayName?.split(' ')[0] || 'Medlem'));
      }).catch(() => {});
    }
  }, [familyId]);

  useEffect(() => {
    if (route?.params?.openAddSection === 'activities') {
      setShowAddModal(true);
      if (child?.name) {
        setSelectedPersons([child.name.split(' ')[0]]);
      }
      navigation.setParams({ openAddSection: undefined, childId: undefined } as any);
    }
  }, [route?.params?.openAddSection]);

  // Handle editActivityId for editing existing activities
  useEffect(() => {
    if (route?.params?.editActivityId && route?.params?.editActivityData) {
      const data = route.params.editActivityData;
      setActivityForm({
        title: data.title || '',
        activityType: data.activityType || 'tur',
        dateFrom: data.dateFrom || getTodayLocal(),
        dateTo: data.dateTo || getTodayLocal(),
        startTime: data.startTime || '10:00',
        endTime: data.endTime || '11:00',
        location: data.location || '',
        note: data.note || '',
        reminder: data.reminder || 0,
        documents: data.documents || [],
      });
      setSelectedPersons(data.selectedPersons || []);
      setEditingActivityId(route.params.editActivityId);
      setShowAddModal(true);
      navigation.setParams({ editActivityId: undefined, editActivityData: undefined } as any);
    }
  }, [route?.params?.editActivityId]);

  const handleSave = async () => {
    if (!familyId || !selectedYear || !child) return;
    if (!activityForm.title.trim() || !activityForm.dateFrom) {
      crossAlert(t('common.error'), t('health.enterTitleAndDate'));
      return;
    }
    if (selectedPersons.length === 0) {
      crossAlert(t('common.error'), t('health.personRequired'));
      return;
    }
    try {
      if (editingActivityId) {
        await updateKindergartenActivity(familyId, editingActivityId, {
          ...activityForm,
          childId: child.id,
          yearId: selectedYear.id,
          familyId,
          createdBy: user?.uid || '',
          selectedPersons,
          reminder: String(activityForm.reminder),
        } as Partial<KindergartenActivity>);
      } else {
        await addKindergartenActivity({
          ...activityForm,
          childId: child.id,
          yearId: selectedYear.id,
          familyId,
          createdBy: user?.uid || '',
          selectedPersons,
          reminder: String(activityForm.reminder),
        });
      }
      setShowAddModal(false);
      setActivityForm({ title: '', activityType: 'tur', dateFrom: getTodayLocal(), dateTo: getTodayLocal(), startTime: '10:00', endTime: '11:00', location: '', note: '', reminder: 0, documents: [] });
      setSelectedPersons([]);
      setEditingActivityId(null);
      loadActivities();
    } catch (e) {
      crossAlert(t('common.error'), t('common.error'));
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const sorted = [...activities].sort((a, b) => {
    const aPast = (a.dateTo || a.dateFrom) < today;
    const bPast = (b.dateTo || b.dateFrom) < today;
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;
    if (aPast && bPast) return (b.dateFrom || '').localeCompare(a.dateFrom || '');
    return (a.dateFrom || '').localeCompare(b.dateFrom || '');
  });

  const getDaysUntil = (dateStr: string): string => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return t('health.past');
    if (diff === 0) return t('health.today');
    if (diff === 1) return t('health.tomorrow');
    return t('health.inDays', { count: diff });
  };

  const isTimePicker = activePicker === 'startTime' || activePicker === 'endTime';
  const getPickerTitle = () => {
    if (activePicker === 'dateFrom') return t('kindergarten.holidayDateFrom');
    if (activePicker === 'dateTo') return t('kindergarten.holidayDateTo');
    if (activePicker === 'startTime') return t('kindergarten.holidayTimeFrom');
    if (activePicker === 'endTime') return t('kindergarten.holidayTimeTo');
    return '';
  };
  const getPickerValue = () => {
    if (!activePicker) return '';
    return activityForm[activePicker as keyof typeof activityForm] as string || '';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: KG_THEME, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: KG_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="activities" size={28} color={KG_THEME} />
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('school.activities')} {child.name}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppIcon name="activities" size={18} color={KG_THEME} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.activities')}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>({activities.length})</Text>
            </View>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: KG_THEME }]} onPress={() => setShowAddModal(true)}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
          {sorted.map(a => {
          const isPast = (a.dateTo || a.dateFrom) < today;
          return (
            <TouchableOpacity key={a.id} style={[styles.activityCard, { backgroundColor: colors.surface, opacity: isPast ? 0.6 : 1 }]} onPress={() => navigation.navigate('KindergartenActivityDetail', { activity: a, childId: child.id, yearId: selectedYear?.id, child, selectedYear })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.activityIcon, { backgroundColor: KG_THEME + '15' }]}>
                  <AppIcon name="activities" size={20} color={KG_THEME} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{a.title}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{formatDate(a.dateFrom)}{a.dateTo ? ` → ${formatDate(a.dateTo)}` : ''} {a.startTime ? `${a.startTime}–${a.endTime || ''}` : ''}</Text>
                </View>
                <Text style={[styles.badge, { backgroundColor: isPast ? '#E8F5E9' : '#FFF3E0', color: isPast ? '#43A047' : '#FB8C00' }]}>{isPast ? t('health.completed') : getDaysUntil(a.dateFrom)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {activities.length === 0 && (
          <View style={styles.emptyState}>
            <AppIcon name="activities" size={48} color={colors.textDisabled} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 8 }}>{t('school.noActivities')}</Text>
          </View>
        )}
        </View>
      </ScrollView>

      {/* Add Activity Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '85%' }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editingActivityId ? t('common.edit') : t('kindergarten.addActivity')}</Text>
                <ScrollView>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('school.activityType')}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {(['tur', 'aktivitet', 'møte'] as const).map((type) => (
                        <TouchableOpacity key={type} style={[styles.personChip, { backgroundColor: activityForm.activityType === type ? KG_THEME : colors.inputBackground }]} onPress={() => setActivityForm(f => ({ ...f, activityType: type }))}>
                          <Text style={{ color: activityForm.activityType === type ? '#fff' : colors.text, fontSize: 13 }}>{type === 'tur' ? t('school.activityTypeTur') : type === 'aktivitet' ? t('school.activityTypeAktivitet') : t('school.activityTypeMøte')}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('school.activityTitle')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={activityForm.title} onChangeText={(v) => setActivityForm(f => ({ ...f, title: v }))} placeholderTextColor={colors.textDisabled} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.personLabel')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {persons.map(p => {
                        const isSelected = selectedPersons.includes(p);
                        return (
                          <TouchableOpacity key={p} style={[styles.personChip, { backgroundColor: isSelected ? KG_THEME : colors.inputBackground }]} onPress={() => {
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
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.activityDateFrom')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('dateFrom')}>
                        <Text style={{ color: activityForm.dateFrom ? colors.text : colors.textDisabled, fontSize: 16 }}>{activityForm.dateFrom || 'Velg dato'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.activityDateTo')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('dateTo')}>
                        <Text style={{ color: activityForm.dateTo ? colors.text : colors.textDisabled, fontSize: 16 }}>{activityForm.dateTo || '—'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.activityStartTime')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('startTime')}>
                        <Text style={{ color: activityForm.startTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{activityForm.startTime || 'Velg tid'}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.activityEndTime')}</Text>
                      <TouchableOpacity style={[styles.input, { backgroundColor: colors.inputBackground }]} onPress={() => setActivePicker('endTime')}>
                        <Text style={{ color: activityForm.endTime ? colors.text : colors.textDisabled, fontSize: 16 }}>{activityForm.endTime || 'Velg tid'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('school.activityLocation')}</Text>
                    <GooglePlacesInput
                      value={activityForm.location}
                      onChangeText={(v) => setActivityForm(f => ({ ...f, location: v }))}
                      placeholder="Søk etter adresse..."
                      onSelect={(v) => setActivityForm(f => ({ ...f, location: v }))}
                    />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('school.activityNote')}</Text>
                    <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={activityForm.note} onChangeText={(v) => setActivityForm(f => ({ ...f, note: v }))} placeholderTextColor={colors.textDisabled} multiline numberOfLines={3} />
                  </View>
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('health.reminder')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {REMINDER_OPTIONS.map((option) => (
                        <TouchableOpacity key={option.value} style={[styles.personChip, { backgroundColor: activityForm.reminder === option.value ? KG_THEME : colors.inputBackground }]} onPress={() => setActivityForm(f => ({ ...f, reminder: option.value }))}>
                          <Text style={{ color: activityForm.reminder === option.value ? '#fff' : colors.text, fontSize: 13 }}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, paddingHorizontal: 16 }}>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground, flex: 1 }]} onPress={() => { setShowAddModal(false); setEditingActivityId(null); }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: KG_THEME, flex: 1 }]} onPress={handleSave}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <DatePickerModal
        visible={activePicker !== null}
        title={getPickerTitle()}
        mode={isTimePicker ? 'time' : 'date'}
        dateOffset={isTimePicker ? 0 : -365}
        dateCount={isTimePicker ? 48 : 730}
        selectedValue={getPickerValue()}
        onSelect={(v) => {
          if (activePicker) setActivityForm(f => ({ ...f, [activePicker]: v }));
          setActivePicker(null);
        }}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  screenTitle: { fontSize: 22, fontWeight: '700' },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  activityCard: { padding: 12, borderRadius: 10, marginBottom: 6 },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  badge: { fontSize: 11, fontWeight: '600', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  section: { borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#e8e8e8' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  field: { marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, borderColor: '#e0e0e0' },
  personChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
