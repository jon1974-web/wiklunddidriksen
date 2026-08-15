import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Modal, Image, ActivityIndicator, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { AppIcon } from '../components/AppIcon';
import { SearchableDropdown } from '../components/SearchableDropdown';
import { SearchableMultiDropdown } from '../components/SearchableMultiDropdown';
import { GooglePlacesInput } from '../components/GooglePlacesInput';
import * as ImagePicker from 'expo-image-picker';
import { crossAlert } from '../utils/alert';
import { MODULE_COLORS } from '../constants/moduleColors';
import { getErrorMessage } from '../utils/validation';
import {
  getSchoolChildren, addSchoolChild, updateSchoolChild, deleteSchoolChild,
  getSchoolYears, addSchoolYear, updateSchoolYear, deleteSchoolYear,
  getSchoolContacts, addSchoolContact, updateSchoolContact, deleteSchoolContact,
  getSchoolSchedules, addSchoolSchedule, deleteSchoolSchedule,
} from '../services/schoolService';
import { SchoolChild, SchoolYear, SchoolContact, SchoolSchedule } from '../types';
import { ActionModal } from '../components/ActionModal';
import { HelpCenter } from '../components/HelpCenter';

const SCHOOL_THEME = MODULE_COLORS.school;

interface SchoolSpaceScreenProps {
  navigation: any;
  route?: { params?: { editContactId?: string } };
}

const ADMIN_ROLES: Record<string, { label: string; color: string }> = {
  rektor: { label: 'Rektor', color: '#E53935' },
  assisterende_rektor: { label: 'Assisterende rektor', color: '#E57373' },
  undervisningsinspektør: { label: 'Undervisningsinspektør', color: '#FB8C00' },
  rådgivere: { label: 'Rådgivere', color: '#F9A825' },
  leder_aks_sfo: { label: 'Leder AKS/SFO', color: '#66BB6A' },
  baseleder_aks_sfo: { label: 'Baseleder AKS/SFO', color: '#81C784' },
  kontorleder: { label: 'Kontorleder', color: '#42A5F5' },
  driftsleder: { label: 'Driftsleder', color: '#5C6BC0' },
  ikt_ansvarlig: { label: 'IKT ansvarlig', color: '#7E57C2' },
  helsesykepleier: { label: 'Helsesykepleier', color: '#EC407A' },
  karriereveileder: { label: 'Karriereveileder', color: '#FF7043' },
  sosiallærer: { label: 'Sosiallærer', color: '#26A69A' },
};

const TEACHER_TYPES: Record<string, { nb: string; color: string }> = {
  personal: { nb: 'Klassekontaktlærer', color: '#43A047' },
  contact: { nb: 'Kontaktlærer', color: '#1976D2' },
  subject: { nb: 'Faglærer', color: '#FB8C00' },
};

const getAdminRoleColor = (key: string) => ADMIN_ROLES[key]?.color || '#607D8B';
const getAdminRoleLabel = (key: string) => ADMIN_ROLES[key]?.label || key;

