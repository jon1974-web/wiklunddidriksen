import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { AppIcon } from '../components/AppIcon';
import { MODULE_COLORS } from '../constants/moduleColors';
import { SchoolChild, SchoolYear, SchoolContact } from '../types';
import { useUserStore } from '../store/userStore';
import { getSchoolContacts, addSchoolContact, updateSchoolContact, deleteSchoolContact } from '../services/schoolService';
import { crossAlert } from '../utils/alert';
import { ActionModal } from '../components/ActionModal';

const SCHOOL_THEME = MODULE_COLORS.school;

const ADMIN_ROLES: Record<string, { label: string; color: string }> = {
  rektor: { label: 'Rektor', color: '#E53935' },
  assisterende_rektor: { label: 'Ass. rektor', color: '#FB8C00' },
  avdelingsleder: { label: 'Avdelingsleder', color: '#FDD835' },
  rådgiver: { label: 'Rådgiver', color: '#66BB6A' },
  helsesykepleier: { label: 'Helsesykepleier', color: '#42A5F5' },
  miljøterapeut: { label: 'Miljøterapeut', color: '#7E57C2' },
  sfoleder: { label: 'SFO-leder', color: '#EF5350' },
  kontorleder: { label: 'Kontorleder', color: '#FF7043' },
  driftsleder: { label: 'Driftsleder', color: '#8D6E63' },
  inspektør: { label: 'Inspektør', color: '#5C6BC0' },
  utdanningsleder: { label: 'Utdanningsleder', color: '#26A69A' },
  undervisningsleder: { label: 'Undervisningsleder', color: '#AB47BC' },
};

interface Props {
  navigation: any;
  route: { params: { child: SchoolChild; selectedYear: SchoolYear | null; years: SchoolYear[] } };
}

export const SchoolContactsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { child, selectedYear, years } = route.params;
  const familyId = useUserStore((state) => state.familyId);

  const [contacts, setContacts] = useState<SchoolContact[]>([]);
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState({ teachers: true, admins: true, classmates: true });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ role: 'teacher' as string, teacherType: '', adminType: [] as string[], name: '', subject: '', address: '', childName: '', parentName: '', parentPhone: '', parentEmail: '', parentName2: '', parentPhone2: '', parentEmail2: '', phone: '', email: '', notes: '' });
  const [actionModal, setActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });

  const loadContacts = useCallback(async () => {
    if (!familyId || !selectedYear?.id) return;
    const data = await getSchoolContacts(familyId, selectedYear.id);
    setContacts(data);
  }, [familyId, selectedYear]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const filteredTeachers = contacts.filter(c => c.role === 'teacher' && (!search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.subject || '').toLowerCase().includes(search.toLowerCase())));
  const filteredAdmins = contacts.filter(c => c.role === 'admin' && (!search || c.name.toLowerCase().includes(search.toLowerCase())));
  const filteredClassmates = contacts.filter(c => c.role === 'classmate' && (!search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.childName || '').toLowerCase().includes(search.toLowerCase())));

  const handleSave = async () => {
    if (!familyId || !selectedYear || !form.name.trim()) return;
    try {
      const data = { ...form, yearId: selectedYear.id, childId: child.id, familyId };
      if (editingId) { await updateSchoolContact(editingId, data); }
      else { await addSchoolContact(data); }
      setShowAddModal(false);
      setEditingId(null);
      setForm({ role: 'teacher', teacherType: '', adminType: [], name: '', subject: '', address: '', childName: '', parentName: '', parentPhone: '', parentEmail: '', parentName2: '', parentPhone2: '', parentEmail2: '', phone: '', email: '', notes: '' });
      loadContacts();
    } catch (e) { crossAlert(t('common.error'), t('common.error')); }
  };

  const renderContactCard = (c: SchoolContact) => (
    <TouchableOpacity key={c.id} style={[styles.contactCard, { backgroundColor: colors.inputBackground }]} onPress={() => navigation.navigate('SchoolContactDetail', { contact: c, childId: child.id, yearId: selectedYear?.id })} onLongPress={() => setActionModal({ visible: true, id: c.id, title: c.name })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{c.name}</Text>
          {c.teacherType && ['personal', 'contact', 'subject'].includes(c.teacherType) && (
            <View style={[styles.badge, { backgroundColor: c.teacherType === 'personal' ? MODULE_COLORS.schoolBg : c.teacherType === 'contact' ? MODULE_COLORS.tripsBg : MODULE_COLORS.birthdaysBg }]}>
              <Text style={{ color: c.teacherType === 'personal' ? MODULE_COLORS.school : c.teacherType === 'contact' ? MODULE_COLORS.trips : MODULE_COLORS.birthdays, fontSize: 10, fontWeight: '600' }}>
                {c.teacherType === 'personal' ? t('school.personalTeacher') : c.teacherType === 'contact' ? t('school.contactTeacher') : t('school.subjectTeacher')}
              </Text>
            </View>
          )}
          {c.subject ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>📚 {c.subject}</Text> : null}
          {c.parentName ? <Text style={{ color: colors.textSecondary, fontSize: 12 }}>👤 {c.parentName}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {c.phone && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: MODULE_COLORS.schoolBg }]} onPress={() => Linking.openURL(`tel:${c.phone!.replace(/\s/g, '')}`)}><AppIcon name="phone" size={14} color={MODULE_COLORS.school} /></TouchableOpacity>}
          {c.email && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: MODULE_COLORS.tripsBg }]} onPress={() => Linking.openURL(`mailto:${c.email}`)}><AppIcon name="email" size={14} color={MODULE_COLORS.trips} /></TouchableOpacity>}
        </View>
      </View>
    </TouchableOpacity>
  );

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { borderColor: SCHOOL_THEME }]}>
          <Text style={{ color: SCHOOL_THEME, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <AppIcon name="contacts" size={24} color={SCHOOL_THEME} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('school.contacts')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <TextInput style={[styles.searchInput, { backgroundColor: colors.inputBackground, color: colors.text }]} placeholder={t('school.searchHint')} placeholderTextColor={colors.textDisabled} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView style={{ flex: 1, padding: 12 }}>
        {/* Teachers */}
        <TouchableOpacity style={[styles.sectionHeader, { backgroundColor: colors.surface }]} onPress={() => toggleSection('teachers')}>
          <Text style={{ fontSize: 16 }}>👩‍🏫</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.teachersAndSubjects')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>({filteredTeachers.length})</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{expandedSections.teachers ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {expandedSections.teachers && filteredTeachers.map(renderContactCard)}
        {expandedSections.teachers && filteredTeachers.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noContacts')}</Text>}

        {/* Admins */}
        <TouchableOpacity style={[styles.sectionHeader, { backgroundColor: colors.surface }]} onPress={() => toggleSection('admins')}>
          <Text style={{ fontSize: 16 }}>🏥</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.healthAdmin')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>({filteredAdmins.length})</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{expandedSections.admins ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {expandedSections.admins && filteredAdmins.map(renderContactCard)}
        {expandedSections.admins && filteredAdmins.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noContacts')}</Text>}

        {/* Classmates */}
        <TouchableOpacity style={[styles.sectionHeader, { backgroundColor: colors.surface }]} onPress={() => toggleSection('classmates')}>
          <Text style={{ fontSize: 16 }}>👥</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.classmates')}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>({filteredClassmates.length})</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>{expandedSections.classmates ? '▼' : '▶'}</Text>
        </TouchableOpacity>
        {selectedYear && (
          <TouchableOpacity style={[styles.aiCard, { backgroundColor: MODULE_COLORS.petsBg }]} onPress={() => navigation.navigate('SchoolAI', { childId: child.id, yearId: selectedYear.id, familyId: familyId || '' })}>
            <Text style={{ fontSize: 20 }}>📸</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: MODULE_COLORS.pets, fontWeight: '600', fontSize: 14 }}>{t('school.importClassList')}</Text>
              <Text style={{ color: MODULE_COLORS.pets, fontSize: 12 }}>{t('school.aiDescription')}</Text>
            </View>
          </TouchableOpacity>
        )}
        {expandedSections.classmates && filteredClassmates.map(renderContactCard)}
        {expandedSections.classmates && filteredClassmates.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noContacts')}</Text>}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingId ? t('school.editContact') : t('school.addContact')}</Text>
              <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} placeholder={t('common.name')} placeholderTextColor={colors.textDisabled} />
              <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={form.phone} onChangeText={(v) => setForm(f => ({ ...f, phone: v }))} placeholder={t('common.phone')} placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
              <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={form.email} onChangeText={(v) => setForm(f => ({ ...f, email: v }))} placeholder={t('common.email')} placeholderTextColor={colors.textDisabled} keyboardType="email-address" />
              <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text }]} value={form.subject} onChangeText={(v) => setForm(f => ({ ...f, subject: v }))} placeholder={t('school.subject')} placeholderTextColor={colors.textDisabled} />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground, flex: 1 }]} onPress={() => setShowAddModal(false)}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: SCHOOL_THEME, flex: 1 }]} onPress={handleSave}>
                  <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ActionModal
        visible={actionModal.visible}
        title={actionModal.title}
        subtitle={t('school.contact')}
        onEdit={() => {
          const c = contacts.find(c => c.id === actionModal.id);
          if (c) { setForm({ role: c.role || 'teacher', teacherType: c.teacherType || '', adminType: (c as any).adminType || [], name: c.name, subject: c.subject || '', address: c.address || '', childName: c.childName || '', parentName: c.parentName || '', parentPhone: c.parentPhone || '', parentEmail: c.parentEmail || '', parentName2: c.parentName2 || '', parentPhone2: c.parentPhone2 || '', parentEmail2: c.parentEmail2 || '', phone: c.phone || '', email: c.email || '', notes: c.notes || '' }); setEditingId(c.id); setShowAddModal(true); }
          setActionModal({ visible: false, id: '', title: '' });
        }}
        onDelete={async () => { await deleteSchoolContact(actionModal.id); setActionModal({ visible: false, id: '', title: '' }); loadContacts(); }}
        onCancel={() => setActionModal({ visible: false, id: '', title: '' })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  searchInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontSize: 14, borderColor: '#e0e0e0' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  contactCard: { padding: 12, borderRadius: 10, marginBottom: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  actionBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8 },
  emptyText: { fontSize: 13, fontStyle: 'italic', padding: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 10, borderColor: '#e0e0e0' },
  modalBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