export const SchoolSpaceScreen: React.FC<SchoolSpaceScreenProps> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const familyId = useUserStore((state) => state.familyId);

  const [children, setChildren] = useState<SchoolChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<SchoolChild | null>(null);
  const [years, setYears] = useState<SchoolYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<SchoolYear | null>(null);
  const [contacts, setContacts] = useState<SchoolContact[]>([]);
  const [schedules, setSchedules] = useState<SchoolSchedule[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [activeSemester, setActiveSemester] = useState<'høst' | 'vår'>('høst');

  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [childForm, setChildForm] = useState({ name: '', school: '', phone: '', email: '', photoUrl: '' });
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [childActionModal, setChildActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });

  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [yearForm, setYearForm] = useState({ year: '', grade: '', school: '' });
  const [editingYearId, setEditingYearId] = useState<string | null>(null);

  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ role: 'teacher' as 'teacher' | 'classmate', teacherType: '' as string, adminType: [] as string[], name: '', subject: '', address: '', childName: '', parentName: '', parentPhone: '', parentEmail: '', parentName2: '', parentPhone2: '', parentEmail2: '', phone: '', email: '', notes: '' });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactActionModal, setContactActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [yearActionModal, setYearActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });
  const [scheduleActionModal, setScheduleActionModal] = useState<{ visible: boolean; id: string; title: string }>({ visible: false, id: '', title: '' });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadChildren = useCallback(async () => {
    if (!familyId) return;
    try {
      const data = await getSchoolChildren(familyId);
      setChildren(data);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [familyId]);

  const loadYears = useCallback(async () => {
    if (!selectedChild || !familyId) return;
    try {
      const data = await getSchoolYears(familyId, selectedChild.id);
      setYears(data);
      if (data.length > 0 && !selectedYear) setSelectedYear(data[0]);
      else if (data.length === 0) setSelectedYear(null);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [selectedChild, familyId]);

  const loadYearData = useCallback(async () => {
    if (!selectedYear || !familyId) { setContacts([]); setSchedules([]); return; }
    try {
      const [c, s] = await Promise.all([
        getSchoolContacts(familyId, selectedYear.id, selectedChild?.id),
        getSchoolSchedules(familyId, selectedYear.id),
      ]);
      setContacts(c);
      setSchedules(s);
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  }, [selectedYear, familyId, selectedChild]);

  useEffect(() => { loadChildren(); }, [loadChildren]);
  useEffect(() => { if (selectedChild) loadYears(); }, [selectedChild, loadYears]);
  useEffect(() => { loadYearData(); }, [loadYearData]);

  useEffect(() => {
    if (route?.params?.editContactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === route.params!.editContactId);
      if (contact) {
        setEditingContactId(contact.id);
        setContactForm({
          role: contact.role || 'classmate',
          teacherType: (contact as any).teacherType || 'contact',
          adminType: Array.isArray((contact as any).adminType) ? (contact as any).adminType : (contact as any).adminType ? [(contact as any).adminType] : [],
          name: contact.name || '',
          subject: contact.subject || '',
          address: contact.address || '',
          childName: contact.childName || '',
          parentName: contact.parentName || '',
          parentPhone: contact.parentPhone || '',
          parentEmail: contact.parentEmail || '',
          parentName2: contact.parentName2 || '',
          parentPhone2: contact.parentPhone2 || '',
          parentEmail2: contact.parentEmail2 || '',
          phone: contact.childPhone || contact.phone || '',
          email: contact.childEmail || contact.email || '',
          notes: contact.notes || '',
        });
        setShowAddContactModal(true);
        navigation.setParams({ editContactId: undefined });
      }
    }
  }, [route?.params?.editContactId, contacts]);

  useEffect(() => {
    if (selectedChild && years.length > 0 && !selectedYear) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedChild]);

  const handleSaveChild = async () => {
    if (!familyId) return;
    if (!childForm.name.trim()) { crossAlert('Error', t('school.enterChildName')); return; }
    try {
      let photoUrl = childForm.photoUrl;
      if (photoUrl && !photoUrl.startsWith('http')) {
        const { webUploadFile } = await import('../services/webStorage');
        let blob: Blob;
        if (photoUrl.startsWith('data:')) {
          const byteString = atob(photoUrl.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
          blob = new Blob([ab], { type: 'image/jpeg' });
        } else {
          const response = await fetch(photoUrl);
          blob = await response.blob();
        }
        photoUrl = await webUploadFile(`school-children/${familyId}_${Date.now()}.jpg`, blob);
      }
      const data = { ...childForm, photoUrl, familyId };
      if (editingChildId) {
        await updateSchoolChild(editingChildId, data as any);
      } else {
        await addSchoolChild(data as any);
      }
      setChildForm({ name: '', school: '', phone: '', email: '', photoUrl: '' });
      setEditingChildId(null);
      setShowAddChildModal(false);
      loadChildren();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDeleteChild = async () => {
    if (!childActionModal.id) return;
    try {
      await deleteSchoolChild(childActionModal.id);
      setChildActionModal({ visible: false, id: '', title: '' });
      setSelectedChild(null);
      loadChildren();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleEditChild = () => {
    const child = children.find(c => c.id === childActionModal.id);
    if (!child) return;
    setChildForm({ name: child.name, school: child.school || '', phone: child.phone || '', email: child.email || '', photoUrl: child.photoUrl || '' });
    setEditingChildId(child.id);
    setChildActionModal({ visible: false, id: '', title: '' });
    setShowAddChildModal(true);
  };

  const handleAddYear = async () => {
    if (!familyId || !selectedChild) return;
    if (!yearForm.year.trim()) { crossAlert('Error', t('school.enterYear')); return; }
    try {
      if (editingYearId) {
        await updateSchoolYear(editingYearId, yearForm);
      } else {
        await addSchoolYear({ ...yearForm, childId: selectedChild.id, familyId });
      }
      setYearForm({ year: '', grade: '', school: '' });
      setEditingYearId(null);
      setShowAddYearModal(false);
      loadYears();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleSaveContact = async () => {
    if (!familyId || !selectedChild || !selectedYear) return;
    if (!contactForm.name.trim()) { crossAlert('Error', t('school.enterContactName')); return; }
    if (contactForm.role === 'teacher' && !contactForm.teacherType) { crossAlert('Error', 'Velg en lærertype'); return; }
    try {
      const rawData: Record<string, any> = {
        role: contactForm.role,
        teacherType: contactForm.teacherType || '',
        adminType: contactForm.adminType.length > 0 ? contactForm.adminType : [],
        name: contactForm.name,
        subject: contactForm.subject || '',
        address: contactForm.address || '',
        phone: contactForm.phone || '',
        email: contactForm.email || '',
        parentName: contactForm.parentName || '',
        parentPhone: contactForm.parentPhone || '',
        parentEmail: contactForm.parentEmail || '',
        parentName2: contactForm.parentName2 || '',
        parentPhone2: contactForm.parentPhone2 || '',
        parentEmail2: contactForm.parentEmail2 || '',
        notes: contactForm.notes || '',
        childId: selectedChild.id,
        yearId: selectedYear.id,
        familyId,
      };
      if (contactForm.role === 'classmate') {
        rawData.childName = contactForm.name;
        rawData.childPhone = contactForm.phone || '';
        rawData.childEmail = contactForm.email || '';
      }
      if (editingContactId) {
        await updateSchoolContact(editingContactId, rawData as any);
      } else {
        await addSchoolContact(rawData as any);
      }
      setContactForm({ role: 'teacher', teacherType: '', adminType: [], name: '', subject: '', address: '', childName: '', parentName: '', parentPhone: '', parentEmail: '', parentName2: '', parentPhone2: '', parentEmail2: '', phone: '', email: '', notes: '' });
      setEditingContactId(null);
      setShowAddContactModal(false);
      loadYearData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDeleteContact = async () => {
    if (!contactActionModal.id) return;
    try {
      await deleteSchoolContact(contactActionModal.id);
      setContactActionModal({ visible: false, id: '', title: '' });
      loadYearData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDeleteYear = async () => {
    if (!yearActionModal.id) return;
    try {
      await deleteSchoolYear(yearActionModal.id);
      setYearActionModal({ visible: false, id: '', title: '' });
      setSelectedYear(null);
      loadYears();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleEditYear = () => {
    const year = years.find(y => y.id === yearActionModal.id);
    if (!year) return;
    setYearForm({ year: year.year, grade: year.grade || '', school: year.school || '' });
    setEditingYearId(year.id);
    setYearActionModal({ visible: false, id: '', title: '' });
    setShowAddYearModal(true);
  };

  const handleEditContact = () => {
    const contact = contacts.find(c => c.id === contactActionModal.id);
    if (!contact) return;
    const isTeacher = contact.role === 'teacher' || contact.role === 'admin';
    setContactForm({
      role: contact.role,
      teacherType: (contact as any).teacherType || 'contact',
      adminType: Array.isArray((contact as any).adminType) ? (contact as any).adminType : (contact as any).adminType ? [(contact as any).adminType] : [],
      name: contact.name,
      subject: contact.subject || '',
      childName: (contact as any).childName || '',
      parentName: contact.parentName || '',
      parentPhone: contact.parentPhone || '',
      parentEmail: contact.parentEmail || '',
      parentName2: contact.parentName2 || '',
      parentPhone2: contact.parentPhone2 || '',
      parentEmail2: contact.parentEmail2 || '',
      address: contact.address || '',
      phone: isTeacher ? (contact.phone || '') : (contact.childPhone || ''),
      email: isTeacher ? (contact.email || '') : (contact.childEmail || ''),
      notes: contact.notes || '',
    });
    setEditingContactId(contact.id);
    setContactActionModal({ visible: false, id: '', title: '' });
    setShowAddContactModal(true);
  };

  const handleAddSchedule = async () => {
    if (!familyId || !selectedChild || !selectedYear) return;
    try {
      const { webUploadFile } = await import('../services/webStorage');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], quality: 0.7, base64: true,
      });
      if (result.canceled || !result.assets[0]) return;
      setLoading(true);
      const asset = result.assets[0];
      const fileName = `schedule_${Date.now()}.jpg`;
      const path = `school-schedules/${fileName}`;
      let blob: Blob;
      if (asset.base64 && Platform.OS === 'web') {
        const byteString = atob(asset.base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        blob = new Blob([ab], { type: 'image/jpeg' });
      } else {
        const response = await fetch(asset.uri);
        blob = await response.blob();
      }
      const url = await webUploadFile(path, blob);
      await addSchoolSchedule({
        yearId: selectedYear.id, childId: selectedChild.id,
        semester: activeSemester, imageUrl: url, fileName, familyId,
      });
      setLoading(false);
      loadYearData();
    } catch (error) {
      setLoading(false);
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteSchoolSchedule(id);
      loadYearData();
    } catch (error) {
      crossAlert('Error', getErrorMessage(error));
    }
  };

  const teachers = contacts.filter(c => c.role === 'teacher').sort((a, b) => {
    const order = { personal: 0, contact: 1, subject: 2 };
    return (order[a.teacherType || 'contact'] ?? 1) - (order[b.teacherType || 'contact'] ?? 1);
  });
  const admins = contacts.filter(c => c.role === 'admin').sort((a, b) => {
    const aType = (Array.isArray((a as any).adminType) ? (a as any).adminType[0] : (a as any).adminType || 'zzz').toLowerCase();
    const bType = (Array.isArray((b as any).adminType) ? (b as any).adminType[0] : (b as any).adminType || 'zzz').toLowerCase();
    return bType.localeCompare(aType);
  });
  const classmates = contacts.filter(c => c.role === 'classmate');
  const filteredClassmates = classmates.filter(c => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.parentName?.toLowerCase().includes(q);
  });
  const filteredTeachers = teachers.filter(c => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    const teacherType = (c as any).teacherType || '';
    const typeLabel = teacherType === 'personal' ? t('school.personalTeacher') : teacherType === 'contact' ? t('school.contactTeacher') : teacherType === 'subject' ? t('school.subjectTeacher') : '';
    return c.name.toLowerCase().includes(q) || typeLabel.toLowerCase().includes(q);
  });
  const filteredAdmins = admins.filter(c => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    const adminTypes = Array.isArray((c as any).adminType) ? (c as any).adminType : [(c as any).adminType || ''];
    const roleLabels = adminTypes.map((t: string) => getAdminRoleLabel(t).toLowerCase());
    return c.name.toLowerCase().includes(q) || roleLabels.some((l: string) => l.includes(q));
  });

  const renderContactActions = (phone?: string, email?: string) => (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
      {phone ? (
        <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => Linking.openURL(`tel:${phone}`)}>
          <Text style={{ fontSize: 12 }}>📞 {t('school.call')}</Text>
        </TouchableOpacity>
      ) : null}
      {phone ? (
        <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => { navigator.clipboard?.writeText(phone); }}>
          <Text style={{ fontSize: 12 }}>📋 {t('school.copy')}</Text>
        </TouchableOpacity>
      ) : null}
      {email ? (
        <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => Linking.openURL(`mailto:${email}`)}>
          <Text style={{ fontSize: 12 }}>✉️ {t('school.email')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderGrid = () => (
    <>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: MODULE_COLORS.school, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: MODULE_COLORS.school, fontSize: 18 }}>←</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppIcon name="activities" size={28} color={SCHOOL_THEME} />
          <Text style={[styles.screenTitle, { color: colors.text }]}>{t('school.title')}</Text>
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
        <Text style={[styles.gridSubtitle, { color: colors.textSecondary }]}>{children.length > 0 ? `${children.length} ${children.length === 1 ? 'barn' : 'barn'} på skole` : t('school.ourChildren')}</Text>
        <View style={styles.grid}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.gridTile, { backgroundColor: colors.surface }]}
              onPress={() => setSelectedChild(child)}
              onLongPress={() => setChildActionModal({ visible: true, id: child.id, title: child.name })}
            >
              {child.photoUrl ? (
                <Image source={{ uri: child.photoUrl }} style={styles.gridPhoto} />
              ) : (
                <Text style={styles.gridEmoji}>👧</Text>
              )}
              <Text style={[styles.gridName, { color: colors.text }]} numberOfLines={1}>{child.name}</Text>
              {child.school ? <Text style={[styles.gridSub, { color: colors.textSecondary }]} numberOfLines={1}>{child.school}</Text> : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.gridTile, styles.gridTileAdd, { borderColor: colors.textDisabled }]}
            onPress={() => { setEditingChildId(null); setChildForm({ name: '', school: '', phone: '', email: '', photoUrl: '' }); setShowAddChildModal(true); }}
          >
            <Text style={[styles.gridEmoji, { color: colors.textDisabled }]}>+</Text>
            <Text style={[styles.gridName, { color: colors.textDisabled }]}>{t('school.addChild')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showAddChildModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingChildId ? t('school.editChild') : t('school.addChild')}</Text>
            <ScrollView>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('school.name')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={childForm.name} onChangeText={(v) => setChildForm(f => ({ ...f, name: v }))} placeholder={t('school.namePlaceholder')} placeholderTextColor={colors.textDisabled} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('school.school')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={childForm.school} onChangeText={(v) => setChildForm(f => ({ ...f, school: v }))} placeholderTextColor={colors.textDisabled} />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('school.phone')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={childForm.phone} onChangeText={(v) => setChildForm(f => ({ ...f, phone: v }))} placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('school.email')}</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={childForm.email} onChangeText={(v) => setChildForm(f => ({ ...f, email: v }))} placeholderTextColor={colors.textDisabled} keyboardType="email-address" />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>{t('school.photo')}</Text>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: colors.inputBackground, flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                  onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
                    if (!result.canceled && result.assets[0]) {
                      setChildForm(f => ({ ...f, photoUrl: result.assets[0].uri }));
                    }
                  }}
                >
                  {childForm.photoUrl ? (
                    <Image source={{ uri: childForm.photoUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.inputBackground, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>📷</Text>
                    </View>
                  )}
                  <Text style={{ color: colors.text, fontSize: 14 }}>{childForm.photoUrl ? 'Endre bilde' : 'Velg bilde'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setShowAddChildModal(false); setEditingChildId(null); }}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: SCHOOL_THEME }]} onPress={handleSaveChild}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ActionModal visible={childActionModal.visible} title={childActionModal.title} onEdit={handleEditChild} onDelete={handleDeleteChild} onCancel={() => setChildActionModal({ visible: false, id: '', title: '' })} accentColor={SCHOOL_THEME} />
    </>
  );

  const renderDetail = () => {
    if (!selectedChild) return null;
    return (
      <>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <TouchableOpacity onPress={() => { setSelectedChild(null); setSelectedYear(null); }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: MODULE_COLORS.school, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: MODULE_COLORS.school, fontSize: 18 }}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, marginTop: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {selectedChild.photoUrl ? (
              <Image source={{ uri: selectedChild.photoUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
            ) : (
              <Text style={{ fontSize: 28 }}>👧</Text>
            )}
            <View>
              <Text style={[styles.screenTitle, { color: colors.text, fontSize: 22 }]}>{selectedChild.name}</Text>
              {(selectedYear?.school || selectedChild.school) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="house" size={12} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{selectedYear?.school || selectedChild.school}</Text>
                </View>
              )}
              {(selectedYear?.grade || (selectedChild as any).grade) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="person" size={12} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{selectedYear?.grade || (selectedChild as any).grade}</Text>
                </View>
              )}
              {selectedYear && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="calendar" size={12} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{selectedYear.year}</Text>
                </View>
              )}
              {selectedChild.phone ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="phone" size={12} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{selectedChild.phone}</Text>
                </View>
              ) : null}
              {selectedChild.email ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <AppIcon name="email" size={12} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{selectedChild.email}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Year Selector */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.schoolYears')}</Text>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: SCHOOL_THEME }]} onPress={() => { setYearForm({ year: '', grade: '', school: '' }); setShowAddYearModal(true); }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>+ {t('school.newYear')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {years.map(y => (
              <TouchableOpacity key={y.id} style={[styles.yearTab, { backgroundColor: selectedYear?.id === y.id ? SCHOOL_THEME : colors.inputBackground }]} onPress={() => setSelectedYear(y)} onLongPress={() => setYearActionModal({ visible: true, id: y.id, title: y.year })}>
                {y.school ? <Text style={{ color: selectedYear?.id === y.id ? 'rgba(255,255,255,0.7)' : colors.textSecondary, fontSize: 10 }}>{y.school}</Text> : null}
                {y.grade ? <Text style={{ color: selectedYear?.id === y.id ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}>{y.grade}</Text> : null}
                <Text style={{ color: selectedYear?.id === y.id ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{y.year}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {years.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noYears')}</Text>}

          {selectedYear && (
            <>
              {/* Contacts Section */}
              <View style={[styles.section, { backgroundColor: colors.surface, marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
                <TextInput style={[styles.searchInput, { backgroundColor: colors.inputBackground, color: colors.text }]} placeholder={t('school.searchHint')} placeholderTextColor={colors.textDisabled} value={contactSearch} onChangeText={setContactSearch} />
              </View>
              {/* Teachers Section */}
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionIcon}>👩‍🏫</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.teachersAndSubjects')}</Text>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({filteredTeachers.length})</Text>
                  </View>
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: SCHOOL_THEME }]} onPress={() => { setEditingContactId(null); setContactForm({ role: 'teacher', teacherType: '', adminType: [], name: '', subject: '', address: '', childName: '', parentName: '', parentPhone: '', parentEmail: '', parentName2: '', parentPhone2: '', parentEmail2: '', phone: '', email: '', notes: '' }); setShowAddContactModal(true); }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
                  </TouchableOpacity>
                </View>
                {filteredTeachers.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.contactCard, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('SchoolContactDetail', { contact: c, childId: selectedChild?.id, yearId: selectedYear?.id })} onLongPress={() => setContactActionModal({ visible: true, id: c.id, title: c.name })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.contactName, { color: colors.text }]}>{c.name}</Text>
                        {['personal', 'contact', 'subject'].includes(c.teacherType || '') && (
                          <View style={[styles.teacherTypeBadge, { backgroundColor: c.teacherType === 'personal' ? '#E8F5E9' : c.teacherType === 'contact' ? '#E3F2FD' : '#FFF3E0' }]}>
                            <Text style={{ color: c.teacherType === 'personal' ? '#43A047' : c.teacherType === 'contact' ? '#1976D2' : '#FB8C00', fontSize: 10, fontWeight: '600' }}>
                              {c.teacherType === 'personal' ? t('school.personalTeacher') : c.teacherType === 'contact' ? t('school.contactTeacher') : t('school.subjectTeacher')}
                            </Text>
                          </View>
                        )}
                        {c.subject ? <Text style={{ color: colors.textSecondary, fontSize: 13 }}>📚 {c.subject}</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {c.phone && <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => Linking.openURL(`tel:${c.phone!.replace(/\s/g, '')}`)}><AppIcon name="phone" size={16} color="#43A047" /></TouchableOpacity>}
                        {c.email && <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => Linking.openURL(`mailto:${c.email}`)}><AppIcon name="email" size={16} color="#1976D2" /></TouchableOpacity>}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {filteredTeachers.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noContacts')}</Text>}
              </View>

              {/* Helse og administrasjon Section */}
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionIcon}>🏥</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.healthAdmin')}</Text>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({filteredAdmins.length})</Text>
                  </View>
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: SCHOOL_THEME }]} onPress={() => { setEditingContactId(null); setContactForm({ role: 'admin', teacherType: '', adminType: [], name: '', subject: '', address: '', childName: '', parentName: '', parentPhone: '', parentEmail: '', parentName2: '', parentPhone2: '', parentEmail2: '', phone: '', email: '', notes: '' }); setShowAddContactModal(true); }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
                  </TouchableOpacity>
                </View>
                {filteredAdmins.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.contactCard, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('SchoolContactDetail', { contact: c, childId: selectedChild?.id, yearId: selectedYear?.id })} onLongPress={() => setContactActionModal({ visible: true, id: c.id, title: c.name })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.contactName, { color: colors.text }]}>{c.name}</Text>
                        {Array.isArray((c as any).adminType) && (c as any).adminType.length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {(c as any).adminType.map((role: string) => (
                              <View key={role} style={[styles.teacherTypeBadge, { backgroundColor: getAdminRoleColor(role) + '20' }]}>
                                <Text style={{ color: getAdminRoleColor(role), fontSize: 10, fontWeight: '600' }}>
                                  {getAdminRoleLabel(role)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                        {c.subject ? <Text style={{ color: colors.textSecondary, fontSize: 13 }}>🏥 {c.subject}</Text> : null}
                        {c.notes ? <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>📝 {c.notes}</Text> : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {c.phone && <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => Linking.openURL(`tel:${c.phone!.replace(/\s/g, '')}`)}><AppIcon name="phone" size={16} color="#43A047" /></TouchableOpacity>}
                        {c.email && <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E3F2FD' }]} onPress={() => Linking.openURL(`mailto:${c.email}`)}><AppIcon name="email" size={16} color="#1976D2" /></TouchableOpacity>}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                {filteredAdmins.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noContacts')}</Text>}
              </View>

              {/* Classmates Section */}
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Text style={styles.sectionIcon}>👥</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.classmates')}</Text>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>({filteredClassmates.length})</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.addButton, { backgroundColor: SCHOOL_THEME }]} onPress={() => { setEditingContactId(null); setContactForm({ role: 'classmate', name: '', subject: '', address: '', childName: '', parentName: '', parentPhone: '', parentEmail: '', parentName2: '', parentPhone2: '', parentEmail2: '', phone: '', email: '', notes: '' }); setShowAddContactModal(true); }}>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {filteredClassmates.map(c => (
                  <TouchableOpacity key={c.id} style={[styles.contactCard, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('SchoolContactDetail', { contact: c, childId: selectedChild?.id, yearId: selectedYear?.id })} onLongPress={() => setContactActionModal({ visible: true, id: c.id, title: c.name })}>
                    <Text style={[styles.contactName, { color: colors.text, marginBottom: 6 }]}>{c.name}</Text>
                    {c.parentName ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>👤 {c.parentName}</Text>
                        <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => Linking.openURL(`tel:${c.parentPhone?.replace(/\s/g, '')}`)}><AppIcon name="phone" size={16} color="#43A047" /></TouchableOpacity>
                      </View>
                    ) : null}
                    {c.parentName2 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>👤 {c.parentName2}</Text>
                        <TouchableOpacity style={[styles.contactActionBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => Linking.openURL(`tel:${c.parentPhone2?.replace(/\s/g, '')}`)}><AppIcon name="phone" size={16} color="#43A047" /></TouchableOpacity>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
                {filteredClassmates.length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noContacts')}</Text>}
              </View>

              {/* Schedule Section */}
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <AppIcon name="calendar" size={18} color={SCHOOL_THEME} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('school.schedule')}</Text>
                  </View>
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: SCHOOL_THEME }]} onPress={handleAddSchedule}>
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>+</Text>}
                  </TouchableOpacity>
                </View>
                <View style={styles.semesterTabs}>
                  <TouchableOpacity style={[styles.semesterTab, { backgroundColor: activeSemester === 'høst' ? SCHOOL_THEME : colors.inputBackground }]} onPress={() => setActiveSemester('høst')}>
                    <Text style={{ color: activeSemester === 'høst' ? '#fff' : colors.text, fontWeight: '600', fontSize: 14 }}>{t('school.autumn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.semesterTab, { backgroundColor: activeSemester === 'vår' ? SCHOOL_THEME : colors.inputBackground }]} onPress={() => setActiveSemester('vår')}>
                    <Text style={{ color: activeSemester === 'vår' ? '#fff' : colors.text, fontWeight: '600', fontSize: 14 }}>{t('school.spring')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.scheduleGrid}>
                  {schedules.filter(s => s.semester === activeSemester).map(s => (
                    <TouchableOpacity key={s.id} style={styles.scheduleThumb} onPress={() => setViewingImage(s.imageUrl)} onLongPress={() => setScheduleActionModal({ visible: true, id: s.id, title: t('school.schedule') })}>
                      <Image source={{ uri: s.imageUrl }} style={styles.scheduleImage} />
                    </TouchableOpacity>
                  ))}
                </View>
                {schedules.filter(s => s.semester === activeSemester).length === 0 && <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('school.noSchedule')}</Text>}
              </View>
            </>
          )}
        </ScrollView>

        {/* Add Year Modal */}
        <Modal visible={showAddYearModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingYearId ? t('school.editYear') : t('school.addYear')}</Text>
              <ScrollView>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('school.year')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={yearForm.year} onChangeText={(v) => setYearForm(f => ({ ...f, year: v }))} placeholder={t('school.yearPlaceholder')} placeholderTextColor={colors.textDisabled} />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('school.grade')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={yearForm.grade} onChangeText={(v) => setYearForm(f => ({ ...f, grade: v }))} placeholderTextColor={colors.textDisabled} />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('school.school')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={yearForm.school} onChangeText={(v) => setYearForm(f => ({ ...f, school: v }))} placeholderTextColor={colors.textDisabled} />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => setShowAddYearModal(false)}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: SCHOOL_THEME }]} onPress={handleAddYear}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Contact Modal */}
        <Modal visible={showAddContactModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingContactId ? t('school.editContact') : t('school.addContact')}</Text>
              <ScrollView>
                <Text style={[styles.label, { color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 12 }]}>{contactForm.role === 'teacher' ? '👩‍🏫 ' + t('school.addContactTeacher') : contactForm.role === 'admin' ? '🏥 ' + t('school.addHealthAdmin') : '👦 ' + t('school.addContactClassmate')}</Text>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{contactForm.role === 'teacher' ? t('school.teacherName') : contactForm.role === 'admin' ? t('school.name') : t('school.childName')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.name} onChangeText={(v) => setContactForm(f => ({ ...f, name: v }))} placeholderTextColor={colors.textDisabled} />
                </View>
                {contactForm.role === 'admin' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('school.adminRole')}</Text>
                    <SearchableMultiDropdown
                      options={Object.entries(ADMIN_ROLES).map(([key, val]) => ({ key, label: val.label, color: val.color }))}
                      value={contactForm.adminType}
                      onChange={(keys) => setContactForm(f => ({ ...f, adminType: keys }))}
                      placeholder={t('school.adminRole')}
                    />
                  </View>
                )}
                {contactForm.role === 'teacher' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.text }]}>{t('school.teacherType')} *</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[
                        { key: 'personal' as const, label: t('school.personalTeacher') },
                        { key: 'contact' as const, label: t('school.contactTeacher') },
                        { key: 'subject' as const, label: t('school.subjectTeacher') },
                      ].map((rt) => (
                        <TouchableOpacity
                          key={rt.key}
                          style={[styles.personChip, { backgroundColor: contactForm.teacherType === rt.key ? SCHOOL_THEME : colors.inputBackground, flex: 1 }]}
                          onPress={() => setContactForm(f => ({ ...f, teacherType: rt.key }))}
                        >
                          <Text style={{ color: contactForm.teacherType === rt.key ? '#fff' : colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{rt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {contactForm.role === 'teacher' ? (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.subject')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.subject} onChangeText={(v) => setContactForm(f => ({ ...f, subject: v }))} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.phone')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.phone} onChangeText={(v) => setContactForm(f => ({ ...f, phone: v }))} placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.email')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.email} onChangeText={(v) => setContactForm(f => ({ ...f, email: v }))} placeholderTextColor={colors.textDisabled} keyboardType="email-address" />
                    </View>
                  </>
                ) : contactForm.role === 'admin' ? (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.phone')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.phone} onChangeText={(v) => setContactForm(f => ({ ...f, phone: v }))} placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.email')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.email} onChangeText={(v) => setContactForm(f => ({ ...f, email: v }))} placeholderTextColor={colors.textDisabled} keyboardType="email-address" />
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.childPhone')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.phone} onChangeText={(v) => setContactForm(f => ({ ...f, phone: v }))} placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.childEmail')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.email} onChangeText={(v) => setContactForm(f => ({ ...f, email: v }))} placeholderTextColor={colors.textDisabled} keyboardType="email-address" />
                    </View>
                    <View style={[styles.field, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 }]}>
                      <Text style={[styles.label, { color: colors.text, fontWeight: '700' }]}>{t('school.parentName')} 1</Text>
                    </View>
                    <View style={styles.field}>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.parentName} onChangeText={(v) => setContactForm(f => ({ ...f, parentName: v }))} placeholder={t('school.parentNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.phone')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.parentPhone} onChangeText={(v) => setContactForm(f => ({ ...f, parentPhone: v }))} placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.email')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.parentEmail} onChangeText={(v) => setContactForm(f => ({ ...f, parentEmail: v }))} placeholderTextColor={colors.textDisabled} keyboardType="email-address" />
                    </View>
                    <View style={[styles.field, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 }]}>
                      <Text style={[styles.label, { color: colors.text, fontWeight: '700' }]}>{t('school.parentName')} 2</Text>
                    </View>
                    <View style={styles.field}>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.parentName2} onChangeText={(v) => setContactForm(f => ({ ...f, parentName2: v }))} placeholder={t('school.parentNamePlaceholder')} placeholderTextColor={colors.textDisabled} />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.phone')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.parentPhone2} onChangeText={(v) => setContactForm(f => ({ ...f, parentPhone2: v }))} placeholderTextColor={colors.textDisabled} keyboardType="phone-pad" />
                    </View>
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.text }]}>{t('school.email')}</Text>
                      <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.parentEmail2} onChangeText={(v) => setContactForm(f => ({ ...f, parentEmail2: v }))} placeholderTextColor={colors.textDisabled} keyboardType="email-address" />
                    </View>
                  </>
                )}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('school.address')}</Text>
                  <GooglePlacesInput
                    value={contactForm.address}
                    onChangeText={(v) => setContactForm(f => ({ ...f, address: v }))}
                    placeholder={t('school.addressPlaceholder')}
                    onSelect={(v) => setContactForm(f => ({ ...f, address: v }))}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('common.note')}</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]} value={contactForm.notes} onChangeText={(v) => setContactForm(f => ({ ...f, notes: v }))} placeholderTextColor={colors.textDisabled} multiline />
                </View>
              </ScrollView>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]} onPress={() => { setShowAddContactModal(false); setEditingContactId(null); }}>
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: SCHOOL_THEME }]} onPress={handleSaveContact}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ActionModal visible={contactActionModal.visible} title={contactActionModal.title} onEdit={handleEditContact} onDelete={handleDeleteContact} onCancel={() => setContactActionModal({ visible: false, id: '', title: '' })} accentColor={SCHOOL_THEME} />

        <ActionModal visible={yearActionModal.visible} title={yearActionModal.title} onEdit={handleEditYear} onDelete={handleDeleteYear} onCancel={() => setYearActionModal({ visible: false, id: '', title: '' })} accentColor={SCHOOL_THEME} />
        <ActionModal visible={scheduleActionModal.visible} title={scheduleActionModal.title} onDelete={() => { handleDeleteSchedule(scheduleActionModal.id); setScheduleActionModal({ visible: false, id: '', title: '' }); }} onCancel={() => setScheduleActionModal({ visible: false, id: '', title: '' })} accentColor={SCHOOL_THEME} />
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: MODULE_COLORS.schoolBg }]} edges={['top']}>
      {selectedChild ? renderDetail() : renderGrid()}

      {/* Full-screen image viewer */}
      <Modal visible={viewingImage !== null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setViewingImage(null)}>
            <Text style={{ color: '#fff', fontSize: 28 }}>✕</Text>
          </TouchableOpacity>
          {viewingImage && <Image source={{ uri: viewingImage }} style={{ width: '90%', height: '80%', resizeMode: 'contain' }} />}
        </View>
      </Modal>

      <HelpCenter
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title={t('school.helpTitle')}
        sections={[
          { icon: '📋', title: t('school.helpWhat'), text: t('school.helpWhatText') },
          { icon: '👉', title: t('school.helpHow'), text: t('school.helpHowText'), tip: t('school.helpTip') },
          { icon: '⚙️', title: t('school.helpSettings'), text: t('school.helpSettingsText') },
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  screenTitle: { fontSize: 28, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  gridSubtitle: { fontSize: 14, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridTile: { width: '30%', borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 12 },
  gridTileAdd: { borderWidth: 2, borderStyle: 'dashed', backgroundColor: 'transparent', aspectRatio: 1 },
  gridEmoji: { fontSize: 36, marginBottom: 6 },
  gridPhoto: { width: 80, height: 80, borderRadius: 40, marginBottom: 6 },
  gridName: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  gridSub: { fontSize: 12, marginTop: 2, textAlign: 'center' },
  section: { borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  sectionCount: { fontSize: 12 },
  addButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  yearTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 8, alignItems: 'center' },
  searchInput: { borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12 },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 12 },
  contactGroupTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  contactCard: { padding: 12, borderRadius: 10, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  teacherTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4, marginBottom: 2 },
  contactName: { fontSize: 15, fontWeight: '600' },
  contactActionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  contactActionBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  semesterTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  semesterTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  scheduleGrid: { flexDirection: 'row', gap: 8 },
  scheduleThumb: { flex: 1, aspectRatio: 3 / 4, borderRadius: 8, overflow: 'hidden' },
  scheduleImage: { width: '100%', height: '100%' },
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
});
